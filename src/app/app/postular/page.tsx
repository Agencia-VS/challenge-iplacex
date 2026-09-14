import type { Metadata } from "next";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ETIQUETA_ROL, roleHomePath } from "@/lib/roles";

export const metadata: Metadata = { title: "Postular" };
export const dynamic = "force-dynamic";

export default async function AccesoPostulacionPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id", user.id)
    .maybeSingle();

  const rol = perfil?.rol ?? user.user_metadata?.rol ?? null;

  if (rol === "postulante") {
    redirect("/app/postulante/postular");
  }

  const etiquetaRol = ETIQUETA_ROL[rol ?? ""] ?? "integrante del equipo";

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-20">
      <header>
        <p className="brand-eyebrow text-brand-accent">Postulación no disponible</p>
        <h1 className="brand-display mt-1.5 text-[32px] leading-tight text-brand-primary md:text-[40px]">
          Esta cuenta no puede postular
        </h1>
      </header>

      <Card className="p-7 md:p-8">
        <p className="text-[15px] leading-relaxed text-brand-ink">
          Iniciaste sesión con el rol <strong>{etiquetaRol}</strong>. Las cuentas del
          equipo organizador y evaluador no pueden presentar un emprendimiento o
          proyecto.
        </p>
        <p className="mt-3 text-[13px] leading-relaxed text-brand-ink-muted">
          Para postular, cierra esta sesión e ingresa con una cuenta de postulante.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button href={roleHomePath(rol)} variant="secondary">
            Volver a mi panel
          </Button>
          <Button href="/" variant="ghost">
            Volver al sitio
          </Button>
        </div>
      </Card>
    </div>
  );
}
