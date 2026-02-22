"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SiteContent, ContactInfo, ContactAddress, ContactHours } from "@/types/siteContent";

interface ContactInfoEditorProps {
  content: SiteContent;
  onChange: (content: SiteContent) => void;
}

export function ContactInfoEditor({ content, onChange }: ContactInfoEditorProps) {
  const data = content as ContactInfo;

  const updateField = (field: string, value: string) => {
    onChange({ ...content, [field]: value } as SiteContent);
  };

  const updateAddress = (field: keyof ContactAddress, value: string) => {
    const currentAddress = data.address || { line1: "", city: "", state: "", zip: "" };
    onChange({
      ...content,
      address: { ...currentAddress, [field]: value },
    } as SiteContent);
  };

  const updateHours = (field: keyof ContactHours, value: string) => {
    const currentHours = data.hours || { weekday: "", weekend: "" };
    onChange({
      ...content,
      hours: { ...currentHours, [field]: value },
    } as SiteContent);
  };

  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="heroTitle">Hero Title</Label>
        <Input
          id="heroTitle"
          value={data.heroTitle || ""}
          onChange={(e) => updateField("heroTitle", e.target.value)}
          placeholder="Get in Touch"
        />
      </div>

      <div>
        <Label htmlFor="heroSubtitle">Hero Subtitle</Label>
        <Input
          id="heroSubtitle"
          value={data.heroSubtitle || ""}
          onChange={(e) => updateField("heroSubtitle", e.target.value)}
          placeholder="We'd love to hear from you..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            value={data.email || ""}
            onChange={(e) => updateField("email", e.target.value)}
            placeholder="hello@example.com"
          />
        </div>

        <div>
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            value={data.phone || ""}
            onChange={(e) => updateField("phone", e.target.value)}
            placeholder="+1 (555) 123-4567"
          />
        </div>
      </div>

      <div className="space-y-4">
        <Label>Address</Label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="line1" className="text-xs text-muted-foreground">Address Line 1</Label>
            <Input
              id="line1"
              value={data.address?.line1 || ""}
              onChange={(e) => updateAddress("line1", e.target.value)}
              placeholder="123 Fashion Avenue"
            />
          </div>
          <div>
            <Label htmlFor="line2" className="text-xs text-muted-foreground">Address Line 2 (optional)</Label>
            <Input
              id="line2"
              value={data.address?.line2 || ""}
              onChange={(e) => updateAddress("line2", e.target.value)}
              placeholder="Suite 100"
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="city" className="text-xs text-muted-foreground">City</Label>
            <Input
              id="city"
              value={data.address?.city || ""}
              onChange={(e) => updateAddress("city", e.target.value)}
              placeholder="New York"
            />
          </div>
          <div>
            <Label htmlFor="state" className="text-xs text-muted-foreground">State</Label>
            <Input
              id="state"
              value={data.address?.state || ""}
              onChange={(e) => updateAddress("state", e.target.value)}
              placeholder="NY"
            />
          </div>
          <div>
            <Label htmlFor="zip" className="text-xs text-muted-foreground">ZIP Code</Label>
            <Input
              id="zip"
              value={data.address?.zip || ""}
              onChange={(e) => updateAddress("zip", e.target.value)}
              placeholder="10001"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <Label>Business Hours</Label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="weekday" className="text-xs text-muted-foreground">Weekday Hours</Label>
            <Input
              id="weekday"
              value={data.hours?.weekday || ""}
              onChange={(e) => updateHours("weekday", e.target.value)}
              placeholder="Monday - Friday: 9am - 6pm EST"
            />
          </div>
          <div>
            <Label htmlFor="weekend" className="text-xs text-muted-foreground">Weekend Hours</Label>
            <Input
              id="weekend"
              value={data.hours?.weekend || ""}
              onChange={(e) => updateHours("weekend", e.target.value)}
              placeholder="Weekend: Limited support"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
