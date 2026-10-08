import { describe, expect, it } from 'vitest';
import { newRoomCode, normalizeCode, peerIdFor } from './protocol';

describe('room codes', () => {
  it('are 4 easy-to-read characters', () => {
    for (let i = 0; i < 200; i++) expect(newRoomCode()).toMatch(/^[A-HJ-NP-Z2-9]{4}$/);
  });

  it('cleans up typed codes', () => {
    expect(normalizeCode(' k7q-f ')).toBe('K7QF');
    expect(normalizeCode('abcdef')).toBe('ABCD');
  });

  it('maps a code to a peer id', () => {
    expect(peerIdFor('K7QF')).toBe('prost-room-K7QF');
  });
});
