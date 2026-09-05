import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Rutas base por rol — a donde redirige el login exitoso
const ROLE_HOME: Record<string, string> = {
  postulante: "/app/postulante",
  evaluador: "/app/evaluador",
  admin: "/app/admin",
  super_evaluador: "/app/evaluador",
};

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Siempre usar getUser() — valida el token en el servidor de Supabase
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // ── Rutas /app/* requieren sesión ─────────────────────────────────────────
  if (pathname.startsWith("/app") && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // ── /app (sin ruta específica) → redirigir al home del rol ────────────────
  if (pathname === "/app" && user) {
    let rol: string | undefined =
      (user as unknown as { rol?: string }).rol ??
      user.user_metadata?.rol;
    // JWT Hook no activo: fallback a DB (solo en este redirect puntual)
    if (!rol) {
      const { data } = await supabase
        .from("usuarios")
        .select("rol")
        .eq("id", user.id)
        .maybeSingle();
      rol = (data as { rol?: string } | null)?.rol ?? "postulante";
    }
    const url = request.nextUrl.clone();
    url.pathname = ROLE_HOME[rol] ?? "/app/postulante";
    return NextResponse.redirect(url);
  }

  // ── Rutas auth no accesibles si ya hay sesión ─────────────────────────────
  if (
    (pathname === "/login" ||
      pathname === "/signup" ||
      pathname === "/acceso") &&
    user
  ) {
    let rol: string | undefined =
      (user as unknown as { rol?: string }).rol ??
      user.user_metadata?.rol;
    if (!rol) {
      const { data } = await supabase
        .from("usuarios")
        .select("rol")
        .eq("id", user.id)
        .maybeSingle();
      rol = (data as { rol?: string } | null)?.rol ?? "postulante";
    }
    const url = request.nextUrl.clone();
    url.pathname = ROLE_HOME[rol] ?? "/app/postulante";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
