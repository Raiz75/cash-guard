/**
 * FILE NAME: SettingsView.tsx
 *
 * ROLE: Settings page — add/edit/delete categories, export CSV, import CSV, and an Update card with a new-version check + restart dialog.
 *
 * IMPORTANT DEVELOPER DECISIONS ON THIS FILE:
 * ? - Add-category uses React Hook Form + categorySchema; type toggle drives a hidden form field.
 * ? - Edit/delete gates are async: transactionCountForCategory decides whether the category is in use before opening the respective dialog.
 * ? - Export builds the CSV inline (with an # Exported timestamp) and downloads via downloadFile with a date-stamped filename.
 * ? - Import reads the file, parses via parseTransactionsCSV, then importTransactions.
 * ? - Update card uses useServiceWorkerUpdate; dot lights up (bg-primary) when a new SW is waiting; Restart posts SKIP_WAITING then reloads.
 *
 * AFFECTS:
 * ! - app/settings/page.tsx (CRITICAL: rendered by the route)
 * ? - components/settings/CategoryEditDialog.tsx and DeleteCategoryDialog.tsx (opened here)
 *
 * AFFECTED BY:
 * ? - lib/hooks/useServiceWorkerUpdate.ts (update status/actions)
 * ? - lib/hooks/useTransactions.ts (useCategories)
 * ? - lib/csv.ts (parseTransactionsCSV)
 * ? - lib/db/repository.ts (addCategory, exportData, importTransactions, transactionCountForCategory)
 * ? - lib/format.ts (downloadFile, todayISO)
 * ? - lib/validations/transaction.ts (categorySchema, CategoryInput)
 * ? - lib/db/schema.ts (Category type)
 * ? - components/shared/ (Header, BottomNav, CategoryIcon)
 *
 * ON FILE EDIT:
 * ! - npm run build
 * ! - npm run lint
 * ? - Verify add/rename/delete category flows and CSV import/export round-trip
 * ? - Verify update flow: dot/banner states (checking -> up-to-date/available), Restart dialog confirm + cancel paths
 * * - Import must handle empty/invalid CSVs with a toast, not a crash
 *
 * AI INSTRUCTIONS
 * - When editing this file, ALWAYS check the AFFECTS list first
 * - After changes, run ALL tests listed under ON FILE EDIT
 * - If AFFECTED BY files change, verify this file still works
 * - KEEP THIS HEADER CURRENT: whenever you edit this file, update ROLE, decisions, AFFECTS, AFFECTED BY, and ON FILE EDIT to match the change
 * - Keep every entry on one line (no wrapped continuations) so Better Comments highlights the full line
 * - Red (!) items are CRITICAL and cannot be skipped
 * - Blue (?) items are important but not blocking
 * - Green (*) items are nice-to-have; skip if not applicable
 */

"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Download, Plus } from "lucide-react";
import { IconUpload } from "@tabler/icons-react";
import { useCategories } from "@/lib/hooks/useTransactions";
import { parseTransactionsCSV } from "@/lib/csv";
import {
  addCategory,
  exportData,
  importTransactions,
  transactionCountForCategory,
} from "@/lib/db/repository";
import { downloadFile, todayISO } from "@/lib/format";
import {
  categorySchema,
  type CategoryInput,
} from "@/lib/validations/transaction";
import { IconPencil, IconTrash, IconRefresh, IconDownload } from "@tabler/icons-react";
import { useServiceWorkerUpdate } from "@/lib/hooks/useServiceWorkerUpdate";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CategoryEditDialog } from "@/components/settings/CategoryEditDialog";
import { DeleteCategoryDialog } from "@/components/settings/DeleteCategoryDialog";
import type { Category } from "@/lib/db/schema";
import { Header } from "@/components/shared/Header";
import { BottomNav } from "@/components/shared/BottomNav";
import { CategoryIcon } from "@/components/shared/CategoryIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SettingsView() {
  const categories = useCategories() ?? [];
  const [type, setType] = useState<"income" | "expense">("expense");
  const { status, checkForUpdates, applyUpdate } = useServiceWorkerUpdate();
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);

  const form = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", type: "expense" },
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState<{ category: Category; inUse: number } | null>(null);
  const [deleting, setDeleting] = useState<{
    category: Category;
    count: number;
    candidates: Category[];
  } | null>(null);

  const openEdit = async (c: Category) => {
    const inUse = await transactionCountForCategory(c.name);
    setEditing({ category: c, inUse });
  };

  const openDelete = async (c: Category) => {
    const count = await transactionCountForCategory(c.name);
    setDeleting({
      category: c,
      count,
      candidates: categories.filter((x) => x.type === c.type && x.id !== c.id),
    });
  };

  const handleImportCSV = async (file: File) => {
    try {
      const text = await file.text();
      const { rows, error } = parseTransactionsCSV(text);
      if (error) {
        toast.error(error);
        return;
      }
      const result = await importTransactions(rows);
      toast.success(`Imported ${result.imported} · skipped ${result.skipped}`);
    } catch {
      toast.error("Could not import CSV");
    }
  };

  const addNew = async (data: CategoryInput) => {
    await addCategory(data);
    toast.success(`Added "${data.name}"`);
    form.reset({ name: "", type: data.type });
  };

  const handleExportCSV = async () => {
    const { transactions } = await exportData();
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const timestamp =
      `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ` +
      `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const csv = [
      `# Exported: ${timestamp}`,
      ["id", "date", "type", "amount", "category", "description"].join(","),
      ...transactions.map((t) =>
        [t.id, t.date, t.type, t.amount, `"${t.category}"`, `"${t.description ?? ""}"`].join(",")
      ),
    ].join("\n");
    downloadFile(`cash-guard-transactions-${todayISO()}.csv`, csv, "text/csv;charset=utf-8");
    toast.success("CSV downloaded");
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col pb-20">
      <Header title="Settings" />

      <main className="flex-1 space-y-4 px-4 pt-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Add category</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={type === "income" ? "default" : "outline"}
                onClick={() => {
                  setType("income");
                  form.setValue("type", "income");
                }}
              >
                Income
              </Button>
              <Button
                type="button"
                variant={type === "expense" ? "default" : "outline"}
                onClick={() => {
                  setType("expense");
                  form.setValue("type", "expense");
                }}
                className={type === "expense" ? "bg-destructive hover:bg-destructive/90" : ""}
              >
                Expense
              </Button>
            </div>
            <input type="hidden" {...form.register("type")} />
            <div className="space-y-1.5">
              <Label htmlFor="name">Category name</Label>
              <Input
                id="name"
                placeholder="e.g. Coffee"
                {...form.register("name")}
              />
              {form.formState.errors.name ? (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              ) : null}
            </div>
            <Button className="w-full" onClick={form.handleSubmit(addNew)}>
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Categories</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {categories.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No categories yet
              </p>
            ) : (
              categories.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-1 rounded-lg border px-3 py-2 text-sm"
                >
                  <span className="inline-flex min-w-0 items-center gap-1.5 truncate">
                    <CategoryIcon name={c.icon} className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{c.name}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-0.5">
                    <Badge
                      variant={c.type === "income" ? "default" : "destructive"}
                      className="ml-1 text-xs"
                    >
                      {c.type === "income" ? "In" : "Ex"}
                    </Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => void openEdit(c)}
                      aria-label={`Edit ${c.name}`}
                    >
                      <IconPencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="text-destructive hover:text-destructive"
                      onClick={() => void openDelete(c)}
                      aria-label={`Delete ${c.name}`}
                    >
                      <IconTrash className="h-3.5 w-3.5" />
                    </Button>
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full" onClick={handleExportCSV}>
              <Download className="mr-1 h-4 w-4" /> Export CSV
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
            >
              <IconUpload className="mr-1 h-4 w-4" /> Import CSV
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleImportCSV(file);
                e.target.value = "";
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Update</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  status === "available" ? "bg-primary" : "bg-muted"
                )}
              />
              <span className="text-muted-foreground">
                {status === "checking"
                  ? "Checking for updates…"
                  : status === "available"
                    ? "New version available"
                    : "You're up to date"}
              </span>
            </div>
            <Button
              variant="outline"
              className="w-full"
              disabled={status === "checking"}
              onClick={() => void checkForUpdates()}
            >
              <IconRefresh className="mr-1 h-4 w-4" /> Check for updates
            </Button>
            {status === "available" ? (
              <Button className="w-full" onClick={() => setUpdateDialogOpen(true)}>
                <IconDownload className="mr-1 h-4 w-4" /> Restart app
              </Button>
            ) : null}
          </CardContent>
        </Card>

        <p className="pt-4 text-center text-xs text-muted-foreground">
          Created by Neziar
        </p>
      </main>

      <BottomNav />

      {editing ? (
        <CategoryEditDialog
          key={editing.category.id}
          category={editing.category}
          inUse={editing.inUse}
          open
          onOpenChange={(o) => {
            if (!o) setEditing(null);
          }}
        />
      ) : null}
      {deleting ? (
        <DeleteCategoryDialog
          key={deleting.category.id}
          category={deleting.category}
          count={deleting.count}
          candidates={deleting.candidates}
          open
          onOpenChange={(o) => {
            if (!o) setDeleting(null);
          }}
        />
      ) : null}

      <AlertDialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>New version ready</AlertDialogTitle>
            <AlertDialogDescription>
              Restart now to apply the update?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUpdateDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setUpdateDialogOpen(false);
                applyUpdate();
              }}
            >
              Restart
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}