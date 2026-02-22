"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, GripVertical } from "lucide-react";
import type { SiteContent, PricingModelFeatures } from "@/types/siteContent";

interface StringArrayEditorProps {
  content: SiteContent;
  onChange: (content: SiteContent) => void;
}

export function StringArrayEditor({ content, onChange }: StringArrayEditorProps) {
  const data = content as PricingModelFeatures;
  const items = data.items || [];

  const updateItem = (index: number, value: string) => {
    const newItems = [...items];
    newItems[index] = value;
    onChange({ ...content, items: newItems } as SiteContent);
  };

  const addItem = () => {
    onChange({
      ...content,
      items: [...items, ""],
    } as SiteContent);
  };

  const removeItem = (index: number) => {
    onChange({
      ...content,
      items: items.filter((_, i) => i !== index),
    } as SiteContent);
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= items.length) return;

    const newItems = [...items];
    [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
    onChange({ ...content, items: newItems } as SiteContent);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Items</Label>
        <Button type="button" onClick={addItem} size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-1" />
          Add Item
        </Button>
      </div>

      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <Input
              value={item}
              onChange={(e) => updateItem(index, e.target.value)}
              placeholder="Enter item text..."
              className="flex-1"
            />
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => moveItem(index, "up")}
                disabled={index === 0}
              >
                ↑
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => moveItem(index, "down")}
                disabled={index === items.length - 1}
              >
                ↓
              </Button>
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
          <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg">
            No items yet. Click &quot;Add Item&quot; to add one.
          </p>
        )}
      </div>
    </div>
  );
}
