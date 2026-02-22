"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import type { SiteContent, AboutUsStats } from "@/types/siteContent";

interface StatsEditorProps {
  content: SiteContent;
  onChange: (content: SiteContent) => void;
}

interface StatItem {
  value: string;
  label: string;
}

export function StatsEditor({ content, onChange }: StatsEditorProps) {
  const data = content as AboutUsStats;
  const items = data.items || [];

  const updateItem = (index: number, field: keyof StatItem, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onChange({ ...content, items: newItems } as SiteContent);
  };

  const addItem = () => {
    onChange({
      ...content,
      items: [...items, { value: "0", label: "" }],
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
        <Label>Statistics</Label>
        <Button type="button" onClick={addItem} size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-1" />
          Add Stat
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {items.map((item, index) => (
          <div
            key={index}
            className="border rounded-lg p-4 space-y-3 bg-muted/30"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Stat {index + 1}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeItem(index)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>

            <div>
              <Label>Value</Label>
              <Input
                value={item.value}
                onChange={(e) => updateItem(index, "value", e.target.value)}
                placeholder="e.g., 10,000+"
              />
            </div>

            <div>
              <Label>Label</Label>
              <Input
                value={item.label}
                onChange={(e) => updateItem(index, "label", e.target.value)}
                placeholder="e.g., Active Models"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
