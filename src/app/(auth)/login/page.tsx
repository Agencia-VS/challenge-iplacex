import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Iniciar sesión · Postulantes" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ restablecida?: string | string[] }>;
}) {
  const params = searchParams ? await searchParams : {};
  const resetValue = Array.isArray(params.restablecida)
    ? params.restablecida[0]
    : params.restablecida;

  return (
    <Card className="p-8">
      <p className="brand-eyebrow text-brand-accent">Acceso postulantes</p>
      <h1 className="brand-display mt-2 text-[34px] text-brand-primary">Ingresa a tu postulación</h1>
      <LoginForm passwordReset={resetValue === "1"} />
    </Card>
  );
}
