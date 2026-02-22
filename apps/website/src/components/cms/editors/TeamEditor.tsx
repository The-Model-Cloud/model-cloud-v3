"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import type { SiteContent, AboutUsTeam, TeamMember } from "@/types/siteContent";

interface TeamEditorProps {
  content: SiteContent;
  onChange: (content: SiteContent) => void;
}

export function TeamEditor({ content, onChange }: TeamEditorProps) {
  const data = content as AboutUsTeam;
  const items = data.items || [];

  const updateItem = (index: number, field: keyof TeamMember, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onChange({ ...content, items: newItems } as SiteContent);
  };

  const addItem = () => {
    onChange({
      ...content,
      items: [...items, { name: "", role: "", bio: "", imageUrl: "" }],
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
        <Label>Team Members</Label>
        <Button type="button" onClick={addItem} size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-1" />
          Add Member
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
                {item.name || `Member ${index + 1}`}
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Name</Label>
                <Input
                  value={item.name}
                  onChange={(e) => updateItem(index, "name", e.target.value)}
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

            <div>
              <Label>Image URL</Label>
              <Input
                value={item.imageUrl || ""}
                onChange={(e) => updateItem(index, "imageUrl", e.target.value)}
                placeholder="/imageUrls/team/name.jpg"
              />
            </div>

            <div>
              <Label>Bio</Label>
              <Textarea
                value={item.bio}
                onChange={(e) => updateItem(index, "bio", e.target.value)}
                placeholder="Short biography"
                className="h-20"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
