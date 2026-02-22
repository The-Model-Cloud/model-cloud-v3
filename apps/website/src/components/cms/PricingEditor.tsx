"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Plus, X } from "lucide-react";
import type { PricingTier, BillingPeriod } from "@/types/pricing";

interface PricingEditorProps {
  tier?: PricingTier;
  isOpen: boolean;
  onClose: () => void;
  onSave: (tier: Partial<PricingTier>) => Promise<void>;
}

const defaultFormData: Partial<PricingTier> = {
  name: "",
  description: "",
  price: 0,
  billingPeriod: "monthly",
  features: [],
  highlighted: false,
  order: 0,
  published: true,
};

export function PricingEditor({
  tier,
  isOpen,
  onClose,
  onSave,
}: PricingEditorProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<PricingTier>>(tier || defaultFormData);
  const [newFeature, setNewFeature] = useState("");

  // Update form data when tier prop changes (e.g., when editing different tier)
  useEffect(() => {
    if (isOpen) {
      setFormData(tier || defaultFormData);
      setNewFeature("");
    }
  }, [tier, isOpen]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      setFormData({
        ...formData,
        features: [...(formData.features || []), newFeature.trim()],
      });
      setNewFeature("");
    }
  };

  const removeFeature = (index: number) => {
    setFormData({
      ...formData,
      features: formData.features?.filter((_, i) => i !== index),
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {tier ? "Edit Pricing Tier" : "Add Pricing Tier"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="name">Tier Name</Label>
            <Input
              id="name"
              value={formData.name || ""}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g., Professional"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description || ""}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Short description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price">Price (£)</Label>
              <Input
                id="price"
                type="number"
                min="0"
                value={formData.price || 0}
                onChange={(e) =>
                  setFormData({ ...formData, price: Number(e.target.value) })
                }
              />
            </div>

            <div>
              <Label htmlFor="billingPeriod">Billing Period</Label>
              <Select
                value={formData.billingPeriod || "monthly"}
                onValueChange={(value: BillingPeriod) =>
                  setFormData({ ...formData, billingPeriod: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="order">Display Order</Label>
            <Input
              id="order"
              type="number"
              min="0"
              value={formData.order || 0}
              onChange={(e) =>
                setFormData({ ...formData, order: Number(e.target.value) })
              }
            />
          </div>

          <div>
            <Label>Features</Label>
            <div className="space-y-2 mt-2">
              {formData.features?.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 bg-muted rounded"
                >
                  <span className="flex-1 text-sm">{feature}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFeature(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  value={newFeature}
                  onChange={(e) => setNewFeature(e.target.value)}
                  placeholder="Add a feature..."
                  onKeyDown={(e) => e.key === "Enter" && addFeature()}
                />
                <Button type="button" onClick={addFeature} variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="highlighted"
                checked={formData.highlighted || false}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, highlighted: checked })
                }
              />
              <Label htmlFor="highlighted">Highlighted</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="published"
                checked={formData.published || false}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, published: checked })
                }
              />
              <Label htmlFor="published">Published</Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
