import { NextResponse } from 'next/server';

const BUILD_TIME = new Date().toISOString();

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json(
    {
    buildTime: BUILD_TIME,
    swVersion: process.env.NEXT_PUBLIC_SW_VERSION || null,
    vercel: {
      gitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA || null,
      gitCommitRef: process.env.VERCEL_GIT_COMMIT_REF || null,
      gitCommitMessage: process.env.VERCEL_GIT_COMMIT_MESSAGE || null,
      deploymentId: process.env.VERCEL_DEPLOYMENT_ID || null,
      env: process.env.VERCEL_ENV || null,
      url: process.env.VERCEL_URL || null,
    },
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      },
    }
  );
}
