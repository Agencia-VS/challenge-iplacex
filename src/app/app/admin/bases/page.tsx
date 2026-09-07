import type { Metadata } from "next";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { roleHomePath } from "@/lib/roles";
import { SubirDocumentoForm } from "@/components/app/subir-documento-form";

export const metadata: Metadata = { title: "Bases de la convocatoria · Admin" };

type Documento = {
  id: string;
  tipo: string;
  titulo: string;
  descripcion: string | null;
  archivo_url: string;
  archivo_nombre: string;
  version: string | null;
  publicado: boolean;
  created_at: string;
};

export default async function BasesAdminPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/acceso");

  const { data: perfil } = await supabase
    .from("usuarios").select("rol").eq("id", user.id).single();
  if (perfil?.rol !== "admin") redirect(roleHomePath(perfil?.rol));

  const { data: raw } = await supabase
    .from("documentos")
    .select("id, tipo, titulo, descripcion, archivo_url, archivo_nombre, version, publicado, created_at")
    .order("created_at", { ascending: false });

  const docs = (raw ?? []) as Documento[];

  return (
    <div className="space-y-6 pb-20">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="brand-eyebrow text-brand-primary">Admin</p>
          <h1 className="brand-display mt-1.5 text-[32px] leading-tight text-brand-primary md:text-[40px]">
            Bases de la convocatoria
          </h1>
        </div>
      </header>

      <SubirDocumentoForm />

      {docs.length === 0 ? (
        <Card variant="ghost" className="flex flex-col items-center gap-4 py-20 text-center">
          <span className="text-[56px]">📄</span>
          <div>
            <p className="text-[17px] font-semibold text-brand-primary">0 documentos publicados</p>
            <p className="mt-1 text-[13px] text-brand-ink-muted">
              Sube las bases, reglamento y anexos para que los postulantes puedan consultarlos.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {docs.map(d => (
            <Card key={d.id} className="flex items-center justify-between gap-4 p-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    tone={d.tipo === "bases" ? "primary" : d.tipo === "reglamento" ? "secondary" : "neutral"}
                  >
                    {d.tipo}
                  </Badge>
                  {d.version && (
                    <span className="text-[11px] text-brand-ink-muted">v{d.version}</span>
                  )}
                  {!d.publicado && <Badge tone="warning">Oculto</Badge>}
                </div>
                <p className="mt-1 font-semibold text-brand-ink">{d.titulo}</p>
                {d.descripcion && (
                  <p className="mt-0.5 text-[12px] text-brand-ink-muted">{d.descripcion}</p>
                )}
              </div>
              <a
                href={d.archivo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-[13px] font-medium text-brand-accent underline-offset-2 hover:underline"
              >
                ↓ Descargar
              </a>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
