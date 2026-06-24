import { BUS_TYPES, DEFAULT_TOTAL_SEATS } from "@/lib/constants";

export type BusType = (typeof BUS_TYPES)[number];
export type SeatLayoutTemplate = BusType | "custom";
export type SeatLayoutItemKind =
  | "seat"
  | "sleeper"
  | "aisle"
  | "driver"
  | "toilet"
  | "empty"
  | "deck_label";

export type SeatLayoutItem = {
  id: string;
  kind: SeatLayoutItemKind;
  row: number;
  col: number;
  rowSpan?: number;
  colSpan?: number;
  seatCode?: string;
  label?: string;
};

export type SeatLayout = {
  version: 1;
  template: SeatLayoutTemplate;
  grid: {
    rows: number;
    cols: number;
  };
  items: SeatLayoutItem[];
};

export type NormalizedSeatLayout = {
  busType: BusType;
  seatLayout: SeatLayout;
  bookedSeats: string[];
  totalSeats: number;
  seatCodes: string[];
  templateStatus: SeatLayoutTemplate;
};

const BOOKABLE_ITEM_KINDS = new Set<SeatLayoutItemKind>(["seat", "sleeper"]);
const LAYOUT_VERSION = 1 as const;

export function isBusType(value: unknown): value is BusType {
  return typeof value === "string" && BUS_TYPES.includes(value as BusType);
}

export function isBookableItemKind(kind: SeatLayoutItemKind) {
  return BOOKABLE_ITEM_KINDS.has(kind);
}

export function compareSeatCodes(first: string, second: string) {
  const normalizedFirst = normalizeSeatCode(first);
  const normalizedSecond = normalizeSeatCode(second);
  const firstMatch = normalizedFirst.match(/^(\d+)([A-Z]+)$/);
  const secondMatch = normalizedSecond.match(/^(\d+)([A-Z]+)$/);

  if (!firstMatch || !secondMatch) {
    return normalizedFirst.localeCompare(normalizedSecond);
  }

  const firstNumber = Number(firstMatch[1]);
  const secondNumber = Number(secondMatch[1]);

  if (firstNumber !== secondNumber) {
    return firstNumber - secondNumber;
  }

  return firstMatch[2].localeCompare(secondMatch[2]);
}

export function normalizeSeatCode(value: string) {
  return value.trim().toUpperCase();
}

export function getSeatLetterForColumn(column: number) {
  return String.fromCharCode(64 + column);
}

export function getSeatCodeForPosition(row: number, col: number) {
  return `${row}${getSeatLetterForColumn(col)}`;
}

export function getBookableRows(layout: SeatLayout) {
  return [...new Set(getBookableSeatItems(layout).map((item) => item.row))].sort(
    (first, second) => first - second
  );
}

export function getSeatCodeForLayoutPosition(
  layout: SeatLayout,
  row: number,
  col: number
) {
  const rows = getBookableRows(layout);
  const rowIndex = rows.indexOf(row);
  const visualRow = rowIndex >= 0 ? rowIndex + 1 : rows.length + 1;

  return getSeatCodeForPosition(visualRow, col);
}

export function autofillSeatCodes(layout: SeatLayout) {
  const nextLayout = cloneLayout(layout);

  nextLayout.items = getSeatLayoutItems(nextLayout).map((item) => {
    if (!isBookableItemKind(item.kind)) {
      return item;
    }

    const seatCode = getSeatCodeForLayoutPosition(nextLayout, item.row, item.col);

    return {
      ...item,
      seatCode,
      label: seatCode,
    };
  });

  return nextLayout;
}

function buildItem(
  kind: SeatLayoutItemKind,
  row: number,
  col: number,
  options: Partial<SeatLayoutItem> = {}
): SeatLayoutItem {
  return {
    id: options.id ?? `${kind}-${row}-${col}-${options.seatCode ?? options.label ?? ""}`,
    kind,
    row,
    col,
    rowSpan: options.rowSpan ?? 1,
    colSpan: options.colSpan ?? 1,
    seatCode: options.seatCode,
    label: options.label,
  };
}

function buildSeat(
  row: number,
  col: number,
  seatCode: string,
  options: Partial<SeatLayoutItem> = {}
) {
  return buildItem("seat", row, col, {
    ...options,
    seatCode,
    label: options.label ?? seatCode,
  });
}

function buildSleeper(
  row: number,
  col: number,
  seatCode: string,
  options: Partial<SeatLayoutItem> = {}
) {
  return buildItem("sleeper", row, col, {
    colSpan: 2,
    ...options,
    seatCode,
    label: options.label ?? seatCode,
  });
}

function cloneLayout(layout: SeatLayout): SeatLayout {
  return JSON.parse(JSON.stringify(layout)) as SeatLayout;
}

export function cloneSeatLayout(layout: SeatLayout) {
  return cloneLayout(layout);
}

export function getBusTypeLabel(busType: BusType) {
  switch (busType) {
    case "bus_45":
      return "45 Seater";
    case "mini_bus":
      return "Mini Bus";
    case "car":
      return "Car";
    case "sleeper_30":
      return "Sleeper Bus (30 Berths)";
    case "sleeper_40":
      return "Sleeper Bus (40 Berths)";
    default:
      return "Bus";
  }
}

function createMiniBusTemplate(): SeatLayout {
  const items: SeatLayoutItem[] = [
    buildItem("driver", 1, 1, { colSpan: 2, label: "Driver" }),
    buildItem("aisle", 1, 3, { label: "Aisle" }),
    buildItem("empty", 1, 4),
    buildItem("empty", 1, 5),
  ];

  // Row 1: 1A, 1B, aisle, 1D, 1E (4 seats)
  items.push(buildSeat(2, 1, "1A"));
  items.push(buildSeat(2, 2, "1B"));
  items.push(buildItem("aisle", 2, 3, { label: "Aisle" }));
  items.push(buildSeat(2, 4, "1D"));
  items.push(buildSeat(2, 5, "1E"));

  // Row 2: 2A, 2B, aisle, 2D, 2E (4 seats)
  items.push(buildSeat(3, 1, "2A"));
  items.push(buildSeat(3, 2, "2B"));
  items.push(buildItem("aisle", 3, 3, { label: "Aisle" }));
  items.push(buildSeat(3, 4, "2D"));
  items.push(buildSeat(3, 5, "2E"));

  // Row 3: 3A, 3B, aisle, 3D, 3E (4 seats)
  items.push(buildSeat(4, 1, "3A"));
  items.push(buildSeat(4, 2, "3B"));
  items.push(buildItem("aisle", 4, 3, { label: "Aisle" }));
  items.push(buildSeat(4, 4, "3D"));
  items.push(buildSeat(4, 5, "3E"));

  // Row 4: 4A, 4B, aisle, empty, empty (2 seats)
  items.push(buildSeat(5, 1, "4A"));
  items.push(buildSeat(5, 2, "4B"));
  items.push(buildItem("aisle", 5, 3, { label: "Aisle" }));
  items.push(buildItem("empty", 5, 4));
  items.push(buildItem("empty", 5, 5));

  return {
    version: LAYOUT_VERSION,
    template: "mini_bus",
    grid: {
      rows: 5,
      cols: 5,
    },
    items,
  };
}

function createCarTemplate(): SeatLayout {
  return {
    version: LAYOUT_VERSION,
    template: "car",
    grid: {
      rows: 3,
      cols: 3,
    },
    items: [
      buildItem("empty", 1, 1),
      buildItem("driver", 1, 2, { label: "Driver" }),
      buildItem("empty", 1, 3),
      buildSeat(2, 1, "1A"),
      buildSeat(2, 2, "1B"),
      buildSeat(2, 3, "1C"),
      buildSeat(3, 1, "2A"),
      buildSeat(3, 2, "2B"),
      buildSeat(3, 3, "2C"),
    ],
  };
}

function createBus45Template(): SeatLayout {
  const items: SeatLayoutItem[] = [
    buildItem("driver", 1, 1, { colSpan: 2, label: "Driver" }),
    buildItem("aisle", 1, 3, { label: "Aisle" }),
    buildItem("empty", 1, 4),
  ];

  // 15 rows of regular seats: 2 left + 1 right = 3 seats per row × 15 rows = 45 seats
  for (let row = 2; row <= 16; row += 1) {
    const seatRow = row - 1;
    // Left side: 2 seats
    items.push(buildSeat(row, 1, `${seatRow}A`));
    items.push(buildSeat(row, 2, `${seatRow}B`));
    // Aisle
    items.push(buildItem("aisle", row, 3, { label: "Aisle" }));
    // Right side: 1 seat
    items.push(buildSeat(row, 4, `${seatRow}C`));
  }

  return {
    version: LAYOUT_VERSION,
    template: "bus_45",
    grid: {
      rows: 16,
      cols: 4,
    },
    items,
  };
}

// sleeper_30: 2-left + aisle + 1-right, 15 lower + 15 upper = 30 berths
function createSleeper30Template(): SeatLayout {
  const items: SeatLayoutItem[] = [];

  // Row 1: driver cabin
  items.push(buildItem("driver", 1, 1, { colSpan: 2, label: "Driver" }));
  items.push(buildItem("aisle", 1, 3, { label: "Aisle" }));
  items.push(buildItem("empty", 1, 4));
  items.push(buildItem("empty", 1, 5));

  // Row 2: lower deck label
  items.push(buildItem("deck_label", 2, 1, { colSpan: 5, label: "Lower Deck" }));

  let lNum = 1;
  for (let row = 3; row <= 7; row++) {
    items.push(buildItem("sleeper", row, 1, { seatCode: `L${lNum}`,   label: `L${lNum}` }));   lNum++;
    items.push(buildItem("sleeper", row, 2, { seatCode: `L${lNum}`,   label: `L${lNum}` }));   lNum++;
    items.push(buildItem("aisle",   row, 3, { label: "Aisle" }));
    items.push(buildItem("sleeper", row, 4, { seatCode: `L${lNum}`,   label: `L${lNum}` }));   lNum++;
    items.push(buildItem("empty",   row, 5));
  }

  // Row 8: upper deck label
  items.push(buildItem("deck_label", 8, 1, { colSpan: 5, label: "Upper Deck" }));

  let uNum = 1;
  for (let row = 9; row <= 13; row++) {
    items.push(buildItem("sleeper", row, 1, { seatCode: `U${uNum}`,   label: `U${uNum}` }));   uNum++;
    items.push(buildItem("sleeper", row, 2, { seatCode: `U${uNum}`,   label: `U${uNum}` }));   uNum++;
    items.push(buildItem("aisle",   row, 3, { label: "Aisle" }));
    items.push(buildItem("sleeper", row, 4, { seatCode: `U${uNum}`,   label: `U${uNum}` }));   uNum++;
    items.push(buildItem("empty",   row, 5));
  }

  return {
    version: LAYOUT_VERSION,
    template: "sleeper_30",
    grid: { rows: 13, cols: 5 },
    items,
  };
}

// sleeper_40: 2-left + aisle + 2-right, 20 lower + 20 upper = 40 berths
function createSleeper40Template(): SeatLayout {
  const items: SeatLayoutItem[] = [];

  // Row 1: driver cabin
  items.push(buildItem("driver", 1, 1, { colSpan: 2, label: "Driver" }));
  items.push(buildItem("aisle", 1, 3, { label: "Aisle" }));
  items.push(buildItem("empty", 1, 4));
  items.push(buildItem("empty", 1, 5));

  // Row 2: lower deck label
  items.push(buildItem("deck_label", 2, 1, { colSpan: 5, label: "Lower Deck" }));

  let lNum = 1;
  for (let row = 3; row <= 7; row++) {
    items.push(buildItem("sleeper", row, 1, { seatCode: `L${lNum}`,   label: `L${lNum}` }));   lNum++;
    items.push(buildItem("sleeper", row, 2, { seatCode: `L${lNum}`,   label: `L${lNum}` }));   lNum++;
    items.push(buildItem("aisle",   row, 3, { label: "Aisle" }));
    items.push(buildItem("sleeper", row, 4, { seatCode: `L${lNum}`,   label: `L${lNum}` }));   lNum++;
    items.push(buildItem("sleeper", row, 5, { seatCode: `L${lNum}`,   label: `L${lNum}` }));   lNum++;
  }

  // Row 8: upper deck label
  items.push(buildItem("deck_label", 8, 1, { colSpan: 5, label: "Upper Deck" }));

  let uNum = 1;
  for (let row = 9; row <= 13; row++) {
    items.push(buildItem("sleeper", row, 1, { seatCode: `U${uNum}`,   label: `U${uNum}` }));   uNum++;
    items.push(buildItem("sleeper", row, 2, { seatCode: `U${uNum}`,   label: `U${uNum}` }));   uNum++;
    items.push(buildItem("aisle",   row, 3, { label: "Aisle" }));
    items.push(buildItem("sleeper", row, 4, { seatCode: `U${uNum}`,   label: `U${uNum}` }));   uNum++;
    items.push(buildItem("sleeper", row, 5, { seatCode: `U${uNum}`,   label: `U${uNum}` }));   uNum++;
  }

  return {
    version: LAYOUT_VERSION,
    template: "sleeper_40",
    grid: { rows: 13, cols: 5 },
    items,
  };
}

export function getSeatLayoutTemplate(busType: BusType): SeatLayout {
  switch (busType) {
    case "bus_45":
      return createBus45Template();
    case "mini_bus":
      return createMiniBusTemplate();
    case "car":
      return createCarTemplate();
    case "sleeper_30":
      return createSleeper30Template();
    case "sleeper_40":
      return createSleeper40Template();
    default:
      return createMiniBusTemplate();
  }
}

export function getFallbackLegacyLayout(totalSeats = DEFAULT_TOTAL_SEATS): SeatLayout {
  const seatColumns = [
    { col: 1, suffix: "A" },
    { col: 2, suffix: "B" },
    { col: 4, suffix: "D" },
    { col: 5, suffix: "E" },
  ];
  const rows = Math.max(Math.ceil(totalSeats / 4), 1);
  const items: SeatLayoutItem[] = [];
  let seatNumber = 1;

  for (let row = 1; row <= rows; row += 1) {
    items.push(buildItem("aisle", row, 3, { label: "Aisle" }));

    for (const column of seatColumns) {
      if (seatNumber > totalSeats) {
        items.push(buildItem("empty", row, column.col));
        continue;
      }

      const seatCode = `${row}${column.suffix}`;
      items.push(buildSeat(row, column.col, seatCode));
      seatNumber += 1;
    }
  }

  return {
    version: LAYOUT_VERSION,
    template: "custom",
    grid: {
      rows,
      cols: 5,
    },
    items,
  };
}

export function getSeatLayoutItems(layout: SeatLayout) {
  return [...layout.items].sort((first, second) => {
    if (first.row !== second.row) {
      return first.row - second.row;
    }

    if (first.col !== second.col) {
      return first.col - second.col;
    }

    return first.id.localeCompare(second.id);
  });
}

export function getBookableSeatItems(layout: SeatLayout) {
  return getSeatLayoutItems(layout).filter((item) => {
    return isBookableItemKind(item.kind) && item.seatCode;
  });
}

export function getSeatCodesFromLayout(layout: SeatLayout) {
  return getBookableSeatItems(layout)
    .map((item) => normalizeSeatCode(item.seatCode!))
    .sort(compareSeatCodes);
}

export function validateSeatLayout(
  layout: SeatLayout,
  bookedSeats: Array<string | number> = []
) {
  if (!layout || typeof layout !== "object") {
    throw new Error("Seat layout is required.");
  }

  if (
    !layout.grid ||
    !Number.isInteger(layout.grid.rows) ||
    layout.grid.rows < 1 ||
    !Number.isInteger(layout.grid.cols) ||
    layout.grid.cols < 1
  ) {
    throw new Error("Seat layout grid must define positive rows and columns.");
  }

  const occupiedCells = new Set<string>();
  const seatCodes = new Set<string>();
  const orderedSeatCodes: string[] = [];
  let bookableCount = 0;

  for (const item of layout.items) {
    const rowSpan = item.rowSpan ?? 1;
    const colSpan = item.colSpan ?? 1;

    if (
      !Number.isInteger(item.row) ||
      item.row < 1 ||
      !Number.isInteger(item.col) ||
      item.col < 1 ||
      !Number.isInteger(rowSpan) ||
      rowSpan < 1 ||
      !Number.isInteger(colSpan) ||
      colSpan < 1
    ) {
      throw new Error("Each layout item must define valid row and column positions.");
    }

    if (
      item.row + rowSpan - 1 > layout.grid.rows ||
      item.col + colSpan - 1 > layout.grid.cols
    ) {
      throw new Error("Seat layout items cannot extend outside the grid.");
    }

    for (let rowOffset = 0; rowOffset < rowSpan; rowOffset += 1) {
      for (let colOffset = 0; colOffset < colSpan; colOffset += 1) {
        const occupancyKey = `${item.row + rowOffset}:${item.col + colOffset}`;

        if (occupiedCells.has(occupancyKey)) {
          throw new Error("Seat layout items cannot overlap.");
        }

        occupiedCells.add(occupancyKey);
      }
    }

    if (isBookableItemKind(item.kind)) {
      const seatCode = item.seatCode ? normalizeSeatCode(item.seatCode) : "";

      if (!seatCode) {
        throw new Error("Bookable seats must define a seat code.");
      }

      if (seatCodes.has(seatCode)) {
        throw new Error("Seat codes must be unique.");
      }

      seatCodes.add(seatCode);
      orderedSeatCodes.push(seatCode);
      bookableCount += 1;
    }
  }

  if (bookableCount < 1) {
    throw new Error("Seat layout must include at least one bookable seat.");
  }

  const normalizedBookedSeats = normalizeStoredSeatCodes(bookedSeats, layout);
  const invalidBookedSeat = normalizedBookedSeats.find((seatCode) => !seatCodes.has(seatCode));

  if (invalidBookedSeat) {
    throw new Error(`Booked seat ${invalidBookedSeat} does not exist in the layout.`);
  }

  return {
    totalSeats: bookableCount,
    seatCodes: orderedSeatCodes.sort(compareSeatCodes),
    bookedSeats: normalizedBookedSeats.sort(compareSeatCodes),
  };
}

export function normalizeStoredSeatCodes(
  value: Array<string | number> | undefined,
  layout: SeatLayout
) {
  if (!Array.isArray(value) || value.length === 0) {
    return [];
  }

  const orderedSeats = getBookableSeatItems(layout).map((item) =>
    normalizeSeatCode(item.seatCode!)
  );
  const normalized = value
    .map((seat) => {
      if (typeof seat === "number" && Number.isInteger(seat) && seat > 0) {
        return orderedSeats[seat - 1] ?? null;
      }

      if (typeof seat === "string") {
        const trimmed = seat.trim();

        if (!trimmed) {
          return null;
        }

        if (/^\d+$/.test(trimmed)) {
          const seatIndex = Number(trimmed);
          return orderedSeats[seatIndex - 1] ?? null;
        }

        return normalizeSeatCode(trimmed);
      }

      return null;
    })
    .filter((seatCode): seatCode is string => Boolean(seatCode));

  return [...new Set(normalized)].sort(compareSeatCodes);
}

function getNormalizedLayoutFromRecord(record: {
  busType?: unknown;
  seatLayout?: SeatLayout | null;
  totalSeats?: number;
  bookedSeats?: Array<string | number>;
}) {
  const busType = isBusType(record.busType) ? record.busType : "mini_bus";
  const layout = record.seatLayout
    ? cloneLayout(record.seatLayout)
    : getFallbackLegacyLayout(
        Number.isInteger(record.totalSeats) && record.totalSeats && record.totalSeats > 0
          ? record.totalSeats
          : DEFAULT_TOTAL_SEATS
      );

  const validation = validateSeatLayout(layout, record.bookedSeats ?? []);

  return {
    busType,
    seatLayout: layout,
    totalSeats: validation.totalSeats,
    bookedSeats: validation.bookedSeats,
    seatCodes: validation.seatCodes,
    templateStatus: layout.template,
  } satisfies NormalizedSeatLayout;
}

export function normalizeBusSeatLayout(record: {
  busType?: unknown;
  seatLayout?: SeatLayout | null;
  totalSeats?: number;
  bookedSeats?: Array<string | number>;
  blockedSeats?: Array<string | number>;
  amenities?: string[];
}) {
  const normalized = getNormalizedLayoutFromRecord(record);
  return {
    ...normalized,
    blockedSeats: normalizeStoredSeatCodes(record.blockedSeats ?? [], normalized.seatLayout),
    amenities: record.amenities ?? [],
  };
}

export function needsLegacySeatLayoutUpgrade(record: {
  busType?: unknown;
  seatLayout?: SeatLayout | null;
  totalSeats?: number;
  bookedSeats?: Array<string | number>;
  blockedSeats?: Array<string | number>;
}) {
  if (!isBusType(record.busType)) {
    return true;
  }

  if (!record.seatLayout) {
    return true;
  }

  if (!Array.isArray(record.bookedSeats)) {
    return true;
  }

  if (record.bookedSeats.some((seat) => typeof seat !== "string")) {
    return true;
  }

  if (record.blockedSeats && record.blockedSeats.some((seat) => typeof seat !== "string")) {
    return true;
  }

  const normalized = getNormalizedLayoutFromRecord(record);
  return normalized.totalSeats !== record.totalSeats;
}

export function createLayoutItem(
  kind: SeatLayoutItemKind,
  layout: SeatLayout,
  row: number,
  col: number
) {
  if (kind === "sleeper") {
    const seatCode = getSeatCodeForLayoutPosition(layout, row, col);
    return buildSleeper(row, col, seatCode);
  }

  if (kind === "seat") {
    const seatCode = getSeatCodeForLayoutPosition(layout, row, col);
    return buildSeat(row, col, seatCode);
  }

  return buildItem(kind, row, col, {
    label: kind === "toilet" ? "WC" : kind === "driver" ? "Driver" : undefined,
  });
}

export function createEmptyLayout(busType: BusType) {
  return cloneLayout(getSeatLayoutTemplate(busType));
}
