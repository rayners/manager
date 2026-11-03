import type { SpotKind } from './layout';

/** One kind of visitor. Names and flavour belong to the data table, not the simulation. */
export interface VisitorType {
  id: string;
  /** How often this type arrives, relative to the others. */
  weight: number;
  crew: [number, number];
  /** The chance a visitor wants each kind of place. */
  wants: Record<SpotKind, number>;
  wallet: [number, number];
  /** Seconds someone will wait for a place before giving up. */
  patience: number;
  /** Which sprite variants this type wears. */
  variants: number[];
}

/** Balance and visitors, kept out of saved state so an update can change them. */
export interface Content {
  types: VisitorType[];
  rivals: [string, string][];
  prices: Record<SpotKind, number>;
  /** Seconds spent at each kind of place. */
  service: Record<SpotKind, number>;
  arrivalEvery: [number, number];
  stay: [number, number];
  /** Seconds a ship holds the bay after docking. */
  bayTime: number;
  queuePatience: number;
  scuffleCost: number;
  /** Rivals this many tiles apart, or closer, start to get annoyed. */
  rivalRange: number;
  /** Seconds of annoyance before a scuffle. */
  grudgeLimit: number;
}
