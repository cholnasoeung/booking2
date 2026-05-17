"use client";

import { useState } from "react";

import SeatMap, { SeatMapLegend, SeatStatePill } from "@/components/seat-map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatBusType } from "@/lib/formatters";
import {
  type BusType,
  type SeatLayout,
  type SeatLayoutItem,
  type SeatLayoutItemKind,
  autofillSeatCodes,
  cloneSeatLayout,
  createLayoutItem,
  getSeatCodeForLayoutPosition,
  getSeatLayoutItems,
  getSeatLayoutTemplate,
  isBookableItemKind,
  normalizeSeatCode,
  validateSeatLayout,
} from "@/lib/seat-layout";

const itemKindOptions: SeatLayoutItemKind[] = [
  "seat",
  "sleeper",
  "aisle",
  "driver",
  "toilet",
  "empty",
];

type SeatLayoutEditorProps = {
  busType: BusType;
  value: SeatLayout;
  bookedSeats?: string[];
  blockedSeats?: string[];
  onChange: (layout: SeatLayout) => void;
  onBlockedSeatsChange?: (blockedSeats: string[]) => void;
};

export default function SeatLayoutEditor({
  busType,
  value,
  bookedSeats = [],
  blockedSeats = [],
  onChange,
  onBlockedSeatsChange,
}: SeatLayoutEditorProps) {
  const [nextItemKind, setNextItemKind] = useState<SeatLayoutItemKind>("seat");

  const validation = getLayoutValidation(value, bookedSeats);
  const sortedItems = getSeatLayoutItems(value);

  function toggleSeatBlock(seatCode: string) {
    if (!onBlockedSeatsChange) return;

    const newBlockedSeats = blockedSeats.includes(seatCode)
      ? blockedSeats.filter((s) => s !== seatCode)
      : [...blockedSeats, seatCode];

    onBlockedSeatsChange(newBlockedSeats);
  }

  function applyChange(updater: (layout: SeatLayout) => SeatLayout) {
    const nextLayout = normalizeLayout(updater(cloneSeatLayout(value)));
    onChange(nextLayout);
  }

  function handleGridChange(field: "rows" | "cols", rawValue: string) {
    const parsed = Number(rawValue);
    const safeValue = Number.isInteger(parsed) && parsed > 0 ? parsed : 1;

    applyChange((layout) => {
      layout.grid[field] = safeValue;
      layout.items = layout.items.map((item) => {
        const nextItem = { ...item };
        nextItem.row = Math.min(nextItem.row, layout.grid.rows);
        nextItem.col = Math.min(nextItem.col, layout.grid.cols);
        nextItem.rowSpan = Math.max(
          1,
          Math.min(nextItem.rowSpan ?? 1, layout.grid.rows - nextItem.row + 1)
        );
        nextItem.colSpan = Math.max(
          1,
          Math.min(nextItem.colSpan ?? 1, layout.grid.cols - nextItem.col + 1)
        );
        return nextItem;
      });

      return layout;
    });
  }

  function addItem() {
    applyChange((layout) => {
      const placement = findNextPlacement(layout, nextItemKind);

      if (placement.shouldGrowRows) {
        layout.grid.rows += 1;
      }

      layout.items.push(
        createLayoutItem(nextItemKind, layout, placement.row, placement.col)
      );

      return layout;
    });
  }

  function updateItem(
    itemId: string,
    updater: (item: SeatLayoutItem) => SeatLayoutItem
  ) {
    applyChange((layout) => {
      layout.items = layout.items.map((item) =>
        item.id === itemId ? updater({ ...item }) : item
      );

      return layout;
    });
  }

  function removeItem(itemId: string) {
    applyChange((layout) => {
      layout.items = layout.items.filter((item) => item.id !== itemId);
      return layout;
    });
  }

  function moveItem(itemId: string, rowDelta: number, colDelta: number) {
    updateItem(itemId, (item) => ({
      ...item,
      row: clamp(item.row + rowDelta, 1, value.grid.rows),
      col: clamp(item.col + colDelta, 1, value.grid.cols),
    }));
  }

  return (
    <div className="space-y-5">
      <Card className="border-white/60 bg-white/90 shadow-xl shadow-red-950/5">
        <CardHeader className="gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-xl">Seat layout editor</CardTitle>
              <p className="text-sm text-muted-foreground">
                Start from the {formatBusType(busType).toLowerCase()} template, then
                fine-tune the layout for this departure.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                {value.template === "custom" ? "Custom layout" : "Template layout"}
              </Badge>
              <SeatStatePill
                label={`${validation.totalSeats} seats`}
                className="border-emerald-200 bg-emerald-50 text-emerald-700"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => onChange(getSeatLayoutTemplate(busType))}
            >
              Reset template
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() =>
                onChange(normalizeLayout(autofillSeatCodes(cloneSeatLayout(value))))
              }
            >
              Regenerate labels
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="layout-rows">Grid rows</Label>
                  <Input
                    id="layout-rows"
                    type="number"
                    min={1}
                    value={value.grid.rows}
                    onChange={(event) => handleGridChange("rows", event.target.value)}
                    className="h-11 rounded-2xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="layout-cols">Grid columns</Label>
                  <Input
                    id="layout-cols"
                    type="number"
                    min={1}
                    value={value.grid.cols}
                    onChange={(event) => handleGridChange("cols", event.target.value)}
                    className="h-11 rounded-2xl"
                  />
                </div>
              </div>

              <div className="rounded-[28px] border border-border/80 bg-secondary/50 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                  Add layout item
                </p>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                  <Select
                    value={nextItemKind}
                    onValueChange={(value) => {
                      if (isSeatLayoutItemKind(value)) {
                        setNextItemKind(value);
                      }
                    }}
                  >
                    <SelectTrigger className="h-11 w-full rounded-2xl">
                      <SelectValue placeholder="Choose item type" />
                    </SelectTrigger>
                    <SelectContent>
                      {itemKindOptions.map((kind) => (
                        <SelectItem key={kind} value={kind}>
                          {formatKindLabel(kind)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    className="h-11 rounded-2xl"
                    onClick={addItem}
                  >
                    Add item
                  </Button>
                </div>
              </div>

              {validation.error ? (
                <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {validation.error}
                </p>
              ) : (
                <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  Layout is valid and ready to save.
                </p>
              )}
            </div>

            <div className="rounded-[28px] border border-border/80 bg-slate-50/70 p-4">
              <SeatMapLegend className="mb-4" />
              <SeatMap
                layout={value}
                bookedSeats={bookedSeats}
                blockedSeats={blockedSeats}
                allowBlockedToggle
                onSeatToggle={toggleSeatBlock}
                className="space-y-0"
              />
              <p className="mt-3 text-xs text-muted-foreground">
                Click a seat to toggle block status while setting up a departure.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">Layout items</p>
                <p className="text-sm text-muted-foreground">
                  Adjust position, span, type, and labels for each grid item.
                </p>
              </div>
              <Badge variant="outline">{sortedItems.length} items</Badge>
            </div>

            <div className="space-y-3">
              {sortedItems.map((item) => (
                <Card key={item.id} className="border-border/70 bg-white/90">
                  <CardContent className="space-y-4 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{formatKindLabel(item.kind)}</Badge>
                        {item.seatCode ? (
                          <Badge variant="outline">{normalizeSeatCode(item.seatCode)}</Badge>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => moveItem(item.id, -1, 0)}
                        >
                          Up
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => moveItem(item.id, 1, 0)}
                        >
                          Down
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => moveItem(item.id, 0, -1)}
                        >
                          Left
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => moveItem(item.id, 0, 1)}
                        >
                          Right
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Select
                          value={item.kind}
                          onValueChange={(nextKind) => {
                            if (!isSeatLayoutItemKind(nextKind)) {
                              return;
                            }

                            updateItem(item.id, (current) => ({
                              ...current,
                              kind: nextKind,
                            }));
                          }}
                        >
                          <SelectTrigger className="h-11 w-full rounded-2xl">
                            <SelectValue placeholder="Type" />
                          </SelectTrigger>
                          <SelectContent>
                            {itemKindOptions.map((kind) => (
                              <SelectItem key={kind} value={kind}>
                                {formatKindLabel(kind)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <NumberField
                        label="Row"
                        value={item.row}
                        min={1}
                        max={value.grid.rows}
                        onChange={(nextValue) =>
                          updateItem(item.id, (current) => ({
                            ...current,
                            row: nextValue,
                          }))
                        }
                      />
                      <NumberField
                        label="Column"
                        value={item.col}
                        min={1}
                        max={value.grid.cols}
                        onChange={(nextValue) =>
                          updateItem(item.id, (current) => ({
                            ...current,
                            col: nextValue,
                          }))
                        }
                      />
                      <NumberField
                        label="Row span"
                        value={item.rowSpan ?? 1}
                        min={1}
                        max={value.grid.rows}
                        onChange={(nextValue) =>
                          updateItem(item.id, (current) => ({
                            ...current,
                            rowSpan: nextValue,
                          }))
                        }
                      />
                      <NumberField
                        label="Column span"
                        value={item.colSpan ?? 1}
                        min={1}
                        max={value.grid.cols}
                        onChange={(nextValue) =>
                          updateItem(item.id, (current) => ({
                            ...current,
                            colSpan: nextValue,
                          }))
                        }
                      />

                      <div className="space-y-2">
                        <Label>{isBookableItemKind(item.kind) ? "Seat code" : "Label"}</Label>
                        <Input
                          value={getItemEditableLabel(item)}
                          onChange={(event) =>
                            updateItem(item.id, (current) => {
                              const nextValue = event.target.value;

                              if (isBookableItemKind(current.kind)) {
                                const seatCode = normalizeSeatCode(nextValue);
                                return {
                                  ...current,
                                  seatCode,
                                  label: seatCode,
                                };
                              }

                              return {
                                ...current,
                                label: nextValue,
                              };
                            })
                          }
                          className="h-11 rounded-2xl"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => {
          const parsed = Number(event.target.value);
          if (!Number.isInteger(parsed)) {
            return;
          }

          onChange(clamp(parsed, min, max));
        }}
        className="h-11 rounded-2xl"
      />
    </div>
  );
}

function normalizeLayout(layout: SeatLayout) {
  layout.template = "custom";
  layout.items = layout.items.map((item) => {
    const nextItem: SeatLayoutItem = {
      ...item,
      row: clamp(item.row, 1, layout.grid.rows),
      col: clamp(item.col, 1, layout.grid.cols),
      rowSpan: Math.max(1, item.rowSpan ?? 1),
      colSpan: Math.max(1, item.colSpan ?? 1),
    };

    if (nextItem.row + (nextItem.rowSpan ?? 1) - 1 > layout.grid.rows) {
      nextItem.rowSpan = Math.max(1, layout.grid.rows - nextItem.row + 1);
    }

    if (nextItem.col + (nextItem.colSpan ?? 1) - 1 > layout.grid.cols) {
      nextItem.colSpan = Math.max(1, layout.grid.cols - nextItem.col + 1);
    }

    if (nextItem.kind === "seat") {
      nextItem.rowSpan = 1;
      nextItem.colSpan = 1;
    }

    if (nextItem.kind === "sleeper") {
      nextItem.rowSpan = 1;
    }

    if (isBookableItemKind(nextItem.kind)) {
      const seatCode = normalizeSeatCode(
        nextItem.seatCode ||
          getSeatCodeForLayoutPosition(layout, nextItem.row, nextItem.col)
      );
      nextItem.seatCode = seatCode;
      nextItem.label = seatCode;
    } else {
      const hadSeatCode = Boolean(nextItem.seatCode);
      delete nextItem.seatCode;

      if (hadSeatCode || !nextItem.label) {
        nextItem.label =
          nextItem.kind === "driver"
            ? "Driver"
            : nextItem.kind === "toilet"
              ? "WC"
              : nextItem.kind === "aisle"
                ? "Aisle"
                : "";
      }
    }

    return nextItem;
  });

  return layout;
}

function findNextPlacement(layout: SeatLayout, kind: SeatLayoutItemKind) {
  const rowSpan = 1;
  const colSpan = 1;

  for (let row = 1; row <= layout.grid.rows; row += 1) {
    for (let col = 1; col <= layout.grid.cols; col += 1) {
      if (canPlaceItem(layout, row, col, rowSpan, colSpan)) {
        return { row, col, shouldGrowRows: false };
      }
    }
  }

  return {
    row: layout.grid.rows + 1,
    col: 1,
    shouldGrowRows: true,
  };
}

function canPlaceItem(
  layout: SeatLayout,
  row: number,
  col: number,
  rowSpan: number,
  colSpan: number
) {
  if (row + rowSpan - 1 > layout.grid.rows || col + colSpan - 1 > layout.grid.cols) {
    return false;
  }

  for (const item of layout.items) {
    if (itemsOverlap({ row, col, rowSpan, colSpan }, item)) {
      return false;
    }
  }

  return true;
}

function itemsOverlap(
  first: Pick<SeatLayoutItem, "row" | "col" | "rowSpan" | "colSpan">,
  second: Pick<SeatLayoutItem, "row" | "col" | "rowSpan" | "colSpan">
) {
  const firstRowEnd = first.row + (first.rowSpan ?? 1) - 1;
  const secondRowEnd = second.row + (second.rowSpan ?? 1) - 1;
  const firstColEnd = first.col + (first.colSpan ?? 1) - 1;
  const secondColEnd = second.col + (second.colSpan ?? 1) - 1;

  return !(
    firstRowEnd < second.row ||
    secondRowEnd < first.row ||
    firstColEnd < second.col ||
    secondColEnd < first.col
  );
}

function getLayoutValidation(layout: SeatLayout, bookedSeats: string[]) {
  try {
    const result = validateSeatLayout(layout, bookedSeats);
    return {
      totalSeats: result.totalSeats,
      error: "",
    };
  } catch (error) {
    return {
      totalSeats: getSeatLayoutItems(layout).filter((item) => isBookableItemKind(item.kind))
        .length,
      error: error instanceof Error ? error.message : "Layout is invalid.",
    };
  }
}

function getItemEditableLabel(item: SeatLayoutItem) {
  if (isBookableItemKind(item.kind)) {
    return item.seatCode ?? item.label ?? "";
  }

  return item.label ?? "";
}

function formatKindLabel(value: SeatLayoutItemKind) {
  switch (value) {
    case "seat":
      return "Seat";
    case "sleeper":
      return "Sleeper";
    case "aisle":
      return "Aisle";
    case "driver":
      return "Driver";
    case "toilet":
      return "Toilet";
    case "empty":
    default:
      return "Empty";
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function isSeatLayoutItemKind(value: string | null): value is SeatLayoutItemKind {
  return itemKindOptions.some((kind) => kind === value);
}
