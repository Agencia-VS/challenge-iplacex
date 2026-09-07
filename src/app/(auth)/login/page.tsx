import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Iniciar sesión · Postulantes" };

export default function LoginPage() {
  return (
    <Card className="p-8">
      <p className="brand-eyebrow text-brand-accent">Acceso postulantes</p>
      <h1 className="brand-display mt-2 text-[34px] text-brand-primary">Ingresa a tu postulación</h1>
      <LoginForm />
    </Card>
  );
}
