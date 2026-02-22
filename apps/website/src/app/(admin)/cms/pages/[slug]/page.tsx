"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { getCMSPage, saveCMSPage } from "@/lib/firebase/firestore";
import { PageEditor } from "@/components/cms/PageEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Save } from "lucide-react";
import type { CMSPage } from "@/types/cms";

export default function EditPagePage() {
  const params = useParams();
  const router = useRouter();
  const { firebaseUser } = useAuth();
  const slug = params.slug as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState<Partial<CMSPage>>({
    slug,
    title: "",
    content: "",
    metaDescription: "",
    metaKeywords: [],
    published: false,
  });

  useEffect(() => {
    async function fetchPage() {
      try {
        const data = await getCMSPage(slug);
        if (data) {
          setPage(data);
        } else {
          // Initialize with default values for new page
          setPage({
            slug,
            title: slug
              .split("-")
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" "),
            content: "<p>Enter your content here...</p>",
            metaDescription: "",
            metaKeywords: [],
            published: false,
          });
        }
      } catch (error) {
        console.error("Error fetching page:", error);
        toast.error("Failed to load page content");
      } finally {
        setLoading(false);
      }
    }

    fetchPage();
  }, [slug]);

  async function handleSave() {
    if (!firebaseUser) return;

    setSaving(true);
    try {
      await saveCMSPage(slug, page, firebaseUser.uid);
      toast.success("Page saved successfully!");
    } catch (error) {
      console.error("Error saving page:", error);
      toast.error("Failed to save page");
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
            onClick={() => router.push("/cms")}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Edit Page: {page.title}</h1>
            <p className="text-sm text-muted-foreground">/{slug}</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Page Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Page Title</Label>
              <Input
                id="title"
                value={page.title || ""}
                onChange={(e) => setPage({ ...page, title: e.target.value })}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="published"
                checked={page.published || false}
                onCheckedChange={(checked) =>
                  setPage({ ...page, published: checked })
                }
              />
              <Label htmlFor="published">Published</Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SEO Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="metaDescription">Meta Description</Label>
              <Textarea
                id="metaDescription"
                value={page.metaDescription || ""}
                onChange={(e) =>
                  setPage({ ...page, metaDescription: e.target.value })
                }
                placeholder="Brief description for search engines..."
                className="h-20"
              />
            </div>

            <div>
              <Label htmlFor="metaKeywords">
                Meta Keywords (comma-separated)
              </Label>
              <Input
                id="metaKeywords"
                value={page.metaKeywords?.join(", ") || ""}
                onChange={(e) =>
                  setPage({
                    ...page,
                    metaKeywords: e.target.value
                      .split(",")
                      .map((k) => k.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="keyword1, keyword2, keyword3"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Page Content</CardTitle>
          </CardHeader>
          <CardContent>
            <PageEditor
              content={page.content || ""}
              onChange={(content) => setPage({ ...page, content })}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
