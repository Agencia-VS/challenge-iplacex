/**
 * Aviso para los formularios de acceso cuando falta la configuración de
 * Supabase. Sin credenciales no hay autenticación posible, y el error de la
 * librería —«Your project's URL and Key are required»— no le dice a nadie qué
 * variable definir.
 */
export function AvisoSinConfigurar() {
  return (
    <div className="rounded-[var(--r-md)] border border-brand-line bg-brand-surface-soft px-5 py-6">
      <p className="brand-eyebrow text-brand-accent">Plataforma sin configurar</p>
      <h2 className="brand-display mt-2 text-[22px] text-brand-primary">
        El acceso no está disponible
      </h2>
      <p className="mt-2 text-[13px] leading-relaxed text-brand-ink-soft">
        Falta conectar la base de datos. Define{" "}
        <code className="font-[family-name:var(--font-mono)] text-[12px] text-brand-primary">
          NEXT_PUBLIC_SUPABASE_URL
        </code>{" "}
        y{" "}
        <code className="font-[family-name:var(--font-mono)] text-[12px] text-brand-primary">
          NEXT_PUBLIC_SUPABASE_ANON_KEY
        </code>{" "}
        en el entorno del despliegue.
      </p>
    </div>
  );
}
