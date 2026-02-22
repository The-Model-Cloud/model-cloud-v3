"use client";

import { useEffect, useState } from "react";
import { useAgency } from "@/lib/hooks/useAgency";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Plus, UserMinus, Users, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

export function AgencySeatManagement() {
  const { isAgency, agency } = useSubscription();
  const {
    managedUsers,
    loading,
    fetchManagedUsers,
    assignSeat,
    removeSeat,
    purchaseSeats,
  } = useAgency();

  const [assignUserId, setAssignUserId] = useState("");
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [purchaseQuantity, setPurchaseQuantity] = useState(1);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (isAgency) {
      fetchManagedUsers();
    }
  }, [isAgency, fetchManagedUsers]);

  if (!isAgency) {
    return null;
  }

  const handleAssignSeat = async () => {
    if (!assignUserId.trim()) return;

    setActionLoading(true);
    try {
      await assignSeat(assignUserId);
      toast.success("Seat assigned successfully");
      setAssignUserId("");
      setAssignDialogOpen(false);
    } catch {
      toast.error(
        "Failed to assign seat. Please check the user ID and try again."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveSeat = async (uid: string, name: string) => {
    setActionLoading(true);
    try {
      await removeSeat(uid);
      toast.success(`Seat removed from ${name}`);
    } catch {
      toast.error("Failed to remove seat");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePurchaseSeats = async () => {
    if (purchaseQuantity < 1) return;

    setActionLoading(true);
    try {
      await purchaseSeats(purchaseQuantity);
      // Note: This will redirect to Stripe, so we won't reach this toast
      toast.success("Redirecting to checkout...");
    } catch {
      toast.error("Failed to initiate seat purchase");
    } finally {
      setActionLoading(false);
    }
  };

  const availableSeats = agency?.availableSeats ?? 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Seats
            </CardTitle>
            <CardDescription>
              Manage your team members&apos; access
            </CardDescription>
          </div>
          <Badge variant="secondary">
            {agency?.usedSeats || 0} / {agency?.totalSeats || 0} seats used
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={availableSeats === 0}>
                <Plus className="mr-2 h-4 w-4" />
                Assign Seat
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign Seat to Team Member</DialogTitle>
                <DialogDescription>
                  Enter the user ID of the team member you want to add. They
                  must already have an account on The Model Cloud.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="userId">User ID</Label>
                  <Input
                    id="userId"
                    placeholder="Enter user ID"
                    value={assignUserId}
                    onChange={(e) => setAssignUserId(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    The user ID can be found in the team member&apos;s profile
                    settings.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setAssignDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAssignSeat}
                  disabled={actionLoading || !assignUserId.trim()}
                >
                  {actionLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Assign Seat
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={purchaseDialogOpen} onOpenChange={setPurchaseDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <ShoppingCart className="mr-2 h-4 w-4" />
                Purchase Seats
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Purchase Additional Seats</DialogTitle>
                <DialogDescription>
                  Add more seats to your agency plan. Additional seats are
                  billed at your current plan rate.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Number of Seats</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min={1}
                    max={50}
                    value={purchaseQuantity}
                    onChange={(e) =>
                      setPurchaseQuantity(parseInt(e.target.value) || 1)
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setPurchaseDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handlePurchaseSeats} disabled={actionLoading}>
                  {actionLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Continue to Checkout
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {availableSeats === 0 && (
          <p className="text-sm text-muted-foreground">
            No seats available. Purchase additional seats to add more team
            members.
          </p>
        )}

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : managedUsers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No team members assigned yet
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {managedUsers.map((user) => (
                  <TableRow key={user.uid}>
                    <TableCell className="font-medium">
                      {user.firstName} {user.lastName}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {user.assignedAt.toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={actionLoading}
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Seat</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove{" "}
                              {user.firstName} {user.lastName} from your team?
                              They will lose their Premium access and revert to
                              the free tier.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                handleRemoveSeat(
                                  user.uid,
                                  `${user.firstName} ${user.lastName}`
                                )
                              }
                            >
                              Remove Seat
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
