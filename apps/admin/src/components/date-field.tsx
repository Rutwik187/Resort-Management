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
export function DateRangeField({
  id,
  names,
  defaultValue,
  min,
  placeholder = "Pick the dates",
  months = 2,
  short = false,
  onChange,
  className,
}: {
  id?: string;
  names: [string, string];
  defaultValue?: [string | undefined, string | undefined];
  min?: string;
  placeholder?: string;
  months?: number;
  /** Dates without the weekday and year, such as "5 Nov – 9 Nov", for a toolbar. */
  short?: boolean;
  /** Called with both dates once a range is complete, or with blanks when it is cleared. */
  onChange?: (from: string, to: string) => void;
  className?: string;
}) {
  const [range, setRange] = useState<DateRange | undefined>(defaultValue?.[0] ? { from: parseISO(defaultValue[0]), to: defaultValue[1] ? parseISO(defaultValue[1]) : undefined } : undefined);
  // A new pick always takes two clicks, the first date then the last, even when dates are already set.
  const [start, setStart] = useState<Date | undefined>();
  const [open, setOpen] = useState(false);
  const show = short ? (date: Date) => format(date, "d MMM") : shown;
  return (
    <>
      <input type="hidden" name={names[0]} value={iso(range?.from)} />
      <input type="hidden" name={names[1]} value={iso(range?.to)} />
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          setStart(undefined);
        }}
      >
        <PopoverTrigger asChild>
          <Button id={id} type="button" variant="outline" className={cn("w-full justify-start font-normal", !range?.from && "text-muted-foreground", className)}>
            <CalendarIcon />
            {range?.from ? (range.to ? `${show(range.from)} – ${show(range.to)}` : `${show(range.from)} – choose the last date`) : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          {start && <p className="border-b px-3 py-2 text-sm text-muted-foreground">From {show(start)}. Now choose the last date.</p>}
          <Calendar
            mode="range"
            selected={start ? { from: start, to: undefined } : range}
            defaultMonth={start ?? range?.from}
            numberOfMonths={months}
            disabled={min ? { before: parseISO(min) } : undefined}
            onSelect={(_, day) => {
              // The first click, or a day on or before it, starts the pick again.
              if (!start || day <= start) {
                setStart(day);
                return;
              }
              const picked = { from: start, to: day };
              setRange(picked);
              setStart(undefined);
              setOpen(false);
              onChange?.(iso(picked.from), iso(picked.to));
            }}
          />
          {onChange && range?.from && (
            <div className="border-t p-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => {
                  setRange(undefined);
                  setOpen(false);
                  onChange("", "");
                }}
              >
                Clear the dates
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </>
  );
}
