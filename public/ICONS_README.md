# BookMe - Iconos y Logo

## Archivos de Iconos

Este directorio contiene todos los iconos necesarios para la aplicación web y PWA de BookMe.

### Logo Principal
- **logo.png** (512x512) - Logo principal utilizado en toda la aplicación

### Favicon
- **favicon.png** (48x48) - Icono del navegador

### Iconos PWA (Progressive Web App)
Estos iconos se utilizan cuando la aplicación se instala como PWA en dispositivos móviles:

- **icon-48.png** (48x48) - Para navegadores y sistemas antiguos
- **icon-72.png** (72x72) - Para dispositivos de baja resolución
- **icon-96.png** (96x96) - Para pantallas estándar
- **icon-128.png** (128x128) - Para pantallas HD
- **icon-144.png** (144x144) - Para tabletas y dispositivos medianos
- **icon-192.png** (192x192) - Tamaño estándar PWA (requerido)
- **icon-256.png** (256x256) - Para pantallas de alta resolución
- **icon-384.png** (384x384) - Para pantallas grandes
- **icon-512.png** (512x512) - Tamaño máximo PWA (requerido)

### Iconos iOS (Apple)
Los siguientes iconos se utilizan para dispositivos iOS cuando la app se agrega a la pantalla de inicio:

- **icon-192.png** - Apple Touch Icon principal
- **icon-256.png** - Para iPad y dispositivos más grandes
- **icon-512.png** - Para pantallas Retina de alta resolución

## Diseño del Logo

El logo de BookMe presenta:
- **Texto estilizado**: "BookMe" en tipografía vintage
- **Color principal**: Cyan/turquesa (#00f0ff) que coincide con el tema de la aplicación
- **Elemento de barbería**: Navaja de afeitar estilizada
- **Forma**: Circular con el diseño centrado

## Uso en la Aplicación

Los iconos están configurados en:
1. **manifest.json** - Para PWA y instalación en móviles
2. **app/layout.tsx** - Meta tags para navegadores e iOS
3. **<head>** - Links directos a favicon y apple-touch-icon

## Splash Screens iOS

Pantallas de carga para dispositivos Apple cuando la PWA se lanza en modo standalone:

- **splash-640x1136.png** (640x1136) - iPhone SE, 5s
- **splash-750x1334.png** (750x1334) - iPhone 6/7/8
- **splash-1125x2436.png** (1125x2436) - iPhone X/XS/11 Pro
- **splash-1242x2688.png** (1242x2688) - iPhone XS Max/11 Pro Max
- **splash-1536x2048.png** (1536x2048) - iPad Pro 10.5"
- **splash-2048x2732.png** (2048x2732) - iPad Pro 12.9"

### Características de los Splash Screens:
- Fondo negro con logo BookMe centrado
- Efecto glow neón cyan (#00f0ff)
- Diseño minimalista y profesional
- Optimizado para cada resolución específica

## Colores del Tema

La aplicación utiliza la siguiente paleta de colores:
- **Cyan Neón**: #00f0ff (color principal, efectos de brillo)
- **Dorado**: #ffd700 (acentos y hover effects)
- **Negro**: #000000 (fondo principal)
- **Gris Oscuro**: Variantes de zinc/gray para elementos secundarios
