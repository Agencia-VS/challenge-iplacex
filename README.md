# Challenge IPLACEX 2026

Plataforma de postulación y evaluación del **Concurso de Emprendimiento e
Innovación** de Iplacex, organizado por la Dirección de Formación General.
Es el hito central de la Ruta Extracurricular de Emprendimiento e Innovación.

La plataforma es el **único canal válido de postulación** —las Bases no
admiten postulaciones por correo ni por ningún otro medio— y a la vez el
sistema con que se evalúa.

## Cómo se evalúa

Tres categorías, según la etapa en que está el proyecto:

| # | Categoría | A quién aplica |
|---|---|---|
| 1 | Idea en etapa temprana | Sin operación comercial: se evalúa la formulación |
| 2 | Emprendimiento en implementación | En operación, con evidencia verificable |
| 3 | Intraemprendimiento / innovación social | Mejora dentro de una organización o territorio |

Las tres comparten los mismos criterios y ponderaciones. Lo único que cambia
entre ellas son los descriptores de desempeño, que traducen cada criterio a la
evidencia exigible en esa etapa. Eso es lo que las hace comparables dentro de
un ranking único.

| Criterio | Peso |
|---|---|
| Problema y oportunidad | 20% |
| Propuesta de valor e innovación | 25% |
| Viabilidad | 25% |
| Impacto y sostenibilidad | 15% |
| Comunicación (pitch) | 15% |

Cada criterio se califica en cuatro niveles —Destacado 1,00 · Logrado 0,75 ·
En desarrollo 0,50 · Incipiente 0,25— y el puntaje es
`Σ [(nivel ÷ 4) × ponderación]`, en escala 0 a 100. El mínimo posible es 25 y
el mínimo para ser finalista, 60.

En la preselección no hay presentación oral: corren solo los cuatro primeros
criterios, que suman 85, y el resultado se normaliza a 100 para mantener la
comparabilidad con las etapas siguientes.

Al Demo Day pasan diez proyectos: los dos mejores de cada categoría, para
garantizar que las tres lleguen representadas, y cuatro más del ranking
general. Si una categoría no reúne dos proyectos sobre 60, sus cupos caen al
ranking general.

## Dónde vive cada cosa

| Archivo | Qué define |
|---|---|
| `src/lib/rubrica.ts` | Categorías, criterios, escala y cálculo del puntaje |
| `src/lib/finalistas.ts` | Selección de finalistas y desempate |
| `src/lib/brand.ts` | Identidad de marca y paleta |
| `src/lib/site.ts` | Contenido público: cronograma, cápsulas, preguntas frecuentes |
| `src/lib/db/schema.ts` | Modelo de datos (Drizzle) |
| `drizzle/supabase-setup.sql` | DDL completo, políticas RLS y triggers |
| `drizzle/seed-challenge-iplacex-2026.sql` | Convocatoria, categorías y criterios |

Los tokens de diseño se nombran por el rol que cumplen y no por su matiz, de
modo que la paleta se cambia editando los valores de `:root` en
`src/app/globals.css` sin tocar un solo componente.

## Desarrollo

```bash
npm install
cp env-example .env.local   # completar credenciales de Supabase
npm run dev
```

Verificación antes de un push:

```bash
npm run build   # incluye chequeo de TypeScript
npm run lint
```

## Base de datos

```bash
psql "$DATABASE_URL" -f drizzle/supabase-setup.sql
psql "$DATABASE_URL" -f drizzle/seed-challenge-iplacex-2026.sql
```

El seed es idempotente y verifica que las ponderaciones sumen 100; falla en
voz alta si no.

## Pendiente

- **Faltan los descriptores de desempeño de los niveles 3, 2 y 1.** El anexo de
  rúbricas recibido solo trae redactado el nivel 4: en las tres tablas, las
  columnas de los demás niveles vienen vacías. Mientras no lleguen, la interfaz
  muestra el significado genérico de la escala.
- El temario del bootcamp, los campos de carga de archivos, la herramienta de
  control de plagio y la etapa de "semifinal" que aparece en las Bases sin estar
  en el calendario.
