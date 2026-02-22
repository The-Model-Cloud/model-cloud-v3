"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { IconPicker } from "@/components/cms/IconPicker";
import { Plus, Trash2, GripVertical } from "lucide-react";
import type { SiteContent, IconItem } from "@/types/siteContent";

interface IconItemsEditorProps {
  content: SiteContent;
  onChange: (content: SiteContent) => void;
}

type ContentWithItems = SiteContent & {
  sectionTitle?: string;
  sectionSubtitle?: string;
  items: IconItem[];
};

export function IconItemsEditor({ content, onChange }: IconItemsEditorProps) {
  const data = content as ContentWithItems;
  const items = data.items || [];

  const updateField = (field: string, value: string) => {
    onChange({ ...content, [field]: value } as SiteContent);
  };

  const updateItem = (index: number, field: keyof IconItem, value: string) => {
    const newItems: IconItem[] = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onChange({ ...content, items: newItems } as SiteContent);
  };

  const addItem = () => {
    onChange({
      ...content,
      items: [...items, { icon: "Star", title: "", description: "" }],
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
    <div className="space-y-6">
      {data.sectionTitle !== undefined && (
        <div>
          <Label htmlFor="sectionTitle">Section Title</Label>
          <Input
            id="sectionTitle"
            value={data.sectionTitle || ""}
            onChange={(e) => updateField("sectionTitle", e.target.value)}
            placeholder="Section heading"
          />
        </div>
      )}

      {data.sectionSubtitle !== undefined && (
        <div>
          <Label htmlFor="sectionSubtitle">Section Subtitle</Label>
          <Textarea
            id="sectionSubtitle"
            value={data.sectionSubtitle || ""}
            onChange={(e) => updateField("sectionSubtitle", e.target.value)}
            placeholder="Section description"
            className="h-20"
          />
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-4">
          <Label>Items</Label>
          <Button type="button" onClick={addItem} size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-1" />
            Add Item
          </Button>
        </div>

        <div className="space-y-4">
          {items.map((item, index) => (
            <div
              key={index}
              className="border rounded-lg p-4 space-y-3 bg-muted/30"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Item {index + 1}</span>
                </div>
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Icon</Label>
                  <IconPicker
                    value={item.icon}
                    onChange={(icon) => updateItem(index, "icon", icon)}
                  />
                </div>
                <div>
                  <Label>Title</Label>
                  <Input
                    value={item.title}
                    onChange={(e) => updateItem(index, "title", e.target.value)}
                    placeholder="Item title"
                  />
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={item.description}
                  onChange={(e) => updateItem(index, "description", e.target.value)}
                  placeholder="Item description"
                  className="h-20"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
