"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";
import { ChevronDown, ChartColumn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/** One column: what it is, its value, and the value in words. */
export type Column = { key: string; label: string; axis: string; value: number; display: string; detail?: string };

/**
 * A single-series column chart on shadcn's chart (the dataviz guide's
 * specs): one validated green, columns at most 24px wide with 2px of air
 * between them and a 4px rounded top, a solid hairline grid, and a value
 * printed only on the tallest column. Hovering or using the keyboard on a
 * column shows its value, and the table under the chart lists them all.
 */
export function BarChartCard({
  title,
  description,
  series,
  summary,
  columns,
  ticks,
  tickLabel,
  max,
  empty,
}: {
  title: string;
  description: string;
  series: string;
  /** One figure for the whole chart, such as the 30-day total, shown beside the title. */
  summary?: { label: string; value: string };
  columns: Column[];
  ticks: number[];
  tickLabel: "rupees" | "percent";
  max: number;
  empty?: string;
}) {
  const [tableOpen, setTableOpen] = useState(false);
  const config = { value: { label: series, color: "var(--chart-1)" } } satisfies ChartConfig;
  const tallest = columns.reduce((best, column, i) => (column.value > (columns[best]?.value ?? -1) ? i : best), 0);
  // Only the tallest column carries a printed value; Recharts leaves out empty labels.
  const data = columns.map((column, i) => ({ ...column, peak: i === tallest && column.value > 0 ? column.display : undefined }));
  const compact = new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 });
  const tick = (value: number) => (tickLabel === "rupees" ? `₹${compact.format(value)}` : `${value}%`);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        {summary && !empty && (
          <CardAction className="text-right">
            <p className="text-xl font-semibold tracking-tight tabular-nums">{summary.value}</p>
            <p className="text-xs text-muted-foreground">{summary.label}</p>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {empty ? (
          <Empty className="border border-dashed py-10">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ChartColumn />
              </EmptyMedia>
              <EmptyTitle>Nothing to show yet</EmptyTitle>
              <EmptyDescription>{empty}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <ChartContainer config={config} className="aspect-auto h-56 w-full">
              <BarChart data={data} margin={{ top: 22, left: 4, right: 16 }} barCategoryGap={2} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="axis" tickLine={false} axisLine={false} tickMargin={8} interval={6} minTickGap={8} />
                <YAxis width={48} tickLine={false} axisLine={false} ticks={ticks} domain={[0, max]} tickFormatter={tick} />
                <ChartTooltip
                  cursor={{ fill: "var(--muted)" }}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(_, payload) => (payload?.[0]?.payload as Column | undefined)?.label}
                      formatter={(_, __, item) => {
                        const column = item.payload as Column;
                        return (
                          <div className="flex w-full items-center justify-between gap-3">
                            <span className="text-muted-foreground">{column.detail ?? series}</span>
                            <span className="font-mono font-medium text-foreground tabular-nums">{column.display}</span>
                          </div>
                        );
                      }}
                    />
                  }
                />
                <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false}>
                  <LabelList dataKey="peak" position="top" offset={6} className="fill-foreground text-[11px] font-semibold" />
                </Bar>
              </BarChart>
            </ChartContainer>
            <Collapsible open={tableOpen} onOpenChange={setTableOpen} className="mt-2">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
                  <ChevronDown className={tableOpen ? "rotate-180 transition-transform" : "transition-transform"} />
                  {tableOpen ? "Hide the table" : "Show as a table"}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Day</TableHead>
                      <TableHead className="text-right">{series}</TableHead>
                      {columns.some((c) => c.detail) && <TableHead className="text-right">Detail</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {columns.map((column) => (
                      <TableRow key={column.key}>
                        <TableCell>{column.label}</TableCell>
                        <TableCell className="text-right tabular-nums">{column.display}</TableCell>
                        {column.detail !== undefined && <TableCell className="text-right text-muted-foreground tabular-nums">{column.detail}</TableCell>}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CollapsibleContent>
            </Collapsible>
          </>
        )}
      </CardContent>
    </Card>
  );
}
