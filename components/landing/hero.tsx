"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Compass } from "lucide-react";
import { BRAND_NAME } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { Flag } from "@/components/flag";

// Purely decorative "match card" chips floating around the headline on
// larger screens — a quick visual preview of what the product actually does.
const FLOATING_MATCHES = [
  { country: "Canada", name: "U. of Toronto", score: 94, className: "left-[4%] top-[14%]" },
  { country: "United Kingdom", name: "U. of Edinburgh", score: 88, className: "top-[8%] right-[6%]" },
  { country: "Germany", name: "TU Munich", score: 91, className: "bottom-[16%] left-[9%]" },
  { country: "Singapore", name: "NUS", score: 85, className: "right-[4%] bottom-[10%]" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Soft gradient blob in the background, purely decorative */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 -z-10 flex justify-center blur-3xl"
      >
        <div className="h-[420px] w-[720px] rounded-full bg-gradient-to-tr from-primary/30 via-primary/10 to-transparent" />
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden lg:block"
      >
        {FLOATING_MATCHES.map((match, i) => (
          <motion.div
            key={match.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: [0, -8, 0] }}
            transition={{
              opacity: { duration: 0.6, delay: 0.4 + i * 0.15 },
              y: {
                duration: 4 + i,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.4 + i * 0.15,
              },
            }}
            className={`absolute flex items-center gap-2 rounded-xl border bg-card/90 px-3 py-2 text-xs font-medium shadow-sm backdrop-blur ${match.className}`}
          >
            <Flag country={match.country} />
            <span className="text-foreground">{match.name}</span>
            <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 font-semibold text-emerald-600 dark:text-emerald-400">
              {match.score}%
            </span>
          </motion.div>
        ))}
      </div>

      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-24 text-center sm:px-6 sm:py-32">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-sm font-medium text-muted-foreground"
        >
          <Compass className="size-4 text-primary" />
          Personalized university matching
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="max-w-3xl text-4xl font-bold tracking-tight text-balance sm:text-5xl md:text-6xl"
        >
          Find the university that actually fits{" "}
          <span className="text-primary">you</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="max-w-xl text-lg text-muted-foreground text-balance"
        >
          {BRAND_NAME} matches you to universities based on your budget,
          academic profile, and preferences — not just generic rankings.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col gap-3 pt-2 sm:flex-row"
        >
          <Button size="lg" asChild>
            <Link href="/signup">
              Get started
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/login">I already have an account</Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
