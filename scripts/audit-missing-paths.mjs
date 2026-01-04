import fs from 'node:fs/promises';
import path from 'node:path';

const PROJECT_ROOT = process.cwd();
const APP_DIR = path.join(PROJECT_ROOT, 'app');
const COMPONENTS_DIR = path.join(PROJECT_ROOT, 'components');
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');

const PAGE_FILE_RE = /^page\.(tsx|ts|jsx|js)$/;
const API_ROUTE_FILE_RE = /^route\.(tsx|ts|jsx|js)$/;

function isGroupSegment(seg) {
  return seg.startsWith('(') && seg.endsWith(')');
}

function isParallelSegment(seg) {
  return seg.startsWith('@');
}

function isInterceptSegment(seg) {
  return seg.startsWith('(') && seg.includes(')');
}

function normalizeUrlPath(p) {
  if (!p) return '';
  const noHash = p.split('#')[0];
  const noQuery = noHash.split('?')[0];
  if (!noQuery.startsWith('/')) return '';
  // remove trailing slash (except root)
  if (noQuery.length > 1 && noQuery.endsWith('/')) return noQuery.slice(0, -1);
  return noQuery;
}

function isLikelyStaticAsset(urlPath) {
  // Anything that ends in a common file extension should not be treated as a Next.js page route.
  return /\.(png|jpg|jpeg|gif|webp|svg|ico|mp4|webm|pdf|txt|xml|json)$/i.test(urlPath);
}

async function existsInPublic(urlPath) {
  // Map /foo/bar.png -> <root>/public/foo/bar.png
  if (!urlPath.startsWith('/')) return false;
  const diskPath = path.join(PUBLIC_DIR, urlPath.slice(1));
  try {
    const stat = await fs.stat(diskPath);
    return stat.isFile();
  } catch {
    return false;
  }
}

async function walkFiles(startDir) {
  /** @type {string[]} */
  const out = [];
  /** @type {string[]} */
  const stack = [startDir];

  while (stack.length) {
    const current = stack.pop();
    if (!current) continue;

    let entries;
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (
          entry.name === 'node_modules' ||
          entry.name === '.next' ||
          entry.name === '.build' ||
          entry.name === 'dist' ||
          entry.name === '.git'
        ) {
          continue;
        }
        stack.push(full);
      } else if (entry.isFile()) {
        out.push(full);
      }
    }
  }

  return out;
}

function routeRegexFromSegments(segments) {
  // segments are url segments (no groups). dynamic segments like [id] become wildcard.
  const parts = segments.map((seg) => {
    if (seg.startsWith('[') && seg.endsWith(']')) {
      return '[^/]+';
    }
    // escape regex specials
    return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  });
  const re = new RegExp('^/' + parts.join('/') + '$');
  return re;
}

async function getExistingPageRoutes() {
  const files = await walkFiles(APP_DIR);

  /** @type {{ route: string, re: RegExp, file: string }[]} */
  const routes = [];

  for (const file of files) {
    const base = path.basename(file);
    if (!PAGE_FILE_RE.test(base)) continue;

    const relDir = path.relative(APP_DIR, path.dirname(file));
    const dirParts = relDir === '' ? [] : relDir.split(path.sep);

    // skip API subtree
    if (dirParts[0] === 'api') continue;

    const urlParts = [];
    for (const seg of dirParts) {
      if (!seg) continue;
      if (isGroupSegment(seg)) continue;
      if (isParallelSegment(seg)) continue;
      if (isInterceptSegment(seg)) continue;
      urlParts.push(seg);
    }

    const route = '/' + urlParts.join('/');
    const normalized = route === '/' ? '/' : route.replace(/\/$/, '');
    routes.push({
      route: normalized,
      re: routeRegexFromSegments(urlParts),
      file,
    });
  }

  return routes;
}

async function getExistingApiRoutes() {
  const apiDir = path.join(APP_DIR, 'api');
  const files = await walkFiles(apiDir);

  /** @type {{ route: string, file: string }[]} */
  const routes = [];

  for (const file of files) {
    const base = path.basename(file);
    if (!API_ROUTE_FILE_RE.test(base)) continue;

    const relDir = path.relative(apiDir, path.dirname(file));
    const dirParts = relDir === '' ? [] : relDir.split(path.sep);

    const url = '/api' + (dirParts.length ? '/' + dirParts.join('/') : '');
    routes.push({ route: normalizeUrlPath(url), file });
  }

  return routes;
}

function extractPathsFromText(text) {
  /** @type {Set<string>} */
  const pageRefs = new Set();
  /** @type {Set<string>} */
  const apiRefs = new Set();

  const patterns = [
    /href\s*=\s*["'](\/[^"']+)["']/g,
    /router\.(?:push|replace)\(\s*["'](\/[^"']+)["']/g,
    /fetch\(\s*["'](\/api\/[^"']+)["']/g,
    /axios\.(?:get|post|put|patch|delete)\(\s*["'](\/api\/[^"']+)["']/g,
  ];

  for (const re of patterns) {
    let m;
    while ((m = re.exec(text)) !== null) {
      const raw = m[1];
      const clean = normalizeUrlPath(raw);
      if (!clean) continue;
      if (clean.startsWith('/api/')) apiRefs.add(clean);
      else pageRefs.add(clean);
    }
  }

  return { pageRefs, apiRefs };
}

async function main() {
  const [pageRoutes, apiRoutes] = await Promise.all([
    getExistingPageRoutes(),
    getExistingApiRoutes(),
  ]);

  const apiRouteSet = new Set(apiRoutes.map((r) => r.route));

  /** @type {Set<string>} */
  const referencedPages = new Set();
  /** @type {Set<string>} */
  const referencedApis = new Set();

  const sourcesToScan = [APP_DIR, COMPONENTS_DIR];
  for (const dir of sourcesToScan) {
    const files = await walkFiles(dir);
    for (const file of files) {
      if (!/\.(tsx|ts|jsx|js)$/.test(file)) continue;
      if (file.includes(`${path.sep}.build${path.sep}`)) continue;
      if (file.includes(`${path.sep}.next${path.sep}`)) continue;

      let text;
      try {
        text = await fs.readFile(file, 'utf8');
      } catch {
        continue;
      }

      const { pageRefs, apiRefs } = extractPathsFromText(text);
      for (const p of pageRefs) referencedPages.add(p);
      for (const a of apiRefs) referencedApis.add(a);
    }
  }

  const isExistingPage = (url) => {
    for (const r of pageRoutes) {
      if (r.re.test(url)) return true;
    }
    return false;
  };

  const missingPages = [...referencedPages]
    .filter((p) => !isExistingPage(p))
    .sort();

  const missingApis = [...referencedApis]
    .filter((p) => !apiRouteSet.has(p))
    .sort();

  console.log('--- Route audit ---');
  console.log(`Existing pages: ${pageRoutes.length}`);
  console.log(`Existing API routes: ${apiRoutes.length}`);
  console.log(`Referenced pages: ${referencedPages.size}`);
  console.log(`Referenced APIs: ${referencedApis.size}`);
  console.log('');

  // Filter out obvious static assets (icons/splash/etc.) from "missing pages"
  /** @type {string[]} */
  const missingPagesFiltered = [];
  for (const p of missingPages) {
    if (isLikelyStaticAsset(p)) {
      // If it exists in public, definitely ignore. If not, still ignore as it's not a page route.
      // (Missing assets can be audited separately if needed.)
      // eslint-disable-next-line no-await-in-loop
      const exists = await existsInPublic(p);
      if (exists) continue;
      continue;
    }
    missingPagesFiltered.push(p);
  }

  if (missingPagesFiltered.length === 0) {
    console.log('✅ No missing page routes detected (from simple string refs).');
  } else {
    console.log('❌ Missing page routes (referenced but not found):');
    for (const p of missingPagesFiltered) console.log(`- ${p}`);
  }

  console.log('');

  if (missingApis.length === 0) {
    console.log('✅ No missing API routes detected (from simple string refs).');
  } else {
    console.log('❌ Missing API routes (referenced but not found):');
    for (const p of missingApis) console.log(`- ${p}`);
  }
}

await main();
