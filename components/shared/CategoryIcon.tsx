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