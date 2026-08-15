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
 *
 * AI INSTRUCTIONS
 * - When editing this file, ALWAYS check the AFFECTS list first
 * - After changes, run ALL tests listed under ON FILE EDIT
 * - If AFFECTED BY files change, verify this file still works
 * - KEEP THIS HEADER CURRENT: whenever you edit this file, update ROLE,
 *   decisions, AFFECTS, AFFECTED BY, and ON FILE EDIT to match the change
 * - Red (!) items are CRITICAL and cannot be skipped
 * - Blue (?) items are important but not blocking
 * - Green (*) items are nice-to-have; skip if not applicable
 */

import type { Metadata } from "next";
import { SettingsView } from "@/components/settings/SettingsView";

export const metadata: Metadata = { title: "Settings · Cash Guard" };
export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return <SettingsView />;
}