import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { AvisoSinConfigurar } from "@/components/auth/aviso-sin-configurar";

export const metadata: Metadata = { title: "Plataforma sin configurar" };

/**
 * Destino de `/app/*` cuando falta la configuración de Supabase.
 *
 * El middleware redirige acá en lugar de dejar que la página privada se
 * ejecute: en el App Router la página se renderiza en paralelo con su layout,
 * así que una compuerta en el layout no impide que la consulta se dispare y
 * lance. Cortar antes es lo único que deja el registro limpio.
 */
export default function SinConfigurarPage() {
  return (
    <Container className="py-24">
      <div className="mx-auto max-w-lg">
        <AvisoSinConfigurar />
      </div>
    </Container>
  );
}
