"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DynamicIcon, commonIcons } from "@/components/ui/DynamicIcon";
import { Search } from "lucide-react";

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredIcons = commonIcons.filter((icon) =>
    icon.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start gap-2 h-10"
          role="combobox"
        >
          <DynamicIcon name={value} className="h-4 w-4" />
          <span className="flex-1 text-left">{value || "Select icon..."}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search icons..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <div className="grid grid-cols-6 gap-1 p-2 max-h-64 overflow-y-auto">
          {filteredIcons.map((icon) => (
            <Button
              key={icon}
              variant={value === icon ? "default" : "ghost"}
              size="icon"
              className="h-9 w-9"
              onClick={() => {
                onChange(icon);
                setOpen(false);
                setSearch("");
              }}
              title={icon}
            >
              <DynamicIcon name={icon} className="h-4 w-4" />
            </Button>
          ))}
          {filteredIcons.length === 0 && (
            <p className="col-span-6 text-center text-sm text-muted-foreground py-4">
              No icons found
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
