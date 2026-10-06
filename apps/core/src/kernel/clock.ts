export interface Clock {
  now(): Date;
}

export const systemClock: Clock = {
  now: () => new Date(),
};

export function fixedClock(at: Date): Clock {
  return { now: () => at };
}

export function mutableClock(at: Date): Clock & { set(next: Date): void; advance(ms: number): void } {
  let current = at;
  return {
    now: () => current,
    set: (next: Date) => {
      current = next;
    },
    advance: (ms: number) => {
      current = new Date(current.getTime() + ms);
    },
  };
}
