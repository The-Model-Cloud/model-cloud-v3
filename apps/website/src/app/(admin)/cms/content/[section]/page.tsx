"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { getSiteContent, saveSiteContent } from "@/lib/firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Save } from "lucide-react";
import type { SiteContent, SiteContentId } from "@/types/siteContent";

// Editor imports
import { HeroEditor } from "@/components/cms/editors/HeroEditor";
import { IconItemsEditor } from "@/components/cms/editors/IconItemsEditor";
import { StatsEditor } from "@/components/cms/editors/StatsEditor";
import { TeamEditor } from "@/components/cms/editors/TeamEditor";
import { FAQEditor } from "@/components/cms/editors/FAQEditor";
import { TestimonialsEditor } from "@/components/cms/editors/TestimonialsEditor";
import { ComparisonsEditor } from "@/components/cms/editors/ComparisonsEditor";
import { ContactInfoEditor } from "@/components/cms/editors/ContactInfoEditor";
import { CTAEditor } from "@/components/cms/editors/CTAEditor";
import { StoryEditor } from "@/components/cms/editors/StoryEditor";
import { HowItWorksEditor } from "@/components/cms/editors/HowItWorksEditor";
import { StringArrayEditor } from "@/components/cms/editors/StringArrayEditor";

// Section metadata for titles and descriptions
const sectionMeta: Record<string, { title: string; description: string }> = {
  "home-hero": { title: "Homepage Hero", description: "Main headline, badge, and call-to-action buttons" },
  "home-features": { title: "Homepage Features", description: "Feature cards displayed on the homepage" },
  "home-howItWorks": { title: "How It Works", description: "Step-by-step process guide" },
  "home-testimonials": { title: "Homepage Testimonials", description: "Customer testimonials on homepage" },
  "home-cta": { title: "Homepage CTA", description: "Bottom call-to-action section" },
  "aboutUs-hero": { title: "About Us Hero", description: "About Us page title and subtitle" },
  "aboutUs-story": { title: "Our Story", description: "Company story and history" },
  "aboutUs-values": { title: "Our Values", description: "Core company values" },
  "aboutUs-stats": { title: "Company Stats", description: "Key metrics and statistics" },
  "aboutUs-team": { title: "Team Members", description: "Team member profiles" },
  "whyUs-hero": { title: "Why Us Hero", description: "Why Us page title and subtitle" },
  "whyUs-benefits": { title: "Benefits", description: "Key benefits of using the platform" },
  "whyUs-comparisons": { title: "Comparison Table", description: "Traditional vs The Model Cloud" },
  "whyUs-testimonials": { title: "Why Us Testimonials", description: "Customer testimonials" },
  "contact-info": { title: "Contact Information", description: "Contact details and hours" },
  "pricing-hero": { title: "Pricing Hero", description: "Pricing page title and subtitle" },
  "pricing-modelFeatures": { title: "Model Features", description: "Features available for models" },
  "pricing-faqs": { title: "Pricing FAQs", description: "Frequently asked questions" },
};

// Map section IDs to their editor components
function getEditorComponent(sectionId: string) {
  if (sectionId.endsWith("-hero")) return "hero";
  if (sectionId === "home-features" || sectionId === "aboutUs-values" || sectionId === "whyUs-benefits") return "iconItems";
  if (sectionId === "home-howItWorks") return "howItWorks";
  if (sectionId === "home-testimonials" || sectionId === "whyUs-testimonials") return "testimonials";
  if (sectionId === "home-cta") return "cta";
  if (sectionId === "aboutUs-story") return "story";
  if (sectionId === "aboutUs-stats") return "stats";
  if (sectionId === "aboutUs-team") return "team";
  if (sectionId === "whyUs-comparisons") return "comparisons";
  if (sectionId === "contact-info") return "contactInfo";
  if (sectionId === "pricing-modelFeatures") return "stringArray";
  if (sectionId === "pricing-faqs") return "faqs";
  return "unknown";
}

export default function EditContentPage() {
  const params = useParams();
  const router = useRouter();
  const { firebaseUser } = useAuth();
  const sectionId = params.section as SiteContentId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState<SiteContent | null>(null);

  const meta = sectionMeta[sectionId] || { title: sectionId, description: "" };
  const editorType = getEditorComponent(sectionId);

  useEffect(() => {
    async function fetchContent() {
      try {
        const data = await getSiteContent(sectionId);
        setContent(data);
      } catch (error) {
        console.error("Error fetching content:", error);
        toast.error("Failed to load content");
      } finally {
        setLoading(false);
      }
    }

    fetchContent();
  }, [sectionId]);

  async function handleSave() {
    if (!firebaseUser || !content) return;

    setSaving(true);
    try {
      await saveSiteContent(sectionId, content, firebaseUser.uid);
      toast.success("Content saved successfully!");
    } catch (error) {
      console.error("Error saving content:", error);
      toast.error("Failed to save content");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/cms/content")}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{meta.title}</h1>
            <p className="text-sm text-muted-foreground">{meta.description}</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving || !content}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Content</CardTitle>
        </CardHeader>
        <CardContent>
          {!content ? (
            <p className="text-muted-foreground">
              No content found. Click &quot;Seed Default Content&quot; on the content dashboard to populate default data.
            </p>
          ) : editorType === "hero" ? (
            <HeroEditor content={content} onChange={setContent} sectionId={sectionId} />
          ) : editorType === "iconItems" ? (
            <IconItemsEditor content={content} onChange={setContent} />
          ) : editorType === "howItWorks" ? (
            <HowItWorksEditor content={content} onChange={setContent} />
          ) : editorType === "testimonials" ? (
            <TestimonialsEditor content={content} onChange={setContent} />
          ) : editorType === "cta" ? (
            <CTAEditor content={content} onChange={setContent} />
          ) : editorType === "story" ? (
            <StoryEditor content={content} onChange={setContent} />
          ) : editorType === "stats" ? (
            <StatsEditor content={content} onChange={setContent} />
          ) : editorType === "team" ? (
            <TeamEditor content={content} onChange={setContent} />
          ) : editorType === "comparisons" ? (
            <ComparisonsEditor content={content} onChange={setContent} />
          ) : editorType === "contactInfo" ? (
            <ContactInfoEditor content={content} onChange={setContent} />
          ) : editorType === "stringArray" ? (
            <StringArrayEditor content={content} onChange={setContent} />
          ) : editorType === "faqs" ? (
            <FAQEditor content={content} onChange={setContent} />
          ) : (
            <p className="text-muted-foreground">
              No editor available for this content type.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
