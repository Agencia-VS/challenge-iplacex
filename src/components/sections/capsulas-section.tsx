import { Section } from "@/components/ui/section";
import { Card } from "@/components/ui/card";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getYoutubeThumbnail } from "@/lib/youtube";

export async function CapsulasSection() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );

  const { data: capsulasRaw } = await supabase
    .from("capsulas")
    .select("id, numero, titulo, descripcion, video_url")
    .order("numero", { ascending: true });

  type CapsulaDB = {
    id: number;
    numero: number;
    titulo: string;
    descripcion: string | null;
    video_url: string | null;
  };

  const capsulas = (capsulasRaw ?? []) as CapsulaDB[];

  return (
    <Section
      id="capsulas"
      eyebrow="Metodología"
      eyebrowTone="secondary"
      title="5 cápsulas de formación express"
      description="Los proyectos seleccionados acceden a contenidos prácticos para refinar su propuesta antes del pitch final."
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {capsulas.length > 0
          ? capsulas.map((c) => {
              const thumbnail = c.video_url ? getYoutubeThumbnail(c.video_url) : null;
              return (
                <Card key={c.id} className="flex flex-col gap-3 overflow-hidden p-0">
                  {thumbnail && (
                    <a href={c.video_url ?? "#"} target="_blank" rel="noopener noreferrer" className="block">
                      <div className="relative aspect-video w-full overflow-hidden bg-brand-ink">
                        <img
                          src={thumbnail}
                          alt={c.titulo}
                          className="h-full w-full object-cover transition-transform hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity hover:opacity-100">
                          <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-accent text-[14px] text-white">
                            ▶
                          </span>
                        </div>
                      </div>
                    </a>
                  )}
                  <div className="flex flex-col gap-2 px-5 pb-5 pt-4">
                    <div className="flex items-center justify-between">
                      <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-secondary-soft brand-display text-[14px] text-brand-secondary">
                        {String(c.numero).padStart(2, "0")}
                      </span>
                      {c.video_url && (
                        <a
                          href={c.video_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-full bg-brand-accent px-3 py-0.5 text-[11px] font-semibold text-white hover:bg-brand-accent/90 transition-colors"
                        >
                          ▶ Ver
                        </a>
                      )}
                    </div>
                    <p className="font-[family-name:var(--font-heading)] text-[15px] font-bold text-brand-primary">
                      {c.titulo}
                    </p>
                    <p className="text-[13px] text-brand-ink-soft">
                      {c.descripcion ?? ""}
                    </p>
                    {c.video_url && (
                      <a
                        href={c.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-auto text-[12px] font-medium text-brand-accent underline-offset-2 hover:underline"
                      >
                        Ver video en YouTube →
                      </a>
                    )}
                  </div>
                </Card>
              );
            })
          : [1, 2, 3, 4, 5].map((n) => (
              <Card key={n} className="flex flex-col gap-3 p-5">
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-secondary-soft brand-display text-[14px] text-brand-secondary">
                    {String(n).padStart(2, "0")}
                  </span>
                </div>
                <p className="font-[family-name:var(--font-heading)] text-[15px] font-bold text-brand-primary">
                  Cápsula {n}
                </p>
                <p className="text-[13px] text-brand-ink-soft">
                  Contenido disponible pronto.
                </p>
              </Card>
            ))}
      </div>
    </Section>
  );
}
