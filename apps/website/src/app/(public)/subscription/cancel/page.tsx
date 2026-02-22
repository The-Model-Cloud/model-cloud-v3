"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { XCircle, ArrowLeft, MessageCircle } from "lucide-react";

export default function SubscriptionCancelPage() {
  return (
    <div className="container py-20">
      <div className="max-w-lg mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <XCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle className="text-2xl">Checkout Cancelled</CardTitle>
            <CardDescription>
              Your subscription was not processed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-center text-muted-foreground">
              No worries! You can return to pricing at any time to start your
              subscription.
            </p>

            <div className="space-y-3">
              <Button className="w-full" asChild>
                <Link href="/pricing">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Pricing
                </Link>
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/contact">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Contact Support
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
