"use client";

import Link from "next/link";
import Image from "next/image";
import { Separator } from "@/components/ui/separator";
import { useLayoutContent } from "@/lib/hooks/useLayoutContent";
import { FAIcon } from "@/components/ui/FAIcon";
import type { FooterLinkSection, SocialLink } from "@/types/siteContent";

// Fallback footer link sections
const fallbackSections: FooterLinkSection[] = [
  {
    title: "Product",
    links: [
      { href: "/pricing", label: "Pricing" },
      { href: "/about-us", label: "About Us" },
      { href: "/why-us", label: "Why Us" },
    ],
  },
  {
    title: "Support",
    links: [
      { href: "/contact", label: "Contact" },
      { href: "/faq", label: "FAQ" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms of Service" },
    ],
  },
];

// Fallback social links
const fallbackSocialLinks: SocialLink[] = [
  {
    platform: "instagram",
    url: "https://www.instagram.com/themodelcloud",
    icon: "fa-brands fa-instagram",
  },
  {
    platform: "linkedin",
    url: "https://www.linkedin.com/company/themodel.cloud",
    icon: "fa-brands fa-linkedin",
  },
];

const fallbackTagline = "The modern platform for model booking and talent management.";
const fallbackCopyrightText = "The Model Cloud. All rights reserved.";

export function Footer() {
  const currentYear = new Date().getFullYear();
  const { content } = useLayoutContent();

  // Use CMS content or fallbacks
  const footerContent = content.footer;
  const sections = footerContent?.sections ?? fallbackSections;
  const socialLinks = footerContent?.socialLinks ?? fallbackSocialLinks;
  const tagline = footerContent?.tagline ?? fallbackTagline;
  const copyrightText = footerContent?.copyrightText ?? fallbackCopyrightText;
  const logoLightUrl = footerContent?.logoLightUrl || "/assets/logo-light.png";
  const logoDarkUrl = footerContent?.logoDarkUrl || "/assets/logo-dark.png";

  return (
    <footer className="border-t bg-muted/30">
      <div className="container py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center">
              <Image
                src={logoLightUrl}
                alt="The Model Cloud"
                width={180}
                height={40}
                className="dark:hidden"
              />
              <Image
                src={logoDarkUrl}
                alt="The Model Cloud"
                width={180}
                height={40}
                className="hidden dark:block"
              />
            </Link>
            <p className="mt-4 text-sm text-muted-foreground">{tagline}</p>
          </div>

          {/* Dynamic Footer Sections */}
          {sections.map((section) => (
            <div key={section.title}>
              <h3 className="font-semibold mb-4">{section.title}</h3>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
                      {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    >
                      {link.icon && <FAIcon name={link.icon} className="h-4 w-4" />}
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {currentYear} {copyrightText}
          </p>
          <div className="flex items-center space-x-4">
            {socialLinks.map((social) => (
              <a
                key={social.platform}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary"
              >
                <span className="sr-only">{social.platform}</span>
                <FAIcon name={social.icon} className="h-5 w-5" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
