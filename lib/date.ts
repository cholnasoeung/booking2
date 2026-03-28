const DATE_INPUT_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateInput(value: string) {
  return DATE_INPUT_REGEX.test(value);
}

export function toTravelDate(dateInput: string) {
  if (!isValidDateInput(dateInput)) {
    throw new Error("Invalid travel date.");
  }

  return new Date(`${dateInput}T00:00:00.000Z`);
}

export function getTravelDateRange(dateInput: string) {
  const start = toTravelDate(dateInput);
  const end = new Date(start);
  end.setUTCHours(23, 59, 59, 999);

  return { start, end };
}

export function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function getTomorrowDateInput(baseDate = new Date()) {
  const tomorrowUtc = new Date(
    Date.UTC(
      baseDate.getUTCFullYear(),
      baseDate.getUTCMonth(),
      baseDate.getUTCDate() + 1
    )
  );

  return formatDateInput(tomorrowUtc);
}

export function getDepartureDateTime(date: Date, time: string) {
  const [hours, minutes] = time.split(":").map(Number);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    throw new Error("Invalid departure time.");
  }

  const departure = new Date(date);
  departure.setUTCHours(hours, minutes, 0, 0);

  return departure;
}
