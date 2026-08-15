/**
 * FILE NAME: utils.ts
 *
 * ROLE: cn() — the clsx + tailwind-merge class combiner used across the app.
 *
 * IMPORTANT DEVELOPER DECISIONS ON THIS FILE:
 * ? - tailwind-merge resolves conflicting Tailwind utilities so later classes win.
 *
 * AFFECTS:
 * ? - app/layout.tsx (root <html> className)
 * ? - components/shared/RangeFilter.tsx, components/transactions/TransactionList.tsx
 * ? - Every component that conditionally composes utility classes
 *
 * AFFECTED BY:
 * ? - clsx and tailwind-merge versions
 *
 * ON FILE EDIT:
 * ! - npm run build
 * ! - npm run lint
 * ? - Verify class conflicts still resolve last-wins
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

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
