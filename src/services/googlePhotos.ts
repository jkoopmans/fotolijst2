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

export function getSampleOrCuratedPhotos(): PhotoItem[] {
  return CURATED_DEFAULT_PHOTOS;
}

// Lightweight stubs for existing imports
export async function fetchGoogleAlbums(_accessToken?: string): Promise<GoogleAlbum[]> {
  return [];
}
export async function fetchAlbumPhotos(
  _accessToken?: string,
  _albumId?: string,
  _albumTitle?: string
): Promise<PhotoItem[]> {
  return [];
}
export async function fetchAllSelectedPhotos(
  _accessToken?: string | null,
  _selectedAlbumIds?: string[],
  _albums?: GoogleAlbum[]
): Promise<PhotoItem[]> {
  return [];
}

/**
 * Extract a Google Drive file ID from legacy lh3 or drive.google.com URLs.
 */
export function extractDriveFileIdFromUrl(url: string): string | null {
  if (!url || url.startsWith('data:')) return null;
  const lh3Match = url.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
  if (lh3Match) return lh3Match[1];
  const driveIdMatch = url.match(/drive\.google\.com\/(?:file\/d\/|thumbnail\?id=)([a-zA-Z0-9_-]+)/);
  if (driveIdMatch) return driveIdMatch[1];
  return null;
}

/**
 * Download a Google Drive image using the user's OAuth token and compress it
 * into a portable JPEG data URL so it displays on any unauthenticated TV / preview.
 */
export async function fetchAndCompressDriveImage(
  fileId: string,
  accessToken: string,
  maxDimension: number = 1440
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    if (!res.ok) return null;

    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);

    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = (e) => reject(e);
        image.src = objectUrl;
      });

      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width >= height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.drawImage(img, 0, 0, width, height);
      // Use quality 0.78 to keep images crisp while staying comfortably under Firestore's 1MB doc limit
      let dataUrl = canvas.toDataURL('image/jpeg', 0.78);
      if (dataUrl.length > 750_000) {
        dataUrl = canvas.toDataURL('image/jpeg', 0.6);
      }
      return dataUrl;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch (err) {
    console.warn('Could not inline Google Drive image:', fileId, err);
    return null;
  }
}

/**
 * Google Drive Images Picker
 * Dedicated Google Drive picker that queries user's Drive photos and images securely.
 */
export async function openGoogleDriveImagePicker({
  accessToken,
  developerKey,
  appId,
  onPhotosPicked,
  onProcessingStart,
  onError,
}: {
  accessToken: string;
  developerKey?: string;
  appId?: string;
  onPhotosPicked: (photos: PhotoItem[]) => void;
  onProcessingStart?: () => void;
  onError?: (err: any) => void;
}): Promise<void> {
  if (typeof window === 'undefined') return;

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
        throw new Error('Google Picker service is nog niet gereed in de browser.');
      }

      // Ensure proper origin matching
      const pickerOrigin = window.location.protocol + '//' + window.location.host;

      // Google Drive Images View (supported natively by Google Drive API & Picker API)
      const docsImagesView = new google.picker.DocsView(google.picker.ViewId.DOCS_IMAGES)
        .setIncludeFolders(true)
        .setSelectFolderEnabled(false)
        .setMimeTypes('image/png,image/jpeg,image/jpg,image/webp,image/gif');

      const effectiveKey = developerKey || GOOGLE_API_KEY;
      const effectiveAppId = appId || GOOGLE_PROJECT_NUMBER;

      const builder = new google.picker.PickerBuilder()
        .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
        .setOAuthToken(accessToken)
        .setDeveloperKey(effectiveKey)
        .setAppId(effectiveAppId)
        .addView(docsImagesView)
        .setOrigin(pickerOrigin)
        .setTitle('Selecteer afbeeldingen uit je Google Drive voor je TV')
        .setCallback(async (data: any) => {
          if (data.action === google.picker.Action.PICKED) {
            if (onProcessingStart) onProcessingStart();
            const pickedDocs = data.docs || [];

            const newPhotos: PhotoItem[] = await Promise.all(
              pickedDocs.map(async (doc: any, index: number) => {
                // Attempt to fetch & compress Drive file via OAuth token so it renders on unauthenticated TVs
                let imgUrl: string | null = null;
                if (doc.id && accessToken) {
                  imgUrl = await fetchAndCompressDriveImage(doc.id, accessToken);
                }

                // Fallback to Google Drive high-res URL if direct media fetch fails
                if (!imgUrl) {
                  imgUrl = doc.id ? `https://lh3.googleusercontent.com/d/${doc.id}=w2560-h1440` : '';
                  if (doc.thumbnails && doc.thumbnails.length > 0) {
                    const thumb = doc.thumbnails[doc.thumbnails.length - 1];
                    if (thumb && thumb.url && !imgUrl) {
                      imgUrl = thumb.url.split('=')[0] + '=w2560-h1440';
                    }
                  }
                  if (!imgUrl && doc.id) {
                    imgUrl = `https://drive.google.com/thumbnail?id=${doc.id}&sz=w2560`;
                  }
                }

                const cleanId = (doc.id || `google-drive-${Date.now()}-${index}`).replace(
                  /[^a-zA-Z0-9_-]/g,
                  '_'
                );

                return {
                  id: cleanId,
                  url: imgUrl || doc.url,
                  title: doc.name || 'Google Drive Foto',
                  albumTitle: 'Google Drive Afbeeldingen',
                  createTime: doc.lastEditedUtc
                    ? new Date(doc.lastEditedUtc).toISOString()
                    : new Date().toISOString(),
                  source: 'google_photos' as const,
                };
              })
            );

            onPhotosPicked(newPhotos);
          } else if (data.action === google.picker.Action.CANCEL) {
            if (onError) onError(null);
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

// Alias for backwards compatibility
export const openGooglePhotoPicker = openGoogleDriveImagePicker;

