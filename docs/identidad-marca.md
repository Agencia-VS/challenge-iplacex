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

## Fondo de PC de ejemplo y pieza móvil pendiente

Se incorporó la imagen de ejemplo para PC suministrada por el cliente el 9 de
octubre, `Gemini_Generated_Image_g023eqg023eqg023.jpg`, como
`public/brand/hero-desktop-example.jpg`. Se conservan los bytes originales:
2048 × 1012 px y aproximadamente 259 KiB. Next optimiza su entrega al navegador.
Es una referencia de composición, pendiente de la aprobación final de DAM.

Desde 1024 px se muestra la fotografía con encuadre centrado, persona a la derecha
y degradado azul oscuro sobre la zona del texto. En móvil y tablet se conserva el
degradado institucional; el navegador no descarga la foto horizontal para esas
pantallas. La pieza vertical se puede incorporar independientemente.

Entregables acordados:

| Pieza | Tamaño de origen | Composición |
| --- | --- | --- |
| PC | 2400 × 1200 px | Personas a la derecha, zona libre a la izquierda |
| Móvil | 1080 × 1600 px | Composición vertical, zona libre para título y botones |

Las imágenes deben llegar sin textos, botones o logos incrustados y con margen
alrededor de los rostros. Son tamaños de entrega, no alturas fijas del bloque.

Para reemplazar el ejemplo e incorporar la pieza móvil:

1. Optimizar y guardar las dos piezas aprobadas en `public/brand/`.
2. Actualizar `HERO_IMAGES` en `src/lib/brand.ts`, usando las dimensiones reales:

```ts
export const HERO_IMAGES: HeroImages | null = {
  desktop: { src: "/brand/hero-desktop.webp", width: 2400, height: 1200 },
  mobile: { src: "/brand/hero-mobile.webp", width: 1080, height: 1600 },
};
```

3. Revisar el encuadre y la legibilidad a 320, 390, 768, 1024 y 1440 px. Ajustar la
   posición del objeto o el degradado según las fotografías reales.

`HeroBackground` utiliza `picture` y `getImageProps` de Next. El navegador elige
la pieza móvil hasta 1023 px y la de PC desde 1024 px. Si se omite `mobile`, usa
un recurso transparente embebido sobre el degradado, sin una descarga adicional.
El ancho visible máximo
actual es 1176 px y la altura crece con el contenido, conservando texto y botones
como HTML accesible.
