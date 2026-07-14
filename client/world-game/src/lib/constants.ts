import { Difficulty } from '@workspace/api-client-react';

export const LADDER_AMOUNTS = [
  100, 200, 300, 500, 1000, 
  2000, 4000, 8000, 16000, 32000, 
  64000, 125000, 250000, 500000, 1000000
];

export const SAFE_HAVENS = [5, 10]; // 1-based levels

export const TIMERS: Record<Difficulty, number> = {
  easy: 20,
  medium: 25,
  hard: 30
};
