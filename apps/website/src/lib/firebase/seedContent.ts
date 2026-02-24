import { saveSiteContent, savePricingTier } from "./firestore";
import type { PricingTier } from "@/types/pricing";
import type {
  AboutUsHero,
  AboutUsStory,
  AboutUsValues,
  AboutUsStats,
  AboutUsTeam,
  PricingHero,
  PricingModelFeatures,
  PricingFAQs,
  WhyUsHero,
  WhyUsBenefits,
  WhyUsComparisons,
  WhyUsTestimonials,
  ContactInfo,
  HomeHero,
  HomeFeatures,
  HomeHowItWorks,
  HomeTestimonials,
  HomeCTA,
} from "@/types/siteContent";

// About Us seed data
const aboutUsHero: Omit<AboutUsHero, "id" | "updatedAt" | "updatedBy"> = {
  title: "Building the Future of Model Booking",
  subtitle:
    "We're on a mission to transform how models and clients connect, making the booking process simpler, faster, and more transparent.",
};

const aboutUsStory: Omit<AboutUsStory, "id" | "updatedAt" | "updatedBy"> = {
  content: `<p>The Model Cloud was born out of frustration with the traditional model booking process. Our founders, having worked in both the fashion industry and tech, saw firsthand how outdated systems were holding back both talent and clients.</p>
<p>In 2020, we set out to build something different - a platform that puts transparency and efficiency at its core. We wanted to create a space where models could showcase their portfolios, manage their bookings, and connect with clients seamlessly.</p>
<p>Today, The Model Cloud serves thousands of users worldwide, from independent models to major fashion brands. But we're just getting started. Our vision is to become the global standard for talent booking in the fashion and entertainment industries.</p>`,
};

const aboutUsValues: Omit<AboutUsValues, "id" | "updatedAt" | "updatedBy"> = {
  items: [
    {
      icon: "Target",
      title: "Our Mission",
      description:
        "To revolutionize the model booking industry by providing a seamless, transparent, and efficient platform that connects talent with opportunities worldwide.",
    },
    {
      icon: "Heart",
      title: "Our Values",
      description:
        "We believe in transparency, fairness, and empowering both models and clients to succeed. Every feature we build is designed with our users in mind.",
    },
    {
      icon: "Globe",
      title: "Global Reach",
      description:
        "With users in over 50 countries, we're building a truly global community that breaks down geographical barriers in the fashion and modeling industry.",
    },
    {
      icon: "Award",
      title: "Excellence",
      description:
        "We strive for excellence in everything we do - from our platform's user experience to the quality of talent and opportunities we facilitate.",
    },
  ],
};

const aboutUsStats: Omit<AboutUsStats, "id" | "updatedAt" | "updatedBy"> = {
  items: [
    { value: "10,000+", label: "Active Models" },
    { value: "5,000+", label: "Clients" },
    { value: "50+", label: "Countries" },
    { value: "100,000+", label: "Successful Bookings" },
  ],
};

const aboutUsTeam: Omit<AboutUsTeam, "id" | "updatedAt" | "updatedBy"> = {
  items: [
    {
      name: "Matthew Smith",
      role: "CEO & Co-Founder",
      bio: "Former fashion industry executive with 15 years of experience at top agencies.",
    },
    {
      name: "Russell English",
      role: "CTO & Co-Founder",
      bio: "Tech entrepreneur who previously built and sold two successful startups.",
    },
    {
      name: "Emma Rodriguez",
      role: "Head of Operations",
      bio: "Operations expert with a background in scaling marketplace businesses.",
    },
    {
      name: "Michael Thompson",
      role: "Head of Product",
      bio: "Product leader passionate about creating delightful user experiences.",
    },
  ],
};

// Pricing Tiers seed data (stored in pricingTiers collection)
const pricingTiers: Omit<PricingTier, "id">[] = [
  {
    name: "Starter",
    description: "Perfect for small businesses and individuals getting started",
    price: 49.99,
    billingPeriod: "monthly",
    features: [
      "Up to 10 saved favorites",
      "Basic search filters",
      "Email support",
      "1 team member",
      "Standard listings",
    ],
    highlighted: false,
    order: 1,
    published: true,
  },
  {
    name: "Professional",
    description: "Ideal for growing businesses with regular booking needs",
    price: 99.99,
    billingPeriod: "monthly",
    features: [
      "Unlimited saved favorites",
      "Advanced search filters",
      "Priority support",
      "Up to 5 team members",
      "Direct messaging",
      "Booking analytics",
      "Featured listings",
    ],
    highlighted: true,
    order: 2,
    published: true,
  },
  {
    name: "Enterprise",
    description: "For agencies and large teams with high-volume needs",
    price: 149.99,
    billingPeriod: "monthly",
    features: [
      "Everything in Professional",
      "Unlimited team members",
      "API access",
      "Custom branding",
      "Dedicated account manager",
      "Priority placement",
      "Advanced analytics",
      "6 managed client seats included",
    ],
    highlighted: false,
    order: 3,
    published: true,
  },
];

// Pricing seed data
const pricingHero: Omit<PricingHero, "id" | "updatedAt" | "updatedBy"> = {
  title: "Simple, Transparent Pricing",
  subtitle:
    "Free for models. Flexible plans for clients looking to discover and book talent.",
};

const pricingModelFeatures: Omit<
  PricingModelFeatures,
  "id" | "updatedAt" | "updatedBy"
> = {
  items: [
    "Complete profile with unlimited photos",
    "Portfolio showcase",
    "Receive booking requests",
    "Direct messaging with clients",
    "Analytics & insights",
    "Verified badge eligibility",
    "Community access",
    "Mobile app access",
  ],
};

const pricingFaqs: Omit<PricingFAQs, "id" | "updatedAt" | "updatedBy"> = {
  items: [
    {
      question: "Is it really free for models?",
      answer:
        "Yes! Model accounts are completely free. We believe in empowering talent to showcase their work without barriers. You get full access to all model features at no cost.",
    },
    {
      question: "Can I change my client plan later?",
      answer:
        "Yes, you can upgrade or downgrade your plan at any time. Changes take effect at the start of your next billing cycle.",
    },
    {
      question: "Is there a free trial for paid plans?",
      answer:
        "Yes! All paid client plans come with a 14-day free trial. No credit card required to start.",
    },
    {
      question: "What payment methods do you accept?",
      answer:
        "We accept all major credit cards (Visa, MasterCard, American Express) as well as PayPal.",
    },
    {
      question: "Can I cancel my subscription?",
      answer:
        "Yes, you can cancel your subscription at any time from your account settings. You'll continue to have access until the end of your billing period.",
    },
  ],
};

// Why Us seed data
const whyUsHero: Omit<WhyUsHero, "id" | "updatedAt" | "updatedBy"> = {
  title: "Why Choose The Model Cloud?",
  subtitle:
    "We're not just another booking platform. We're your partner in building a successful career in the modeling industry.",
};

const whyUsBenefits: Omit<WhyUsBenefits, "id" | "updatedAt" | "updatedBy"> = {
  items: [
    {
      icon: "Zap",
      title: "Lightning Fast Bookings",
      description:
        "Our streamlined process means you can go from discovery to confirmed booking in minutes, not days.",
    },
    {
      icon: "Shield",
      title: "Secure & Protected",
      description:
        "Bank-level security for your data and transactions. Your privacy and safety are our top priority.",
    },
    {
      icon: "TrendingUp",
      title: "Grow Your Business",
      description:
        "Powerful analytics and insights help you understand your performance and make data-driven decisions.",
    },
    {
      icon: "Clock",
      title: "Save Valuable Time",
      description:
        "Automate tedious tasks like scheduling, invoicing, and follow-ups so you can focus on what matters.",
    },
    {
      icon: "HeartHandshake",
      title: "Quality Connections",
      description:
        "Our verification system ensures you're connecting with legitimate, professional partners.",
    },
    {
      icon: "Award",
      title: "Industry Recognition",
      description:
        "Trusted by leading agencies and brands worldwide. Join a platform with a proven track record.",
    },
  ],
};

const whyUsComparisons: Omit<
  WhyUsComparisons,
  "id" | "updatedAt" | "updatedBy"
> = {
  title: "The Model Cloud vs Traditional Methods",
  subtitle: "See how we compare to traditional booking methods",
  items: [
    {
      feature: "Booking Time",
      traditional: "Days to weeks",
      modelCloud: "Minutes to hours",
    },
    {
      feature: "Commission Fees",
      traditional: "20-40%",
      modelCloud: "Transparent flat rates",
    },
    {
      feature: "Payment Processing",
      traditional: "30-90 days",
      modelCloud: "Within 48 hours",
    },
    {
      feature: "Portfolio Management",
      traditional: "Scattered files",
      modelCloud: "Centralized & organized",
    },
    {
      feature: "Global Reach",
      traditional: "Limited networks",
      modelCloud: "50+ countries",
    },
    {
      feature: "Support",
      traditional: "Business hours only",
      modelCloud: "24/7 available",
    },
  ],
};

const whyUsTestimonials: Omit<
  WhyUsTestimonials,
  "id" | "updatedAt" | "updatedBy"
> = {
  items: [
    {
      quote:
        "Switching to The Model Cloud was the best decision for my agency. We've increased our booking efficiency by 70%.",
      author: "David Kim",
      role: "Agency Owner",
    },
    {
      quote:
        "As an independent model, this platform gave me access to opportunities I never could have found on my own.",
      author: "Lisa Martinez",
      role: "Fashion Model",
    },
  ],
};

// Contact seed data
const contactInfo: Omit<ContactInfo, "id" | "updatedAt" | "updatedBy"> = {
  heroTitle: "Get in Touch",
  heroSubtitle:
    "Have questions or feedback? We'd love to hear from you. Our team is here to help.",
  email: "hello@themodel.cloud",
  phone: "+1 (555) 123-4567",
  address: {
    line1: "123 Fashion Avenue",
    city: "New York",
    state: "NY",
    zip: "10001",
  },
  hours: {
    weekday: "Monday - Friday: 9am - 6pm EST",
    weekend: "Weekend: Limited support",
  },
};

// Homepage seed data
const homeHero: Omit<HomeHero, "id" | "updatedAt" | "updatedBy"> = {
  badge: "Now accepting new models and clients",
  title: "The Modern Way to",
  titleHighlight: "Book Models",
  subtitle:
    "Streamline your talent booking process with our powerful platform. Connect with top models, manage bookings, and grow your business effortlessly.",
  primaryCta: { text: "Get Started Free", href: "/sign-up" },
  secondaryCta: { text: "See How It Works", href: "/pricing" },
  trustText: "Trusted by leading agencies worldwide",
};

const homeFeatures: Omit<HomeFeatures, "id" | "updatedAt" | "updatedBy"> = {
  sectionTitle: "Everything You Need to Succeed",
  sectionSubtitle:
    "Powerful features designed to streamline your model booking workflow and help you grow your business.",
  items: [
    {
      icon: "Calendar",
      title: "Smart Scheduling",
      description:
        "Manage bookings, availability, and schedules with our intuitive calendar system. Never double-book again.",
    },
    {
      icon: "Users",
      title: "Talent Discovery",
      description:
        "Browse and filter through our curated pool of professional models. Find the perfect fit for every project.",
    },
    {
      icon: "BarChart3",
      title: "Analytics Dashboard",
      description:
        "Track performance, earnings, and booking trends with comprehensive analytics and reporting.",
    },
    {
      icon: "Shield",
      title: "Secure Payments",
      description:
        "Process payments securely with our integrated payment system. Transparent pricing, no hidden fees.",
    },
    {
      icon: "Zap",
      title: "Instant Notifications",
      description:
        "Stay updated with real-time notifications for bookings, messages, and important updates.",
    },
    {
      icon: "Globe",
      title: "Global Reach",
      description:
        "Connect with models and clients worldwide. Expand your network and grow your opportunities.",
    },
  ],
};

const homeHowItWorks: Omit<HomeHowItWorks, "id" | "updatedAt" | "updatedBy"> = {
  sectionTitle: "How It Works",
  sectionSubtitle:
    "Getting started is easy. Follow these simple steps to begin your journey with The Model Cloud.",
  items: [
    {
      icon: "UserPlus",
      step: "01",
      title: "Create Your Profile",
      description:
        "Sign up and build your professional profile. Models showcase their portfolio, clients outline their needs.",
    },
    {
      icon: "Search",
      step: "02",
      title: "Discover & Connect",
      description:
        "Browse through talent or opportunities. Use filters to find the perfect match for your project.",
    },
    {
      icon: "CalendarCheck",
      step: "03",
      title: "Book & Manage",
      description:
        "Send booking requests, negotiate terms, and manage your schedule all in one place.",
    },
    {
      icon: "Star",
      step: "04",
      title: "Collaborate & Grow",
      description:
        "Complete bookings, leave reviews, and build lasting professional relationships.",
    },
  ],
};

const homeTestimonials: Omit<
  HomeTestimonials,
  "id" | "updatedAt" | "updatedBy"
> = {
  sectionTitle: "Loved by Industry Professionals",
  sectionSubtitle:
    "See what our users have to say about their experience with The Model Cloud.",
  items: [
    {
      quote:
        "The Model Cloud has transformed how we manage our talent bookings. The platform is intuitive and the support team is exceptional.",
      author: "Sarah Johnson",
      role: "Agency Director",
      company: "Elite Models NYC",
      rating: 5,
    },
    {
      quote:
        "As a model, having everything in one place - my portfolio, bookings, and payments - has made my life so much easier. Highly recommend!",
      author: "Michael Chen",
      role: "Professional Model",
      company: "Independent",
      rating: 5,
    },
    {
      quote:
        "We've reduced our booking time by 60% since switching to The Model Cloud. The analytics help us make better decisions for our campaigns.",
      author: "Emily Rodriguez",
      role: "Marketing Manager",
      company: "Fashion Forward Co",
      rating: 5,
    },
  ],
};

const homeCta: Omit<HomeCTA, "id" | "updatedAt" | "updatedBy"> = {
  title: "Ready to Transform Your Booking Experience?",
  subtitle:
    "Join thousands of models and clients already using The Model Cloud to streamline their workflow and grow their business.",
  primaryCta: { text: "Start Free Trial", href: "/sign-up" },
  secondaryCta: { text: "Contact Sales", href: "/contact" },
};

// Seed pricing tiers function
export async function seedPricingTiers(): Promise<void> {
  const tierIds = ["starter", "professional", "enterprise"];
  const seedOperations = pricingTiers.map((tier, index) =>
    savePricingTier(tierIds[index], tier)
  );
  await Promise.all(seedOperations);
}

// Seed all content function
export async function seedAllContent(userId: string): Promise<void> {
  const seedOperations = [
    // About Us
    saveSiteContent("aboutUs-hero", aboutUsHero, userId),
    saveSiteContent("aboutUs-story", aboutUsStory, userId),
    saveSiteContent("aboutUs-values", aboutUsValues, userId),
    saveSiteContent("aboutUs-stats", aboutUsStats, userId),
    saveSiteContent("aboutUs-team", aboutUsTeam, userId),
    // Pricing
    saveSiteContent("pricing-hero", pricingHero, userId),
    saveSiteContent("pricing-modelFeatures", pricingModelFeatures, userId),
    saveSiteContent("pricing-faqs", pricingFaqs, userId),
    // Why Us
    saveSiteContent("whyUs-hero", whyUsHero, userId),
    saveSiteContent("whyUs-benefits", whyUsBenefits, userId),
    saveSiteContent("whyUs-comparisons", whyUsComparisons, userId),
    saveSiteContent("whyUs-testimonials", whyUsTestimonials, userId),
    // Contact
    saveSiteContent("contact-info", contactInfo, userId),
    // Homepage
    saveSiteContent("home-hero", homeHero, userId),
    saveSiteContent("home-features", homeFeatures, userId),
    saveSiteContent("home-howItWorks", homeHowItWorks, userId),
    saveSiteContent("home-testimonials", homeTestimonials, userId),
    saveSiteContent("home-cta", homeCta, userId),
  ];

  await Promise.all(seedOperations);

  // Also seed pricing tiers
  await seedPricingTiers();
}

// Export individual seed data for potential partial seeding
export const seedData = {
  aboutUsHero,
  aboutUsStory,
  aboutUsValues,
  aboutUsStats,
  aboutUsTeam,
  pricingHero,
  pricingModelFeatures,
  pricingFaqs,
  pricingTiers,
  whyUsHero,
  whyUsBenefits,
  whyUsComparisons,
  whyUsTestimonials,
  contactInfo,
  homeHero,
  homeFeatures,
  homeHowItWorks,
  homeTestimonials,
  homeCta,
};
