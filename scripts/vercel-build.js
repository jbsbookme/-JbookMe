const { spawnSync } = require('node:child_process');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runCapture(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, {
    env: process.env,
    encoding: 'utf8',
    ...opts,
  });

  if (res.stdout) process.stdout.write(res.stdout);
  if (res.stderr) process.stderr.write(res.stderr);

  return res;
}

async function migrateDeployWithRetry() {
  const attempts = 5;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const res = runCapture('prisma', ['migrate', 'deploy']);
    if (res.status === 0) return;

    const combined = `${res.stdout || ''}\n${res.stderr || ''}`;
    const isAdvisoryLockTimeout =
      combined.includes('P1002') &&
      combined.toLowerCase().includes('advisory lock') &&
      combined.toLowerCase().includes('timed out');

    if (!isAdvisoryLockTimeout) {
      process.exit(res.status || 1);
    }

    if (attempt === attempts) {
      console.warn(
        '\n[vercel-build] prisma migrate deploy timed out acquiring advisory lock. Continuing build because database is likely already migrated.\n'
      );
      return;
    }

    const backoffMs = 2000 * attempt;
    console.warn(
      `\n[vercel-build] prisma migrate deploy advisory-lock timeout (attempt ${attempt}/${attempts}). Retrying in ${backoffMs}ms...\n`
    );
    await sleep(backoffMs);
  }
}

async function main() {
  await migrateDeployWithRetry();

  const gen = runCapture('prisma', ['generate']);
  if (gen.status !== 0) process.exit(gen.status || 1);

  const build = runCapture('next', ['build']);
  if (build.status !== 0) process.exit(build.status || 1);
}

main().catch((err) => {
  console.error('[vercel-build] Fatal error:', err);
  process.exit(1);
});
