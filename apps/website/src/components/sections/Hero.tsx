"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Play } from "lucide-react";
import { useSiteContent } from "@/lib/hooks/useSiteContent";
import { useHeroModels } from "@/lib/hooks/useHeroModels";
import { cloudinaryUrl } from "@/lib/cloudinary";
import { PLATFORM_URLS } from "@/lib/urls";
import type { HomeHero, HeroModelImage } from "@/types/siteContent";

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

// Generate random position data for a parallax circle
interface CirclePosition {
  x: number; // percentage from left
  y: number; // percentage from top
  size: number; // pixel size
  depth: number; // 0-1, affects speed and opacity (0 = far/slow, 1 = close/fast)
  speed: number; // parallax speed multiplier
  opacity: number;
  zIndex: number;
}

function generateRandomPositions(count: number): CirclePosition[] {
  const positions: CirclePosition[] = [];

  for (let i = 0; i < count; i++) {
    // Random depth determines size, speed, opacity
    const depth = Math.random();

    // Size ranges from 40px (far) to 150px (close)
    const size = 40 + depth * 110;

    // Speed: far objects move slower (0.05), close objects faster (0.5)
    const speed = 0.05 + depth * 0.45;

    // Opacity: far objects more transparent (0.4), close objects more opaque (0.95)
    const opacity = 0.4 + depth * 0.55;

    // Z-index based on depth
    const zIndex = Math.floor(depth * 10);

    // Random position - keep away from center where text is
    let x: number, y: number;
    const attempt = Math.random();

    if (attempt < 0.5) {
      // Left or right edges
      x = Math.random() < 0.5 ? Math.random() * 20 : 80 + Math.random() * 20;
      y = Math.random() * 100;
    } else {
      // Top or bottom edges, but can extend further into sides
      x = Math.random() * 100;
      y = Math.random() < 0.5 ? Math.random() * 30 : 70 + Math.random() * 30;
    }

    positions.push({ x, y, size, depth, speed, opacity, zIndex });
  }

  // Sort by depth so far objects render first (behind)
  return positions.sort((a, b) => a.depth - b.depth);
}

interface ParallaxCircleProps {
  image: HeroModelImage;
  position: CirclePosition;
  scrollY: number;
  index: number;
}

function ParallaxCircle({ image, position, scrollY, index }: ParallaxCircleProps) {
  const { x, y, size, speed, opacity, zIndex } = position;
  const translateY = scrollY * speed;

  const optimizedUrl = cloudinaryUrl(image.url, {
    width: Math.round(size * 2), // 2x for retina
    height: Math.round(size * 2),
    crop: "fill",
    gravity: "face",
  });

  if (!optimizedUrl) return null;

  return (
    <div
      className="absolute rounded-full overflow-hidden shadow-2xl ring-2 ring-white/10 hidden md:block transition-opacity duration-300"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: size,
        height: size,
        transform: `translate(-50%, -50%) translateY(${translateY}px)`,
        opacity,
        zIndex,
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-purple-400/10 z-10" />
      <Image
        src={optimizedUrl}
        alt={image.alt || `Model ${index + 1}`}
        width={Math.round(size)}
        height={Math.round(size)}
        className="w-full h-full object-cover"
        priority={index < 4}
      />
    </div>
  );
}

export function Hero() {
  const { content, loading } = useSiteContent<HomeHero>("home-hero");
  const { models } = useHeroModels(60); // Request 60 models
  const [scrollY, setScrollY] = useState(0);
  const hero = content ?? fallbackHero;

  // Generate stable random positions based on model count
  const positions = useMemo(
    () => generateRandomPositions(models.length),
    [models.length]
  );

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

      {/* Decorative blur elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-purple-300/5 rounded-full blur-3xl" />

      {/* Parallax model circles - layered by depth */}
      {models.map((image, index) => (
        <ParallaxCircle
          key={image.url}
          image={image}
          position={positions[index] || positions[0]}
          scrollY={scrollY}
          index={index}
        />
      ))}

      <div className="container relative z-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8 backdrop-blur-sm">
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
              <a href={PLATFORM_URLS.signUp}>
                {hero.primaryCta.text}
                <ArrowRight className="ml-2 h-5 w-5" />
              </a>
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
