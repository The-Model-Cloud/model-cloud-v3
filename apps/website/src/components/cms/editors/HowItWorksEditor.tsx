"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { IconPicker } from "@/components/cms/IconPicker";
import { Plus, Trash2, GripVertical } from "lucide-react";
import type { SiteContent, HomeHowItWorks, HowItWorksStep } from "@/types/siteContent";

interface HowItWorksEditorProps {
  content: SiteContent;
  onChange: (content: SiteContent) => void;
}

export function HowItWorksEditor({ content, onChange }: HowItWorksEditorProps) {
  const data = content as HomeHowItWorks;
  const items = data.items || [];

  const updateField = (field: string, value: string) => {
    onChange({ ...content, [field]: value } as SiteContent);
  };

  const updateItem = (index: number, field: keyof HowItWorksStep, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onChange({ ...content, items: newItems } as SiteContent);
  };

  const addItem = () => {
    const nextStep = String(items.length + 1).padStart(2, "0");
    onChange({
      ...content,
      items: [...items, { icon: "Star", step: nextStep, title: "", description: "" }],
    } as SiteContent);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    // Re-number steps
    const renumbered = newItems.map((item, i) => ({
      ...item,
      step: String(i + 1).padStart(2, "0"),
    }));
    onChange({ ...content, items: renumbered } as SiteContent);
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= items.length) return;

    const newItems = [...items];
    [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
    // Re-number steps
    const renumbered = newItems.map((item, i) => ({
      ...item,
      step: String(i + 1).padStart(2, "0"),
    }));
    onChange({ ...content, items: renumbered } as SiteContent);
  };

  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="sectionTitle">Section Title</Label>
        <Input
          id="sectionTitle"
          value={data.sectionTitle || ""}
          onChange={(e) => updateField("sectionTitle", e.target.value)}
          placeholder="How It Works"
        />
      </div>

      <div>
        <Label htmlFor="sectionSubtitle">Section Subtitle</Label>
        <Textarea
          id="sectionSubtitle"
          value={data.sectionSubtitle || ""}
          onChange={(e) => updateField("sectionSubtitle", e.target.value)}
          placeholder="Getting started is easy..."
          className="h-20"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <Label>Steps</Label>
          <Button type="button" onClick={addItem} size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-1" />
            Add Step
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
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                    {item.step}
                  </span>
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
                    placeholder="Step title"
                  />
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={item.description}
                  onChange={(e) => updateItem(index, "description", e.target.value)}
                  placeholder="What happens in this step..."
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
