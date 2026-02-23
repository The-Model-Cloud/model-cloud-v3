"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Play } from "lucide-react";
import { useSiteContent } from "@/lib/hooks/useSiteContent";
import { PLATFORM_URLS } from "@/lib/urls";
import type { HomeHero } from "@/types/siteContent";

const fallbackHero = {
  badge: "Now accepting new models and clients",
  title: "The Modern Way to",
  titleHighlight: "Book Models",
  subtitle:
    "Streamline your talent booking process with our powerful platform. Connect with top models, manage bookings, and grow your business effortlessly.",
  primaryCta: { text: "Get Started Free", href: PLATFORM_URLS.signUp },
  secondaryCta: { text: "See How It Works", href: "/pricing" },
  trustText: "Trusted by leading agencies worldwide",
};

export function Hero() {
  const { content, loading } = useSiteContent<HomeHero>("home-hero");
  const hero = content ?? fallbackHero;

  if (loading) {
    return (
      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/20" />
        <div className="container relative">
          <div className="max-w-4xl mx-auto text-center">
            <Skeleton className="h-8 w-64 mx-auto mb-8 rounded-full" />
            <Skeleton className="h-16 w-3/4 mx-auto mb-6" />
            <Skeleton className="h-6 w-2/3 mx-auto mb-10" />
            <div className="flex justify-center gap-4">
              <Skeleton className="h-12 w-40" />
              <Skeleton className="h-12 w-40" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden py-20 md:py-32">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/20" />

      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl" />

      <div className="container relative">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
            <span className="relative flex h-2 w-2 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            {hero.badge}
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
            {hero.title}{" "}
            <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
              {hero.titleHighlight}
            </span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            {hero.subtitle}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" asChild className="text-lg px-8">
              <Link href={hero.primaryCta.href}>
                {hero.primaryCta.text}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="text-lg px-8">
              <Link href={hero.secondaryCta.href}>
                <Play className="mr-2 h-5 w-5" />
                {hero.secondaryCta.text}
              </Link>
            </Button>
          </div>

          <p className="mt-8 text-sm text-muted-foreground">{hero.trustText}</p>
        </div>
      </div>
    </section>
  );
}
