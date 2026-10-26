import type { Metadata } from "next";
import { AdminProyectosContent } from "@/components/app/admin-proyectos-content";

export const metadata: Metadata = { title: "Postulaciones · Admin" };
export const dynamic = "force-dynamic";

export default function AdminProyectosPage() {
  return <AdminProyectosContent vistaInicial="postulaciones" />;
}
