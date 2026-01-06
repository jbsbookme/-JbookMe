import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createS3Client, getBucketConfig } from '@/lib/aws-config';
import { isBarberOrStylist } from '@/lib/auth/role-utils';

export const dynamic = 'force-dynamic';

const extractRegionFromBucket = (name: string): string => {
  const regionMatch = name.match(
    /(us|eu|ap|sa|ca|me|af)-(north|south|east|west|central|southeast|northeast)-\d+/
  );
  return regionMatch ? regionMatch[0] : 'us-east-1';
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null) as null | {
      fileName?: string;
      fileType?: string;
      fileSize?: number;
    };

    const fileName = body?.fileName || '';
    const fileType = body?.fileType || '';
    const fileSize = typeof body?.fileSize === 'number' ? body?.fileSize : null;

    if (!fileName || !fileType) {
      return NextResponse.json(
        { error: 'fileName and fileType are required', code: 'PRESIGN_BAD_REQUEST' },
        { status: 400 }
      );
    }

    if (!fileType.startsWith('image/') && !fileType.startsWith('video/')) {
      return NextResponse.json(
        { error: 'Only images and videos are allowed', code: 'PRESIGN_UNSUPPORTED_TYPE' },
        { status: 400 }
      );
    }

    // Keep parity with existing UX limits.
    if (fileSize != null && fileSize > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File is too large (max 50MB)', code: 'PRESIGN_FILE_TOO_LARGE' },
        { status: 400 }
      );
    }

    // Validate storage configuration early so production failures are obvious.
    let bucketName: string;
    let folderPrefix: string;
    try {
      ({ bucketName, folderPrefix } = getBucketConfig());
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json(
        {
          error: msg,
          code: 'PRESIGN_MISSING_ENV',
          required: ['AWS_BUCKET_NAME (or NEXT_PUBLIC_AWS_BUCKET_NAME)', 'AWS_REGION (or NEXT_PUBLIC_AWS_REGION)'],
        },
        { status: 500 }
      );
    }

    // Ensure region is set for AWS SDK (required for signing).
    if (!process.env.AWS_REGION && !process.env.AWS_DEFAULT_REGION && !process.env.NEXT_PUBLIC_AWS_REGION) {
      process.env.AWS_REGION = extractRegionFromBucket(bucketName);
    }

    let s3Client;
    try {
      s3Client = createS3Client();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json(
        {
          error: msg,
          code: 'PRESIGN_MISSING_ENV',
          required: ['AWS_REGION (or AWS_DEFAULT_REGION or NEXT_PUBLIC_AWS_REGION)'],
        },
        { status: 500 }
      );
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    const postTypeFolder = isBarberOrStylist(session.user.role) ? 'barber_work' : 'client_share';

    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const relativeKey = `posts/${year}/${month}/${postTypeFolder}/${Date.now()}-${sanitizedFileName}`;
    const key = `${folderPrefix}public/uploads/${relativeKey}`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: fileType,
    });

    // Short expiry: client uploads immediately.
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 });

    const region =
      process.env.AWS_REGION ||
      process.env.AWS_DEFAULT_REGION ||
      process.env.NEXT_PUBLIC_AWS_REGION ||
      extractRegionFromBucket(bucketName);

    const publicUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;

    return NextResponse.json({
      uploadUrl,
      cloud_storage_path: key,
      publicUrl,
    });
  } catch (error) {
    console.error('[POST /api/posts/presign] Error:', error);

    const message = error instanceof Error ? error.message : String(error);
    if (/credentials|CredentialProviderError|Missing credentials/i.test(message)) {
      return NextResponse.json(
        {
          error: 'AWS credentials are not configured in this environment',
          code: 'PRESIGN_MISSING_AWS_CREDENTIALS',
          required: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION', 'AWS_BUCKET_NAME'],
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create upload URL', code: 'PRESIGN_FAILED' },
      { status: 500 }
    );
  }
}
