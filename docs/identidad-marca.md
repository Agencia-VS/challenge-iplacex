# Identidad Iplacex 2026

Implementación basada en `Iplacex 2026_Lineamientos de marca 4.pdf` y la solicitud
de DAM del 9 de octubre de 2026.

## Tipografía y color

- Montserrat en títulos, textos, controles, tablas y cifras (pág. 10).
- Fondos y elementos principales: `#06092D`.
- Acciones y enlaces: `#000080`; interacción: `#06092D`.
- Ambos azules provienen de los colores secundarios de la pág. 9. DAM pidió
  priorizarlos sobre el azul brillante en la interfaz.
- Grises institucionales, con un gris de texto auxiliar más oscuro para que siga
  siendo legible. El color del logotipo original se conserva intacto.

## Archivos oficiales

`public/brand/iplacex-color.svg` conserva los 22 trazados vectoriales del logo de
la pág. 4 del manual, exportados sin reconstruir letras ni isotipo.
`iplacex-white.svg` utiliza exactamente la misma geometría en blanco, conforme
a la aplicación invertida de color único de la pág. 8. No depende de fuentes.

El componente presenta el arte a 160 px de ancho (mínimo del manual: 150 px),
con 18 px de espacio libre alrededor, equivalente a la letra e a ese tamaño.
La bajada enovus supera los 53 px indicados en la pág. 5.
El favicon y el ícono de Apple usan el isotipo de esos mismos trazados originales.

El ZIP entregado contiene un PNG llamado `Logo-Iplacex_full_blanco.png` que está
prácticamente en blanco y sin canal alfa; no se utiliza. Los sellos de acreditación
del ZIP y del PowerPoint no son el logo Iplacex y no se incorporan.

## Fondo pendiente de DAM

Hasta recibir las imágenes, se muestra un degradado de los azules institucionales
sin cuadrícula, fotografía de reemplazo ni solicitudes a archivos inexistentes.

Entregables acordados:

| Pieza | Tamaño de origen | Composición |
| --- | --- | --- |
| PC | 2400 × 1200 px | Personas a la derecha, zona libre a la izquierda |
| Móvil | 1080 × 1600 px | Composición vertical, zona libre para título y botones |

Las imágenes deben llegar sin textos, botones o logos incrustados y con margen
alrededor de los rostros. Son tamaños de entrega, no alturas fijas del bloque.

Para activarlas:

1. Optimizar y guardar las dos piezas aprobadas en `public/brand/`.
2. Reemplazar `HERO_IMAGES = null` en `src/lib/brand.ts` por:

```ts
export const HERO_IMAGES: HeroImages | null = {
  desktop: "/brand/hero-desktop.webp",
  mobile: "/brand/hero-mobile.webp",
};
```

3. Revisar el encuadre y la legibilidad a 320, 390, 768 y 1440 px. Ajustar la
   posición del objeto o el degradado según las fotografías reales.

`HeroBackground` utiliza `picture` y `getImageProps` de Next. El navegador elige
la pieza móvil hasta 767 px y la de PC desde 768 px. El ancho visible máximo
actual es 1176 px y la altura crece con el contenido, conservando texto y botones
como HTML accesible.
