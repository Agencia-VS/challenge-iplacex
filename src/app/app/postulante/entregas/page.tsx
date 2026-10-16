import type { Metadata } from "next";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { roleHomePath } from "@/lib/roles";
import { entregasHabilitadas } from "@/lib/entregas";
import { firmarArchivos } from "@/app/actions/entregas";
import { EntregaForm, type EntregaArchivo } from "@/components/app/entrega-form";
import { RefreshWhileVisible } from "@/components/app/refresh-while-visible";

export const metadata: Metadata = { title: "Entregas" };
export const dynamic = "force-dynamic";

type EntregaRow = {
  id: string;
  etapa_id: number;
  video_url: string | null;
  contexto: string | null;
  estado: string | null;
};
type ArchivoRow = { id: string; nombre: string; url: string; entrega_id: string | null };

export default async function EntregasPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("usuarios").select("rol").eq("id", user.id).single();
  if (perfil?.rol && perfil.rol !== "postulante") redirect(roleHomePath(perfil.rol));

  // Resolver el mismo proyecto que «Mi postulación», aunque pertenezca a una
  // convocatoria cerrada o anterior a la más reciente.
  const { data: proyecto } = await supabase
    .from("proyectos")
    .select("id, convocatoria_id, estado_postulacion, created_at")
    .eq("postulante_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: etapasDB } = proyecto
    ? await supabase
        .from("etapas")
        .select("id, numero, nombre, tipo")
        .eq("convocatoria_id", proyecto.convocatoria_id)
        .order("numero", { ascending: true })
    : { data: [] };

  const habilitadas = entregasHabilitadas(proyecto?.estado_postulacion, etapasDB);

  // Cargar entregas + archivos del proyecto (solo si hay proyecto)
  let entregasPorEtapa: Record<number, EntregaRow> = {};
  const archivosPorEntrega: Record<string, EntregaArchivo[]> = {};
  if (proyecto) {
    const { data: entregas } = await supabase
      .from("entregas")
      .select("id, etapa_id, video_url, contexto, estado")
      .eq("proyecto_id", proyecto.id);
    entregasPorEtapa = Object.fromEntries(
      ((entregas ?? []) as EntregaRow[]).map((e) => [e.etapa_id, e]),
    );

    const { data: archivos } = await supabase
      .from("archivos")
      .select("id, nombre, url, entrega_id")
      .eq("proyecto_id", proyecto.id)
      .not("entrega_id", "is", null);
    const rows = (archivos ?? []) as ArchivoRow[];
    const pathsPorEntrega = new Map<string, string[]>();
    for (const row of rows) {
      if (!row.entrega_id) continue;
      const paths = pathsPorEntrega.get(row.entrega_id) ?? [];
      paths.push(row.url);
      pathsPorEntrega.set(row.entrega_id, paths);
    }
    const resultadosFirmados = await Promise.all(
      [...pathsPorEntrega.entries()].map(([entregaId, paths]) =>
        firmarArchivos(entregaId, paths)
      ),
    );
    const firmadas: Record<string, string> = {};
    resultadosFirmados.forEach((resultado) => Object.assign(firmadas, resultado));

    for (const row of rows) {
      if (!row.entrega_id) continue;
      (archivosPorEntrega[row.entrega_id] ??= []).push({
        id: row.id,
        nombre: row.nombre,
        url: firmadas[row.url] ?? "",
      });
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-20">
      <RefreshWhileVisible />
      <header>
        <p className="brand-eyebrow text-brand-accent">Mi proceso</p>
        <h1 className="brand-display mt-1.5 text-[36px] leading-tight text-brand-primary md:text-[44px]">
          Entregas por etapa
        </h1>
        <p className="mt-2 max-w-xl text-[14px] text-brand-ink-soft">
          El estado de tu proyecto se actualiza automáticamente. Aquí puedes subir el material
          habilitado para las etapas que has alcanzado.
        </p>
      </header>

      {!proyecto ? (
        <Card variant="ghost" className="flex flex-col items-center gap-4 py-16 text-center">
          <span className="text-[48px]">📋</span>
          <p className="text-[15px] text-brand-ink-muted">
            Primero necesitas una postulación para acceder a las entregas.
          </p>
          <Button href="/app/postulante/postular">Postular ahora</Button>
        </Card>
      ) : habilitadas.length === 0 ? (
        <Card variant="ghost" className="py-14 text-center">
          <p className="text-[14px] text-brand-ink-muted">
            No hay etapas con entregas configuradas para la convocatoria de tu postulación.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {habilitadas.map(({ etapa, config, habilitada }) => {
            if (!habilitada) {
              return (
                <Card key={etapa.id} variant="ghost" className="flex items-center gap-4 p-5 opacity-70">
                  <span className="text-[24px]">🔒</span>
                  <div>
                    <p className="text-[14px] font-semibold text-brand-ink">
                      {config.titulo}
                      <span className="ml-2 text-[12px] font-normal text-brand-ink-muted">
                        Etapa {String(etapa.numero).padStart(2, "0")} · {etapa.nombre}
                      </span>
                    </p>
                    <p className="mt-0.5 text-[12px] text-brand-ink-muted">
                      Se habilita cuando tu proyecto avance a esta etapa.
                    </p>
                  </div>
                </Card>
              );
            }
            const entrega = entregasPorEtapa[etapa.id];
            return (
              <EntregaForm
                key={etapa.id}
                proyectoId={proyecto.id}
                etapa={etapa}
                config={config}
                initial={{
                  videoUrl: entrega?.video_url ?? "",
                  contexto: entrega?.contexto ?? "",
                  estado: entrega?.estado ?? "borrador",
                  archivos: entrega ? archivosPorEntrega[entrega.id] ?? [] : [],
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
