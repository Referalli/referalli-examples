import { Referalli } from 'referalli';

// Server-side client: reads REFERALLI_API_KEY. Never import this from a client component.
export const referalli = new Referalli();

export const programId = (): string => {
  const id = process.env.REFERALLI_PROGRAM_ID;
  if (!id) throw new Error('Set REFERALLI_PROGRAM_ID in .env.local');
  return id;
};
