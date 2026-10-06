"use client";

import { motion } from "framer-motion";
import { Target, Sparkles, Columns3, Bookmark } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

const features = [
  {
    icon: Target,
    title: "Personalized matching",
    description:
      "Tell us your budget, major, and preferences once — we do the filtering for every recommendation after that.",
  },
  {
    icon: Sparkles,
    title: "Match scores & explanations",
    description:
      "Every university comes with a match score and a plain-language explanation of why it's a good fit for you.",
  },
  {
    icon: Columns3,
    title: "Side-by-side comparison",
    description:
      "Shortlisted a couple of schools? Compare tuition, ranking, and programs side by side in one view.",
  },
  {
    icon: Bookmark,
    title: "Save your favorites",
    description:
      "Bookmark universities as you explore and come back to your saved list anytime.",
  },
];

export function FeatureCards() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Everything you need to choose with confidence
        </h2>
        <p className="mt-3 text-muted-foreground">
          Less guesswork, less scrolling through generic rankings — just the
          schools that make sense for your profile.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((feature, i) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
          >
            <Card className="h-full rounded-2xl transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <feature.icon className="size-5" />
                </div>
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
