# Configurar AWS S3 en Vercel para Upload de Imágenes

## 🚨 Problema Actual

El upload de imágenes no funciona en producción porque faltan las credenciales de AWS S3.

## ✅ Solución: Configurar Variables de Entorno en Vercel

### Paso 1: Obtener Credenciales de AWS

1. Ve a AWS Console: https://console.aws.amazon.com/
2. Busca "IAM" en la barra de búsqueda
3. Click en "Users" → Selecciona tu usuario (o crea uno nuevo)
4. Click en "Security credentials"
5. Scroll a "Access keys" y click en "Create access key"
6. Selecciona "Application running outside AWS"
7. Copia el **Access key ID** y **Secret access key**

### Paso 2: Configurar en Vercel

1. Ve a tu proyecto en Vercel: https://vercel.com/jbsbookmes-projects/jbook-me-sg94
2. Click en "Settings"
3. Click en "Environment Variables" en el menú lateral
4. Agrega estas variables:

```
AWS_ACCESS_KEY_ID = tu_access_key_aqui
AWS_SECRET_ACCESS_KEY = tu_secret_key_aqui
AWS_BUCKET_NAME = jsbookme-media
AWS_REGION = us-west-2
NEXT_PUBLIC_AWS_BUCKET_NAME = jsbookme-media
NEXT_PUBLIC_AWS_REGION = us-west-2
```

### Paso 3: Verificar el Bucket S3

1. Ve a S3 en AWS Console
2. Busca el bucket: `jsbookme-media`
3. Click en "Permissions"
4. Asegúrate que tiene CORS configurado:

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
        "AllowedOrigins": ["*"],
        "ExposeHeaders": ["ETag"]
    }
]
```

5. Asegúrate que el bucket tiene permisos públicos de lectura (solo lectura, no escritura)

### Paso 4: Re-deploy

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

- Las credenciales AWS NUNCA deben estar en el código
- Solo se configuran como variables de entorno en Vercel
- El bucket debe existir y tener los permisos correctos
- CORS debe estar configurado para permitir uploads desde tu dominio
