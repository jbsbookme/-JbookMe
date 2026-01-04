#!/bin/bash

# Lista de archivos a modificar
files=(
  "app/inicio/page.tsx"
  "app/galeria/page.tsx"
  "app/page.tsx"
  "app/perfil/page.tsx"
  "app/feed/page.tsx"
  "app/menu/page.tsx"
  "app/dashboard/cliente/page.tsx"
  "app/dashboard/cliente/publicar/page.tsx"
  "app/dashboard/cliente/resenas/[id]/page.tsx"
  "app/dashboard/admin/galeria/page.tsx"
  "app/dashboard/admin/servicios/page.tsx"
  "app/dashboard/barbero/page.tsx"
  "app/dashboard/barbero/perfil/page.tsx"
  "app/dashboard/barbero/servicios/page.tsx"
  "app/dashboard/barbero/publicar/page.tsx"
  "app/dashboard/barbero/posts/page.tsx"
  "app/reservar/page.tsx"
)

# Reemplazar en cada archivo
for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Procesando $file..."
    sed -i 's/useSession({ required: false })/useSession()/g' "$file"
  fi
done

echo "✅ Todos los archivos actualizados"
