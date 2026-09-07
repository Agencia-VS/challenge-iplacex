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

## Roles

| Rol | Qué hace |
|---|---|
| Postulante | Representante del equipo; crea y envía la postulación |
| Comité Técnico | Revisa admisibilidad, evalúa la preselección, reclasifica categorías |
| Jurado Evaluador | Evalúa el Demo Day |
| Comité Organizador | Configura fechas, publica resultados, gestiona notificaciones |

## Calendario

| Fecha | Hito |
|---|---|
| 14 sep | Apertura de postulaciones |
| 2 oct, 23:59 | Cierre automático |
| 9 oct | Notificación de preseleccionados |
| 12 oct – 6 nov | Bootcamp y mentorías (75% de asistencia mínima) |
| 6 nov | Notificación de finalistas |
| 12 nov | Demo Day y premiación |

Las fechas viven en la tabla `etapas`, no en el código: la organización se
reserva el derecho de moverlas.

## Dónde vive cada cosa

| Archivo | Qué define |
|---|---|
| `src/lib/rubrica.ts` | Categorías, criterios, escala y cálculo del puntaje |
| `src/lib/finalistas.ts` | Selección de los diez finalistas y desempate |
| `src/lib/admisibilidad.ts` | Validaciones duras: equipo, exclusiones, plazo |
| `src/lib/rut.ts` | RUT canónico y dígito verificador, base de la deduplicación |
| `src/lib/bootcamp.ts` | Asistencia y el mínimo del 75% |
| `src/lib/ods.ts` | Los 17 Objetivos de Desarrollo Sostenible |
| `src/lib/brand.ts` | Identidad de marca y paleta |
| `src/lib/site.ts` | Contenido público: cronograma y preguntas frecuentes |
| `src/lib/db/schema.ts` | Modelo de datos (Drizzle) |
| `drizzle/supabase-setup.sql` | DDL completo, políticas RLS y triggers |
| `drizzle/seed-challenge-iplacex-2026.sql` | Concurso, categorías y criterios |

Una persona no puede figurar en dos proyectos: lo hace cumplir la base con un
índice único sobre `(convocatoria_id, rut)` en `integrantes`, no solo la
validación del formulario.

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
- El temario y las fechas de las sesiones del bootcamp.
- Los campos de carga de archivos: las Bases no los definen, pese a que la
  Categoría 2 exige acreditar ventas y el Demo Day requiere material.
- Con qué herramienta se integra el control de plagio (máximo 30% de similitud).
- La etapa de "semifinal" que las Bases mencionan sin ubicarla en el calendario,
  y si el pitch se evalúa una o dos veces.
- La exportación y eliminación de datos personales que exige la Ley 19.628.
