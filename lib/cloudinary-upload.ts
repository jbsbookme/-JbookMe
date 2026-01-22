export type CloudinaryResourceType = 'image' | 'video';

export type CloudinaryUploadResult = {
  secureUrl: string;
  publicId: string;
  resourceType: CloudinaryResourceType;
  bytes: number;
  format?: string;
  width?: number;
  height?: number;
  duration?: number;
};

const UPLOAD_PRESET = 'jbookme_posts';
const FOLDER = 'jbookme/posts';

function inferResourceType(file: File): CloudinaryResourceType | null {
  const type = String((file as any)?.type || '').toLowerCase();
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('video/')) return 'video';

  const name = String((file as any)?.name || '').toLowerCase();
  if (/(\.(jpg|jpeg|png|gif|webp|heic|heif))$/i.test(name)) return 'image';
  if (/(\.(mp4|mov|webm))$/i.test(name)) return 'video';

  return null;
}

function getCloudName(): string | null {
  const cloudName =
    (process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME as string | undefined) ||
    (process.env.CLOUDINARY_CLOUD_NAME as string | undefined);

  const trimmed = cloudName?.trim();
  return trimmed ? trimmed : null;
}

async function safeReadText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return '';
  }
}

function enhanceCloudinaryError(args: {
  status: number;
  statusText: string;
  resourceType: CloudinaryResourceType;
  rawBody: string;
}): string {
  const { status, statusText, resourceType, rawBody } = args;

  const raw = (rawBody || '').trim();
  const fallback = raw || statusText || 'Please try again.';

  if (status === 401 || status === 403) {
    // Common causes:
    // - Upload preset is not unsigned
    // - Upload preset name is wrong/missing
    // - Preset restrictions disallow video uploads
    const hint =
      `Cloudinary returned ${status} (${fallback}). ` +
      `Check Cloudinary upload preset "${UPLOAD_PRESET}": it must be UNSIGNED and allow ${resourceType} uploads ` +
      `(allowed formats: videos mp4/mov/webm).`;
    return hint;
  }

  return fallback;
}

export async function uploadToCloudinary(file: File): Promise<CloudinaryUploadResult> {
  const cloudName = getCloudName();
  if (!cloudName) {
    throw new Error(
      'Cloudinary is not configured. Missing NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME.'
    );
  }

  const resourceType = inferResourceType(file);
  if (!resourceType) {
    throw new Error('Unsupported media. Please select an image or video.');
  }

  const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(
    cloudName
  )}/${resourceType}/upload`;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', FOLDER);

  const res = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const raw = await safeReadText(res);
    let reason = raw;
    try {
      const parsed = raw ? JSON.parse(raw) : null;
      const message = parsed?.error?.message;
      if (typeof message === 'string' && message.trim()) {
        reason = message.trim();
      }
    } catch {
      // ignore
    }

    const enhanced = enhanceCloudinaryError({
      status: res.status,
      statusText: res.statusText,
      resourceType,
      rawBody: reason,
    });

    throw new Error(`Upload failed (${res.status}). ${enhanced}`);
  }

  const data = (await res.json()) as any;
  const secureUrl = String(data?.secure_url || '').trim();
  const publicId = String(data?.public_id || '').trim();

  if (!secureUrl || !publicId) {
    throw new Error('Upload failed: missing Cloudinary URL.');
  }

  return {
    secureUrl,
    publicId,
    resourceType,
    bytes: Number(data?.bytes || 0) || 0,
    format: typeof data?.format === 'string' ? data.format : undefined,
    width: typeof data?.width === 'number' ? data.width : undefined,
    height: typeof data?.height === 'number' ? data.height : undefined,
    duration: typeof data?.duration === 'number' ? data.duration : undefined,
  };
}
