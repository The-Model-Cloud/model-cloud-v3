import { Timestamp } from "firebase/firestore";

// Base type for all site content documents
export interface SiteContentBase {
  id: string;
  updatedAt?: Timestamp;
  updatedBy?: string;
}

// Shared item types
export interface IconItem {
  icon: string; // lucide-react icon name
  title: string;
  description: string;
}

export interface StatItem {
  value: string;
  label: string;
}

export interface TeamMember {
  name: string;
  role: string;
  bio: string;
  imageUrl?: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface TestimonialItem {
  quote: string;
  author: string;
  role: string;
  company?: string;
  rating?: number;
  imageUrl?: string; // Author photo (Cloudinary URL)
}

export interface ComparisonItem {
  feature: string;
  traditional: string;
  modelCloud: string;
}

export interface CTAButton {
  text: string;
  href: string;
}

export interface HowItWorksStep {
  icon: string;
  step: string;
  title: string;
  description: string;
}

// About Us types
export interface AboutUsHero extends SiteContentBase {
  title: string;
  subtitle: string;
}

export interface AboutUsStory extends SiteContentBase {
  content: string; // HTML content
}

export interface AboutUsValues extends SiteContentBase {
  items: IconItem[];
}

export interface AboutUsStats extends SiteContentBase {
  items: StatItem[];
}

export interface AboutUsTeam extends SiteContentBase {
  items: TeamMember[];
}

// Pricing types
export interface PricingHero extends SiteContentBase {
  title: string;
  subtitle: string;
}

export interface PricingModelFeatures extends SiteContentBase {
  items: string[];
}

export interface PricingFAQs extends SiteContentBase {
  items: FAQItem[];
}

// Why Us types
export interface WhyUsHero extends SiteContentBase {
  title: string;
  subtitle: string;
}

export interface WhyUsBenefits extends SiteContentBase {
  items: IconItem[];
}

export interface WhyUsComparisons extends SiteContentBase {
  items: ComparisonItem[];
}

export interface WhyUsTestimonials extends SiteContentBase {
  items: TestimonialItem[];
}

// Contact types
export interface ContactAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
}

export interface ContactHours {
  weekday: string;
  weekend: string;
}

export interface ContactInfo extends SiteContentBase {
  heroTitle: string;
  heroSubtitle: string;
  email: string;
  phone: string;
  address: ContactAddress;
  hours: ContactHours;
}

// Page Metadata type (for SEO)
export interface PageMetadata extends SiteContentBase {
  title: string;
  description: string;
  keywords?: string[];
  ogImage?: string;
  ogType?: string;
  twitterCard?: "summary" | "summary_large_image";
  noIndex?: boolean;
  canonicalUrl?: string;
}

// Homepage types
export interface HomeHero extends SiteContentBase {
  badge: string;
  title: string;
  titleHighlight: string;
  subtitle: string;
  primaryCta: CTAButton;
  secondaryCta: CTAButton;
  trustText: string;
  heroImage?: string; // Hero section image (Cloudinary URL)
}

export interface HomeFeatures extends SiteContentBase {
  sectionTitle: string;
  sectionSubtitle: string;
  items: IconItem[];
}

export interface HomeHowItWorks extends SiteContentBase {
  sectionTitle: string;
  sectionSubtitle: string;
  items: HowItWorksStep[];
}

export interface HomeTestimonials extends SiteContentBase {
  sectionTitle: string;
  sectionSubtitle: string;
  items: TestimonialItem[];
}

export interface HomeCTA extends SiteContentBase {
  title: string;
  subtitle: string;
  primaryCta: CTAButton;
  secondaryCta: CTAButton;
}

// Navigation link type
export interface NavLink {
  href: string;
  label: string;
  icon?: string; // Font Awesome icon name
  external?: boolean;
}

// Social link type
export interface SocialLink {
  platform: string; // e.g., "instagram", "linkedin", "twitter", "facebook"
  url: string;
  icon: string; // Font Awesome icon name
}

// Footer link section
export interface FooterLinkSection {
  title: string;
  links: NavLink[];
}

// Header content
export interface HeaderContent extends SiteContentBase {
  logoLightUrl?: string;
  logoDarkUrl?: string;
  navLinks: NavLink[];
  signInButtonText: string;
  signUpButtonText: string;
}

// Footer content
export interface FooterContent extends SiteContentBase {
  logoLightUrl?: string;
  logoDarkUrl?: string;
  tagline: string;
  sections: FooterLinkSection[];
  socialLinks: SocialLink[];
  copyrightText: string;
}

// Union type for all site content
export type SiteContent =
  | AboutUsHero
  | AboutUsStory
  | AboutUsValues
  | AboutUsStats
  | AboutUsTeam
  | PricingHero
  | PricingModelFeatures
  | PricingFAQs
  | WhyUsHero
  | WhyUsBenefits
  | WhyUsComparisons
  | WhyUsTestimonials
  | ContactInfo
  | HomeHero
  | HomeFeatures
  | HomeHowItWorks
  | HomeTestimonials
  | HomeCTA
  | HeaderContent
  | FooterContent
  | PageMetadata;

// Content section identifiers
export type SiteContentId =
  | "aboutUs-hero"
  | "aboutUs-story"
  | "aboutUs-values"
  | "aboutUs-stats"
  | "aboutUs-team"
  | "pricing-hero"
  | "pricing-modelFeatures"
  | "pricing-faqs"
  | "whyUs-hero"
  | "whyUs-benefits"
  | "whyUs-comparisons"
  | "whyUs-testimonials"
  | "contact-info"
  | "home-hero"
  | "home-features"
  | "home-howItWorks"
  | "home-testimonials"
  | "home-cta"
  // Layout content
  | "layout-header"
  | "layout-footer"
  // Page metadata
  | "meta-home"
  | "meta-about"
  | "meta-pricing"
  | "meta-whyUs"
  | "meta-contact"
  | "meta-signIn"
  | "meta-signUp";
