import { GoogleAlbum, PhotoItem } from '../types';
import { CURATED_DEFAULT_PHOTOS } from '../data/defaultPhotos';

export const GOOGLE_API_KEY = 'AIzaSyBx2yj4QSfS2U75ylF9Khx1XseoMRb3aeQ';
export const GOOGLE_PROJECT_NUMBER = '114756915443';

/**
 * Dynamically load Google API script for the picker
 */
export async function loadGapiPickerScript(): Promise<void> {
  if (typeof window === 'undefined') return;
  if ((window as any).gapi) return;

  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector('script[src="https://apis.google.com/js/api.js"]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Kon Google API script niet laden.'));
    document.head.appendChild(script);
  });
}

/**
 * Attempts to fetch Google Photos albums via REST API.
 * Catches 403 gracefully and returns an empty list without throwing popup alerts.
 */
export async function fetchGoogleAlbums(accessToken: string): Promise<GoogleAlbum[]> {
  try {
    const res = await fetch('https://photoslibrary.googleapis.com/v1/albums?pageSize=50', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        throw new Error('UNAUTHORIZED');
      }
      return [];
    }

    const data = await res.json();
    if (!data.albums || !Array.isArray(data.albums)) {
      return [];
    }

    return data.albums.map((album: any) => ({
      id: album.id,
      title: album.title || 'Naamloos album',
      productUrl: album.productUrl,
      coverPhotoBaseUrl: album.coverPhotoBaseUrl ? `${album.coverPhotoBaseUrl}=w600-h400-c` : undefined,
      mediaItemsCount: album.mediaItemsCount || '0',
    }));
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') throw err;
    return [];
  }
}

export async function fetchAlbumPhotos(
  accessToken: string,
  albumId: string,
  albumTitle?: string
): Promise<PhotoItem[]> {
  try {
    const res = await fetch('https://photoslibrary.googleapis.com/v1/mediaItems:search', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        albumId: albumId,
        pageSize: 50,
      }),
    });

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    if (!data.mediaItems || !Array.isArray(data.mediaItems)) {
      return [];
    }

    return data.mediaItems
      .filter((item: any) => item.mimeType?.startsWith('image/'))
      .map((item: any) => ({
        id: item.id,
        url: `${item.baseUrl}=w2560-h1440`,
        title: item.description || albumTitle || 'Google Foto',
        albumTitle: albumTitle || 'Google Photos',
        createTime: item.mediaMetadata?.creationTime,
        width: item.mediaMetadata?.width ? parseInt(item.mediaMetadata.width, 10) : undefined,
        height: item.mediaMetadata?.height ? parseInt(item.mediaMetadata.height, 10) : undefined,
        source: 'google_photos' as const,
      }));
  } catch {
    return [];
  }
}

export async function fetchAllSelectedPhotos(
  accessToken: string | null,
  selectedAlbumIds: string[],
  albums: GoogleAlbum[] = []
): Promise<PhotoItem[]> {
  if (!accessToken || !selectedAlbumIds.length) {
    return [];
  }

  const allPhotos: PhotoItem[] = [];
  const albumMap = new Map(albums.map((a) => [a.id, a.title]));

  for (const albumId of selectedAlbumIds) {
    const albumTitle = albumMap.get(albumId);
    const photos = await fetchAlbumPhotos(accessToken, albumId, albumTitle);
    allPhotos.push(...photos);
  }

  return allPhotos;
}

export function getSampleOrCuratedPhotos(): PhotoItem[] {
  return CURATED_DEFAULT_PHOTOS;
}

/**
 * Modern Google Photos Picker API (official 2024/2025 standard)
 * 1. Creates a session: POST https://photospicker.googleapis.com/v1/sessions
 * 2. Opens the pickerUri in a secure popup window
 * 3. Polls/retrieves selected media items: GET https://photospicker.googleapis.com/v1/mediaItems?sessionId=...
 */
export async function startGooglePhotosPickerSession({
  accessToken,
  onPhotosPicked,
  onError,
}: {
  accessToken: string;
  onPhotosPicked: (photos: PhotoItem[]) => void;
  onError?: (err: any) => void;
}): Promise<boolean> {
  try {
    const res = await fetch('https://photospicker.googleapis.com/v1/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn('Google Photos Picker API session response:', res.status, errText);
      return false;
    }

    const sessionData = await res.json();
    const sessionId = sessionData.id;
    const pickerUri = sessionData.pickerUri;

    if (!pickerUri) {
      return false;
    }

    // Open Google's native picker window
    const popup = window.open(
      pickerUri,
      'google_photos_picker',
      'width=840,height=700,menubar=no,toolbar=no,location=no,status=no,resizable=yes'
    );

    let pollInterval: NodeJS.Timeout | null = null;
    let attempts = 0;
    const maxAttempts = 90; // up to 3 minutes

    pollInterval = setInterval(async () => {
      attempts++;
      if (attempts > maxAttempts || (popup && popup.closed)) {
        if (pollInterval) clearInterval(pollInterval);
      }

      try {
        const checkRes = await fetch(
          `https://photospicker.googleapis.com/v1/mediaItems?sessionId=${sessionId}&pageSize=100`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (checkRes.ok) {
          const mediaData = await checkRes.json();
          if (mediaData.mediaItems && mediaData.mediaItems.length > 0) {
            if (pollInterval) clearInterval(pollInterval);
            if (popup && !popup.closed) popup.close();

            const newPhotos: PhotoItem[] = mediaData.mediaItems.map(
              (item: any, index: number) => ({
                id: item.id || `google-photos-${Date.now()}-${index}`,
                url: `${item.baseUrl}=w2560-h1440`,
                title: item.filename || 'Google Foto',
                albumTitle: 'Google Photos Selectie',
                createTime: new Date().toISOString(),
                width: item.mediaFile?.width ? parseInt(item.mediaFile.width, 10) : undefined,
                height: item.mediaFile?.height ? parseInt(item.mediaFile.height, 10) : undefined,
                source: 'google_photos' as const,
              })
            );

            onPhotosPicked(newPhotos);

            // Clean up session
            fetch(`https://photospicker.googleapis.com/v1/sessions/${sessionId}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${accessToken}` },
            }).catch(() => {});
          }
        }
      } catch {
        // continue polling
      }
    }, 2000);

    return true;
  } catch (err) {
    console.warn('Photos picker session start error:', err);
    if (onError) onError(err);
    return false;
  }
}

/**
 * Google Picker dialog (supporting Google Drive images & shared photos)
 * Uses DocsView(DOCS_IMAGES) which avoids the deprecated ViewId.PHOTOS 403 error.
 */
export async function openGooglePhotoPicker({
  accessToken,
  developerKey,
  appId,
  onPhotosPicked,
  onError,
}: {
  accessToken: string;
  developerKey?: string;
  appId?: string;
  onPhotosPicked: (photos: PhotoItem[]) => void;
  onError?: (err: any) => void;
}): Promise<void> {
  if (typeof window === 'undefined') return;

  // 1. First attempt the modern Google Photos Picker API
  const sessionSuccess = await startGooglePhotosPickerSession({
    accessToken,
    onPhotosPicked,
  });

  if (sessionSuccess) {
    return;
  }

  // 2. Fallback to Google Drive DocsView(DOCS_IMAGES) via PickerBuilder
  try {
    await loadGapiPickerScript();
  } catch (err) {
    if (onError) onError(err);
    return;
  }

  const gapi = (window as any).gapi;
  if (!gapi) {
    if (onError) {
      onError(new Error('Google API component kon niet worden geïnitialiseerd.'));
    }
    return;
  }

  gapi.load('picker', () => {
    try {
      const google = (window as any).google;
      if (!google?.picker) {
        throw new Error('Google Picker service is nog niet gereed.');
      }

      const pickerOrigin = window.location.origin;

      // Use DOCS_IMAGES which is valid and supported by Google Picker API
      const docsView = new google.picker.DocsView(google.picker.ViewId.DOCS_IMAGES)
        .setIncludeFolders(true)
        .setSelectFolderEnabled(false);

      const effectiveKey = developerKey || GOOGLE_API_KEY;
      const effectiveAppId = appId || GOOGLE_PROJECT_NUMBER;

      const builder = new google.picker.PickerBuilder()
        .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
        .setOAuthToken(accessToken)
        .setDeveloperKey(effectiveKey)
        .setAppId(effectiveAppId)
        .addView(docsView)
        .setOrigin(pickerOrigin)
        .setTitle('Selecteer afbeeldingen voor je TV Fotolijst')
        .setCallback((data: any) => {
          if (data.action === google.picker.Action.PICKED) {
            const pickedDocs = data.docs || [];
            const newPhotos: PhotoItem[] = pickedDocs.map((doc: any, index: number) => {
              let imgUrl = doc.url;
              if (doc.thumbnails && doc.thumbnails.length > 0) {
                const thumb = doc.thumbnails[doc.thumbnails.length - 1];
                imgUrl = thumb.url;
              }
              if (imgUrl && imgUrl.includes('googleusercontent.com')) {
                imgUrl = imgUrl.split('=')[0] + '=w2560-h1440';
              }

              return {
                id: doc.id || `google-picker-${Date.now()}-${index}`,
                url: imgUrl || doc.iconUrl,
                title: doc.name || 'Google Foto',
                albumTitle: 'Google Drive Selectie',
                createTime: doc.lastEditedUtc
                  ? new Date(doc.lastEditedUtc).toISOString()
                  : new Date().toISOString(),
                source: 'google_photos' as const,
              };
            });

            onPhotosPicked(newPhotos);
          }
        });

      const picker = builder.build();
      picker.setVisible(true);
    } catch (e) {
      console.error('Picker initialization error:', e);
      if (onError) onError(e);
    }
  });
}
