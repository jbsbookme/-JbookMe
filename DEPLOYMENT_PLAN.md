# 🚀 Plan de Deployment - Sistema de Comentarios y SocialBar

**Fecha:** 7 de enero de 2026  
**Deploy en proceso:** https://jbook-me-sg94.vercel.app

---

## 🎯 OBJETIVO

Implementar 5 mejoras tipo Instagram/TikTok en el sistema de posts:

- ✅ **Comentarios** (Backend completado - Falta integración UI)
- ⏳ **Guardar/Favoritos** (Pendiente)
- ⏳ **Compartir Posts** (Pendiente)
- ⏳ **Hashtags Clickeables** (Pendiente)
- ⏳ **Múltiples Imágenes** (Pendiente)

---

## ✅ CAMBIOS YA IMPLEMENTADOS

### Commit 1: API de Comentarios
- **SHA:** d1e0703
- **Archivo creado:** `app/api/posts/[postId]/comments/route.ts`
- **❌ Problema:** Usa `[postId]` pero el código existente usa `[id]` → Causa conflicto de rutas en Next.js

**Error en Vercel:**
```
Error: You cannot use different slug names for the same dynamic path ('id' !== 'postId')
```

### Commit 2: Social Media Bar
- **SHA:** 402de37
- **Archivo creado:** `components/layout/social-bar.tsx`
- **❌ Problema:** Componente creado pero NO agregado al `app/layout.tsx` → No se muestra en la app

**Features:**
- Barra sticky debajo del header
- Iconos animados con hover effects
- Fetch URLs desde `/api/settings`
- Responsive

---

## 🔧 CAMBIOS NECESARIOS PARA PRODUCCIÓN

### TAREA 1: Arreglar conflicto de rutas de comentarios

#### Problema:
Next.js no permite mezclar `[id]` y `[postId]` en la misma estructura de rutas.

#### Solución:

**1.1 Eliminar carpeta incorrecta:**
```bash
rm -rf app/api/posts/[postId]
```

**1.2 Crear estructura correcta:**

**Archivo:** `app/api/posts/[id]/comments/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';

// GET: Fetch comments with pagination
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const post = await prisma.post.findUnique({
      where: { id },
    });

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    const [comments, totalCount] = await Promise.all([
      prisma.comment.findMany({
        where: { 
          postId: id,
          parentId: null // Solo comentarios principales
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              image: true,
              role: true,
            },
          },
          replies: {
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                  role: true,
                },
              },
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.comment.count({
        where: { 
          postId: id,
          parentId: null
        },
      }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      success: true,
      data: {
        comments,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          limit,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

// POST: Create new comment or reply
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = params;
    const body = await request.json();
    const { content, parentId } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Comment content is required' },
        { status: 400 }
      );
    }

    if (content.length > 1000) {
      return NextResponse.json(
        { error: 'Comment must be less than 1000 characters' },
        { status: 400 }
      );
    }

    const post = await prisma.post.findUnique({
      where: { id },
    });

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    if (parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId },
      });

      if (!parentComment || parentComment.postId !== id) {
        return NextResponse.json(
          { error: 'Parent comment not found' },
          { status: 404 }
        );
      }
    }

    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        postId: id,
        authorId: session.user.id,
        parentId: parentId || null,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: comment,
        message: 'Comment created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}
```

**Archivo:** `app/api/posts/[id]/comments/[commentId]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';

// DELETE: Delete comment (only author or admin)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; commentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { commentId } = params;

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }

    const isAuthor = comment.authorId === session.user.id;
    const isAdmin = session.user.role === 'ADMIN';

    if (!isAuthor && !isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden. You can only delete your own comments.' },
        { status: 403 }
      );
    }

    await prisma.comment.delete({
      where: { id: commentId },
    });

    return NextResponse.json({
      success: true,
      message: 'Comment deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json(
      { error: 'Failed to delete comment' },
      { status: 500 }
    );
  }
}
```

---

### TAREA 2: Crear componente UI de comentarios

**Archivo:** `components/posts/comment-section.tsx`

> **Nota:** Este es un componente completo con:
> - Listado de comentarios con paginación
> - Formulario para agregar comentarios
> - Sistema de respuestas (replies)
> - Eliminación de comentarios (solo autor/admin)
> - Diseño responsive y animado

**Ver código completo en el archivo del proyecto**

---

### TAREA 3: Integrar comentarios en el Feed

**Archivo a modificar:** `app/feed/page.tsx`

**Agregar import:**
```typescript
import { CommentSection } from '@/components/posts/comment-section';
```

**Agregar en cada post card:**
```typescript
{/* Después de la sección de likes */}
<CommentSection 
  postId={post.id} 
  initialCommentCount={post._count?.comments || 0}
/>
```

---

### TAREA 4: Agregar SocialBar al layout

**Archivo a modificar:** `app/layout.tsx`

**Línea 12 - Agregar import:**
```typescript
import SocialBar from '@/components/layout/social-bar';
```

**Línea ~91 - Agregar después de TopMenuHeader:**
```typescript
<TopMenuHeader />
<SocialBar />  {/* ← AGREGAR ESTA LÍNEA */}
{children}
```

---

## 📦 DEPENDENCIAS NECESARIAS

Verificar instalación:
```bash
npm list date-fns
npm list framer-motion
```

Si faltan, instalar:
```bash
npm install date-fns framer-motion
```

---

## 🗂️ ESTRUCTURA FINAL DE ARCHIVOS

```
app/
├── api/
│   └── posts/
│       ├── [id]/
│       │   ├── route.ts (existente)
│       │   ├── comments/
│       │   │   ├── route.ts ← NUEVO (GET/POST)
│       │   │   └── [commentId]/
│       │   │       └── route.ts ← NUEVO (DELETE)
│       │   ├── like/
│       │   └── save/
│       └── route.ts
├── feed/
│   └── page.tsx ← MODIFICAR (agregar CommentSection)
└── layout.tsx ← MODIFICAR (agregar SocialBar)

components/
├── layout/
│   └── social-bar.tsx ✅ (ya existe)
└── posts/
    └── comment-section.tsx ← NUEVO
```

---

## 🚀 PROCESO DE DEPLOYMENT

```bash
# 1. Crear todos los archivos mencionados arriba

# 2. Verificar que compile
npm run build

# 3. Si hay errores, revisar imports y tipos

# 4. Commit
git add .
git commit -m "feat: Add comments system and integrate SocialBar

- Add comments API with GET/POST/DELETE endpoints
- Create CommentSection component with replies support
- Integrate comments in feed
- Add SocialBar to layout
- Fix route naming conflict (postId → id)"

# 5. Push
git push origin main

# 6. Vercel desplegará automáticamente
```

---

## ✅ CHECKLIST DE VERIFICACIÓN

Después del deploy, verificar:

- [ ] `/feed` muestra botón "Ver comentarios"
- [ ] Click en comentarios muestra el componente
- [ ] Usuarios logueados pueden comentar
- [ ] Comentarios se guardan y muestran correctamente
- [ ] Botón eliminar solo visible para autor/admin
- [ ] SocialBar visible debajo del header
- [ ] Iconos de redes sociales funcionan
- [ ] No hay errores en consola del navegador
- [ ] Build exitoso en Vercel

---

## 🐛 PROBLEMAS CONOCIDOS

1. **Conflicto de rutas:** Si persiste error de `[id]` vs `[postId]`, asegurar que NO exista carpeta `app/api/posts/[postId]`

2. **SocialBar no visible:** Verificar que las URLs estén configuradas en `/api/settings`

3. **Comentarios no cargan:** Verificar que el modelo `Comment` en Prisma tenga:
   - Campo `parentId` (nullable) para replies
   - Relación con `Post` y `User`

---

## 📝 NOTAS ADICIONALES

- El sistema de comentarios soporta hilos de respuestas (replies)
- Límite de 1000 caracteres por comentario
- Paginación configurada en 20 comentarios por página
- Los comentarios se ordenan por fecha descendente (más recientes primero)
- Las respuestas se ordenan por fecha ascendente (más antiguas primero)

---

## 🎯 PRÓXIMOS PASOS (DESPUÉS DE ESTE DEPLOY)

1. **Guardar/Favoritos** - Permitir guardar posts
2. **Compartir** - Botón de compartir con Web Share API
3. **Hashtags Clickeables** - Parser y página de exploración
4. **Múltiples Imágenes** - Carrusel de imágenes

---

## 📊 ESTADO ACTUAL DEL DEPLOY

- ✅ Build local exitoso
- ✅ Archivos de comentarios creados
- ✅ `.vercelignore` configurado
- 🔄 Deploy en progreso a Vercel
- ⏳ Esperando verificación en producción

**URL de producción:** https://jbook-me-sg94.vercel.app  
**Panel de Vercel:** https://vercel.com/jbsbookmes-projects/jbook-me-sg94

---

**Última actualización:** 7 de enero de 2026, 7:30 PM
