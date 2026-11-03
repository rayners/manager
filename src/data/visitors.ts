import type { Content } from '../sim/content';

/** The visitors of the first playable slice. Prices are in Combine credits. */
export const CONTENT: Content = {
  types: [
    {
      id: 'hauler',
      weight: 5,
      crew: [3, 5],
      wants: { stool: 0.8, chair: 0.6, machine: 0.3 },
      wallet: [30, 60],
      patience: 60,
      variants: [1, 2, 3, 7, 10],
    },
    {
      id: 'miner',
      weight: 3,
      crew: [4, 6],
      wants: { stool: 1, chair: 0.3, machine: 0.5 },
      wallet: [40, 90],
      patience: 45,
      variants: [0, 8],
    },
    {
      id: 'auditor',
      weight: 2,
      crew: [2, 3],
      wants: { stool: 0.2, chair: 0.9, machine: 0.1 },
      wallet: [60, 120],
      patience: 90,
      variants: [5, 11, 4],
    },
  ],
  // Miners and Combine auditors have history.
  rivals: [['miner', 'auditor']],
  prices: { stool: 6, chair: 12, machine: 3 },
  service: { stool: 45, chair: 70, machine: 20 },
  arrivalEvery: [25, 60],
  stay: [150, 260],
  bayTime: 25,
  queuePatience: 45,
  scuffleCost: 40,
  rivalRange: 3,
  grudgeLimit: 15,
};
