"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DynamicIcon } from "@/components/ui/DynamicIcon";
import { useAboutUsContent } from "@/lib/hooks/useAboutUsContent";
import { Skeleton } from "@/components/ui/skeleton";

// Fallback data for when Firestore is not seeded
const fallbackValues = [
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
];

const fallbackStats = [
  { value: "10,000+", label: "Active Models" },
  { value: "5,000+", label: "Clients" },
  { value: "50+", label: "Countries" },
  { value: "100,000+", label: "Successful Bookings" },
];

const fallbackTeam = [
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
];

export default function AboutUsPage() {
  const { content, loading } = useAboutUsContent();

  const hero = content.hero ?? {
    title: "Building the Future of Model Booking",
    subtitle:
      "We're on a mission to transform how models and clients connect, making the booking process simpler, faster, and more transparent.",
  };

  const story = content.story ?? {
    content: `<p>The Model Cloud was born out of frustration with the traditional model booking process. Our founders, having worked in both the fashion industry and tech, saw firsthand how outdated systems were holding back both talent and clients.</p>
<p>In 2020, we set out to build something different - a platform that puts transparency and efficiency at its core. We wanted to create a space where models could showcase their portfolios, manage their bookings, and connect with clients seamlessly.</p>
<p>Today, The Model Cloud serves thousands of users worldwide, from independent models to major fashion brands. But we're just getting started. Our vision is to become the global standard for talent booking in the fashion and entertainment industries.</p>`,
  };

  const values = content.values?.items ?? fallbackValues;
  const stats = content.stats?.items ?? fallbackStats;
  const team = content.team?.items ?? fallbackTeam;

  if (loading) {
    return (
      <>
        {/* Hero Skeleton */}
        <section className="py-20 bg-gradient-to-br from-primary/5 via-background to-accent/20">
          <div className="container">
            <div className="text-center max-w-3xl mx-auto">
              <Skeleton className="h-12 w-3/4 mx-auto mb-6" />
              <Skeleton className="h-6 w-full mx-auto" />
              <Skeleton className="h-6 w-2/3 mx-auto mt-2" />
            </div>
          </div>
        </section>

        {/* Values Skeleton */}
        <section className="py-20 bg-muted/30">
          <div className="container">
            <Skeleton className="h-10 w-48 mx-auto mb-12" />
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="bg-background">
                  <CardContent className="pt-6">
                    <Skeleton className="w-12 h-12 rounded-lg mb-4" />
                    <Skeleton className="h-6 w-2/3 mb-2" />
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      {/* Hero */}
      <section className="py-20 bg-gradient-to-br from-primary/5 via-background to-accent/20">
        <div className="container">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">{hero.title}</h1>
            <p className="text-xl text-muted-foreground">{hero.subtitle}</p>
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="py-20">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-6">Our Story</h2>
            <div
              className="space-y-4 text-muted-foreground prose prose-neutral dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: story.content }}
            />
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12">What Drives Us</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value) => (
              <Card key={value.title} className="bg-background">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <DynamicIcon name={value.icon} className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{value.title}</h3>
                  <p className="text-muted-foreground">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-4xl md:text-5xl font-bold text-primary mb-2">
                  {stat.value}
                </p>
                <p className="text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Meet Our Team</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We&apos;re a diverse team of industry veterans and tech innovators,
              united by our passion for transforming the model booking experience.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
            {team.map((member) => (
              <Card key={member.name} className="bg-background text-center">
                <CardContent className="pt-6">
                  <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-primary">
                      {member.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </span>
                  </div>
                  <h3 className="font-semibold">{member.name}</h3>
                  <p className="text-sm text-primary mb-2">{member.role}</p>
                  <p className="text-sm text-muted-foreground">{member.bio}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Join Our Journey</h2>
            <p className="text-muted-foreground mb-8">
              Whether you&apos;re a model looking to grow your career or a client
              seeking top talent, we&apos;d love to have you on board.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" asChild>
                <Link href="/sign-up">Get Started</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/contact">Contact Us</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
