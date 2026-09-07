import Link from "next/link";
import { Container } from "@/components/ui/container";
import { BrandLogo } from "@/components/brand/logo";
import { BrandPattern } from "@/components/brand/pattern";
import { publicNav } from "@/lib/site";
import { BRAND } from "@/lib/brand";

const legalLinks = [
  { href: "/bases", label: "Bases de la convocatoria" },
  { href: "/faq", label: "Preguntas frecuentes" },
  { href: "/privacidad", label: "Privacidad" },
];

const equipoLinks = [
  { href: "/acceso", label: `Acceso equipo ${BRAND.shortName}` },
  { href: "/login", label: "Acceso postulantes" },
];

export function PublicFooter() {
  return (
    <footer className="relative mt-24 overflow-hidden border-t border-brand-line bg-brand-primary text-white">
      <BrandPattern tone="surface" scale={110} opacity={0.06} />
      <Container className="relative grid gap-12 py-14 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
        <div>
          <BrandLogo variant="light" />
          <p className="mt-5 max-w-xs text-[14px] text-white/70">
            Concurso de Emprendimiento e Innovación de Iplacex. Dirección de Formación General.
          </p>
        </div>
        <FooterColumn title="Navegación" links={publicNav} />
        <FooterColumn title="Información" links={legalLinks} />
        <FooterColumn title="Acceso plataforma" links={equipoLinks} />
      </Container>
      <div className="relative border-t border-white/10">
        <Container className="flex flex-col items-start justify-between gap-3 py-6 text-[12px] text-white/55 md:flex-row md:items-center">
          <span>© {new Date().getFullYear()} {BRAND.org} · {BRAND.name}</span>
          <span className="font-[family-name:var(--font-mono)] uppercase tracking-widest">Edición {BRAND.edition}</span>
        </Container>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <p className="brand-eyebrow text-white/60">{title}</p>
      <ul className="mt-4 space-y-2.5 text-[14px]">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-white/80 transition-colors hover:text-white">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
