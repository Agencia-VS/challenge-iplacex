import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function SignupPage() {
  return (
    <Card className="p-8">
      <p className="brand-eyebrow">Nueva cuenta</p>
      <h1 className="brand-display mt-2 text-[34px] text-brand-primary">Crea tu cuenta</h1>
      <p className="mt-2 text-[14px] text-brand-ink-soft">
        Tarda menos de 1 minuto. Necesitarás un email válido para confirmar.
      </p>

      <SignupForm />

      <p className="mt-6 text-center text-[13px] text-brand-ink-muted">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-semibold text-brand-primary hover:text-brand-accent">
          Iniciar sesión
        </Link>
      </p>
    </Card>
  );
}
