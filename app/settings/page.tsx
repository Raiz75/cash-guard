/* AI-CONTEXT-NOTE:{"R":"Settings route (/settings) - renders SettingsView with metadata.","IDD":[{"?":"force-dynamic client view; data (categories) is loaded reactively in SettingsView."}],"A":[{"?":"components/settings/SettingsView.tsx","rendered here"}],"AB":[{"?":"components/settings/SettingsView.tsx","behavior changes are reflected here"}],"E":[{"!!":"npm run build"},{"!!":"npm run lint"},{"?":"Keep force-dynamic and the metadata title"}]} */

import type { Metadata } from "next";
import { SettingsView } from "@/components/settings/SettingsView";

export const metadata: Metadata = { title: "Settings · Cash Guard" };
export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return <SettingsView />;
}