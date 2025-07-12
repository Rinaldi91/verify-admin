// components/MultiSelectPopover.tsx
"use client";

import * as Popover from "@radix-ui/react-popover";
import { ChevronDown, Search } from "lucide-react";
import { useState, useMemo } from "react";

interface Option {
  label: string;
  value: number;
}

interface MultiSelectPopoverProps {
  options: Option[];
  selected: Option[];
  onChange: (selected: Option[]) => void;
  placeholder?: string;
}

export default function MultiSelectPopover({
  options,
  selected,
  onChange,
  placeholder = "Select...",
}: MultiSelectPopoverProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredOptions = useMemo(() => {
    return options.filter((opt) =>
      opt.label.toLowerCase().includes(search.toLowerCase())
    );
  }, [options, search]);

  const toggleOption = (option: Option) => {
    const isSelected = selected.some((s) => s.value === option.value);
    const newSelected = isSelected
      ? selected.filter((s) => s.value !== option.value)
      : [...selected, option];
    onChange(newSelected);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          className="w-full h-[42px] px-4 py-2 rounded-lg bg-gray-800 text-left text-gray-400 flex items-center justify-between cursor-pointer"
          aria-label="Filter Types"
        >
          <span className="truncate">
            {selected.length > 0 ? `${selected.length} selected` : placeholder}
          </span>
          <ChevronDown className="w-4 h-4 ml-2 text-gray-400" />
        </button>
      </Popover.Trigger>
      <Popover.Content
        className="z-50 w-[var(--radix-popover-trigger-width)] rounded-lg bg-gray-800 border border-gray-700 p-2 shadow-xl"
        side="bottom"
        align="start"
      >
        <div className="mb-2 relative w-full">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="pl-8 pr-3 py-1.5 w-full rounded bg-gray-700 border border-gray-600 text-white text-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="max-h-60 overflow-y-auto space-y-1">
          {filteredOptions.map((option) => {
            const isSelected = selected.some((s) => s.value === option.value);
            return (
              <label
                key={option.value}
                className="flex items-center justify-between px-2 py-1 rounded hover:bg-gray-700 cursor-pointer text-sm text-white"
              >
                {option.label}
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleOption(option)}
                  className="form-checkbox text-blue-600 w-4 h-4"
                />
              </label>
            );
          })}
        </div>
      </Popover.Content>
    </Popover.Root>
  );
}
