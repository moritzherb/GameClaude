import type { Pose } from './logic';
import back from './pigs/back.webp';
import jowl from './pigs/jowl.webp';
import sideDot from './pigs/side-dot.webp';
import side from './pigs/side.webp';
import snout from './pigs/snout.webp';
import standing from './pigs/standing.webp';

/*
 * The two little rubber pigs, as pictures: every molded part (body, head, legs, ears, snout)
 * lit like soft rubber, the leaping pose of the toys from the box. Lying on a side shows the
 * profile (the side with the black dots, or the other one); on the back shows the belly with
 * the legs up; standing shows the back; on the snout and on snout and ear show the profile
 * tipped over. All pictures share one frame: the pig's middle is the picture's middle.
 */
const PICTURE: Record<Pose, string> = { 'side-dot': sideDot, side, back, standing, snout, jowl };

export default function Pig({ pose, className = '' }: { pose: Pose; className?: string }) {
  return <img className={`sw-pig ${className}`} src={PICTURE[pose]} alt="" draggable={false} />;
}
