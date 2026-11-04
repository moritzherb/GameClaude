import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import BigButton from '../../components/BigButton';
import Sheet from '../../components/Sheet';
import { t, tx } from '../../i18n';
import { buzz, sfx } from '../../lib/fx';
import { pick } from '../../lib/random';
import { cellKey, jumps, jumpTarget, MAX_COLS, MAX_ROWS, MIN_FIELDS, type Board, type Cell } from './boards';
import { field, FIELDS, GROUPS, KINDS, param, type Field, type FieldKind } from './fields';

type Tool = 'path' | 'water' | 'tunnel' | 'erase';

const TOOLS: { id: Tool; emoji: string; label: string; hint: string }[] = [
  { id: 'path', emoji: '👣', label: tx('Path'), hint: tx('Draw the path with your finger, from the start on; draw back to take fields away. Tap a field to choose what it is.') },
  { id: 'water', emoji: '💧', label: tx('Water'), hint: tx('Swipe over cells to put water there (or take it away). A field on water is a bridge over it.') },
  { id: 'tunnel', emoji: '🕳️', label: tx('Tunnel'), hint: tx('Swipe beside the path to dig the mole’s tunnel. It runs from the Mole field to the field furthest back it reaches.') },
  { id: 'erase', emoji: '🧽', label: tx('Erase'), hint: tx('Swipe to take water and tunnels away, or along the path from its end to take fields away.') },
];

/** Filling empty fields at random: any kind but those that have to lead somewhere. */
const FRESH = KINDS.filter((k) => k !== 'back-bridge' && k !== 'mole' && k !== 'bridge');

const SIDES = [
  { x: 0, y: 1, name: 'n' },
  { x: 0, y: -1, name: 's' },
  { x: 1, y: 0, name: 'e' },
  { x: -1, y: 0, name: 'w' },
] as const;

/** What the editor changes: the path, each field's kind (null: laid, not filled yet; the first is the start, the last the finish once it's set), water, tunnels. */
interface Ed {
  spots: Cell[];
  kinds: (Field | null)[];
  water: Set<string>;
  tunnels: Set<string>;
}

/** One finger on the map: where it started and is now, and what it does on each cell it reaches. */
interface Gesture {
  id: number;
  from: Cell;
  at: Cell;
  /** draw: the path on from its end · field: a tap on a field (to choose it) · add/remove: water or tunnel · erase */
  mode: 'draw' | 'field' | 'add' | 'remove' | 'erase' | 'none';
  changed: boolean;
  /** The field the finger came down on. */
  field: number | null;
}

interface Props {
  board: Board;
  /** Making a new board from this one (else changing it). */
  asNew: boolean;
  onSave: (b: Board) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

/**
 * Your own board, cell by cell: draw the path with a finger, tap its fields to fill them, swipe
 * water and the mole's tunnels round it. Water and tunnels join their neighbours, round corners
 * too. The whole map fits the screen (no scrolling), the tools down the left.
 */
export default function Editor({ board, asNew, onSave, onDelete, onCancel }: Props) {
  const [name, setName] = useState(asNew ? '' : board.name);
  const [ed, setEd] = useState<Ed>(() => ({
    spots: board.spots,
    kinds: board.fields,
    water: new Set(board.water.map(cellKey)),
    tunnels: new Set(board.tunnels.map(cellKey)),
  }));
  // Gestures read and change the newest state right away, a step per cell the finger crosses.
  const live = useRef(ed);
  const commit = (next: Ed) => {
    live.current = next;
    setEd(next);
  };
  const { spots, kinds, water, tunnels } = ed;
  const [tool, setTool] = useState<Tool>('path');
  const [editing, setEditing] = useState<number | null>(null);
  const [clearing, setClearing] = useState(false);
  const [more, setMore] = useState(false);
  const [naming, setNaming] = useState(false);
  const cols = MAX_COLS;
  const used = [...spots.map((c) => c.y), ...[...water, ...tunnels].map((k) => +k.split(',')[1])];
  const top = used.length ? Math.max(...used) : 0;
  /** What gets saved: the map to the top of what's on it and a little room (the game shows all of it). */
  const savedRows = Math.min(MAX_ROWS, Math.max(10, top + 3));

  // The map fills the room beside the tools: as many rows as fit with the cells as wide as they
  // can be. It only grows (and its cells shrink) once the path nears its top.
  const box = useRef<HTMLDivElement>(null);
  const [room, setRoom] = useState({ w: 0, h: 0 });
  const screenRows = room.w && room.h ? Math.max(8, Math.floor(room.h / Math.floor(room.w / MAX_COLS))) : 10;
  const fitRows = Math.min(MAX_ROWS, Math.max(screenRows, top + 2));
  // While a finger draws, the map keeps its size (it grows once the finger lifts).
  const [heldRows, setHeldRows] = useState<number | null>(null);
  const rows = heldRows ?? fitRows;
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setRoom({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const cell = Math.max(14, Math.floor(Math.min(room.w / cols, room.h / rows)));

  const at = useMemo(() => new Map(spots.map((c, i) => [cellKey(c), i])), [spots]);
  const last = spots.length - 1;
  /** The fields as they'd be played (an empty one as Safe), the start first. */
  const fields = kinds.map((f, i) => (i === 0 ? field('start') : (f ?? field('safe'))));
  /** Fields laid but not filled yet, between the start and the last one. */
  const empty = kinds.filter((f, i) => i > 0 && i < last && !f).length;
  const finished = last > 0 && kinds[last]?.kind === 'goal';
  const geometry = { spots, fields, water: [...water].map(toCell), tunnels: [...tunnels].map(toCell) };
  const targets = jumps(geometry);
  /** Fields a tunnel joins (the Mole field and where it leads). */
  const tunnelEnds = new Set<string>();
  for (const [from, to] of Object.entries(targets)) {
    if (fields[+from].kind !== 'mole') continue;
    tunnelEnds.add(cellKey(spots[+from]));
    tunnelEnds.add(cellKey(spots[to]));
  }
  const end = spots[last];
  const nextTo = (a: Cell, b: Cell) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;

  /* ---------- Changes, one cell at a time (on the newest state) ---------- */

  const feel = () => {
    sfx.tick();
    buzz(8);
  };

  /** Lay the next field on the path (empty), if c is free and next to its end. */
  const extend = (c: Cell) => {
    const cur = live.current;
    const k = cellKey(c);
    const n = cur.spots.length;
    if (cur.spots.some((s) => cellKey(s) === k) || (n && !nextTo(cur.spots[n - 1], c)) || c.y >= rows) return false;
    const tunnelsNext = new Set(cur.tunnels);
    tunnelsNext.delete(k);
    commit({
      ...cur,
      spots: [...cur.spots, c],
      // The finish only ever lies at the end: the field it was on is empty again.
      kinds: [...cur.kinds.map((f, i) => (i === n - 1 && f?.kind === 'goal' ? null : f)), n ? null : field('start')],
      tunnels: tunnelsNext,
    });
    feel();
    return true;
  };

  /** Take the last field of the path away. */
  const shorten = () => {
    const cur = live.current;
    if (!cur.spots.length) return false;
    commit({ ...cur, spots: cur.spots.slice(0, -1), kinds: cur.kinds.slice(0, -1) });
    feel();
    return true;
  };

  const paint = (which: 'water' | 'tunnels', c: Cell, on: boolean) => {
    const cur = live.current;
    const k = cellKey(c);
    if (cur[which].has(k) === on) return false;
    if (which === 'tunnels' && on && cur.spots.some((s) => cellKey(s) === k)) return false;
    const next = new Set(cur[which]);
    if (on) next.add(k);
    else next.delete(k);
    commit({ ...cur, [which]: next });
    feel();
    return true;
  };

  const setKind = (i: number, next: Field) => {
    feel();
    const cur = live.current;
    commit({ ...cur, kinds: cur.kinds.map((x, k) => (k === i ? next : x)) });
  };

  /* ---------- The finger on the map ---------- */

  const gesture = useRef<Gesture | null>(null);
  const gridEl = useRef<HTMLDivElement>(null);

  const cellAt = (e: ReactPointerEvent): Cell | null => {
    const r = gridEl.current?.getBoundingClientRect();
    if (!r) return null;
    const x = Math.floor((e.clientX - r.left) / cell);
    const top = Math.floor((e.clientY - r.top) / cell);
    if (x < 0 || x >= cols || top < 0 || top >= rows) return null;
    return { x, y: rows - 1 - top };
  };

  /** What the finger does on one cell it reaches. */
  const step = (c: Cell) => {
    const g = gesture.current;
    if (!g) return;
    const cur = live.current;
    const n = cur.spots.length;
    if (g.mode === 'field') {
      // Moved off the field it was on: no tap, nothing to do.
      g.mode = 'none';
      return;
    }
    if (g.mode === 'draw') {
      // Back onto the field before the end: take the end away (drawing backwards undoes).
      if (n > 1 && cellKey(cur.spots[n - 2]) === cellKey(c)) g.changed = shorten() || g.changed;
      else g.changed = extend(c) || g.changed;
    } else if (g.mode === 'add' || g.mode === 'remove') {
      g.changed = paint(tool === 'water' ? 'water' : 'tunnels', c, g.mode === 'add') || g.changed;
    } else if (g.mode === 'erase') {
      const k = cellKey(c);
      let did = paint('water', c, false);
      did = paint('tunnels', c, false) || did;
      if (n && cellKey(cur.spots[n - 1]) === k) did = shorten() || did;
      g.changed = did || g.changed;
    }
  };

  const onDown = (e: ReactPointerEvent) => {
    const c = cellAt(e);
    if (!c || gesture.current) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setHeldRows(rows);
    const cur = live.current;
    const k = cellKey(c);
    const i = cur.spots.findIndex((s) => cellKey(s) === k);
    const n = cur.spots.length;
    const g: Gesture = { id: e.pointerId, from: c, at: c, mode: 'none', changed: false, field: i >= 0 ? i : null };
    gesture.current = g;
    if (tool === 'path') {
      if (i === n - 1 && n > 0) {
        g.mode = 'draw'; // from the end on (a tap on it: choose what it is)
      } else if (i >= 0) {
        g.mode = 'field'; // a tap: choose what it is
      } else {
        g.mode = 'draw';
        g.changed = extend(c);
      }
    } else if (tool === 'water' || tool === 'tunnel') {
      // The first cell says which way: put it there, or take it away.
      const which = tool === 'water' ? 'water' : 'tunnels';
      g.mode = cur[which].has(k) ? 'remove' : 'add';
      if (tool === 'tunnel' && i >= 0) g.mode = 'field';
      else g.changed = paint(which, c, g.mode === 'add');
    } else {
      g.mode = 'erase';
      step(c);
    }
  };

  const onMove = (e: ReactPointerEvent) => {
    const g = gesture.current;
    if (!g || e.pointerId !== g.id) return;
    const c = cellAt(e);
    if (!c || (c.x === g.at.x && c.y === g.at.y)) return;
    // A quick finger skips cells: go there one cell at a time, so the path stays whole.
    let { x, y } = g.at;
    while (x !== c.x || y !== c.y) {
      if (Math.abs(c.x - x) >= Math.abs(c.y - y)) x += Math.sign(c.x - x);
      else y += Math.sign(c.y - y);
      step({ x, y });
    }
    g.at = c;
  };

  const onUp = (e: ReactPointerEvent) => {
    const g = gesture.current;
    if (!g || e.pointerId !== g.id) return;
    gesture.current = null;
    setHeldRows(null);
    // A tap on a field (not the start): what goes on it.
    const tapped = !g.changed && g.at.x === g.from.x && g.at.y === g.from.y;
    if (tapped && g.field != null && g.field > 0 && (g.mode === 'field' || g.mode === 'draw')) {
      sfx.tick();
      setEditing(g.field);
    }
  };

  const save = () => {
    const keep = (k: string) => toCell(k).y < savedRows;
    onSave({
      id: asNew ? `own-${Date.now().toString(36)}` : board.id,
      name: name.trim() || t('My board'),
      theme: board.theme,
      cols,
      rows: savedRows,
      spots,
      fields: kinds.map((f, i) => (i === 0 ? field('start') : f!)),
      water: [...water].filter(keep).map(toCell),
      tunnels: [...tunnels].filter((k) => keep(k) && !at.has(k)).map(toCell),
      custom: true,
    });
  };

  const f = editing != null ? (kinds[editing] ?? null) : null;
  const fillAtRandom = () => {
    sfx.pop();
    buzz(15);
    const cur = live.current;
    const lastNow = cur.spots.length - 1;
    commit({ ...cur, kinds: cur.kinds.map((x, i) => (i === 0 || x || i === lastNow ? x : field(pick(FRESH)))) });
  };
  // What's still missing before the board can be saved.
  const blocker =
    spots.length < MIN_FIELDS
      ? t('At least {n} fields', { n: MIN_FIELDS })
      : empty
        ? t('Still {n} empty fields', { n: empty })
        : !finished
          ? t('Put the finish on the last field')
          : null;
  const hint = TOOLS.find((x) => x.id === tool)!.hint;

  return (
    <div className="pt-editor fill">
      <div className="pt-ed-main">
        <div className="pt-tools" role="radiogroup" aria-label={t('Tools')}>
          {TOOLS.map((x) => (
            <button
              key={x.id}
              type="button"
              role="radio"
              aria-checked={tool === x.id}
              className={`pt-tool${tool === x.id ? ' on' : ''}`}
              onClick={() => {
                sfx.tick();
                setTool(x.id);
              }}
            >
              <span className="pt-tool-emoji">{x.emoji}</span>
              <span className="pt-tool-label">{t(x.label)}</span>
            </button>
          ))}
          {empty > 0 && spots.length > 2 && (
            <button type="button" className="pt-tool extra" onClick={fillAtRandom} aria-label={t('Fill the empty fields at random')}>
              <span className="pt-tool-emoji">🎲</span>
              <span className="pt-tool-label">{t('Random')}</span>
            </button>
          )}
          <button type="button" className="pt-tool extra" onClick={() => setMore(true)}>
            <span className="pt-tool-emoji">⋯</span>
            <span className="pt-tool-label">{t('More')}</span>
          </button>
        </div>

        <div ref={box} className="pt-ed-board">
          <div
            ref={gridEl}
            className={`pt-grid${cell < 30 ? ' small' : ''}`}
            style={{ gridTemplateColumns: `repeat(${cols}, ${cell}px)`, gridAutoRows: `${cell}px`, '--cell': `${cell}px` } as CSSProperties}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
          >
            {Array.from({ length: rows }, (_, r) => rows - 1 - r).map((y) =>
              Array.from({ length: cols }, (_, x) => {
                const c = { x, y };
                const k = cellKey(c);
                const i = at.get(k);
                const near = (dx: number, dy: number, set: Set<string>) => set.has(`${x + dx},${y + dy}`);
                // Water: round corners where nothing wet meets them.
                const round = (a: [number, number], b: [number, number]) => (!near(...a, water) && !near(...b, water) ? '45%' : '0');
                const waterStyle: CSSProperties = {
                  borderTopLeftRadius: round([-1, 0], [0, 1]),
                  borderTopRightRadius: round([1, 0], [0, 1]),
                  borderBottomRightRadius: round([1, 0], [0, -1]),
                  borderBottomLeftRadius: round([-1, 0], [0, -1]),
                };
                const here = i != null ? (i === 0 ? field('start') : kinds[i]) : null;
                const blank = i != null && !here;
                const next = tool === 'path' && i == null && (!end || nextTo(end, c));
                // Where the path comes from and where it goes on: a line to each.
                const links = i != null ? [spots[i - 1], spots[i + 1]].filter(Boolean).map((n) => (n.x > x ? 'e' : n.x < x ? 'w' : n.y > y ? 'n' : 's')) : [];
                const jump = here && (here.kind === 'back-bridge' || here.kind === 'mole');
                return (
                  <div key={k} className={`pt-cell${next ? ' next' : ''}${i === last && last > 0 ? ' end' : ''}`}>
                    {/* The tunnel under the water: where it crosses a river, the river runs over it. */}
                    {tunnels.has(k) && (
                      <span className="pt-cell-tunnel">
                        {SIDES.filter((d) => near(d.x, d.y, tunnels) || tunnelEnds.has(`${x + d.x},${y + d.y}`)).map((d) => (
                          <span key={d.name} className={`pt-arm ${d.name}`} />
                        ))}
                      </span>
                    )}
                    {water.has(k) && <span className="pt-cell-water" style={waterStyle} />}
                    {links.map((d) => (
                      <span key={d} className={`pt-route ${d}`} />
                    ))}
                    {blank && (
                      <span className="pt-cell-field blank">
                        <span className="pt-cell-n">{i}</span>
                      </span>
                    )}
                    {here && (
                      <span className={`pt-cell-field${here.kind === 'start' || here.kind === 'goal' ? ' end' : ''}${jump && targets[i!] == null ? ' broken' : ''}`} style={{ '--field': FIELDS[here.kind].color } as CSSProperties}>
                        {here.kind !== 'start' && here.kind !== 'goal' && <span className="pt-cell-n">{i}</span>}
                        <span className="pt-cell-emoji">{FIELDS[here.kind].emoji}</span>
                        {jump && <span className="pt-cell-to">{targets[i!] != null ? `→ ${targets[i!]}` : '⚠️'}</span>}
                      </span>
                    )}
                    {next && <span className="pt-cell-plus">+</span>}
                  </div>
                );
              }),
            )}
          </div>
        </div>
      </div>

      <p className="fine-print pt-tool-hint">{t(hint)}</p>

      <div className="pt-ed-actions">
        <BigButton size="md" variant="glass" className="pt-ed-cancel" onClick={onCancel}>
          {t('Cancel')}
        </BigButton>
        <BigButton size="md" onClick={() => setNaming(true)} disabled={!!blocker}>
          {blocker ?? t('Save · {n} fields', { n: spots.length - 1 })}
        </BigButton>
      </div>

      <Sheet open={naming} onClose={() => setNaming(false)} title={t('Name your board')} closeLabel={t('Cancel')}>
        <input
          type="search"
          className="add-player-input"
          value={name}
          maxLength={40}
          placeholder={t('My board')}
          autoComplete="off"
          enterKeyHint="done"
          aria-label={t('Name')}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
        />
        <BigButton size="xl" onClick={save}>
          {t('Save board · {n} fields', { n: spots.length - 1 })}
        </BigButton>
      </Sheet>

      <Sheet open={more} onClose={() => setMore(false)} title={t('More')} closeLabel={t('Done')}>
        <div className="stack">
          {spots.length > 0 && (
            <BigButton
              variant="glass"
              onClick={() => {
                setMore(false);
                setClearing(true);
              }}
            >
              {t('Start the path over')}
            </BigButton>
          )}
          {onDelete && (
            <BigButton variant="danger" onClick={onDelete}>
              {t('Delete board')}
            </BigButton>
          )}
        </div>
      </Sheet>

      <Sheet open={clearing} onClose={() => setClearing(false)} title={t('Start the path over?')} closeLabel={t('Cancel')}>
        <p className="fine-print">{t('The path and its fields go; water and tunnels stay.')}</p>
        <BigButton
          variant="danger"
          onClick={() => {
            commit({ ...live.current, spots: [], kinds: [] });
            setTool('path');
            setClearing(false);
          }}
        >
          {t('Start over')}
        </BigButton>
      </Sheet>

      <Sheet open={editing != null} onClose={() => setEditing(null)} title={editing != null ? t('Field {n}', { n: editing }) : ''}>
        {editing != null && (
          <div className="pt-kinds">
            {editing === last && (
              <button
                type="button"
                className={`pt-kind pt-kind-goal${f?.kind === 'goal' ? ' on' : ''}`}
                style={{ '--field': FIELDS.goal.color } as CSSProperties}
                onClick={() => {
                  setKind(editing, field('goal'));
                  setEditing(null);
                }}
              >
                <span className="pt-kind-emoji">{FIELDS.goal.emoji}</span>
                <span className="pt-kind-text">
                  <span className="pt-kind-title">{t('Finish')}</span>
                  <span className="pt-kind-sub">{t('The path ends here: the finish.')}</span>
                </span>
              </button>
            )}
            {f && f.kind !== 'goal' && FIELDS[f.kind].param && (
              <div className="pt-param">
                <span className="pt-param-title">
                  {FIELDS[f.kind].emoji} {FIELDS[f.kind].title(param(f))}
                </span>
                <div className="pt-param-values">
                  {FIELDS[f.kind].param!.values.map((v) => (
                    <button key={v} type="button" className={`pt-param-btn${param(f) === v ? ' on' : ''}`} onClick={() => setKind(editing, field(f.kind, v))}>
                      {FIELDS[f.kind].param!.label(v)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {GROUPS.map((group) => (
              <div key={group.id} className="pt-kind-group">
                <span className="pt-kind-group-title">{t(group.label)}</span>
                {KINDS.filter((k) => FIELDS[k].group === group.id).map((k) => {
                  // A bridge back or a tunnel has to lead somewhere from here.
                  const jump = k === 'back-bridge' || k === 'mole';
                  const to = jump ? jumpTarget(geometry, editing, k) : null;
                  const sub = !jump
                    ? FIELDS[k].text(FIELDS[k].param?.def ?? 0, '')
                    : to != null
                      ? t('Back to field {n}', { n: to })
                      : k === 'mole'
                        ? t('Not here yet: dig a tunnel next to this field (Tunnel tool).')
                        : t('Not here yet: put water next to this field, with a field before it across the water.');
                  return (
                    <button
                      key={k}
                      type="button"
                      className={`pt-kind${f?.kind === k ? ' on' : ''}`}
                      style={{ '--field': FIELDS[k].color } as CSSProperties}
                      disabled={jump && to == null}
                      onClick={() => setKind(editing, field(k as FieldKind, f?.kind === k ? f.n : undefined))}
                    >
                      <span className="pt-kind-emoji">{FIELDS[k].emoji}</span>
                      <span className="pt-kind-text">
                        <span className="pt-kind-title">{FIELDS[k].title(FIELDS[k].param?.def ?? 0)}</span>
                        <span className="pt-kind-sub">{sub}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </Sheet>
    </div>
  );
}

function toCell(k: string): Cell {
  const [x, y] = k.split(',').map(Number);
  return { x, y };
}
