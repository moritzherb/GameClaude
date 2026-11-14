/**
 * The box as a real 3D scene (three.js): a walnut tray with walls, a slot at the back where the
 * maple flaps stand on a brass rod, a divider, green felt in front where the dice land. One camera
 * looks down on all of it from in front and a little above, so every flap is seen the same way, and
 * one light from the top left throws the shadows. Drawn only while something moves.
 *
 * Units are centimetres; x to the right, y up, z towards you.
 */

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { appFont } from '../../lib/fonts';
import { MAPLE, plankCanvas, WALNUT } from './wood';

export interface FlapState {
  open: number[];
  picked: number[];
  /** Flaps falling now, in the order they go (each STAGGER ms after the one before). */
  falling: number[];
  /** Flaps can be tapped. */
  interactive: boolean;
}

/** A flap falling into the box, and the next one after it (ms). Kept in step with the game. */
export const FALL_MS = 640;
export const STAGGER = 90;
/** A throw of the dice, from the hand to lying still (ms). */
export const THROW_MS = 1050;

const FW = 3; // flap width
const FG = 0.16; // gap between flaps
const FH = 5; // flap height
const FT = 0.8; // flap thickness
const WALL = 1.3;
const WALL_H = 2.6;
const SLOT = 6.6; // inside the back wall, to the divider: the flaps stand at its back, fall forward onto it
const RAIL_D = 1;
const RAIL_H = 1.1;
const FELT_D = 11.5;
const ROD_Y = 0.45;
const DIE = 2.3;
const ACCENT = new THREE.Color('#b8f01e');

const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeIn = (t: number) => t * t;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

/**
 * The angle (radians) a falling flap has at time u (0–1): it tips forward, falls faster and faster,
 * knocks on the floor of the slot, bounces and lies there, its plain back up.
 */
function fallAngle(u: number, from: number) {
  const down = Math.PI / 2;
  const deg = (d: number) => (d * Math.PI) / 180;
  if (u < 0.56) return from + (down - from) * easeIn(u / 0.56);
  if (u < 0.71) return down + (deg(70) - down) * easeOut((u - 0.56) / 0.15);
  if (u < 0.84) return deg(70) + (down - deg(70)) * easeIn((u - 0.71) / 0.13);
  if (u < 0.92) return down + (deg(85) - down) * easeOut((u - 0.84) / 0.08);
  return deg(85) + (down - deg(85)) * easeIn((u - 0.92) / 0.08);
}

function canvasTexture(c: HTMLCanvasElement, renderer: THREE.WebGLRenderer) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return t;
}

/** A die's face: ivory, its pips drilled in. */
function dieFace(n: number) {
  const s = 128;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d')!;
  g.fillStyle = '#f4f0e6';
  g.fillRect(0, 0, s, s);
  const at: Record<number, [number, number][]> = {
    1: [[0.5, 0.5]],
    2: [[0.28, 0.28], [0.72, 0.72]],
    3: [[0.27, 0.27], [0.5, 0.5], [0.73, 0.73]],
    4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
    5: [[0.27, 0.27], [0.73, 0.27], [0.5, 0.5], [0.27, 0.73], [0.73, 0.73]],
    6: [[0.28, 0.24], [0.72, 0.24], [0.28, 0.5], [0.72, 0.5], [0.28, 0.76], [0.72, 0.76]],
  };
  for (const [x, y] of at[n]) {
    const grad = g.createRadialGradient(x * s - 2, y * s - 2, 1, x * s, y * s, s * 0.09);
    grad.addColorStop(0, '#3a362f');
    grad.addColorStop(1, '#141210');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(x * s, y * s, s * 0.085, 0, Math.PI * 2);
    g.fill();
  }
  return c;
}

/** The faces of a BoxGeometry in its material order (+x, −x, +y, −y, +z, −z): opposite sides make 7. */
const DIE_FACES = [3, 4, 1, 6, 2, 5];

/** The turn that puts `n` on top. */
function faceUp(n: number) {
  const q = new THREE.Quaternion();
  const x = new THREE.Vector3(1, 0, 0);
  const z = new THREE.Vector3(0, 0, 1);
  if (n === 6) q.setFromAxisAngle(x, Math.PI);
  else if (n === 2) q.setFromAxisAngle(x, -Math.PI / 2);
  else if (n === 5) q.setFromAxisAngle(x, Math.PI / 2);
  else if (n === 3) q.setFromAxisAngle(z, Math.PI / 2);
  else if (n === 4) q.setFromAxisAngle(z, -Math.PI / 2);
  return q;
}

interface Flap {
  n: number;
  pivot: THREE.Group;
  mesh: THREE.Mesh;
  mats: THREE.MeshStandardMaterial[];
  angle: number;
  lift: number;
  down: boolean;
  shade: number;
}

interface Anim {
  start: number;
  duration: number;
  delay: number;
  step: (u: number) => void;
}

export class Box3D {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(24, 1, 1, 400);
  private flaps: Flap[] = [];
  private dice: THREE.Mesh[] = [];
  private diceMats: THREE.MeshStandardMaterial[][] = [];
  private anims: Anim[] = [];
  private frame = 0;
  private interactive = false;
  private disposables: { dispose: () => void }[] = [];
  private width: number;
  private depth: number;
  private feltZ: number;
  private innerW: number;
  private raycaster = new THREE.Raycaster();
  private lastRoll = -1;

  constructor(
    private canvas: HTMLCanvasElement,
    private size: 9 | 12,
    private onTap: (n: number) => void,
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.innerW = size * FW + (size - 1) * FG + 0.6;
    this.width = this.innerW + 2 * WALL;
    this.depth = WALL + SLOT + RAIL_D + FELT_D + WALL;
    const zBack = -this.depth / 2;
    const zInnerBack = zBack + WALL;
    const zHinge = zInnerBack + 1.1;
    const zRail = zInnerBack + SLOT + RAIL_D / 2;
    this.feltZ = zInnerBack + SLOT + RAIL_D + FELT_D / 2;

    this.buildBox(zBack, zInnerBack, zRail);
    this.buildFlaps(zHinge);
    this.buildDice();
    this.buildLights();

    canvas.addEventListener('pointerdown', this.pointer);
  }

  /* ---------- The scene ---------- */

  private material(map: THREE.Texture | null, color = '#ffffff', roughness = 0.6) {
    const m = new THREE.MeshStandardMaterial({ map, color, roughness, metalness: 0 });
    this.disposables.push(m);
    return m;
  }

  private buildBox(zBack: number, zInnerBack: number, zRail: number) {
    const walnut = plankCanvas({ w: 512, h: 128, scale: 1, ...WALNUT, seed: 7 });
    const walnutUp = plankCanvas({ w: 128, h: 512, scale: 1, upright: true, ...WALNUT, seed: 11 });
    const wood = this.material(walnut ? canvasTexture(walnut, this.renderer) : null, walnut ? '#ffffff' : '#7d4b26', 0.55);
    const woodUp = this.material(walnutUp ? canvasTexture(walnutUp, this.renderer) : null, walnutUp ? '#ffffff' : '#7d4b26', 0.55);
    const slotFloor = this.material(null, '#2a170a', 0.9);
    const add = (geo: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[], x: number, y: number, z: number) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      m.receiveShadow = true;
      this.scene.add(m);
      this.disposables.push(geo);
      return m;
    };
    const W = this.width;
    const D = this.depth;
    // The floor under everything.
    add(new THREE.BoxGeometry(W, 0.6, D), wood, 0, -0.3, 0);
    // Back and front walls (grain along them), the sides (grain along them too).
    add(new THREE.BoxGeometry(W, WALL_H, WALL), wood, 0, WALL_H / 2, zBack + WALL / 2);
    add(new THREE.BoxGeometry(W, WALL_H, WALL), wood, 0, WALL_H / 2, D / 2 - WALL / 2);
    const side = new THREE.BoxGeometry(WALL, WALL_H, D - 2 * WALL);
    add(side, woodUp, -W / 2 + WALL / 2, WALL_H / 2, 0);
    add(side.clone(), woodUp, W / 2 - WALL / 2, WALL_H / 2, 0);
    // The slot's floor, dark, and the divider rail between it and the felt.
    add(new THREE.BoxGeometry(this.innerW, 0.05, SLOT), slotFloor, 0, 0.025, zInnerBack + SLOT / 2);
    add(new THREE.BoxGeometry(this.innerW, RAIL_H, RAIL_D), wood, 0, RAIL_H / 2, zRail);
    // The felt.
    const felt = this.feltCanvas();
    const feltMat = this.material(felt ? canvasTexture(felt, this.renderer) : null, felt ? '#ffffff' : '#22603f', 1);
    if (feltMat.map) {
      feltMat.map.wrapS = feltMat.map.wrapT = THREE.RepeatWrapping;
      feltMat.map.repeat.set(3, 2);
    }
    const feltMesh = add(new THREE.BoxGeometry(this.innerW, 0.08, FELT_D), feltMat, 0, 0.04, this.feltZ);
    feltMesh.castShadow = false;
  }

  private feltCanvas() {
    if (typeof document === 'undefined') return null;
    const s = 256;
    const c = document.createElement('canvas');
    c.width = c.height = s;
    const g = c.getContext('2d');
    if (!g) return null;
    g.fillStyle = '#25664a';
    g.fillRect(0, 0, s, s);
    const img = g.getImageData(0, 0, s, s);
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < img.data.length; i += 4) {
      const k = (rnd() - 0.5) * 34;
      img.data[i] = Math.max(0, Math.min(255, img.data[i] + k));
      img.data[i + 1] = Math.max(0, Math.min(255, img.data[i + 1] + k));
      img.data[i + 2] = Math.max(0, Math.min(255, img.data[i + 2] + k));
    }
    g.putImageData(img, 0, 0);
    return c;
  }

  private buildFlaps(zHinge: number) {
    const maple = plankCanvas({ w: 1024, h: 300, scale: 1, upright: true, ...MAPLE, seed: 23 });
    // The rod they hang on.
    const rodGeo = new THREE.CylinderGeometry(0.13, 0.13, this.innerW, 16);
    const brass = new THREE.MeshStandardMaterial({ color: '#c99b45', roughness: 0.35, metalness: 0.85 });
    this.disposables.push(rodGeo, brass);
    const rod = new THREE.Mesh(rodGeo, brass);
    rod.rotation.z = Math.PI / 2;
    rod.position.set(0, ROD_Y, zHinge);
    rod.castShadow = true;
    this.scene.add(rod);

    const geo = new THREE.BoxGeometry(FW, FH, FT);
    geo.translate(0, FH / 2 - 0.1, 0);
    this.disposables.push(geo);
    const x0 = -this.innerW / 2 + 0.3 + FW / 2;
    for (let i = 0; i < this.size; i++) {
      const n = i + 1;
      const crop = (w: number, h: number, number: boolean) => {
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const g = c.getContext('2d')!;
        if (maple) g.drawImage(maple, ((n * 97) % (maple.width - w)) | 0, 0, w, Math.min(h, maple.height), 0, 0, w, h);
        else {
          g.fillStyle = '#e7c58c';
          g.fillRect(0, 0, w, h);
        }
        if (number) {
          // Burnt into the wood.
          const px = n > 9 ? 128 : 172;
          g.font = `800 ${px}px ${appFont('display')}`;
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.shadowColor = 'rgba(58,33,14,0.6)';
          g.shadowBlur = 3;
          g.fillStyle = '#3a210e';
          g.fillText(String(n), w / 2, h * 0.52);
        }
        return c;
      };
      const front = crop(192, 294, true);
      const plain = crop(192, 294, false);
      const end = crop(192, 40, false);
      const tex = (c: HTMLCanvasElement) => canvasTexture(c, this.renderer);
      const plainTex = tex(plain);
      const endTex = tex(end);
      const mats = [
        this.material(plainTex, '#d6b37c'), // right side
        this.material(plainTex, '#d6b37c'), // left side
        this.material(endTex, '#f2dcb0'), // top: end grain, lit
        this.material(endTex, '#c9a06a'), // bottom
        this.material(tex(front)), // front: the number
        this.material(plainTex, '#e2c08c'), // back
      ];
      const mesh = new THREE.Mesh(geo, mats);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.n = n;
      const pivot = new THREE.Group();
      pivot.position.set(x0 + i * (FW + FG), ROD_Y, zHinge);
      pivot.add(mesh);
      this.scene.add(pivot);
      this.flaps.push({ n, pivot, mesh, mats, angle: 0, lift: 0, down: false, shade: 1 });
    }
  }

  private buildDice() {
    const geo = new RoundedBoxGeometry(DIE, DIE, DIE, 4, 0.24);
    this.disposables.push(geo);
    const faces = DIE_FACES.map((n) => canvasTexture(dieFace(n), this.renderer));
    for (let i = 0; i < 2; i++) {
      const mats = faces.map((map) => {
        const m = new THREE.MeshStandardMaterial({ map, roughness: 0.35, metalness: 0, transparent: true, opacity: 0.4 });
        this.disposables.push(m);
        return m;
      });
      const die = new THREE.Mesh(geo, mats);
      die.castShadow = true;
      die.position.set(i ? 1.5 : -1.5, DIE / 2 + 0.08, this.feltZ);
      this.scene.add(die);
      this.dice.push(die);
      this.diceMats.push(mats);
    }
  }

  private buildLights() {
    this.scene.add(new THREE.HemisphereLight('#fff6e6', '#3a2716', 1.15));
    const sun = new THREE.DirectionalLight('#ffffff', 2.1);
    sun.position.set(-9, 26, 12);
    sun.target.position.set(0, 0, 0);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    const r = Math.max(this.width, this.depth) * 0.62;
    Object.assign(sun.shadow.camera, { left: -r, right: r, top: r, bottom: -r, near: 1, far: 70 });
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.03;
    sun.shadow.radius = 3;
    this.scene.add(sun, sun.target);
  }

  /* ---------- Size and camera ---------- */

  /** Fits the camera so the whole box (flaps standing included) fills the canvas. */
  resize(w: number, h: number) {
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    const cam = this.camera;
    cam.aspect = w / h;
    const elev = (62 * Math.PI) / 180;
    const target = new THREE.Vector3(0, 1.2, 0.6);
    const corners: THREE.Vector3[] = [];
    for (const x of [-this.width / 2, this.width / 2])
      for (const y of [-0.6, FH + 0.5])
        for (const z of [-this.depth / 2, this.depth / 2]) corners.push(new THREE.Vector3(x, y, z));
    const place = (dist: number) => {
      cam.position.set(target.x, target.y + Math.sin(elev) * dist, target.z + Math.cos(elev) * dist);
      cam.lookAt(target);
      cam.updateProjectionMatrix();
      cam.updateMatrixWorld();
      let minY = 1;
      let maxY = -1;
      let maxX = 0;
      for (const c of corners) {
        const p = c.clone().project(cam);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
        maxX = Math.max(maxX, Math.abs(p.x));
      }
      return { minY, maxY, maxX };
    };
    // Centre it up and down, then the nearest distance at which it still fits.
    for (let pass = 0; pass < 2; pass++) {
      let lo = 10;
      let hi = 400;
      for (let k = 0; k < 30; k++) {
        const mid = (lo + hi) / 2;
        const e = place(mid);
        if (e.maxX <= 0.97 && e.maxY <= 0.97 && e.minY >= -0.97) hi = mid;
        else lo = mid;
      }
      const e = place(hi);
      // Shift the target so the box sits in the middle of the canvas.
      const off = (e.maxY + e.minY) / 2;
      if (Math.abs(off) < 0.005) break;
      target.z -= off * 6;
    }
    this.render();
  }

  /* ---------- State ---------- */

  setFlaps(state: FlapState) {
    this.interactive = state.interactive;
    for (const f of this.flaps) {
      const open = state.open.includes(f.n);
      const picked = state.picked.includes(f.n);
      if (!open) {
        if (f.down) continue;
        f.down = true;
        for (const m of f.mats) m.emissive.setScalar(0);
        const order = state.falling.indexOf(f.n);
        if (order < 0) {
          // Already down (a box shown as it is): lying there.
          this.setFlap(f, Math.PI / 2, 0, 0.86);
          continue;
        }
        const from = f.angle;
        const lift = f.lift;
        this.animate(FALL_MS, order * STAGGER, (u) => {
          this.setFlap(f, fallAngle(u, from), lift * (1 - clamp01(u / 0.4)), 1 - 0.14 * clamp01(u / 0.56));
        });
        continue;
      }
      if (f.down) {
        // A new box: up again.
        f.down = false;
        this.setFlap(f, 0, 0, 1);
      }
      const angle = picked ? -0.1 : 0;
      const lift = picked ? 0.45 : 0;
      for (const m of f.mats) m.emissive.copy(ACCENT).multiplyScalar(picked ? 0.16 : 0);
      if (angle !== f.angle || lift !== f.lift) {
        const a0 = f.angle;
        const l0 = f.lift;
        this.animate(200, 0, (u) => {
          const e = easeOut(u);
          this.setFlap(f, a0 + (angle - a0) * e, l0 + (lift - l0) * e, 1);
        });
      }
    }
    this.render();
  }

  private setFlap(f: Flap, angle: number, lift: number, shade: number) {
    f.angle = angle;
    f.lift = lift;
    f.pivot.rotation.x = angle;
    f.pivot.position.y = ROD_Y + lift;
    if (shade !== f.shade) {
      f.shade = shade;
      const base = ['#d6b37c', '#d6b37c', '#f2dcb0', '#c9a06a', '#ffffff', '#e2c08c'];
      f.mats.forEach((m, i) => m.color.set(base[i]).multiplyScalar(shade));
    }
  }

  /** The dice as they lie: thrown (`rolls` counts the throws; a new count throws) or put aside. */
  setDice(values: number[] | null, rolls: number, last: number[]) {
    const shown = values ?? last;
    this.dice.forEach((d, i) => (d.visible = i < shown.length));
    for (const mats of this.diceMats) for (const m of mats) m.opacity = values ? 1 : 0.4;
    if (values && rolls !== this.lastRoll) {
      this.lastRoll = rolls;
      this.throwDice(values, rolls);
    } else if (!values || this.lastRoll < 0) {
      this.restDice(shown, rolls);
    }
    this.render();
  }

  private restingPose(values: number[], seed: number) {
    const rnd = (k: number) => {
      const x = Math.sin(seed * 12.9898 + k * 78.233) * 43758.5453;
      return x - Math.floor(x);
    };
    return values.map((v, i) => {
      const x = values.length === 1 ? 0 : i ? 1.55 : -1.55;
      const z = this.feltZ - 1.4 + (rnd(i + 1) - 0.5) * 0.9;
      const yaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), (rnd(i + 5) - 0.5) * 0.7);
      return { pos: new THREE.Vector3(x + (rnd(i + 9) - 0.5) * 0.4, DIE / 2 + 0.08, z), quat: yaw.multiply(faceUp(v)), rnd };
    });
  }

  private restDice(values: number[], seed: number) {
    this.restingPose(values, seed).forEach((p, i) => {
      this.dice[i].position.copy(p.pos);
      this.dice[i].quaternion.copy(p.quat);
    });
  }

  private throwDice(values: number[], seed: number) {
    const poses = this.restingPose(values, seed);
    poses.forEach((p, i) => {
      const die = this.dice[i];
      // Each from its own side of the hand, so they don't pass through each other.
      const from = new THREE.Vector3(-this.innerW / 2 + 0.8 - i * 0.9, DIE / 2 + 2.5, this.feltZ + (i ? -2.4 : 2.6));
      const axis = new THREE.Vector3(p.rnd(i + 20) - 0.5, p.rnd(i + 21) - 0.5, p.rnd(i + 22) - 0.5).normalize();
      const turns = (3 + p.rnd(i + 23) * 2) * Math.PI * 2;
      const spin = new THREE.Quaternion();
      this.animate(THROW_MS, i * 70, (u) => {
        const e = easeOut(u);
        const left = 1 - e;
        const bounceT = Math.min(1, u * 1.15);
        const hop = Math.abs(Math.sin(Math.PI * 3 * bounceT)) * 2.2 * (1 - bounceT) ** 1.6;
        // In from above at the left, three bounces lower each time, rolling out to its place.
        const drop = (from.y - p.pos.y) * (1 - clamp01(u * 4)) ** 2;
        die.position.set(from.x + (p.pos.x - from.x) * e, p.pos.y + hop + drop, from.z + (p.pos.z - from.z) * e);
        spin.setFromAxisAngle(axis, turns * left);
        die.quaternion.copy(p.quat).multiply(spin);
      });
    });
  }

  /* ---------- Taps ---------- */

  private pointer = (e: PointerEvent) => {
    if (!this.interactive) return;
    const r = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const hit = this.raycaster.intersectObjects(
      this.flaps.filter((f) => !f.down).map((f) => f.mesh),
      false,
    )[0];
    if (hit) this.onTap(hit.object.userData.n as number);
  };

  /* ---------- Drawing ---------- */

  private animate(duration: number, delay: number, step: (u: number) => void) {
    this.anims.push({ start: performance.now(), duration, delay, step });
    this.loop();
  }

  private loop = () => {
    if (this.frame) return;
    const tick = (now: number) => {
      this.frame = 0;
      this.anims = this.anims.filter((a) => {
        const u = clamp01((now - a.start - a.delay) / a.duration);
        if (now - a.start < a.delay) return true;
        a.step(u);
        return u < 1;
      });
      this.renderer.render(this.scene, this.camera);
      if (this.anims.length) this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  };

  render() {
    if (!this.frame) this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    cancelAnimationFrame(this.frame);
    this.canvas.removeEventListener('pointerdown', this.pointer);
    this.scene.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | THREE.MeshStandardMaterial[] | undefined;
      for (const x of Array.isArray(m) ? m : m ? [m] : []) x.map?.dispose();
    });
    for (const d of this.disposables) d.dispose();
    this.renderer.dispose();
  }
}

/** Whether this phone can draw the box in 3D at all. */
export function canDraw3D() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}
