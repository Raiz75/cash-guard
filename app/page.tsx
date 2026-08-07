import type { Metadata } from "next";
import { DashboardView } from "@/components/dashboard/DashboardView";

export const metadata: Metadata = { title: "Home · Cash Guard" };
export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return <DashboardView />;
}