"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { BarChart2, LayoutDashboard, Link2, Settings2 } from "lucide-react";

const nav = [
  { href: "/portal", label: "Overview", icon: LayoutDashboard },
  { href: "/portal/connectors", label: "BI connectors", icon: Link2 },
  { href: "/portal/roi", label: "ROI & performance", icon: BarChart2 },
  { href: "/portal/settings", label: "Organization", icon: Settings2 },
];

export function PortalSidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center border-b border-sidebar-border px-4">
        <Link href="/portal" className="font-heading text-sm font-semibold tracking-tight">
          BI-Pruner
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-2">
        {nav.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/portal"
              ? pathname === "/portal"
              : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/60",
              )}
            >
              <Icon className="size-4 opacity-80" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
      <p className="border-t border-sidebar-border p-3 text-xs text-muted-foreground leading-relaxed">
        Next: wire Snowflake / BigQuery query logs for savings attribution and department cost mapping.
      </p>
    </aside>
  );
}
