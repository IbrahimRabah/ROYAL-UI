/**
 * Helpers for the bulk image upload that need no browser: how big a picture should be, and how to split a long
 * list of files into requests the server accepts. The canvas work itself is in {@link resizeForUpload}.
 */

/** The longest side a stored picture needs. Bigger only costs disk and page load. */
export const MAX_EDGE_PX = 2000;

/** A file at or under this size and within {@link MAX_EDGE_PX} is sent as it is; it needs no re-encoding. */
export const KEEP_AS_IS_BYTES = 1_500_000;

/** The server rejects a file over 5 MB. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** The server takes at most 12 files per request; fewer keeps a request well under its 10 MB limit. */
export const FILES_PER_REQUEST = 8;

const WEB_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

/** The size to draw at: the longest side at most `maxEdge`, never enlarged, proportions kept. */
export function fitWithin(width: number, height: number, maxEdge = MAX_EDGE_PX): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxEdge || longest <= 0) {
    return { width, height };
  }
  const scale = maxEdge / longest;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** Whether the original bytes can be sent untouched: a web format, small enough, and not oversized in pixels. */
export function canSendAsIs(type: string, sizeBytes: number, width: number, height: number): boolean {
  return WEB_TYPES.has(type) && sizeBytes <= KEEP_AS_IS_BYTES && Math.max(width, height) <= MAX_EDGE_PX;
}

/**
 * Splits items into requests of at most `perRequest`, keeping the items of one group (one SKU) together so that
 * a product's main image and its extras travel in the same request. A group larger than `perRequest` is split.
 */
export function planBatches<T>(items: readonly T[], groupOf: (item: T) => string, perRequest = FILES_PER_REQUEST): T[][] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = groupOf(item);
    const list = groups.get(key);
    if (list) {
      list.push(item);
    } else {
      groups.set(key, [item]);
    }
  }

  const batches: T[][] = [];
  let current: T[] = [];
  for (const group of groups.values()) {
    for (let i = 0; i < group.length; i += perRequest) {
      const part = group.slice(i, i + perRequest);
      if (current.length + part.length > perRequest) {
        batches.push(current);
        current = [];
      }
      current.push(...part);
    }
  }
  if (current.length > 0) {
    batches.push(current);
  }
  return batches;
}

/** The folder part of a relative path («a/b/CH101.jpg» -> «a/b»), or null for a bare file. */
export function folderOf(relativePath: string | null | undefined): string | null {
  if (!relativePath) {
    return null;
  }
  const cut = relativePath.lastIndexOf('/');
  return cut > 0 ? relativePath.substring(0, cut) : null;
}

/** The key that ties a server answer (name + folder) back to the File the person picked. */
export function fileKey(name: string, folder: string | null | undefined): string {
  return (folder ?? '') + '\u0000' + name;
}

/**
 * Reads the picture and, unless it is already a small web image, draws it at {@link MAX_EDGE_PX} and encodes it as
 * WebP (JPEG where the browser cannot write WebP). The returned File keeps the ORIGINAL name: the name is the SKU.
 * The original stays in Drive, so nothing is lost by sending the smaller copy.
 *
 * @throws Error('UNREADABLE') when the browser cannot decode it, Error('TOO_LARGE') when it is still over 5 MB
 */
export async function resizeForUpload(file: File): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    // «from-image» applies the camera's rotation, so a portrait photo is not stored on its side.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error('UNREADABLE');
  }

  try {
    if (canSendAsIs(file.type, file.size, bitmap.width, bitmap.height)) {
      return file;
    }
    const size = fitWithin(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('UNREADABLE');
    }
    context.drawImage(bitmap, 0, 0, size.width, size.height);

    let blob = await toBlob(canvas, 'image/webp', 0.85);
    if (!blob || blob.type !== 'image/webp') {
      // This browser cannot write WebP: JPEG has no transparency, so paint white behind the picture first.
      context.globalCompositeOperation = 'destination-over';
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, size.width, size.height);
      blob = await toBlob(canvas, 'image/jpeg', 0.85);
    }
    if (!blob) {
      throw new Error('UNREADABLE');
    }
    if (blob.size > MAX_UPLOAD_BYTES) {
      throw new Error('TOO_LARGE');
    }
    return new File([blob], file.name, { type: blob.type });
  } finally {
    bitmap.close();
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}
