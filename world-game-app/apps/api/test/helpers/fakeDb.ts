import type { Score } from "@repo/db";

/**
 * In-memory stand-in for `@repo/db`'s drizzle instance.
 *
 * The real db points at a shared remote Turso database also used by the
 * live game, so tests must never write to it. Route handlers only use a
 * handful of chained drizzle calls (`select().from().orderBy().limit()` and
 * `insert().values().returning()`), so we fake just that surface.
 */
export function createFakeDb(seed: Score[] = []) {
  const rows: Score[] = [...seed];
  let nextId = rows.reduce((max, r) => Math.max(max, r.id), 0) + 1;

  const db = {
    select: () => ({
      from: () => ({
        orderBy: () => ({
          limit: async (limit: number) =>
            [...rows].sort((a, b) => b.winnings - a.winnings).slice(0, limit),
        }),
      }),
    }),
    insert: () => ({
      values: (value: Omit<Score, "id" | "createdAt">) => ({
        returning: async () => {
          const row: Score = {
            id: nextId++,
            createdAt: new Date(),
            ...value,
          };
          rows.push(row);
          return [row];
        },
      }),
    }),
  };

  return { db, rows };
}
