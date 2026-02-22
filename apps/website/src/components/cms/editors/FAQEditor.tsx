"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, GripVertical } from "lucide-react";
import type { SiteContent, PricingFAQs, FAQItem } from "@/types/siteContent";

interface FAQEditorProps {
  content: SiteContent;
  onChange: (content: SiteContent) => void;
}

export function FAQEditor({ content, onChange }: FAQEditorProps) {
  const data = content as PricingFAQs;
  const items = data.items || [];

  const updateItem = (index: number, field: keyof FAQItem, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onChange({ ...content, items: newItems } as SiteContent);
  };

  const addItem = () => {
    onChange({
      ...content,
      items: [...items, { question: "", answer: "" }],
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
        <Label>FAQs</Label>
        <Button type="button" onClick={addItem} size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-1" />
          Add FAQ
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
                <span className="text-sm font-medium">FAQ {index + 1}</span>
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

            <div>
              <Label>Question</Label>
              <Input
                value={item.question}
                onChange={(e) => updateItem(index, "question", e.target.value)}
                placeholder="What is...?"
              />
            </div>

            <div>
              <Label>Answer</Label>
              <Textarea
                value={item.answer}
                onChange={(e) => updateItem(index, "answer", e.target.value)}
                placeholder="The answer is..."
                className="h-24"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
