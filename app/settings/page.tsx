/**
 * FILE NAME: page.tsx (app/settings)
 *
 * ROLE: Settings route ("/settings") — renders SettingsView with metadata.
 *
 * IMPORTANT DEVELOPER DECISIONS ON THIS FILE:
 * ? - force-dynamic client view; data (categories) is loaded reactively in SettingsView.
 *
 * AFFECTS:
 * ? - components/settings/SettingsView.tsx (rendered here)
 *
 * AFFECTED BY:
 * ? - components/settings/SettingsView.tsx
 *
 * ON FILE EDIT:
 * ! - npm run build
 * ! - npm run lint
 * ? - Keep force-dynamic and the metadata title
 */

import type { Metadata } from "next";
import { SettingsView } from "@/components/settings/SettingsView";

export const metadata: Metadata = { title: "Settings · Cash Guard" };
export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return <SettingsView />;
}