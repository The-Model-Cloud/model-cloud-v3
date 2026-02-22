"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import type { SiteContent, WhyUsComparisons, ComparisonItem } from "@/types/siteContent";

interface ComparisonsEditorProps {
  content: SiteContent;
  onChange: (content: SiteContent) => void;
}

export function ComparisonsEditor({ content, onChange }: ComparisonsEditorProps) {
  const data = content as WhyUsComparisons;
  const items = data.items || [];

  const updateItem = (index: number, field: keyof ComparisonItem, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onChange({ ...content, items: newItems } as SiteContent);
  };

  const addItem = () => {
    onChange({
      ...content,
      items: [...items, { feature: "", traditional: "", modelCloud: "" }],
    } as SiteContent);
  };

  const removeItem = (index: number) => {
    onChange({
      ...content,
      items: items.filter((_, i) => i !== index),
    } as SiteContent);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Comparison Items</Label>
        <Button type="button" onClick={addItem} size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-1" />
          Add Row
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="grid grid-cols-4 gap-2 p-3 bg-muted font-medium text-sm">
          <div>Feature</div>
          <div>Traditional</div>
          <div>The Model Cloud</div>
          <div className="text-right">Actions</div>
        </div>

        {items.map((item, index) => (
          <div
            key={index}
            className="grid grid-cols-4 gap-2 p-3 border-t items-center"
          >
            <Input
              value={item.feature}
              onChange={(e) => updateItem(index, "feature", e.target.value)}
              placeholder="Feature name"
              className="h-9"
            />
            <Input
              value={item.traditional}
              onChange={(e) => updateItem(index, "traditional", e.target.value)}
              placeholder="Traditional approach"
              className="h-9"
            />
            <Input
              value={item.modelCloud}
              onChange={(e) => updateItem(index, "modelCloud", e.target.value)}
              placeholder="Model Cloud approach"
              className="h-9"
            />
            <div className="text-right">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeItem(index)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}

        {items.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            No comparison items. Click &quot;Add Row&quot; to add one.
          </div>
        )}
      </div>
    </div>
  );
}
