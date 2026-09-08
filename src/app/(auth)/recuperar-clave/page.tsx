import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { RecuperarClaveForm } from "@/components/auth/recuperar-clave-form";

export const metadata: Metadata = { title: "Recuperar contraseña" };

function normalizeNext(value: string | string[] | undefined): "/login" | "/acceso" {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate === "/acceso" ? "/acceso" : "/login";
}

export default async function RecuperarClavePage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string | string[] }>;
}) {
  const params = searchParams ? await searchParams : {};
  const nextPath = normalizeNext(params.next);

  return (
    <Card className="p-8">
      <p className="brand-eyebrow text-brand-accent">Recuperar acceso</p>
      <h1 className="brand-display mt-2 text-[34px] text-brand-primary">
        Crea una nueva contraseña
      </h1>
      <p className="mt-2 text-[14px] leading-relaxed text-brand-ink-soft">
        Ingresa tu correo electrónico y te enviaremos un enlace para restablecer el
        acceso.
      </p>

      <div className="mt-6">
        <RecuperarClaveForm nextPath={nextPath} />
      </div>

      <p className="mt-6 text-center text-[12px] text-brand-ink-muted">
        <Link
          href={nextPath}
          className="font-medium text-brand-primary hover:underline"
        >
          ← Volver al acceso
        </Link>
      </p>
    </Card>
  );
}
