"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { SubscriptionStatus } from "@/components/subscription/SubscriptionStatus";
import { ManageSubscriptionButton } from "@/components/subscription/ManageSubscriptionButton";
import { UpgradeButton } from "@/components/subscription/UpgradeButton";
import { AgencySeatManagement } from "@/components/subscription/AgencySeatManagement";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, User } from "lucide-react";

export default function AccountPage() {
  const router = useRouter();
  const { firebaseUser, userData, loading: authLoading } = useAuth();
  const {
    tier,
    isAgency,
    isFreeTier,
    loading: subLoading,
  } = useSubscription();

  useEffect(() => {
    if (!authLoading && !firebaseUser) {
      router.push("/sign-in?redirect=/account");
    }
  }, [authLoading, firebaseUser, router]);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://v4.themodel.cloud";

  if (authLoading || !firebaseUser) {
    return (
      <div className="container py-20">
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container py-20">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Account</h1>
          <p className="text-muted-foreground">
            Manage your account and subscription
          </p>
        </div>

        {/* Profile Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">
                  {userData?.firstName} {userData?.lastName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium">{userData?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Account Type</span>
                <span className="font-medium capitalize">{userData?.role}</span>
              </div>
            </div>
            <Separator />
            <Button variant="outline" asChild>
              <Link href={`${appUrl}/settings`}>
                Edit Profile
                <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Subscription Status */}
        <SubscriptionStatus />

        {/* Subscription Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Subscription Management</CardTitle>
            <CardDescription>
              {isFreeTier
                ? "Upgrade to unlock premium features"
                : "Manage your billing and subscription"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {isFreeTier ? (
              <UpgradeButton />
            ) : (
              <>
                <ManageSubscriptionButton />
                {tier !== "agency" && <UpgradeButton variant="outline" />}
              </>
            )}
          </CardContent>
        </Card>

        {/* Agency Seat Management */}
        {isAgency && <AgencySeatManagement />}
      </div>
    </div>
  );
}
