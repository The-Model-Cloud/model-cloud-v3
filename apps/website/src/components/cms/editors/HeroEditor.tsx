"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { SiteContent, SiteContentId } from "@/types/siteContent";

interface HeroEditorProps {
  content: SiteContent;
  onChange: (content: SiteContent) => void;
  sectionId: SiteContentId;
}

export function HeroEditor({ content, onChange, sectionId }: HeroEditorProps) {
  const data = content as unknown as Record<string, unknown>;

  const updateField = (field: string, value: string) => {
    onChange({ ...content, [field]: value } as SiteContent);
  };

  const updateCTA = (ctaField: string, field: string, value: string) => {
    const currentCTA = (data[ctaField] as Record<string, string>) || { text: "", href: "" };
    onChange({
      ...content,
      [ctaField]: { ...currentCTA, [field]: value },
    } as SiteContent);
  };

  // Different hero sections have different fields
  const isHomeHero = sectionId === "home-hero";
  const hasCTAs = isHomeHero || sectionId === "pricing-hero";

  return (
    <div className="space-y-4">
      {isHomeHero && (
        <div>
          <Label htmlFor="badge">Badge Text</Label>
          <Input
            id="badge"
            value={(data.badge as string) || ""}
            onChange={(e) => updateField("badge", e.target.value)}
            placeholder="e.g., Now accepting new models"
          />
        </div>
      )}

      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={(data.title as string) || ""}
          onChange={(e) => updateField("title", e.target.value)}
          placeholder="Main headline"
        />
      </div>

      {isHomeHero && (
        <div>
          <Label htmlFor="titleHighlight">Title Highlight</Label>
          <Input
            id="titleHighlight"
            value={(data.titleHighlight as string) || ""}
            onChange={(e) => updateField("titleHighlight", e.target.value)}
            placeholder="Highlighted part of title"
          />
        </div>
      )}

      <div>
        <Label htmlFor="subtitle">Subtitle</Label>
        <Textarea
          id="subtitle"
          value={(data.subtitle as string) || ""}
          onChange={(e) => updateField("subtitle", e.target.value)}
          placeholder="Supporting description"
          className="h-24"
        />
      </div>

      {isHomeHero && (
        <div>
          <Label htmlFor="trustText">Trust Text</Label>
          <Input
            id="trustText"
            value={(data.trustText as string) || ""}
            onChange={(e) => updateField("trustText", e.target.value)}
            placeholder="e.g., Trusted by leading agencies"
          />
        </div>
      )}

      {hasCTAs && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="primaryCtaText">Primary CTA Text</Label>
              <Input
                id="primaryCtaText"
                value={((data.primaryCta as Record<string, string>)?.text) || ""}
                onChange={(e) => updateCTA("primaryCta", "text", e.target.value)}
                placeholder="Button text"
              />
            </div>
            <div>
              <Label htmlFor="primaryCtaHref">Primary CTA Link</Label>
              <Input
                id="primaryCtaHref"
                value={((data.primaryCta as Record<string, string>)?.href) || ""}
                onChange={(e) => updateCTA("primaryCta", "href", e.target.value)}
                placeholder="/sign-up"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="secondaryCtaText">Secondary CTA Text</Label>
              <Input
                id="secondaryCtaText"
                value={((data.secondaryCta as Record<string, string>)?.text) || ""}
                onChange={(e) => updateCTA("secondaryCta", "text", e.target.value)}
                placeholder="Button text"
              />
            </div>
            <div>
              <Label htmlFor="secondaryCtaHref">Secondary CTA Link</Label>
              <Input
                id="secondaryCtaHref"
                value={((data.secondaryCta as Record<string, string>)?.href) || ""}
                onChange={(e) => updateCTA("secondaryCta", "href", e.target.value)}
                placeholder="/pricing"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
