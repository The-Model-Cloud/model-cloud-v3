"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import type { SiteContent, TestimonialItem } from "@/types/siteContent";

interface TestimonialsEditorProps {
  content: SiteContent;
  onChange: (content: SiteContent) => void;
}

type ContentWithTestimonials = SiteContent & {
  sectionTitle?: string;
  sectionSubtitle?: string;
  items: TestimonialItem[];
};

export function TestimonialsEditor({ content, onChange }: TestimonialsEditorProps) {
  const data = content as ContentWithTestimonials;
  const items = data.items || [];

  const updateField = (field: string, value: string) => {
    onChange({ ...content, [field]: value } as SiteContent);
  };

  const updateItem = (index: number, field: keyof TestimonialItem, value: string | number) => {
    const newItems: TestimonialItem[] = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onChange({ ...content, items: newItems } as SiteContent);
  };

  const addItem = () => {
    onChange({
      ...content,
      items: [...items, { quote: "", author: "", role: "", company: "", rating: 5 }],
    } as SiteContent);
  };

  const removeItem = (index: number) => {
    onChange({
      ...content,
      items: items.filter((_, i) => i !== index),
    } as SiteContent);
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
          <Label>Testimonials</Label>
          <Button type="button" onClick={addItem} size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-1" />
            Add Testimonial
          </Button>
        </div>

        <div className="space-y-4">
          {items.map((item, index) => (
            <div
              key={index}
              className="border rounded-lg p-4 space-y-3 bg-muted/30"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {item.author || `Testimonial ${index + 1}`}
                </span>
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
                <Label>Quote</Label>
                <Textarea
                  value={item.quote}
                  onChange={(e) => updateItem(index, "quote", e.target.value)}
                  placeholder="What they said..."
                  className="h-24"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Author Name</Label>
                  <Input
                    value={item.author}
                    onChange={(e) => updateItem(index, "author", e.target.value)}
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <Label>Role</Label>
                  <Input
                    value={item.role}
                    onChange={(e) => updateItem(index, "role", e.target.value)}
                    placeholder="Job title"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Company</Label>
                  <Input
                    value={item.company || ""}
                    onChange={(e) => updateItem(index, "company", e.target.value)}
                    placeholder="Company name"
                  />
                </div>
                <div>
                  <Label>Rating</Label>
                  <Select
                    value={String(item.rating || 5)}
                    onValueChange={(value) => updateItem(index, "rating", parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[5, 4, 3, 2, 1].map((rating) => (
                        <SelectItem key={rating} value={String(rating)}>
                          {rating} Star{rating !== 1 ? "s" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
