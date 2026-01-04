#!/usr/bin/env node
/*
  Audits UI source for Spanish text.
  Goal: help enforce an English-only UI after a recovery.

  Scope: app/ and components/ (TS/TSX/JS/JSX/MD/JSON).
  Output: prints file:line:snippet for probable Spanish strings.

  Notes:
  - This is a heuristic. It tries to avoid false positives (URLs, identifiers).
  - It flags common Spanish words and accented characters.
*/

import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
// UI-only scan roots. We intentionally exclude app/api (server routes) and lib/
// to keep this focused on end-user UI text.
const scanRoots = ['app', 'components', 'contexts', 'hooks'];
const includeExt = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.md', '.json']);

const argv = process.argv.slice(2);
const maxArg = argv.find((a) => a.startsWith('--max='));
const maxHits = maxArg ? Number(maxArg.split('=')[1]) : Infinity;

let stdoutClosed = false;

function safeWrite(text) {
  if (stdoutClosed) return;
  try {
    process.stdout.write(text);
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && err.code === 'EPIPE') {
      stdoutClosed = true;
      return;
    }
    throw err;
  }
}

const IGNORE_DIRS = new Set([
  'node_modules',
  '.next',
  '.git',
  'dist',
  'build',
  'coverage',
]);

const spanishWordPattern = new RegExp(
  String.raw`\b(` +
    [
      // common UI words
      'cargando',
      'guardar',
      'cancelar',
      'continuar',
      'volver',
      'cerrar',
      'abrir',
      'enviar',
      'editar',
      'eliminar',
      'borrar',
      'buscar',
      'seleccionar',
      'selecciona',
      'confirmar',
      'confirmación',
      'confirmacion',
      'aceptar',
      'rechazar',
      'mensaje',
      'mensajes',
      'notificación',
      'notificacion',
      'notificaciones',
      'reserva',
      'reservar',
      'cita',
      'citas',
      'horario',
      'horarios',
      'usuario',
      'usuarios',
      'contraseña',
      'contrasena',
      'iniciar',
      'sesión',
      'sesion',
      'registro',
      'perfil',
      'galería',
      'galeria',
      'reseña',
      'reseñas',
      'resena',
      'resenas',
      'servicio',
      'servicios',
      'barbero',
      'barberos',
      'cliente',
      // other specific words
      'por favor',
      'éxito',
      'exito',
      'bienvenido',
      'bienvenida',
      'aquí',
      'aqui',
    ].join('|') +
    String.raw`)\b`,
  'i'
);

const accentedPattern = /[áéíóúüñÁÉÍÓÚÜÑ]/;

function isTextLike(line) {
  // Ignore comment lines (including JSX comments) to keep this focused on user-visible UI text.
  if (/^\s*\/\//.test(line)) return false;
  if (/^\s*\/\*/.test(line)) return false;
  if (/^\s*\*\/?/.test(line)) return false;
  if (line.includes('{/*') || line.includes('*/}')) return false;

  // Ignore console logs/debugging noise.
  if (/^\s*console\.(log|info|debug|warn|error)\(/.test(line)) return false;

  // Skip import lines and pure identifiers where false positives are common.
  if (/^\s*(import|export)\b/.test(line)) return false;
  // Skip urls
  if (/https?:\/\//i.test(line)) return false;
  // Skip route-like string literals (common false positives when routes contain Spanish segments)
  // Examples: link: `/dashboard/barbero/resenas`, redirect('/notificaciones')
  if (/['"`]\/[A-Za-z0-9_\-./?=&:%]+['"`]/.test(line)) return false;
  // Skip route-like template literals that include ${...}
  // Example: window.location.href = `/reservar?${params.toString()}`
  if (
    /(href\s*=|router\.push\(|redirect\(|window\.location\.|window\.location\.href)/.test(line) &&
    /`\/[\s\S]*\$\{[\s\S]*`/.test(line)
  ) {
    return false;
  }
  // Ignore long alphanumeric hashes
  if (/\b[a-f0-9]{24,}\b/i.test(line)) return false;
  return true;
}

function walk(dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }

  for (const ent of entries) {
    if (ent.name.startsWith('.')) {
      if (ent.name !== '.well-known') continue;
    }

    const full = path.join(dir, ent.name);

    if (ent.isDirectory()) {
      // Exclude Next.js route handlers from this UI text audit
      if (ent.name === 'api' && path.basename(dir) === 'app') continue;
      if (IGNORE_DIRS.has(ent.name)) continue;
      walk(full, out);
      continue;
    }

    const ext = path.extname(ent.name);
    if (!includeExt.has(ext)) continue;

    // Ignore obvious backup/temporary files that are not part of the active UI.
    if (/backup/i.test(ent.name)) continue;
    if (/\.bak$/i.test(ent.name)) continue;

    out.push(full);
  }

  return out;
}

function toRel(p) {
  return path.relative(repoRoot, p);
}

const files = [];
for (const root of scanRoots) {
  files.push(...walk(path.join(repoRoot, root)));
}

let hitCount = 0;
let fileHitCount = 0;

for (const file of files) {
  let content;
  try {
    content = fs.readFileSync(file, 'utf8');
  } catch {
    continue;
  }

  const lines = content.split(/\r?\n/);
  let fileHasHits = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!isTextLike(line)) continue;

    // Strip inline comments to avoid flagging non-UI notes.
    const scanLine = line.replace(/\s\/\/.*$/, '');

    const hasSpanishWord = spanishWordPattern.test(scanLine);
    const hasAccents = accentedPattern.test(scanLine);

    if (!hasSpanishWord && !hasAccents) continue;

    // Try to avoid flagging known route segments like /resenas, /notificaciones in hrefs.
    if (/href=\{?['"`]\/(resenas|notificaciones|barberos|inicio|menu|perfil|reservar|registro|login)/i.test(scanLine)) {
      continue;
    }

    fileHasHits = true;
    hitCount++;

    if (hitCount > maxHits) {
      stdoutClosed = true;
      break;
    }

    const rel = toRel(file);
    const lineNo = i + 1;
    const snippet = line.trim().slice(0, 220);
    safeWrite(`${rel}:${lineNo}: ${snippet}\n`);
  }

  if (fileHasHits) fileHitCount++;

  if (stdoutClosed) break;
}

safeWrite(`\nScanned files: ${files.length}\n`);
safeWrite(`Files with hits: ${fileHitCount}\n`);
safeWrite(`Total hits: ${hitCount}\n`);

if (hitCount > 0) {
  process.exitCode = 2;
}
