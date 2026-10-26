import type { Metadata } from "next";
import { AdminProyectosContent } from "@/components/app/admin-proyectos-content";

export const metadata: Metadata = { title: "Rondas y evaluaciones · Admin" };
export const dynamic = "force-dynamic";

export default function AdminRondasPage() {
  return <AdminProyectosContent vistaInicial="rondas" />;
}
