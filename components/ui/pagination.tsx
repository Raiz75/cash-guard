"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      data-slot="pagination"
      aria-label="pagination"
      className={cn("mx-auto w-full", className)}
      {...props}
    />
  )
}

function PaginationContent({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn("flex flex-row items-center justify-between gap-2", className)}
      {...props}
    />
  )
}

function PaginationItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="pagination-item"
      className={cn("", className)}
      {...props}
    />
  )
}

function PaginationPrevious({
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      data-slot="pagination-previous"
      className={cn(buttonVariants({ variant: "outline", size: "sm" }), className)}
      {...props}
    >
      <ChevronLeft data-icon="inline-start" />
      Previous
    </button>
  )
}

function PaginationNext({
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      data-slot="pagination-next"
      className={cn(buttonVariants({ variant: "outline", size: "sm" }), className)}
      {...props}
    >
      Next
      <ChevronRight data-icon="inline-end" />
    </button>
  )
}

export { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext }
