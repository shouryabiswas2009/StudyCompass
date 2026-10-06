"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CtaSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 sm:pb-28">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center gap-6 rounded-3xl border bg-muted/40 px-6 py-16 text-center sm:px-16"
      >
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Ready to find your fit?
        </h2>
        <p className="max-w-lg text-muted-foreground">
          Create your free profile in a couple of minutes and get matched
          with universities that make sense for you.
        </p>
        <Button size="lg" asChild>
          <Link href="/signup">
            Create your profile
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </motion.div>
    </section>
  );
}
