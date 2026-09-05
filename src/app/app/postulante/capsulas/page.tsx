import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { getYoutubeThumbnail } from "@/lib/youtube";

interface Capsula {
  id: number;
  numero: number;
  titulo: string;
  descripcion: string | null;
  video_url: string | null;
  disponible_desde: string | null;
  tags: string[] | null;
}

export default async function CapsulasPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: capsulasRaw } = await supabase
    .from("capsulas")
    .select("id, numero, titulo, descripcion, video_url, disponible_desde, tags")
    .order("numero", { ascending: true });

  const capsulas = (capsulasRaw ?? []) as Capsula[];
  const now = new Date();

  return (
    <div className="space-y-8 pb-20">
      <header>
        <p className="brand-eyebrow text-brand-accent">Formación</p>
        <h1 className="brand-display mt-1.5 text-[36px] leading-tight text-brand-primary md:text-[44px]">
          Cápsulas de aprendizaje
        </h1>
        <p className="mt-2 max-w-2xl text-[14px] text-brand-ink-soft">
          5 cápsulas express para fortalecer tu postulación. Una nueva cada semana del programa.
        </p>
      </header>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {capsulas.map((c) => {
          const unlocked = !c.disponible_desde || new Date(c.disponible_desde) <= now;
          return (
            <Card
              key={c.id}
              className={cn(
                "flex flex-col overflow-hidden p-0 transition-all",
                unlocked ? "hover:-translate-y-0.5 hover:shadow-[var(--sh-md)]" : "opacity-70",
              )}
            >
              {/* Thumbnail YouTube */}
              {c.video_url && (
                <a href={c.video_url} target="_blank" rel="noopener noreferrer" className="block">
                  <div className="relative aspect-video w-full overflow-hidden bg-brand-ink">
                    <img
                      src={getYoutubeThumbnail(c.video_url) ?? ""}
                      alt={c.titulo}
                      className="h-full w-full object-cover transition-transform hover:scale-105"
                      loading="lazy"
                    />
                    {unlocked && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity hover:opacity-100">
                        <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-accent text-[18px] text-white">
                          ▶
                        </span>
                      </div>
                    )}
                    {!unlocked && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <span className="text-[28px]">🔒</span>
                      </div>
                    )}
                  </div>
                </a>
              )}
              <div className="flex flex-col gap-4 p-6">
                <div className="flex items-center justify-between">
                  <span className="brand-display text-[40px] leading-none text-brand-accent">
                    {String(c.numero).padStart(2, "0")}
                  </span>
                  {unlocked ? (
                    <Badge tone="success">Disponible</Badge>
                  ) : (
                    <Badge tone="neutral">🔒 Bloqueada</Badge>
                  )}
                </div>

                <div>
                  <h3 className="text-[16px] font-semibold leading-tight text-brand-primary">
                    {c.titulo}
                  </h3>
                  {c.descripcion && (
                    <p className="mt-1.5 text-[13px] leading-relaxed text-brand-ink-soft">
                      {c.descripcion}
                    </p>
                  )}
                </div>

                {c.tags && c.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {c.tags.map((t) => (
                      <Badge key={t} tone="neutral">
                        {t}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="mt-auto pt-2">
                  {unlocked && c.video_url ? (
                    <a
                      href={c.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-[var(--r-sm)] bg-brand-accent px-4 py-2 text-[12px] font-semibold text-white transition-all hover:bg-brand-accent/90"
                    >
                      ▶ Ver cápsula
                    </a>
                  ) : (
                    <p className="text-[11px] text-brand-ink-muted">
                      {c.disponible_desde
                        ? `Disponible: ${new Date(c.disponible_desde).toLocaleDateString("es-CL", { day: "numeric", month: "short" })}`
                        : "Próximamente"}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          );
        })}

        {!capsulas.length && (
          <Card variant="ghost" className="col-span-full text-center">
            <p className="text-[13px] text-brand-ink-muted">
              Aún no hay cápsulas publicadas. Vuelve pronto.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
