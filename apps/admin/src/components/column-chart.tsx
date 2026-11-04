"use client";

import { useState } from "react";

/** One column: what it is, its value, and the value in words. */
export type Column = { key: string; label: string; axis: string; value: number; display: string; detail?: string };

/**
 * A single-series column chart in plain HTML (the dataviz guide's specs):
 * columns at most 24px wide with 2px of air between them, a 4px rounded top
 * and a square foot on the baseline, solid hairline gridlines, and a value
 * printed only on the tallest column. Every column shows its value on hover
 * and on keyboard focus, and the table under the chart lists them all.
 */
export function ColumnChart({ title, caption, columns, ticks, max, empty }: { title: string; caption: string; columns: Column[]; ticks: { value: number; label: string }[]; max: number; empty?: string }) {
  const [active, setActive] = useState<number | null>(null);
  const top = Math.max(max, 1);
  const tallest = columns.reduce((best, column, i) => (column.value > (columns[best]?.value ?? -1) ? i : best), 0);
  const height = (value: number) => `${Math.min(100, (value / top) * 100)}%`;
  const shown = active === null ? null : columns[active];

  return (
    <figure className="card p-5">
      <figcaption>
        <h2 className="font-semibold">{title}</h2>
        <p className="text-[0.85rem] text-muted">{caption}</p>
      </figcaption>
      {empty ? (
        <p className="mt-6 mb-2 text-[0.9rem] text-muted">{empty}</p>
      ) : (
        <div className="mt-8 grid grid-cols-[auto_1fr] gap-x-2">
          {/* The y axis: clean, compact ticks. */}
          <div className="relative h-40 w-10 text-right text-[0.72rem] text-muted tabular-nums" aria-hidden="true">
            {ticks.map((tick) => (
              <span key={tick.value} className="absolute right-0 -translate-y-1/2" style={{ bottom: height(tick.value) }}>
                {tick.label}
              </span>
            ))}
          </div>
          <div className="relative h-40" onPointerLeave={() => setActive(null)}>
            {ticks.map((tick) => (
              <div key={tick.value} aria-hidden="true" className="absolute inset-x-0 h-px bg-ink/10" style={{ bottom: height(tick.value) }} />
            ))}
            <ol className="absolute inset-0 flex items-end" aria-label={title}>
              {columns.map((column, i) => (
                <li
                  key={column.key}
                  // One tab stop for the chart; the arrow keys move along it.
                  tabIndex={i === (active ?? 0) ? 0 : -1}
                  aria-label={`${column.label}: ${column.display}${column.detail ? `, ${column.detail}` : ""}`}
                  onPointerEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  onKeyDown={(event) => {
                    const next = event.key === "ArrowRight" ? event.currentTarget.nextElementSibling : event.key === "ArrowLeft" ? event.currentTarget.previousElementSibling : null;
                    if (next instanceof HTMLElement) {
                      event.preventDefault();
                      next.focus();
                    }
                  }}
                  className="group relative flex h-full flex-1 cursor-default items-end justify-center px-px outline-none"
                >
                  <span
                    className="w-full max-w-6 rounded-t bg-chart transition-opacity group-hover:opacity-75 group-focus-visible:opacity-75 group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-accent"
                    style={{ height: column.value > 0 ? `max(2px, ${height(column.value)})` : "0" }}
                  />
                  {i === tallest && column.value > 0 && active === null && (
                    <span
                      className={`pointer-events-none absolute -translate-y-full pb-1 text-[0.72rem] font-semibold whitespace-nowrap ${i >= columns.length - 3 ? "right-0" : i <= 2 ? "left-0" : "left-1/2 -translate-x-1/2"}`}
                      style={{ bottom: height(column.value) }}
                    >
                      {column.display}
                    </span>
                  )}
                </li>
              ))}
            </ol>
            {shown && (
              <div
                role="status"
                className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-line bg-card px-2.5 py-1.5 text-[0.8rem] whitespace-nowrap shadow-sm"
                style={{ left: `clamp(3.5rem, ${((active! + 0.5) / columns.length) * 100}%, calc(100% - 3.5rem))`, bottom: `calc(${height(shown.value)} + 8px)` }}
              >
                <span className="block font-semibold">{shown.display}</span>
                <span className="block text-muted">
                  {shown.label}
                  {shown.detail ? ` · ${shown.detail}` : ""}
                </span>
              </div>
            )}
          </div>
          {/* The x axis: a few dates, so the labels never crowd. */}
          <div />
          <div className="mt-1.5 flex text-[0.72rem] text-muted" aria-hidden="true">
            {columns.map((column, i) => (
              <span key={column.key} className="flex-1 text-center whitespace-nowrap">
                {i % 7 === 0 ? column.axis : ""}
              </span>
            ))}
          </div>
        </div>
      )}
      {!empty && (
        <details className="mt-3 text-[0.85rem]">
          <summary className="cursor-pointer text-muted">Show as a table</summary>
          <table className="mt-2 w-full max-w-md tabular-nums">
            <tbody>
              {columns.map((column) => (
                <tr key={column.key} className="border-b border-line last:border-0">
                  <td className="py-1 pr-3">{column.label}</td>
                  <td className="py-1 text-right font-medium">{column.display}</td>
                  {column.detail !== undefined && <td className="py-1 pl-3 text-right text-muted">{column.detail}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </figure>
  );
}
