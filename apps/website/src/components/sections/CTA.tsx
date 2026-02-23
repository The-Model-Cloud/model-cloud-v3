"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight } from "lucide-react";
import { useSiteContent } from "@/lib/hooks/useSiteContent";
import { PLATFORM_URLS } from "@/lib/urls";
import type { HomeCTA } from "@/types/siteContent";

const fallbackCta = {
  title: "Ready to Transform Your Booking Experience?",
  subtitle:
    "Join thousands of models and clients already using The Model Cloud to streamline their workflow and grow their business.",
  primaryCta: { text: "Start Free Trial", href: PLATFORM_URLS.signUp },
  secondaryCta: { text: "Contact Sales", href: "/contact" },
};

export function CTA() {
  const { content, loading } = useSiteContent<HomeCTA>("home-cta");
  const cta = content ?? fallbackCta;

  if (loading) {
    return (
      <section className="py-20">
        <div className="container">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-purple-600 px-8 py-16 md:px-16 md:py-24">
            <div className="relative max-w-3xl mx-auto text-center">
              <Skeleton className="h-12 w-3/4 mx-auto mb-6 bg-white/20" />
              <Skeleton className="h-6 w-full mx-auto mb-10 bg-white/20" />
              <div className="flex justify-center gap-4">
                <Skeleton className="h-12 w-40 bg-white/20" />
                <Skeleton className="h-12 w-40 bg-white/20" />
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20">
      <div className="container">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-purple-600 px-8 py-16 md:px-16 md:py-24">
          {/* Decorative elements */}
          <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/10 rounded-full translate-x-1/3 translate-y-1/3" />

          <div className="relative max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
              {cta.title}
            </h2>
            <p className="text-xl text-white/80 mb-10">{cta.subtitle}</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                variant="secondary"
                asChild
                className="text-lg px-8 bg-white text-primary hover:bg-white/90"
              >
                <Link href={cta.primaryCta.href}>
                  {cta.primaryCta.text}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="text-lg px-8 border-white text-white hover:bg-white/10"
              >
                <Link href={cta.secondaryCta.href}>{cta.secondaryCta.text}</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
