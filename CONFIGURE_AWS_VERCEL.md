# Deploy en Vercel (Cloudinary-only para Posts)

## ✅ Estado actual

- Para **Posts** (fotos/videos): el sistema es **Cloudinary-only**.
- El endpoint de token de Vercel Blob está **deshabilitado intencionalmente** y devuelve **410**:
	- `GET/POST /api/blob/upload` → `code: VERCEL_BLOB_DISABLED`

Esto evita que clientes viejos intenten subir a Blob por error.

## 🔧 Variables de entorno mínimas (Vercel)

En tu proyecto en Vercel → **Settings → Environment Variables**:

- `DATABASE_URL`
- `NEXTAUTH_URL` (ej: `https://www.jbsbookme.com`)
- `NEXTAUTH_SECRET`
- `NEXT_PUBLIC_APP_URL` (recomendado: `https://www.jbsbookme.com`)
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`

## 🧪 Verificación post-deploy (rápida)

- `GET /api/version` debe mostrar `buildTime` actualizado.
- `GET /api/blob/upload` debe devolver 410 (confirmación de backend nuevo).

## Cloudinary (requisito para que funcione el upload)

En Cloudinary crea/valida el preset `jbookme_posts`:

- Debe ser **UNSIGNED**
- Debe permitir **video** y formatos `mp4/mov/webm`
