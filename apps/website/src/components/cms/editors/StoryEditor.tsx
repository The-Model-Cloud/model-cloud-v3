"use client";

import { Label } from "@/components/ui/label";
import { PageEditor } from "@/components/cms/PageEditor";
import type { SiteContent, AboutUsStory } from "@/types/siteContent";

interface StoryEditorProps {
  content: SiteContent;
  onChange: (content: SiteContent) => void;
}

export function StoryEditor({ content, onChange }: StoryEditorProps) {
  const data = content as AboutUsStory;

  return (
    <div className="space-y-4">
      <div>
        <Label>Story Content</Label>
        <p className="text-sm text-muted-foreground mb-2">
          Use the rich text editor below to format the company story.
        </p>
        <PageEditor
          content={data.content || ""}
          onChange={(newContent) =>
            onChange({ ...content, content: newContent } as SiteContent)
          }
        />
      </div>
    </div>
  );
}
