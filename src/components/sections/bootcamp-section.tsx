import { Section } from "@/components/ui/section";
import { Card } from "@/components/ui/card";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { ASISTENCIA_MINIMA } from "@/lib/bootcamp";
import { sesionesBootcamp as sesionesFallback } from "@/lib/site";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigurado } from "@/lib/supabase/config";

type SesionDB = {
  id: number;
  numero: number;
  titulo: string;
  descripcion: string | null;
};

async function obtenerSesiones(): Promise<SesionDB[]> {
  // Sin base configurada se usa el temario por omisión: el sitio público es
  // contenido y no tiene por qué caerse si la base no está disponible.
  if (!supabaseConfigurado) return [];

  const cookieStore = await cookies();
  const supabase = createServerClient(
    SUPABASE_URL!,
    SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );

  const { data } = await supabase
    .from("sesiones_bootcamp")
    .select("id, numero, titulo, descripcion")
    .order("numero", { ascending: true });

  return (data ?? []) as SesionDB[];
}

export async function BootcampSection() {
  const data = await obtenerSesiones();

  const sesiones = data.length
    ? data.map((s) => ({
        numero: s.numero,
        titulo: s.titulo,
        resumen: s.descripcion ?? "",
      }))
    : sesionesFallback;

  return (
    <Section
      id="bootcamp"
      eyebrow="Formación"
      eyebrowTone="secondary"
      title="Bootcamp y mentorías"
      description={`Los proyectos preseleccionados entran a un bootcamp con acompañamiento. Las Bases exigen asistir al menos al ${ASISTENCIA_MINIMA}% de las sesiones para seguir en carrera.`}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sesiones.map((s) => (
          <Card key={s.numero} variant="neutral" className="flex flex-col gap-2 p-6">
            <span className="brand-display text-[36px] leading-none text-brand-secondary-light">
              {String(s.numero).padStart(2, "0")}
            </span>
            <h3 className="text-[15px] font-semibold text-brand-primary">{s.titulo}</h3>
            <p className="text-[13px] leading-relaxed text-brand-ink-soft">{s.resumen}</p>
          </Card>
        ))}
      </div>
    </Section>
  );
}
