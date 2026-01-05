import { NextResponse } from 'next/server';

const BUILD_TIME = new Date().toISOString();

export function GET() {
  return NextResponse.json({
    buildTime: BUILD_TIME,
    vercel: {
      gitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA || null,
      gitCommitRef: process.env.VERCEL_GIT_COMMIT_REF || null,
      gitCommitMessage: process.env.VERCEL_GIT_COMMIT_MESSAGE || null,
      deploymentId: process.env.VERCEL_DEPLOYMENT_ID || null,
      env: process.env.VERCEL_ENV || null,
      url: process.env.VERCEL_URL || null,
    },
  });
}
