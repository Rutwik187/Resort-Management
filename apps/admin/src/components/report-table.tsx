import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { rupees, shortDate } from "@/lib/format";
import type { Column, ReportTable } from "@/lib/report-tables";
import { cn } from "@/lib/utils";

/** One cell in words: rupees, a share, a short date or the value itself. */
function show(column: Column, value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "";
  if (column.kind === "money" && typeof value === "number") {
    const paise = Math.round(value);
    return paise < 0 ? `−${rupees(-paise)}` : rupees(Math.abs(paise));
  }
  if (column.kind === "percent" && typeof value === "number") return `${Math.round(value * 1000) / 10}%`;
  if (column.kind === "number" && typeof value === "number") return value.toLocaleString("en-IN");
  if (column.kind === "date" && typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return shortDate(value);
  return String(value);
}

const numeric = (column: Column) => column.kind === "money" || column.kind === "number" || column.kind === "percent";

/** A report as a card with its table and total line. Wide tables scroll sideways on a phone. */
export function ReportTableCard({ table }: { table: ReportTable }) {
  return (
    <Card className="gap-0 overflow-hidden py-0 shadow-xs break-inside-avoid print:border-0 print:shadow-none">
      <CardHeader className="border-b py-4 [.border-b]:pb-4">
        <CardTitle>{table.title}</CardTitle>
        <CardDescription>{table.description}</CardDescription>
      </CardHeader>
      {table.rows.length === 0 ? (
        <p className="px-6 py-8 text-center text-sm text-muted-foreground">Nothing in this period.</p>
      ) : (
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="hover:bg-transparent">
              {table.columns.map((column, i) => (
                <TableHead key={column.key} className={cn(numeric(column) && "text-right", i === 0 && "pl-6", i === table.columns.length - 1 && "pr-6")}>
                  {column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {table.rows.map((row, r) => (
              <TableRow key={r} className={cn(table.flagged?.(row) && "bg-warn/10")}>
                {table.columns.map((column, i) => (
                  <TableCell key={column.key} className={cn("whitespace-normal", numeric(column) && "text-right tabular-nums", i === 0 && "pl-6", i === table.columns.length - 1 && "pr-6", column.kind === "money" && typeof row[column.key] === "number" && (row[column.key] as number) < 0 && "text-danger")}>
                    {show(column, row[column.key])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
          {table.total && (
            <TableFooter>
              <TableRow>
                {table.columns.map((column, i) => (
                  <TableCell key={column.key} className={cn("font-semibold", numeric(column) && "text-right tabular-nums", i === 0 && "pl-6", i === table.columns.length - 1 && "pr-6")}>
                    {show(column, table.total![column.key])}
                  </TableCell>
                ))}
              </TableRow>
            </TableFooter>
          )}
        </Table>
      )}
    </Card>
  );
}
