"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const iso = (date: Date | undefined) => (date ? format(date, "yyyy-MM-dd") : "");
const shown = (date: Date) => format(date, "EEE d MMM yyyy");

/**
 * A date, picked from shadcn's calendar rather than the browser's own
 * picker. The form gets it as yyyy-mm-dd in a hidden field called `name`.
 */
export function DateField({ id, name, defaultValue, min, placeholder = "Pick a date", onChange, className }: { id?: string; name: string; defaultValue?: string; min?: string; placeholder?: string; onChange?: (value: string) => void; className?: string }) {
  const [date, setDate] = useState<Date | undefined>(defaultValue ? parseISO(defaultValue) : undefined);
  const [open, setOpen] = useState(false);
  return (
    <>
      <input type="hidden" name={name} value={iso(date)} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button id={id} type="button" variant="outline" className={cn("w-full justify-start font-normal", !date && "text-muted-foreground", className)}>
            <CalendarIcon />
            {date ? shown(date) : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            defaultMonth={date}
            disabled={min ? { before: parseISO(min) } : undefined}
            onSelect={(picked) => {
              setDate(picked);
              setOpen(false);
              onChange?.(iso(picked));
            }}
          />
        </PopoverContent>
      </Popover>
    </>
  );
}

/** A first and last date picked as one range, such as check-in and check-out. */
export function DateRangeField({ id, names, defaultValue, min, placeholder = "Pick the dates", months = 2 }: { id?: string; names: [string, string]; defaultValue?: [string | undefined, string | undefined]; min?: string; placeholder?: string; months?: number }) {
  const [range, setRange] = useState<DateRange | undefined>(defaultValue?.[0] ? { from: parseISO(defaultValue[0]), to: defaultValue[1] ? parseISO(defaultValue[1]) : undefined } : undefined);
  const [open, setOpen] = useState(false);
  return (
    <>
      <input type="hidden" name={names[0]} value={iso(range?.from)} />
      <input type="hidden" name={names[1]} value={iso(range?.to)} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button id={id} type="button" variant="outline" className={cn("w-full justify-start font-normal", !range?.from && "text-muted-foreground")}>
            <CalendarIcon />
            {range?.from ? (range.to ? `${shown(range.from)} – ${shown(range.to)}` : `${shown(range.from)} – choose the last date`) : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={range}
            defaultMonth={range?.from}
            numberOfMonths={months}
            disabled={min ? { before: parseISO(min) } : undefined}
            onSelect={(picked) => {
              setRange(picked);
              if (picked?.from && picked.to && picked.to > picked.from) setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </>
  );
}
