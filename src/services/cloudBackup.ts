import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { app, auth, ensureFirebaseAuth } from './auth';
import { CalendarEvent, FrameSettings, PhotoItem } from '../types';

export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export const DEFAULT_BACKUP_COLLECTION = 'tv_backups';
export const DEFAULT_BACKUP_ID = 'default';

const RESERVED_COLLECTIONS = new Set(['admins', 'users', 'system', 'config', 'test']);
const VALID_ID_REGEX = /^[a-zA-Z0-9_-]+$/;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export interface CloudBackupPayload {
  ownerUid: string;
  ownerEmail: string;
  collectionName: string;
  backupId: string;
  label?: string;
  settings: FrameSettings;
  photos: PhotoItem[];
  events: CalendarEvent[];
  photoCount?: number;
  eventCount?: number;
  createdAt?: Timestamp | string | null;
  updatedAt?: Timestamp | string | null;
}

export interface CloudBackupSummary {
  collectionName: string;
  backupId: string;
  label: string;
  photoCount: number;
  eventCount: number;
  updatedAtIso: string | null;
}

function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate Firestore connection on module initialization
async function testConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

/**
 * Sanitize and normalize a user-defined collection name to match firestore.rules constraints.
 */
export function sanitizeCollectionName(name?: string): string {
  const cleaned = (name || DEFAULT_BACKUP_COLLECTION)
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_');

  if (
    cleaned.length < 2 ||
    cleaned.length > 64 ||
    !VALID_ID_REGEX.test(cleaned) ||
    RESERVED_COLLECTIONS.has(cleaned.toLowerCase())
  ) {
    throw new Error(
      'Ongeldige collectienaam. Gebruik 2-64 tekens (letters, cijfers, _ of -) en geen gereserveerde naam.'
    );
  }
  return cleaned;
}

/**
 * Sanitize and normalize a document backup ID to match firestore.rules constraints.
 */
export function sanitizeBackupId(id?: string): string {
  const cleaned = (id || DEFAULT_BACKUP_ID)
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_');

  if (cleaned.length < 1 || cleaned.length > 128 || !VALID_ID_REGEX.test(cleaned)) {
    throw new Error('Ongeldige backup ID. Gebruik 1-128 tekens (letters, cijfers, _ of -).');
  }
  return cleaned;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Recursively remove undefined/null properties on plain objects while preserving
 * Firestore FieldValue/Timestamp class instances untouched.
 */
function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined && item !== null)
      .map((item) => stripUndefined(item)) as unknown as T;
  }
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (v !== undefined && v !== null) {
        out[k] = stripUndefined(v);
      }
    }
    return out as T;
  }
  return value;
}

function normalizePhotoSource(source: unknown): 'google_photos' | 'curated' | 'custom' {
  if (source === 'google_photos' || source === 'curated' || source === 'custom') {
    return source;
  }
  return 'custom';
}

/**
 * Prepare photos array safely for Firestore 1MB document limits.
 * Skips oversized inline base64 uploads (>150KB each) if needed, preserving all Drive/URL photos.
 */
function preparePhotosForFirestore(photos: PhotoItem[]): {
  safePhotos: PhotoItem[];
  skippedLargeUploads: number;
} {
  const limited = photos.slice(0, 100);
  const safePhotos: PhotoItem[] = [];
  let skippedLargeUploads = 0;
  let totalBytes = 0;

  for (const photo of limited) {
    const cleanPhoto = stripUndefined({
      id: String(photo.id || `photo-${safePhotos.length}`),
      url: String(photo.url || ''),
      title: photo.title ? String(photo.title).slice(0, 200) : undefined,
      albumTitle: photo.albumTitle ? String(photo.albumTitle).slice(0, 120) : undefined,
      createTime: photo.createTime ? String(photo.createTime).slice(0, 64) : undefined,
      source: photo.source || 'google_photos',
    }) as PhotoItem;

    if (!cleanPhoto.url) continue;

    const approxSize = cleanPhoto.url.length + 128;
    // Skip very large inline data URLs so the Firestore 1MB limit is never exceeded
    if (cleanPhoto.url.startsWith('data:') && approxSize > 150_000) {
      skippedLargeUploads += 1;
      continue;
    }

    if (totalBytes + approxSize > 750_000) {
      skippedLargeUploads += 1;
      continue;
    }

    totalBytes += approxSize;
    safePhotos.push(cleanPhoto);
  }

  return { safePhotos, skippedLargeUploads };
}

function prepareEventsForFirestore(events: CalendarEvent[]): CalendarEvent[] {
  return events.slice(0, 100).map((ev) =>
    stripUndefined({
      id: String(ev.id || ''),
      summary: String(ev.summary || 'Afspraak').slice(0, 300),
      description: ev.description ? String(ev.description).slice(0, 500) : undefined,
      start: ev.start || {},
      end: ev.end || {},
      location: ev.location ? String(ev.location).slice(0, 250) : undefined,
      htmlLink: ev.htmlLink ? String(ev.htmlLink).slice(0, 500) : undefined,
      calendarId: String(ev.calendarId || 'primary'),
      calendarName: ev.calendarName ? String(ev.calendarName).slice(0, 150) : undefined,
      color: ev.color ? String(ev.color).slice(0, 32) : undefined,
      isAllDay: Boolean(ev.isAllDay),
    })
  );
}

/**
 * Upload current settings, photos, and calendar events to a user-defined Firestore collection.
 */
export async function uploadCloudBackup({
  collectionName = DEFAULT_BACKUP_COLLECTION,
  backupId = DEFAULT_BACKUP_ID,
  label,
  settings,
  photos,
  events,
}: {
  collectionName?: string;
  backupId?: string;
  label?: string;
  settings: FrameSettings;
  photos: PhotoItem[];
  events: CalendarEvent[];
}): Promise<{
  collectionName: string;
  backupId: string;
  photoCount: number;
  eventCount: number;
  skippedLargeUploads: number;
}> {
  const safeCollection = sanitizeCollectionName(collectionName);
  const safeBackupId = sanitizeBackupId(backupId);
  const docPath = `${safeCollection}/${safeBackupId}`;

  const fbUser = await ensureFirebaseAuth();
  if (!fbUser || !fbUser.email) {
    throw new Error('Niet ingelogd met een geverifieerd Google account voor cloud-opslag.');
  }

  const { safePhotos, skippedLargeUploads } = preparePhotosForFirestore(photos);
  const safeEvents = prepareEventsForFirestore(events);
  const safeSettings = stripUndefined({
    ...settings,
    // Keep customPhotos compact inside settings as well to stay well under 1MB
    customPhotos: preparePhotosForFirestore(settings.customPhotos || []).safePhotos,
  });

  const safeLabel = (label || `Backup ${new Date().toLocaleDateString('nl-NL')}`)
    .trim()
    .slice(0, 120);

  const docRef = doc(db, safeCollection, safeBackupId);

  let existsAlready = false;
  try {
    const existingSnap = await getDoc(docRef);
    existsAlready = existingSnap.exists();
  } catch (error: any) {
    // If document doesn't exist and get fails due to non-existing resource check, ignore and attempt create;
    // otherwise report permission/network error via handleFirestoreError.
    const msg = error instanceof Error ? error.message : String(error);
    if (!msg.includes('not-found')) {
      // Proceed to check if create works only if missing; rethrow permissions error properly
      if (msg.includes('Missing or insufficient permissions') || msg.includes('PERMISSION_DENIED')) {
        handleFirestoreError(error, OperationType.GET, docPath);
      }
    }
  }

  if (existsAlready) {
    try {
      await updateDoc(docRef, {
        label: safeLabel,
        settings: safeSettings,
        photos: safePhotos,
        events: safeEvents,
        photoCount: safePhotos.length,
        eventCount: safeEvents.length,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, docPath);
    }
  } else {
    try {
      await setDoc(docRef, {
        ownerUid: fbUser.uid,
        ownerEmail: fbUser.email,
        collectionName: safeCollection,
        backupId: safeBackupId,
        label: safeLabel,
        settings: safeSettings,
        photos: safePhotos,
        events: safeEvents,
        photoCount: safePhotos.length,
        eventCount: safeEvents.length,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, docPath);
    }
  }

  return {
    collectionName: safeCollection,
    backupId: safeBackupId,
    photoCount: safePhotos.length,
    eventCount: safeEvents.length,
    skippedLargeUploads,
  };
}

/**
 * Fetch saved settings, photos, and calendar events back from a user-defined Firestore collection.
 */
export async function fetchCloudBackup(
  collectionName: string = DEFAULT_BACKUP_COLLECTION,
  backupId: string = DEFAULT_BACKUP_ID
): Promise<CloudBackupPayload | null> {
  const safeCollection = sanitizeCollectionName(collectionName);
  const safeBackupId = sanitizeBackupId(backupId);
  const docPath = `${safeCollection}/${safeBackupId}`;

  await ensureFirebaseAuth();

  try {
    const snap = await getDoc(doc(db, safeCollection, safeBackupId));
    if (!snap.exists()) {
      return null;
    }
    return snap.data() as CloudBackupPayload;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, docPath);
  }
}

/**
 * List all cloud backups owned by the current user in a user-defined Firestore collection.
 */
export async function listCloudBackups(
  collectionName: string = DEFAULT_BACKUP_COLLECTION
): Promise<CloudBackupSummary[]> {
  const safeCollection = sanitizeCollectionName(collectionName);
  const fbUser = await ensureFirebaseAuth();

  try {
    const q = query(
      collection(db, safeCollection),
      where('ownerUid', '==', fbUser.uid)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data() as CloudBackupPayload;
      let updatedAtIso: string | null = null;
      if (data.updatedAt && typeof (data.updatedAt as any).toDate === 'function') {
        updatedAtIso = (data.updatedAt as any).toDate().toISOString();
      } else if (typeof data.updatedAt === 'string') {
        updatedAtIso = data.updatedAt;
      }

      return {
        collectionName: data.collectionName || safeCollection,
        backupId: data.backupId || d.id,
        label: data.label || d.id,
        photoCount: typeof data.photoCount === 'number' ? data.photoCount : (data.photos?.length || 0),
        eventCount: typeof data.eventCount === 'number' ? data.eventCount : (data.events?.length || 0),
        updatedAtIso,
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, safeCollection);
  }
}

/**
 * Delete a cloud backup document from a user-defined Firestore collection.
 */
export async function deleteCloudBackup(
  collectionName: string = DEFAULT_BACKUP_COLLECTION,
  backupId: string = DEFAULT_BACKUP_ID
): Promise<void> {
  const safeCollection = sanitizeCollectionName(collectionName);
  const safeBackupId = sanitizeBackupId(backupId);
  const docPath = `${safeCollection}/${safeBackupId}`;

  await ensureFirebaseAuth();

  try {
    await deleteDoc(doc(db, safeCollection, safeBackupId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

/**
 * Returns true if Firebase Auth currently has an active verified user session.
 */
export function isFirebaseSessionActive(): boolean {
  return Boolean(auth.currentUser && auth.currentUser.emailVerified);
}

/**
 * Publish current non-PII settings, calendar events, and photos to /tv_display/active
 * so any TV or preview screen can render them without signing in.
 */
export async function publishTVDisplayState({
  settings,
  photos,
  events,
  promptAuthIfNeeded = false,
}: {
  settings: FrameSettings;
  photos: PhotoItem[];
  events: CalendarEvent[];
  promptAuthIfNeeded?: boolean;
}): Promise<boolean> {
  if (!auth.currentUser) {
    if (!promptAuthIfNeeded) {
      return false;
    }
    await ensureFirebaseAuth();
  }

  const displayDocPath = 'tv_display/active';
  const safePhotosList = photos
    .slice(0, 100)
    .map((photo, index) => {
      const cleanId =
        String(photo.id || `photo_${index}`)
          .replace(/[^a-zA-Z0-9_-]/g, '_')
          .slice(0, 128) || `photo_${index}`;
      let url = String(photo.url || '').trim();
      if (url.length > 890_000) {
        url = '';
      }
      return {
        id: cleanId,
        url,
        title: photo.title && String(photo.title).trim() ? String(photo.title).trim().slice(0, 200) : undefined,
        albumTitle:
          photo.albumTitle && String(photo.albumTitle).trim()
            ? String(photo.albumTitle).trim().slice(0, 120)
            : undefined,
        createTime:
          photo.createTime && String(photo.createTime).trim()
            ? String(photo.createTime).trim().slice(0, 64)
            : undefined,
        source: normalizePhotoSource(photo.source),
        order: index,
      };
    })
    .filter((p) => p.url.length > 0);

  const photoIds = safePhotosList.map((p) => p.id);

  // Publish each photo document in /tv_display/active/photos/{photoId}
  for (const photo of safePhotosList) {
    const photoPath = `tv_display/active/photos/${photo.id}`;
    const cleanFields = stripUndefined({
      isPublicDisplay: true,
      id: photo.id,
      url: photo.url,
      title: photo.title,
      albumTitle: photo.albumTitle,
      createTime: photo.createTime,
      source: photo.source,
      order: photo.order,
    });
    try {
      await setDoc(doc(db, 'tv_display', 'active', 'photos', photo.id), {
        ...cleanFields,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, photoPath);
    }
  }

  // Remove stale photos that were unselected/deleted in admin
  try {
    const existingPhotosSnap = await getDocs(
      query(collection(db, 'tv_display', 'active', 'photos'), where('isPublicDisplay', '==', true))
    );
    const activeIdSet = new Set(photoIds);
    for (const existingDoc of existingPhotosSnap.docs) {
      if (!activeIdSet.has(existingDoc.id)) {
        await deleteDoc(doc(db, 'tv_display', 'active', 'photos', existingDoc.id));
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'tv_display/active/photos');
  }

  // Strip PII/secrets from published display settings
  const publicSettings = stripUndefined({
    slideInterval: settings.slideInterval,
    transitionStyle: settings.transitionStyle,
    fitMode: settings.fitMode,
    showCalendarOverlay: settings.showCalendarOverlay,
    overlayPosition: settings.overlayPosition,
    overlayWidth: settings.overlayWidth,
    overlayOpacity: settings.overlayOpacity,
    showClock: settings.showClock,
    clockFormat: settings.clockFormat,
    selectedAlbumIds: settings.selectedAlbumIds || [],
    selectedCalendarIds: settings.selectedCalendarIds || ['primary'],
    refreshIntervalMinutes: settings.refreshIntervalMinutes || 5,
    curatedAlbumEnabled: false,
  });

  const safeEvents = prepareEventsForFirestore(events);

  try {
    await setDoc(doc(db, 'tv_display', 'active'), {
      isPublicDisplay: true,
      settings: publicSettings,
      events: safeEvents,
      photoIds,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, displayDocPath);
  }
}

/**
 * Fetch the published TV display state (photos, calendar events, display settings)
 * from Firestore WITHOUT requiring any user login.
 */
export async function fetchPublicTVDisplay(): Promise<{
  settings?: Partial<FrameSettings>;
  photos: PhotoItem[];
  events: CalendarEvent[];
} | null> {
  try {
    const stateSnap = await getDoc(doc(db, 'tv_display', 'active'));
    if (!stateSnap.exists()) {
      return null;
    }

    const stateData = stateSnap.data() as any;

    const photosSnap = await getDocs(
      query(collection(db, 'tv_display', 'active', 'photos'), where('isPublicDisplay', '==', true))
    );

    const photosWithOrder = photosSnap.docs.map((d) => {
      const data = d.data() as any;
      return {
        order: typeof data.order === 'number' ? data.order : 0,
        item: {
          id: data.id || d.id,
          url: data.url,
          title: data.title,
          albumTitle: data.albumTitle,
          createTime: data.createTime,
          source: data.source || 'google_photos',
        } as PhotoItem,
      };
    });

    photosWithOrder.sort((a, b) => a.order - b.order);
    const photos = photosWithOrder.map((p) => p.item);

    return {
      settings: stateData.settings || {},
      photos,
      events: Array.isArray(stateData.events) ? stateData.events : [],
    };
  } catch (error: any) {
    // Missing document / initial empty state before first publish returns null silently
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('Missing or insufficient permissions') || msg.includes('not-found')) {
      return null;
    }
    handleFirestoreError(error, OperationType.GET, 'tv_display/active');
  }
}

/**
 * Subscribe to real-time updates on the published TV display state.
 */
export function subscribeToPublicTVDisplay(
  onUpdate: (data: {
    settings?: Partial<FrameSettings>;
    photos: PhotoItem[];
    events: CalendarEvent[];
  }) => void
): () => void {
  const docRef = doc(db, 'tv_display', 'active');
  return onSnapshot(
    docRef,
    async (snap) => {
      if (!snap.exists()) return;
      try {
        const fullState = await fetchPublicTVDisplay();
        if (fullState) {
          onUpdate(fullState);
        }
      } catch (err) {
        console.warn('Error refreshing public TV display state:', err);
      }
    },
    (error) => {
      const msg = error instanceof Error ? error.message : String(error);
      if (!msg.includes('Missing or insufficient permissions')) {
        handleFirestoreError(error, OperationType.GET, 'tv_display/active');
      }
    }
  );
}

