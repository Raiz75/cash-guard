/**
 * FILE NAME: CategoryIcon.tsx
 *
 * ROLE: Resolves a stored category icon-name string to a Tabler icon component,
 * falling back to IconTag for unknown names.
 *
 * IMPORTANT DEVELOPER DECISIONS ON THIS FILE:
 * ? - The map is the ONLY place icon names are turned into components; unknown names
 *     silently fall back to IconTag so old data never crashes.
 * ? - Tabler icons (@tabler/icons-react), per the base-maia preset convention.
 *
 * AFFECTS:
 * ? - components/dashboard/DashboardView.tsx (spending breakdown icons)
 * ? - components/transactions/TransactionForm.tsx (category select icons)
 * ? - components/transactions/TransactionFilters.tsx (category select icons)
 * ? - components/settings/SettingsView.tsx (category row icons)
 *
 * AFFECTED BY:
 * ? - lib/db/schema.ts (Category.icon is the input name string)
 * ? - @tabler/icons-react version
 *
 * ON FILE EDIT:
 * ! - npm run build
 * ! - npm run lint
 * ? - Verify every known icon name still maps and unknown names fall back gracefully
 * * - Adding a new category icon requires a new map entry here
 */

"use client";

import {
  IconCashBanknote,
  IconCode,
  IconSoup,
  IconCar,
  IconShoppingBag,
  IconReceipt,
  IconMovie,
  IconTag,
  type Icon as TablerIcon,
} from "@tabler/icons-react";

const icons: Record<string, TablerIcon> = {
  banknote: IconCashBanknote,
  code: IconCode,
  soup: IconSoup,
  car: IconCar,
  "shopping-bag": IconShoppingBag,
  receipt: IconReceipt,
  clapperboard: IconMovie,
  tag: IconTag,
};

export function CategoryIcon({
  name,
  className,
  size,
}: {
  name: string | null;
  className?: string;
  size?: number;
}) {
  const Icon = (name && icons[name]) || IconTag;
  return <Icon className={className} size={size} stroke={1.5} />;
}