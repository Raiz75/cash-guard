import type { Metadata } from "next";
import { SettingsView } from "@/components/settings/SettingsView";

export const metadata: Metadata = { title: "Settings · Cash Guard" };
export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return <SettingsView />;
}