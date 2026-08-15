/**
 * FILE NAME: page.tsx
 *
 * ROLE: Dashboard route ("/") — renders DashboardView with page metadata.
 *
 * IMPORTANT DEVELOPER DECISIONS ON THIS FILE:
 * ? - force-dynamic because all content is client-side data from IndexedDB.
 * ? - Renders DashboardView as the single component; ?add=1 linking is handled inside
 *     DashboardView via Link, not here.
 *
 * AFFECTS:
 * ? - components/dashboard/DashboardView.tsx (rendered here)
 *
 * AFFECTED BY:
 * ? - components/dashboard/DashboardView.tsx (any prop/behavior change is reflected here)
 *
 * ON FILE EDIT:
 * ! - npm run build
 * ! - npm run lint
 * ? - Keep force-dynamic and the page metadata title
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
import { DashboardView } from "@/components/dashboard/DashboardView";

export const metadata: Metadata = { title: "Home · Cash Guard" };
export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return <DashboardView />;
}