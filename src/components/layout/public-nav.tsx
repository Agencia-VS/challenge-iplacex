import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { BrandLogo } from "@/components/brand/logo";
import { publicNav } from "@/lib/site";

export function PublicNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-brand-line bg-[color-mix(in_srgb,var(--brand-surface)_85%,transparent)] backdrop-blur-xl">
      <Container className="flex min-h-[84px] items-center justify-between gap-2 px-3 sm:px-8">
        <Link href="/" className="shrink-0">
          <BrandLogo />
        </Link>
        <nav aria-label="Navegación principal" className="hidden items-center gap-1 xl:flex">
          {publicNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3.5 py-2 text-[13px] font-medium text-brand-ink-soft transition-colors hover:bg-brand-surface-raised hover:text-brand-primary"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button href="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">
            Iniciar sesión
          </Button>
          <Button href="/app/postular" size="sm">
            Postular
          </Button>
        </div>
      </Container>
      <Container className="pb-3 xl:hidden">
        <nav aria-label="Navegación principal" className="flex flex-wrap gap-x-4 gap-y-2">
          {publicNav.map((item) => (
            <Link key={item.href} href={item.href} className="text-xs font-medium text-brand-ink-soft hover:text-brand-accent">
              {item.label}
            </Link>
          ))}
        </nav>
      </Container>
    </header>
  );
}
