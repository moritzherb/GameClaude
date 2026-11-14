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
const SLOT = 6.6; // inside the back wall, to the divider: the flaps stand at its front, fall back into it
const RAIL_D = 1;
const RAIL_H = 1.1;
const FELT_D = 15;
const ROD_Y = 0.45;
const DIE = 2.3;
const ACCENT = new THREE.Color('#b8f01e');

const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeIn = (t: number) => t * t;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

/**
 * The angle (radians) a falling flap has at time u (0–1): it tips back, falls faster and faster,
 * knocks on the floor of the slot behind it, bounces and lies there.
 */
function fallAngle(u: number, from: number) {
  const down = -Math.PI / 2;
  const deg = (d: number) => (d * Math.PI) / 180;
  if (u < 0.56) return from + (down - from) * easeIn(u / 0.56);
  if (u < 0.71) return down + (deg(-70) - down) * easeOut((u - 0.56) / 0.15);
  if (u < 0.84) return deg(-70) + (down - deg(-70)) * easeIn((u - 0.71) / 0.13);
  if (u < 0.92) return down + (deg(-85) - down) * easeOut((u - 0.84) / 0.08);
  return deg(-85) + (down - deg(-85)) * easeIn((u - 0.92) / 0.08);
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

/** Where on a picture each face of a box goes: x, y, width, height in its pixels. */
type Cell = [number, number, number, number];

/**
 * Points each face of a box (its groups, in BoxGeometry's order) at its own part of one picture,
 * then makes it one piece, drawn with one material.
 */
function mapFaces(geo: THREE.BufferGeometry, cells: Cell[], [w, h]: [number, number]) {
  const uv = geo.getAttribute('uv') as THREE.BufferAttribute;
  const index = geo.getIndex();
  const done = new Set<number>();
  for (const group of geo.groups) {
    const [x, y, cw, ch] = cells[group.materialIndex ?? 0];
    // A pixel in from the edge, so the next face's picture doesn't bleed in.
    const u0 = (x + 2) / w;
    const u1 = (x + cw - 2) / w;
    const v0 = 1 - (y + ch - 2) / h;
    const v1 = 1 - (y + 2) / h;
    for (let k = group.start; k < group.start + group.count; k++) {
      const v = index ? index.getX(k) : k;
      if (done.has(v)) continue;
      done.add(v);
      uv.setXY(v, u0 + uv.getX(v) * (u1 - u0), v0 + uv.getY(v) * (v1 - v0));
    }
  }
  uv.needsUpdate = true;
  geo.clearGroups();
}

/** The flaps' picture: the numbers six to a row, then a side, the back and the two ends. */
const ATLAS: [number, number] = [1024, 1024];
const CELL_W = 160;
const CELL_H = 256;
const flapCell = (n: number): Cell => [((n - 1) % 6) * CELL_W, Math.floor((n - 1) / 6) * CELL_H, CELL_W, CELL_H];
const FLAP_SIDE: Cell = [0, 2 * CELL_H, CELL_W, CELL_H];
const FLAP_BACK: Cell = [CELL_W, 2 * CELL_H, CELL_W, CELL_H];
const FLAP_TOP: Cell = [2 * CELL_W, 2 * CELL_H, CELL_W, 64];
const FLAP_BOTTOM: Cell = [3 * CELL_W, 2 * CELL_H, CELL_W, 64];

function flapAtlas(size: number) {
  const maple = plankCanvas({ w: 1024, h: 300, scale: 1, upright: true, ...MAPLE, seed: 23 });
  const c = document.createElement('canvas');
  [c.width, c.height] = ATLAS;
  const g = c.getContext('2d')!;
  /** Maple, a different stretch of the plank for each, tinted for the light that side gets. */
  const wood = ([x, y, w, h]: Cell, seed: number, tint?: string) => {
    if (maple) g.drawImage(maple, (seed * 97) % (maple.width - w), 0, w, Math.min(h, maple.height), x, y, w, h);
    else {
      g.fillStyle = '#e7c58c';
      g.fillRect(x, y, w, h);
    }
    if (tint) {
      g.globalCompositeOperation = 'multiply';
      g.fillStyle = tint;
      g.fillRect(x, y, w, h);
      g.globalCompositeOperation = 'source-over';
    }
  };
  for (let n = 1; n <= size; n++) {
    const cell = flapCell(n);
    wood(cell, n);
    // The number, burnt into the wood.
    const [x, y, w, h] = cell;
    g.font = `800 ${n > 9 ? 107 : 143}px ${appFont('display')}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.shadowColor = 'rgba(58,33,14,0.6)';
    g.shadowBlur = 3;
    g.fillStyle = '#3a210e';
    g.fillText(String(n), x + w / 2, y + h * 0.52);
    g.shadowColor = 'transparent';
  }
  wood(FLAP_SIDE, 3, '#d6b37c');
  wood(FLAP_BACK, 5, '#e2c08c');
  wood(FLAP_TOP, 7, '#f2dcb0');
  wood(FLAP_BOTTOM, 9, '#c9a06a');
  return c;
}

interface Flap {
  n: number;
  pivot: THREE.Group;
  mesh: THREE.Mesh;
  mat: THREE.MeshStandardMaterial;
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
  // A long lens: the flaps at the back nearly as big as the front of the box.
  private camera = new THREE.PerspectiveCamera(18, 1, 1, 500);
  private flaps: Flap[] = [];
  private dice: THREE.Mesh[] = [];
  private diceMat!: THREE.MeshStandardMaterial;
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
  private disposed = false;

  constructor(
    readonly canvas: HTMLCanvasElement,
    private size: 9 | 12,
    /** A flap tapped in the picture (settable: a box built ahead gets its game later). */
    public onTap: (n: number) => void,
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.innerW = size * FW + (size - 1) * FG + 0.6;
    this.width = this.innerW + 2 * WALL;
    this.depth = WALL + SLOT + RAIL_D + FELT_D + WALL;
    const zBack = -this.depth / 2;
    const zInnerBack = zBack + WALL;
    const zHinge = zInnerBack + SLOT - 0.6;
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
    // The rod they hang on.
    const rodGeo = new THREE.CylinderGeometry(0.13, 0.13, this.innerW, 16);
    const brass = new THREE.MeshStandardMaterial({ color: '#c99b45', roughness: 0.35, metalness: 0.85 });
    this.disposables.push(rodGeo, brass);
    const rod = new THREE.Mesh(rodGeo, brass);
    rod.rotation.z = Math.PI / 2;
    rod.position.set(0, ROD_Y, zHinge);
    rod.castShadow = true;
    this.scene.add(rod);

    // All their faces on one picture, so a flap is drawn in one go (one material, not six).
    const atlas = canvasTexture(flapAtlas(this.size), this.renderer);
    const x0 = -this.innerW / 2 + 0.3 + FW / 2;
    for (let i = 0; i < this.size; i++) {
      const n = i + 1;
      const geo = new THREE.BoxGeometry(FW, FH, FT);
      geo.translate(0, FH / 2 - 0.1, 0);
      // Faces in BoxGeometry's order: right, left, top, bottom, front (the number), back.
      const c = flapCell(n);
      mapFaces(geo, [FLAP_SIDE, FLAP_SIDE, FLAP_TOP, FLAP_BOTTOM, c, FLAP_BACK], ATLAS);
      this.disposables.push(geo);
      const mat = this.material(atlas);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.n = n;
      const pivot = new THREE.Group();
      pivot.position.set(x0 + i * (FW + FG), ROD_Y, zHinge);
      pivot.add(mesh);
      this.scene.add(pivot);
      this.flaps.push({ n, pivot, mesh, mat, angle: 0, lift: 0, down: false, shade: 1 });
    }
  }

  private buildDice() {
    const geo = new RoundedBoxGeometry(DIE, DIE, DIE, 4, 0.24);
    // The six faces on one picture: both dice drawn with one material.
    mapFaces(
      geo,
      DIE_FACES.map((n) => [((n - 1) % 4) * 128, Math.floor((n - 1) / 4) * 128, 128, 128]),
      [512, 256],
    );
    this.disposables.push(geo);
    const atlas = document.createElement('canvas');
    atlas.width = 512;
    atlas.height = 256;
    const g = atlas.getContext('2d')!;
    for (let n = 1; n <= 6; n++) g.drawImage(dieFace(n), ((n - 1) % 4) * 128, Math.floor((n - 1) / 4) * 128);
    this.diceMat = new THREE.MeshStandardMaterial({ map: canvasTexture(atlas, this.renderer), roughness: 0.35, metalness: 0, transparent: true, opacity: 0.4 });
    this.disposables.push(this.diceMat);
    for (let i = 0; i < 2; i++) {
      const die = new THREE.Mesh(geo, this.diceMat);
      die.castShadow = true;
      die.position.set(i ? 1.5 : -1.5, DIE / 2 + 0.08, this.feltZ);
      this.scene.add(die);
      this.dice.push(die);
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
    if (!w || !h || this.disposed) return;
    this.renderer.setSize(w, h, false);
    const cam = this.camera;
    cam.aspect = w / h;
    const elev = (39 * Math.PI) / 180;
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
      let hi = 500;
      for (let k = 0; k < 30; k++) {
        const mid = (lo + hi) / 2;
        const e = place(mid);
        if (e.maxX <= 0.985 && e.maxY <= 0.97 && e.minY >= -0.97) hi = mid;
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
        f.mat.emissive.setScalar(0);
        const order = state.falling.indexOf(f.n);
        if (order < 0) {
          // Already down (a box shown as it is): lying there.
          this.setFlap(f, -Math.PI / 2, 0, 0.6);
          continue;
        }
        const from = f.angle;
        const lift = f.lift;
        this.animate(FALL_MS, order * STAGGER, (u) => {
          this.setFlap(f, fallAngle(u, from), lift * (1 - clamp01(u / 0.4)), 1 - 0.4 * clamp01(u / 0.56));
        });
        continue;
      }
      if (f.down) {
        // A new box: up again.
        f.down = false;
        this.setFlap(f, 0, 0, 1);
      }
      const angle = picked ? 0.1 : 0;
      const lift = picked ? 0.45 : 0;
      f.mat.emissive.copy(ACCENT).multiplyScalar(picked ? 0.16 : 0);
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
      f.mat.color.setScalar(shade);
    }
  }

  /** The dice as they lie: thrown (`rolls` counts the throws; a new count throws) or put aside. */
  setDice(values: number[] | null, rolls: number, last: number[]) {
    const shown = values ?? last;
    this.dice.forEach((d, i) => (d.visible = i < shown.length));
    this.diceMat.opacity = values ? 1 : 0.4;
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
    // Anywhere on the felt, clear of the walls (the front one hides what lies right behind it) and
    // of each other.
    const xMin = -this.innerW / 2 + 1.9;
    const xMax = this.innerW / 2 - 1.9;
    const zMin = this.feltZ - FELT_D / 2 + 1.7;
    const zMax = this.feltZ + FELT_D / 2 - 2.2;
    const spots: THREE.Vector3[] = [];
    values.forEach((_, i) => {
      const spot = new THREE.Vector3();
      for (let k = 0; k < 24; k++) {
        spot.set(xMin + rnd(i * 50 + k * 2 + 1) * (xMax - xMin), DIE / 2 + 0.08, zMin + rnd(i * 50 + k * 2 + 2) * (zMax - zMin));
        if (spots.every((o) => o.distanceTo(spot) >= 3.4)) break;
      }
      spots.push(spot);
    });
    return values.map((v, i) => {
      const yaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), (rnd(i + 5) - 0.5) * 0.7);
      return { pos: spots[i], quat: yaw.multiply(faceUp(v)), rnd };
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
    // The die that lands further left leaves the hand further out, so their paths don't cross.
    const leftmost = poses.length > 1 && poses[1].pos.x < poses[0].pos.x ? 1 : 0;
    poses.forEach((p, i) => {
      const die = this.dice[i];
      const back = poses.length > 1 && i === leftmost ? 1 : 0;
      // From the hand, outside the box on the left, in over the wall along its own lane.
      const from = new THREE.Vector3(-this.width / 2 - DIE * (1 + back * 1.2), DIE / 2 + 4.2, p.pos.z + (p.rnd(i + 24) - 0.5) * 1.2);
      // It rolls the way it goes, about as far as it travels, a little skew.
      const way = new THREE.Vector3(p.pos.x - from.x, 0, p.pos.z - from.z);
      const axis = new THREE.Vector3(way.z, 0, -way.x)
        .normalize()
        .add(new THREE.Vector3(p.rnd(i + 20) - 0.5, p.rnd(i + 21) - 0.5, p.rnd(i + 22) - 0.5).multiplyScalar(0.5))
        .normalize();
      const turns = way.length() / 1.7 + p.rnd(i + 23) * 1.5;
      const spin = new THREE.Quaternion();
      const step = (u: number) => {
        const e = easeOut(u);
        const left = 1 - e;
        const bounceT = Math.min(1, u * 1.15);
        const hop = Math.abs(Math.sin(Math.PI * 3 * bounceT)) * 2.2 * (1 - bounceT) ** 1.6;
        // In from above at the left, three bounces lower each time, rolling out to its place.
        const drop = (from.y - p.pos.y) * (1 - clamp01(u * 4)) ** 2;
        die.position.set(from.x + (p.pos.x - from.x) * e, p.pos.y + hop + drop, from.z + (p.pos.z - from.z) * e);
        spin.setFromAxisAngle(axis, -turns * left);
        die.quaternion.copy(p.quat).premultiply(spin);
      };
      // Into the hand at once: the dice of the last throw don't linger where they lay.
      step(0);
      this.animate(THROW_MS, back * 70, step);
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
    if (this.disposed) return;
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
    if (!this.frame && !this.disposed) this.renderer.render(this.scene, this.camera);
  }

  /**
   * Draws once before it's shown (while the setup is up): the shaders get compiled and the wood goes
   * to the graphics card then, not in the moment the game starts.
   */
  warmUp() {
    const draw = () => this.resize(320, 236);
    this.renderer
      .compileAsync(this.scene, this.camera)
      .then(draw, draw)
      .catch(() => {});
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.canvas.removeEventListener('pointerdown', this.pointer);
    this.scene.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | THREE.MeshStandardMaterial[] | undefined;
      for (const x of Array.isArray(m) ? m : m ? [m] : []) x.map?.dispose();
    });
    for (const d of this.disposables) d.dispose();
    this.renderer.dispose();
    // Phones allow only a few of these at a time: give it back now, not when it's collected.
    this.renderer.forceContextLoss();
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
