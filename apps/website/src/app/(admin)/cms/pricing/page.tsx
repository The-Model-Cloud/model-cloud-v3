"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  getPricingTiers,
  savePricingTier,
  deletePricingTier,
} from "@/lib/firebase/firestore";
import { PricingEditor } from "@/components/cms/PricingEditor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Plus, Pencil, Trash2, GripVertical, ChevronRight } from "lucide-react";
import type { PricingTier } from "@/types/pricing";

// Get inherited features from lower-order tiers
function getInheritedFeatures(tier: PricingTier, allTiers: PricingTier[]): string[] {
  const lowerTiers = allTiers.filter((t) => (t.order || 0) < (tier.order || 0));
  const inheritedSet = new Set<string>();
  lowerTiers.forEach((t) => {
    t.features.forEach((f) => inheritedSet.add(f));
  });
  // Remove features that are already in this tier's own features
  tier.features.forEach((f) => inheritedSet.delete(f));
  return Array.from(inheritedSet);
}

export default function PricingCMSPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [editingTier, setEditingTier] = useState<PricingTier | undefined>();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  useEffect(() => {
    fetchTiers();
  }, []);

  async function fetchTiers() {
    try {
      const data = await getPricingTiers(false); // Get all, including unpublished
      setTiers(data);
    } catch (error) {
      console.error("Error fetching tiers:", error);
      toast.error("Failed to load pricing tiers");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(tierData: Partial<PricingTier>) {
    const id = editingTier?.id || `tier-${Date.now()}`;
    try {
      await savePricingTier(id, { ...tierData, id });
      toast.success("Pricing tier saved!");
      fetchTiers();
    } catch (error) {
      console.error("Error saving tier:", error);
      toast.error("Failed to save pricing tier");
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await deletePricingTier(deleteId);
      toast.success("Pricing tier deleted");
      setDeleteId(null);
      fetchTiers();
    } catch (error) {
      console.error("Error deleting tier:", error);
      toast.error("Failed to delete pricing tier");
    }
  }

  // Drag and drop handlers
  function handleDragStart(e: React.DragEvent, tierId: string) {
    setDraggedId(tierId);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent, tierId: string) {
    e.preventDefault();
    if (tierId !== draggedId) {
      setDragOverId(tierId);
    }
  }

  function handleDragLeave() {
    setDragOverId(null);
  }

  function handleDragEnd() {
    setDraggedId(null);
    setDragOverId(null);
  }

  async function handleDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const draggedIndex = tiers.findIndex((t) => t.id === draggedId);
    const targetIndex = tiers.findIndex((t) => t.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Reorder the array
    const newTiers = [...tiers];
    const [draggedTier] = newTiers.splice(draggedIndex, 1);
    newTiers.splice(targetIndex, 0, draggedTier);

    // Update order values and save
    try {
      const updates = newTiers.map((tier, index) =>
        savePricingTier(tier.id, { ...tier, order: index })
      );
      await Promise.all(updates);

      // Update local state with new orders
      setTiers(newTiers.map((tier, index) => ({ ...tier, order: index })));
      toast.success("Tier order updated");
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error("Failed to update tier order");
      fetchTiers(); // Refresh to get correct order
    }

    setDraggedId(null);
    setDragOverId(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/cms")}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Pricing Tiers</h1>
            <p className="text-sm text-muted-foreground">
              Manage your pricing plans
            </p>
          </div>
        </div>
        <Button
          onClick={() => {
            setEditingTier(undefined);
            setIsEditorOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Tier
        </Button>
      </div>

      {tiers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              No pricing tiers created yet
            </p>
            <Button
              onClick={() => {
                setEditingTier(undefined);
                setIsEditorOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create First Tier
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tiers.map((tier) => {
            const inheritedFeatures = getInheritedFeatures(tier, tiers);
            return (
              <Card
                key={tier.id}
                draggable
                onDragStart={(e) => handleDragStart(e, tier.id)}
                onDragOver={(e) => handleDragOver(e, tier.id)}
                onDragLeave={handleDragLeave}
                onDragEnd={handleDragEnd}
                onDrop={(e) => handleDrop(e, tier.id)}
                className={`transition-all ${
                  draggedId === tier.id ? "opacity-50" : ""
                } ${
                  dragOverId === tier.id
                    ? "border-primary border-2 bg-primary/5"
                    : ""
                }`}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-3">
                    <div className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded">
                      <GripVertical className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <CardTitle className="text-lg">{tier.name}</CardTitle>
                    {tier.highlighted && <Badge>Featured</Badge>}
                    {!tier.published && (
                      <Badge variant="outline">Unpublished</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingTier(tier);
                        setIsEditorOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteId(tier.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">
                    {tier.description}
                  </p>
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-2xl font-bold">£{tier.price}</span>
                    <span className="text-muted-foreground">
                      /{tier.billingPeriod === "monthly" ? "mo" : "yr"}
                    </span>
                  </div>
                  {inheritedFeatures.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-muted-foreground mb-2 flex items-center">
                        <ChevronRight className="h-3 w-3 mr-1" />
                        Inherited from lower tiers:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {inheritedFeatures.map((feature, index) => (
                          <Badge key={index} variant="outline" className="text-muted-foreground">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    {tier.features.length > 0 && (
                      <p className="text-xs text-muted-foreground mb-2">
                        This tier&apos;s features:
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {tier.features.map((feature, index) => (
                        <Badge key={index} variant="secondary">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <PricingEditor
        tier={editingTier}
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingTier(undefined);
        }}
        onSave={handleSave}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Pricing Tier</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this pricing tier? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
