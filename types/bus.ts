export type BusStop = {
  location: string;
  boarding: boolean;
  dropping: boolean;
  order: number;
};

export type StopInput = {
  location?: unknown;
  boarding?: unknown;
  dropping?: unknown;
};
