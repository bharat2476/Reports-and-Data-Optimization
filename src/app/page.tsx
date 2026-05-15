import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-24">
      <div className="max-w-lg text-center">
        <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
          BI observability
        </p>
        <h1 className="font-heading mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          BI-Pruner
        </h1>
        <p className="text-muted-foreground mt-3 text-pretty text-sm leading-relaxed sm:text-base">
          Audit enterprise BI usage, detect duplicate semantic logic, and run a disciplined report
          lifecycle to cut latency and cloud cost.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/portal" className={cn(buttonVariants({ size: "lg" }))}>
            Open admin portal
          </Link>
          <Link
            href="/portal/connectors"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
          >
            Add BI connector
          </Link>
        </div>
      </div>
    </div>
  );
}
