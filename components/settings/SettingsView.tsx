"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Download, Plus } from "lucide-react";
import { useCategories } from "@/lib/hooks/useTransactions";
import { addCategory } from "@/lib/db/repository";
import { exportData } from "@/lib/db/repository";
import { downloadFile } from "@/lib/format";
import {
  categorySchema,
  type CategoryInput,
} from "@/lib/validations/transaction";
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

  const form = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", type: "expense" },
  });

  const addNew = async (data: CategoryInput) => {
    await addCategory(data);
    toast.success(`Added "${data.name}"`);
    form.reset({ name: "", type: data.type });
  };

  const handleExportCSV = async () => {
    const { transactions } = await exportData();
    const csv = [
      ["date", "type", "amount", "category", "description"].join(","),
      ...transactions.map((t) =>
        [t.date, t.type, t.amount, `"${t.category}"`, `"${t.description ?? ""}"`].join(",")
      ),
    ].join("\n");
    downloadFile("cash-guard-transactions.csv", csv, "text/csv;charset=utf-8");
    toast.success("CSV downloaded");
  };

  const handleExportJSON = async () => {
    const data = await exportData();
    downloadFile(
      "cash-guard-backup.json",
      JSON.stringify(data, null, 2),
      "application/json"
    );
    toast.success("Backup downloaded");
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
          <CardContent className="grid grid-cols-2 gap-2">
            {categories.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
              >
                <span className="inline-flex min-w-0 items-center gap-1.5 truncate">
                  <CategoryIcon name={c.icon} className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{c.name}</span>
                </span>
<Badge
                  variant={c.type === "income" ? "default" : "destructive"}
                  className="ml-1 shrink-0 text-xs"
                >
                  {c.type === "income" ? "In" : "Ex"}
                </Badge>
              </div>
            ))}
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
            <Button variant="outline" className="w-full" onClick={handleExportJSON}>
              <Download className="mr-1 h-4 w-4" /> Export JSON backup
            </Button>
          </CardContent>
        </Card>

        <p className="pt-4 text-center text-xs text-muted-foreground">
          Created by Neziar
        </p>
      </main>

      <BottomNav />
    </div>
  );
}