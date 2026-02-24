"use client";

import Image from "next/image";
import { Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSiteContent } from "@/lib/hooks/useSiteContent";
import { cloudinaryAvatar } from "@/lib/cloudinary";
import type { HomeTestimonials } from "@/types/siteContent";

const fallbackTestimonials: HomeTestimonials = {
  id: "home-testimonials",
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

export function Testimonials() {
  const { content, loading } = useSiteContent<HomeTestimonials>("home-testimonials");
  const testimonials = content ?? fallbackTestimonials;

  if (loading) {
    return (
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Skeleton className="h-10 w-3/4 mx-auto mb-4" />
            <Skeleton className="h-6 w-full mx-auto" />
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-background">
                <CardContent className="pt-6">
                  <Skeleton className="h-5 w-24 mb-4" />
                  <Skeleton className="h-24 w-full mb-6" />
                  <div className="flex items-center">
                    <Skeleton className="w-12 h-12 rounded-full mr-4" />
                    <div>
                      <Skeleton className="h-5 w-24 mb-1" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-muted/30">
      <div className="container">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {testimonials.sectionTitle}
          </h2>
          <p className="text-lg text-muted-foreground">
            {testimonials.sectionSubtitle}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.items.map((testimonial) => {
            const avatarUrl = cloudinaryAvatar(testimonial.imageUrl, 96);
            return (
              <Card key={testimonial.author} className="bg-background">
                <CardContent className="pt-6">
                  <div className="flex mb-4">
                    {Array.from({ length: testimonial.rating ?? 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className="h-5 w-5 text-yellow-500 fill-yellow-500"
                      />
                    ))}
                  </div>
                  <blockquote className="text-lg mb-6">
                    &ldquo;{testimonial.quote}&rdquo;
                  </blockquote>
                  <div className="flex items-center">
                    {avatarUrl ? (
                      <div className="w-12 h-12 rounded-full mr-4 overflow-hidden">
                        <Image
                          src={avatarUrl}
                          alt={testimonial.author}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mr-4">
                        <span className="text-lg font-semibold text-primary">
                          {testimonial.author[0]}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="font-semibold">{testimonial.author}</p>
                      <p className="text-sm text-muted-foreground">
                        {testimonial.role}
                        {testimonial.role && testimonial.company && ", "}
                        {testimonial.company}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
