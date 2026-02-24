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

export interface AboutUsCTA extends SiteContentBase {
  title: string;
  subtitle: string;
  primaryButtonText: string;
  primaryButtonLink: string;
  secondaryButtonText: string;
  secondaryButtonLink: string;
}

// Why Us additional types
export interface WhyUsForModels extends SiteContentBase {
  title: string;
  features: { title: string; description: string }[];
  ctaTitle: string;
  ctaSubtitle: string;
  ctaButtonText: string;
  ctaButtonLink: string;
}

export interface WhyUsForClients extends SiteContentBase {
  title: string;
  features: { title: string; description: string }[];
  ctaTitle: string;
  ctaSubtitle: string;
  ctaButtonText: string;
  ctaButtonLink: string;
}

export interface WhyUsCTA extends SiteContentBase {
  title: string;
  subtitle: string;
  buttonText: string;
  buttonLink: string;
}

// Pricing types
export interface PricingHero extends SiteContentBase {
  title: string;
  subtitle: string;
  modelButtonText?: string;
  clientButtonText?: string;
}

export interface PricingModelsSection extends SiteContentBase {
  title: string;
  subtitle: string;
  icon?: string; // Font Awesome icon name
}

export interface PricingModelCard extends SiteContentBase {
  badge: string; // e.g., "Always Free"
  title: string; // e.g., "Model Account"
  description: string;
  price: string; // e.g., "£0"
  priceSuffix: string; // e.g., "/forever"
  buttonText: string;
  buttonLink: string;
}

export interface PricingClientsSection extends SiteContentBase {
  title: string;
  subtitle: string;
  icon?: string; // Font Awesome icon name
}

export interface PricingComparisonRow {
  feature: string;
  starter: string;
  professional: string;
  enterprise: string;
}

export interface PricingComparison extends SiteContentBase {
  title: string;
  subtitle: string;
  rows: PricingComparisonRow[];
}

export interface PricingCTA extends SiteContentBase {
  title: string;
  subtitle: string;
  modelButtonText: string;
  modelButtonLink: string;
  clientButtonText: string;
  clientButtonLink: string;
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
  title: string;
  subtitle: string;
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

export interface ContactFAQTeaser extends SiteContentBase {
  title: string;
  subtitle: string;
  buttonText: string;
  buttonLink: string;
}

// FAQ Page CTA section
export interface FAQContactCTA extends SiteContentBase {
  title: string;
  subtitle: string;
  buttonText: string;
  buttonLink: string;
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

// FAQ Page types
export interface FAQPageContent extends SiteContentBase {
  heroTitle: string;
  heroSubtitle: string;
  categories: FAQCategory[];
}

export interface FAQCategory {
  title: string;
  icon?: string; // Font Awesome icon name
  items: FAQItem[];
}

// Legal Page types (Privacy & Terms)
export interface LegalPageContent extends SiteContentBase {
  title: string;
  lastUpdated: string;
  content: string; // HTML/Markdown content
}

// Union type for all site content
export type SiteContent =
  | AboutUsHero
  | AboutUsStory
  | AboutUsValues
  | AboutUsStats
  | AboutUsTeam
  | AboutUsCTA
  | WhyUsForModels
  | WhyUsForClients
  | WhyUsCTA
  | PricingHero
  | PricingModelsSection
  | PricingModelCard
  | PricingClientsSection
  | PricingComparison
  | PricingCTA
  | PricingModelFeatures
  | PricingFAQs
  | WhyUsHero
  | WhyUsBenefits
  | WhyUsComparisons
  | WhyUsTestimonials
  | ContactInfo
  | ContactFAQTeaser
  | FAQContactCTA
  | HomeHero
  | HomeFeatures
  | HomeHowItWorks
  | HomeTestimonials
  | HomeCTA
  | HeaderContent
  | FooterContent
  | FAQPageContent
  | LegalPageContent
  | PageMetadata;

// Content section identifiers
export type SiteContentId =
  | "aboutUs-hero"
  | "aboutUs-story"
  | "aboutUs-values"
  | "aboutUs-stats"
  | "aboutUs-team"
  | "aboutUs-cta"
  | "whyUs-forModels"
  | "whyUs-forClients"
  | "whyUs-cta"
  | "pricing-hero"
  | "pricing-modelsSection"
  | "pricing-modelCard"
  | "pricing-clientsSection"
  | "pricing-comparison"
  | "pricing-cta"
  | "pricing-modelFeatures"
  | "pricing-faqs"
  | "whyUs-hero"
  | "whyUs-benefits"
  | "whyUs-comparisons"
  | "whyUs-testimonials"
  | "contact-info"
  | "contact-faqTeaser"
  | "faq-cta"
  | "home-hero"
  | "home-features"
  | "home-howItWorks"
  | "home-testimonials"
  | "home-cta"
  // Layout content
  | "layout-header"
  | "layout-footer"
  // FAQ page
  | "faq-content"
  // Legal pages
  | "legal-privacy"
  | "legal-terms"
  // Page metadata
  | "meta-home"
  | "meta-about"
  | "meta-pricing"
  | "meta-whyUs"
  | "meta-contact"
  | "meta-signIn"
  | "meta-signUp"
  | "meta-faq"
  | "meta-privacy"
  | "meta-terms";
