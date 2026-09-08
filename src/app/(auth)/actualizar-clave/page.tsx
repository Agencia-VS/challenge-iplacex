import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { ActualizarClaveForm } from "@/components/auth/actualizar-clave-form";

export const metadata: Metadata = { title: "Nueva contraseña" };

function normalizeLogin(value: string | string[] | undefined): "/login" | "/acceso" {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate === "/acceso" ? "/acceso" : "/login";
}

export default async function ActualizarClavePage({
  searchParams,
}: {
  searchParams?: Promise<{ login?: string | string[] }>;
}) {
  const params = searchParams ? await searchParams : {};
  const loginPath = normalizeLogin(params.login);

  return (
    <Card className="p-8">
      <p className="brand-eyebrow text-brand-accent">Recuperar acceso</p>
      <h1 className="brand-display mt-2 text-[34px] text-brand-primary">
        Define tu nueva contraseña
      </h1>
      <p className="mt-2 text-[14px] leading-relaxed text-brand-ink-soft">
        Elige una contraseña segura para volver a ingresar a tu cuenta.
      </p>

      <div className="mt-6">
        <ActualizarClaveForm loginPath={loginPath} />
      </div>

      <p className="mt-6 text-center text-[12px] text-brand-ink-muted">
        <Link
          href={loginPath}
          className="font-medium text-brand-primary hover:underline"
        >
          ← Volver al acceso
        </Link>
      </p>
    </Card>
  );
}
