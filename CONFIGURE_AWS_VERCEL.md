# Configurar Vercel Blob en Vercel para Upload de Imágenes

## 🚨 Problema Actual

El upload de imágenes no funciona en producción si no está configurado **Vercel Blob**.

## ✅ Solución: Configurar Vercel Blob

### Paso 1: Crear/Conectar un Blob Store

1. Ve a tu proyecto en Vercel
2. Abre **Storage** → **Blob**
3. Crea un **Blob Store** (o conecta uno existente)

### Paso 2: Configurar Variables de Entorno

1. Ve a tu proyecto en Vercel: https://vercel.com/jbsbookmes-projects/jbook-me-sg94
2. Click en "Settings"
3. Click en "Environment Variables" en el menú lateral
4. Agrega esta variable:

```
BLOB_READ_WRITE_TOKEN = tu_token_de_vercel_blob
```

Notas:
- En Vercel normalmente puedes crear el token desde el mismo panel de Blob.
- No expongas este token en el cliente; solo en server/runtime.

### Paso 3: Re-deploy

Después de agregar las variables:
1. Ve a "Deployments" en Vercel
2. Click en el último deployment
3. Click en los tres puntos "..."
4. Click en "Redeploy"

## 🧪 Probar el Upload

Después del redeploy, prueba:
- https://jbook-me-sg94.vercel.app/test-upload
- https://jbook-me-sg94.vercel.app/dashboard/barbero/publicar-simple

## 📝 Notas

- El proyecto está configurado para usar **Vercel Blob** únicamente.
- El token `BLOB_READ_WRITE_TOKEN` debe existir en Vercel para que los endpoints de upload funcionen.
