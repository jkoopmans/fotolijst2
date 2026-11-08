import { GoogleAlbum, PhotoItem } from '../types';
import { CURATED_DEFAULT_PHOTOS } from '../data/defaultPhotos';

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
      const errText = await res.text();
      console.warn('Google Photos albums error response:', errText);
      throw new Error(`Google Photos API status ${res.status}: ${res.statusText}`);
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
  } catch (err) {
    console.error('Error fetching Google Photos albums:', err);
    throw err;
  }
}

export async function fetchAlbumPhotos(accessToken: string, albumId: string, albumTitle?: string): Promise<PhotoItem[]> {
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
      console.warn(`Could not load photos for album ${albumId}:`, res.statusText);
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
        // =w2560-h1440 provides crisp 2K/4K display on TV screens without distortion
        url: `${item.baseUrl}=w2560-h1440`,
        title: item.description || albumTitle || 'Google Foto',
        albumTitle: albumTitle || 'Google Photos',
        createTime: item.mediaMetadata?.creationTime,
        width: item.mediaMetadata?.width ? parseInt(item.mediaMetadata.width, 10) : undefined,
        height: item.mediaMetadata?.height ? parseInt(item.mediaMetadata.height, 10) : undefined,
        source: 'google_photos' as const,
      }));
  } catch (err) {
    console.warn(`Error fetching items for album ${albumId}:`, err);
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
