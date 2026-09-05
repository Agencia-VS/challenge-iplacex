"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Send,
  Upload,
  BookOpen,
  ClipboardList,
  Star,
  Settings,
  Users,
  CalendarRange,
  FolderKanban,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { BrandLogo } from "@/components/brand/logo";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

// ─── Tipos ──────────────────────────────────────────────────────────────────
type Rol = "postulante" | "evaluador" | "admin" | "super_evaluador";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
}

interface NavGroup {
  section: string;
  items: NavItem[];
}

// ─── Nav por rol ─────────────────────────────────────────────────────────────
const NAV_CONFIG: Record<Rol, NavGroup[]> = {
  postulante: [
    {
      section: "Mi proceso",
      items: [
        { href: "/app/postulante", label: "Dashboard", icon: LayoutDashboard },
        { href: "/app/postulante/postulacion", label: "Mi postulación", icon: FileText },
        { href: "/app/postulante/postular", label: "Postular ahora", icon: Send, badge: "Open" },
        { href: "/app/postulante/entregas", label: "Entregas", icon: Upload },
      ],
    },
    {
      section: "Formación",
      items: [
        { href: "/app/postulante/capsulas", label: "Cápsulas", icon: BookOpen },
      ],
    },
  ],

  evaluador: [
    {
      section: "Evaluación",
      items: [
        { href: "/app/evaluador", label: "Dashboard", icon: LayoutDashboard },
        { href: "/app/evaluador/proyectos", label: "Proyectos asignados", icon: FolderKanban },
        { href: "/app/evaluador/mis-evaluaciones", label: "Mis evaluaciones", icon: ClipboardList },
      ],
    },
  ],

  super_evaluador: [
    {
      section: "Evaluación",
      items: [
        { href: "/app/evaluador", label: "Dashboard", icon: LayoutDashboard },
        { href: "/app/evaluador/proyectos", label: "Proyectos asignados", icon: FolderKanban },
        { href: "/app/evaluador/mis-evaluaciones", label: "Mis evaluaciones", icon: ClipboardList },
        { href: "/app/evaluador/ranking", label: "Ranking general", icon: Star },
      ],
    },
  ],

  admin: [
    {
      section: "Plataforma",
      items: [
        { href: "/app/admin", label: "Dashboard", icon: LayoutDashboard },
        { href: "/app/admin/proyectos", label: "Proyectos", icon: FolderKanban },
        { href: "/app/admin/evaluadores", label: "Evaluadores", icon: Users },
      ],
    },
    {
      section: "Configuración",
      items: [
        { href: "/app/admin/convocatoria", label: "Convocatoria", icon: CalendarRange },
        { href: "/app/admin/bases", label: "Bases de la convocatoria", icon: FileText },
        { href: "/app/admin/ajustes", label: "Ajustes", icon: Settings },
      ],
    },
  ],
};

// ─── Role badge ───────────────────────────────────────────────────────────────
const ROLE_LABEL: Record<Rol, { label: string; color: string }> = {
  postulante: { label: "Postulante", color: "bg-brand-accent-soft text-brand-accent" },
  evaluador: { label: "Evaluador", color: "bg-brand-secondary-soft text-brand-secondary" },
  super_evaluador: { label: "Super Eval.", color: "bg-brand-secondary-soft text-brand-secondary" },
  admin: { label: "Admin", color: "bg-brand-primary text-white" },
};

// ─── NavLink ─────────────────────────────────────────────────────────────────
function NavLink({ item, onClick }: { item: NavItem; onClick?: () => void }) {
  const pathname = usePathname();
  const isActive = pathname === item.href;
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "group flex items-center gap-3 rounded-[var(--r-sm)] px-3 py-2 text-[13px] font-medium transition-all duration-150",
        isActive
          ? "bg-brand-primary text-white shadow-[var(--sh-sm)]"
          : "text-brand-ink-soft hover:bg-brand-surface hover:text-brand-primary",
      )}
    >
      <Icon
        size={15}
        className={cn(
          "shrink-0 transition-colors",
          isActive ? "text-white" : "text-brand-ink-muted group-hover:text-brand-primary",
        )}
      />
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge && (
        <span className="rounded-full bg-brand-accent px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[9px] font-bold uppercase tracking-wider text-white">
          {item.badge}
        </span>
      )}
      {isActive && <ChevronRight size={12} className="shrink-0 text-white/60" />}
    </Link>
  );
}

// ─── Sidebar content ─────────────────────────────────────────────────────────
function SidebarContent({
  rol,
  nombre,
  email,
  onClose,
}: {
  rol: Rol;
  nombre: string;
  email: string;
  onClose?: () => void;
}) {
  const router = useRouter();
  const groups = NAV_CONFIG[rol] ?? NAV_CONFIG.postulante;
  const rolMeta = ROLE_LABEL[rol];

  async function handleLogout() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials = nombre
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-brand-line px-5">
        <Link href="/" onClick={onClose}>
          <BrandLogo />
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-[var(--r-xs)] p-1.5 text-brand-ink-muted hover:bg-brand-surface hover:text-brand-primary md:hidden"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-5">
        {groups.map((group) => (
          <div key={group.section}>
            <p className="brand-eyebrow mb-2 px-3">{group.section}</p>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.href}>
                  <NavLink item={item} onClick={onClose} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-brand-line p-4">
        <div className="flex items-center gap-3 rounded-[var(--r-md)] bg-brand-surface-soft p-3">
          {/* Avatar */}
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-accent to-brand-primary text-[11px] font-bold text-white shadow-[var(--sh-sm)]">
            {initials || "TC"}
          </div>
          {/* Info */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-semibold text-brand-ink leading-tight">
              {nombre}
            </p>
            <span
              className={cn(
                "mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                rolMeta.color,
              )}
            >
              {rolMeta.label}
            </span>
          </div>
          {/* Logout */}
          <button
            onClick={handleLogout}
            title="Cerrar sesión"
            className="shrink-0 rounded-[var(--r-xs)] p-1.5 text-brand-ink-muted transition-colors hover:bg-brand-accent-soft hover:text-brand-accent"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── AppSidebar (exported) ───────────────────────────────────────────────────
export interface AppSidebarProps {
  rol: Rol;
  nombre: string;
  email: string;
}

export function AppSidebar({ rol, nombre, email }: AppSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <aside className="hidden w-[260px] shrink-0 border-r border-brand-line bg-brand-surface-raised/80 backdrop-blur-xl md:flex md:flex-col">
        <SidebarContent rol={rol} nombre={nombre} email={email} />
      </aside>

      {/* ── Mobile topbar trigger ────────────────────────────────────────── */}
      <div className="flex h-14 items-center justify-between border-b border-brand-line bg-brand-surface-raised/90 px-4 backdrop-blur-xl md:hidden">
        <Link href="/">
          <BrandLogo />
        </Link>
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-[var(--r-sm)] p-2 text-brand-ink-muted hover:bg-brand-surface hover:text-brand-primary"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* ── Mobile drawer ────────────────────────────────────────────────── */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-brand-ink/40 backdrop-blur-sm md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <div className="fixed inset-y-0 left-0 z-50 w-[280px] border-r border-brand-line bg-brand-surface-raised shadow-[var(--sh-lg)] md:hidden">
            <SidebarContent
              rol={rol}
              nombre={nombre}
              email={email}
              onClose={() => setMobileOpen(false)}
            />
          </div>
        </>
      )}
    </>
  );
}
