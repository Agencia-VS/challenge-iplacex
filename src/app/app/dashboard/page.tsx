import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  // /app is routed by proxy.ts to the home page for the signed-in user's role.
  redirect("/app");
}
