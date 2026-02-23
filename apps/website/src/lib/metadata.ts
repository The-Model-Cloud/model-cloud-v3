import type { Metadata } from "next";
import { getSiteContent } from "./firebase/firestore";
import type { PageMetadata, SiteContentId } from "@/types/siteContent";

// Default metadata for the site
const defaultMetadata = {
  siteName: "The Model Cloud",
  siteUrl: "https://themodel.cloud",
  defaultOgImage: "/og-image.jpg",
};

// Default metadata for each page
const pageDefaults: Record<string, Partial<PageMetadata>> = {
  "meta-home": {
    title: "The Model Cloud | Modern Model Booking Platform",
    description:
      "The modern platform for model booking and talent management. Connect with top models and streamline your booking process.",
    keywords: ["model booking", "talent management", "fashion", "models", "booking platform"],
  },
  "meta-about": {
    title: "About Us",
    description:
      "Learn about The Model Cloud - the modern platform revolutionizing how clients discover and book professional models.",
    keywords: ["about", "model cloud", "company", "mission", "team"],
  },
  "meta-pricing": {
    title: "Pricing",
    description:
      "Simple, transparent pricing for The Model Cloud. Free for models, flexible plans for clients looking to discover and book talent.",
    keywords: ["pricing", "plans", "subscription", "free trial", "model booking cost"],
  },
  "meta-whyUs": {
    title: "Why Choose Us",
    description:
      "Discover why leading agencies and clients choose The Model Cloud for their model booking needs.",
    keywords: ["why us", "benefits", "features", "comparison", "model booking platform"],
  },
  "meta-contact": {
    title: "Contact Us",
    description:
      "Get in touch with The Model Cloud team. We're here to help with any questions about our platform.",
    keywords: ["contact", "support", "help", "questions", "get in touch"],
  },
  "meta-signIn": {
    title: "Sign In",
    description: "Sign in to your Model Cloud account to manage bookings, profiles, and more.",
    keywords: ["sign in", "login", "account"],
    noIndex: true,
  },
  "meta-signUp": {
    title: "Sign Up",
    description:
      "Create your free Model Cloud account. Join thousands of models and clients already using our platform.",
    keywords: ["sign up", "register", "create account", "join"],
  },
};

/**
 * Generate metadata for a page
 * Fetches from Firestore at build time, falls back to defaults
 */
export async function generatePageMetadata(pageId: SiteContentId): Promise<Metadata> {
  const defaults = pageDefaults[pageId] || {};

  try {
    const content = await getSiteContent<PageMetadata>(pageId);
    const meta = content || defaults;

    const title = meta.title || defaults.title || defaultMetadata.siteName;
    const description = meta.description || defaults.description || "";
    const keywords = meta.keywords || defaults.keywords || [];
    const ogImage = meta.ogImage || defaultMetadata.defaultOgImage;
    const ogType = (meta.ogType as "website" | "article") || "website";
    const twitterCard = meta.twitterCard || "summary_large_image";
    const canonicalUrl = meta.canonicalUrl;
    const noIndex = meta.noIndex || false;

    const metadata: Metadata = {
      title,
      description,
      keywords: keywords.join(", "),
      openGraph: {
        title,
        description,
        type: ogType,
        siteName: defaultMetadata.siteName,
        url: defaultMetadata.siteUrl,
        images: ogImage ? [{ url: ogImage }] : undefined,
      },
      twitter: {
        card: twitterCard,
        title,
        description,
        images: ogImage ? [ogImage] : undefined,
      },
      robots: noIndex ? { index: false, follow: false } : undefined,
      alternates: canonicalUrl ? { canonical: canonicalUrl } : undefined,
    };

    return metadata;
  } catch (error) {
    console.error(`Error fetching metadata for ${pageId}:`, error);

    // Return defaults on error
    return {
      title: defaults.title || defaultMetadata.siteName,
      description: defaults.description || "",
    };
  }
}
