"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { SiteContent, HomeCTA } from "@/types/siteContent";

interface CTAEditorProps {
  content: SiteContent;
  onChange: (content: SiteContent) => void;
}

export function CTAEditor({ content, onChange }: CTAEditorProps) {
  const data = content as HomeCTA;

  const updateField = (field: string, value: string) => {
    onChange({ ...content, [field]: value } as SiteContent);
  };

  const updateCTA = (ctaField: "primaryCta" | "secondaryCta", field: string, value: string) => {
    const currentCTA = data[ctaField] || { text: "", href: "" };
    onChange({
      ...content,
      [ctaField]: { ...currentCTA, [field]: value },
    } as SiteContent);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={data.title || ""}
          onChange={(e) => updateField("title", e.target.value)}
          placeholder="Call to action headline"
        />
      </div>

      <div>
        <Label htmlFor="subtitle">Subtitle</Label>
        <Textarea
          id="subtitle"
          value={data.subtitle || ""}
          onChange={(e) => updateField("subtitle", e.target.value)}
          placeholder="Supporting text for the CTA"
          className="h-24"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="primaryCtaText">Primary Button Text</Label>
          <Input
            id="primaryCtaText"
            value={data.primaryCta?.text || ""}
            onChange={(e) => updateCTA("primaryCta", "text", e.target.value)}
            placeholder="Get Started"
          />
        </div>
        <div>
          <Label htmlFor="primaryCtaHref">Primary Button Link</Label>
          <Input
            id="primaryCtaHref"
            value={data.primaryCta?.href || ""}
            onChange={(e) => updateCTA("primaryCta", "href", e.target.value)}
            placeholder="/sign-up"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="secondaryCtaText">Secondary Button Text</Label>
          <Input
            id="secondaryCtaText"
            value={data.secondaryCta?.text || ""}
            onChange={(e) => updateCTA("secondaryCta", "text", e.target.value)}
            placeholder="Contact Sales"
          />
        </div>
        <div>
          <Label htmlFor="secondaryCtaHref">Secondary Button Link</Label>
          <Input
            id="secondaryCtaHref"
            value={data.secondaryCta?.href || ""}
            onChange={(e) => updateCTA("secondaryCta", "href", e.target.value)}
            placeholder="/contact"
          />
        </div>
      </div>
    </div>
  );
}
