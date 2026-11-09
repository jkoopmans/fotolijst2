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
 * Google Drive Images Picker
 * Dedicated Google Drive picker that queries user's Drive photos and images securely.
 */
export async function openGoogleDriveImagePicker({
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
        .setCallback((data: any) => {
          if (data.action === google.picker.Action.PICKED) {
            const pickedDocs = data.docs || [];
            const newPhotos: PhotoItem[] = pickedDocs.map((doc: any, index: number) => {
              // High-resolution Google Drive image URLs
              let imgUrl = doc.id ? `https://lh3.googleusercontent.com/d/${doc.id}=w2560-h1440` : '';

              if (doc.thumbnails && doc.thumbnails.length > 0) {
                const thumb = doc.thumbnails[doc.thumbnails.length - 1];
                if (thumb && thumb.url) {
                  imgUrl = thumb.url.split('=')[0] + '=w2560-h1440';
                }
              }

              if (!imgUrl && doc.id) {
                imgUrl = `https://drive.google.com/thumbnail?id=${doc.id}&sz=w2560`;
              }

              return {
                id: doc.id || `google-drive-${Date.now()}-${index}`,
                url: imgUrl || doc.url,
                title: doc.name || 'Google Drive Foto',
                albumTitle: 'Google Drive Afbeeldingen',
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

// Alias for backwards compatibility
export const openGooglePhotoPicker = openGoogleDriveImagePicker;
