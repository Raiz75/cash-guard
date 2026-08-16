/* AI-CONTEXT-NOTE:{"R":"cn() — the clsx + tailwind-merge class combiner used across the app.","IDD":[{"?":"tailwind-merge resolves conflicting Tailwind utilities so later classes win."}],"A":[{"?":"app/layout.tsx","Root <html> className"},{"?":"components/shared/RangeFilter.tsx, components/transactions/TransactionList.tsx","Compose utility classes"},{"?":"Every component that conditionally composes utility classes","Depends on cn()"}],"AB":[{"?":"clsx and tailwind-merge versions"}],"E":[{"!!":"npm run build"},{"!!":"npm run lint"},{"?":"Verify class conflicts still resolve last-wins"}]} */

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
