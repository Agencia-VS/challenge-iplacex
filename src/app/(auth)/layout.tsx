import Link from "next/link";
import { BrandLogo } from "@/components/brand/logo";
import { Container } from "@/components/ui/container";

// Las páginas de auth no se pre-renderizan: necesitan env vars en runtime
export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="border-b border-brand-line bg-brand-surface/70 backdrop-blur-xl">
        <Container className="flex h-16 items-center justify-between">
          <Link href="/">
            <BrandLogo />
          </Link>
          <Link
            href="/"
            className="text-[13px] font-medium text-brand-ink-muted transition-colors hover:text-brand-primary"
          >
            ← Volver al inicio
          </Link>
        </Container>
      </header>
      <main className="flex flex-1 items-center justify-center py-16">
        <Container className="max-w-md">{children}</Container>
      </main>
    </div>
  );
}
