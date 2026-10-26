import type { Metadata } from "next";
import { AdminProyectosContent } from "@/components/app/admin-proyectos-content";

export const metadata: Metadata = { title: "Entregas · Admin" };
export const dynamic = "force-dynamic";

export default function AdminEntregasPage() {
  return <AdminProyectosContent vistaInicial="entregas" />;
}
