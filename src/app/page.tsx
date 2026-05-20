import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { PRODUCT_DESCRIPTION, PRODUCT_NAME, PRODUCT_TAGLINE } from "@/lib/product-brand";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-24">
      <div className="max-w-lg text-center">
        <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
          {PRODUCT_TAGLINE}
        </p>
        <h1 className="font-heading mt-2 text-3xl font-semibold tracking-tight sm:text-4xl text-balance">
          {PRODUCT_NAME}
        </h1>
        <p className="text-muted-foreground mt-3 text-pretty text-sm leading-relaxed sm:text-base">
          {PRODUCT_DESCRIPTION}
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
