import { useEffect } from 'react';
import { recordFinished } from '../lib/stats';

/**
 * Put this on a game's end screen: once it shows, the game counts as played in the profile's
 * stats. (Games without an end show it from their first finished round on, for as long as the
 * game stays open.)
 */
export default function Finished({ game }: { game: string }) {
  useEffect(() => recordFinished(game), [game]);
  return null;
}
