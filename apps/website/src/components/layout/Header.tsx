"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useLayoutContent } from "@/lib/hooks/useLayoutContent";
import { signOut } from "@/lib/firebase/auth";
import { PLATFORM_URLS, platformUrl } from "@/lib/urls";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, User, LogOut, LayoutDashboard } from "lucide-react";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { FAIcon } from "@/components/ui/FAIcon";
import type { NavLink } from "@/types/siteContent";

// Fallback navigation links when CMS content is not available
const fallbackNavLinks: NavLink[] = [
  { href: "/", label: "Home" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about-us", label: "About Us" },
  { href: "/why-us", label: "Why Us" },
  { href: "/contact", label: "Contact" },
];

const fallbackSignInText = "Sign In";
const fallbackSignUpText = "Get Started";

export function Header() {
  const { firebaseUser, userData, loading: authLoading, isAdmin } = useAuth();
  const { content } = useLayoutContent();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
  };

  const dashboardUrl = platformUrl("/dashboard");

  // Use CMS content or fallbacks
  const headerContent = content.header;
  const navLinks = headerContent?.navLinks ?? fallbackNavLinks;
  const signInButtonText = headerContent?.signInButtonText ?? fallbackSignInText;
  const signUpButtonText = headerContent?.signUpButtonText ?? fallbackSignUpText;
  const logoLightUrl = headerContent?.logoLightUrl || "/assets/logo-light.png";
  const logoDarkUrl = headerContent?.logoDarkUrl || "/assets/logo-dark.png";

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <Image
            src={logoLightUrl}
            alt="The Model Cloud"
            width={180}
            height={40}
            className="dark:hidden"
            priority
          />
          <Image
            src={logoDarkUrl}
            alt="The Model Cloud"
            width={180}
            height={40}
            className="hidden dark:block"
            priority
          />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary flex items-center gap-2"
              {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            >
              {link.icon && <FAIcon name={link.icon} className="h-4 w-4" />}
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Auth */}
        <div className="hidden md:flex items-center space-x-4">
          <ModeToggle />
          {authLoading ? (
            <div className="h-9 w-20 animate-pulse rounded-md bg-muted" />
          ) : firebaseUser ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <User className="h-4 w-4" />
                  {userData?.firstName || "Account"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <a href={dashboardUrl}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Go to Dashboard
                  </a>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link href="/cms">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      CMS
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <a href={PLATFORM_URLS.signIn}>{signInButtonText}</a>
              </Button>
              <Button size="sm" asChild>
                <a href={PLATFORM_URLS.signUp}>{signUpButtonText}</a>
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px]">
            <div className="flex justify-end mt-4">
              <ModeToggle />
            </div>
            <nav className="flex flex-col space-y-4 mt-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-lg font-medium text-foreground hover:text-primary flex items-center gap-2"
                  onClick={() => setMobileMenuOpen(false)}
                  {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                >
                  {link.icon && <FAIcon name={link.icon} className="h-5 w-5" />}
                  {link.label}
                </Link>
              ))}
              <div className="border-t pt-4 space-y-4">
                {firebaseUser ? (
                  <>
                    <a
                      href={dashboardUrl}
                      className="block text-lg font-medium text-foreground hover:text-primary"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Go to Dashboard
                    </a>
                    {isAdmin && (
                      <Link
                        href="/cms"
                        className="block text-lg font-medium text-foreground hover:text-primary"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        CMS
                      </Link>
                    )}
                    <Button
                      variant="ghost"
                      className="w-full justify-start px-0"
                      onClick={() => {
                        handleSignOut();
                        setMobileMenuOpen(false);
                      }}
                    >
                      Sign Out
                    </Button>
                  </>
                ) : (
                  <>
                    <a
                      href={PLATFORM_URLS.signIn}
                      className="block text-lg font-medium text-foreground hover:text-primary"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {signInButtonText}
                    </a>
                    <Button asChild className="w-full">
                      <a href={PLATFORM_URLS.signUp} onClick={() => setMobileMenuOpen(false)}>
                        {signUpButtonText}
                      </a>
                    </Button>
                  </>
                )}
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
