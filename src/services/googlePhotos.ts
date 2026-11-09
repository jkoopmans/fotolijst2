import { GoogleAlbum, PhotoItem } from '../types';
import { CURATED_DEFAULT_PHOTOS } from '../data/defaultPhotos';

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
 * Google restricts /v1/albums for 3rd-party consumer apps unless verified.
 * We catch 403 gracefully and return an empty list without throwing popup alerts.
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
      if (res.status === 403) {
        console.info('Google Photos Library API is policy-restricted by Google. Use upload or custom URLs.');
        return [];
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
    console.warn('Google Photos albums notice:', err);
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
  } catch (err) {
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

export const GOOGLE_API_KEY = 'AIzaSyBx2yj4QSfS2U75ylF9Khx1XseoMRb3aeQ';
export const GOOGLE_PROJECT_NUMBER = '114756915443';

/**
 * Modern Google Photo Picker integration:
 * Dynamically loads gapi and opens Google Picker with user-friendly error handling.
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

  try {
    await loadGapiPickerScript();
  } catch (err) {
    if (onError) onError(err);
    return;
  }

  const gapi = (window as any).gapi;
  if (!gapi) {
    if (onError) {
      onError(new Error('Google API script kon niet worden geïnitialiseerd.'));
    }
    return;
  }

  gapi.load('picker', () => {
    try {
      const google = (window as any).google;
      if (!google?.picker) {
        throw new Error('Google Picker service is nog niet gereed in de browser.');
      }

      const pickerOrigin =
        window.location.ancestorOrigins && window.location.ancestorOrigins.length > 0
          ? window.location.ancestorOrigins[window.location.ancestorOrigins.length - 1]
          : window.location.origin;

      const viewPhotos = new google.picker.View(google.picker.ViewId.PHOTOS);
      const viewAlbums = new google.picker.View(google.picker.ViewId.PHOTO_ALBUMS);

      const effectiveKey = developerKey || GOOGLE_API_KEY;
      const effectiveAppId = appId || GOOGLE_PROJECT_NUMBER;

      const builder = new google.picker.PickerBuilder()
        .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
        .setOAuthToken(accessToken)
        .setDeveloperKey(effectiveKey)
        .setAppId(effectiveAppId)
        .addView(viewPhotos)
        .addView(viewAlbums)
        .setOrigin(pickerOrigin)
        .setTitle('Selecteer foto\'s voor je TV Fotolijst')
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
                albumTitle: 'Google Photos Selectie',
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
