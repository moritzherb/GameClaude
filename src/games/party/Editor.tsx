import { useMemo, useState, type CSSProperties } from 'react';
import BigButton from '../../components/BigButton';
import Sheet from '../../components/Sheet';
import { t, tx } from '../../i18n';
import { buzz, sfx } from '../../lib/fx';
import { pick } from '../../lib/random';
import { cellKey, jumps, jumpTarget, MAX_COLS, MAX_ROWS, MIN_FIELDS, type Board, type Cell } from './boards';
import { field, FIELDS, GROUPS, KINDS, param, type Field, type FieldKind } from './fields';

type Tool = 'path' | 'fields' | 'water' | 'tunnel' | 'erase';

const TOOLS: { id: Tool; emoji: string; label: string; hint: string }[] = [
  { id: 'path', emoji: '👣', label: tx('Path'), hint: tx('Tap next to the end of the path to lay the next field; tap the last field to take it away.') },
  { id: 'fields', emoji: '🎯', label: tx('Fields'), hint: tx('Tap a field to put another kind there. Start and finish stay at the ends.') },
  { id: 'water', emoji: '💧', label: tx('Water'), hint: tx('Tap cells to put water there (or take it away). A field on water is a bridge over it.') },
  { id: 'tunnel', emoji: '🕳️', label: tx('Tunnel'), hint: tx('Tap cells beside the path to dig the mole’s tunnel. It runs from the Mole field to the field furthest back it reaches.') },
  { id: 'erase', emoji: '🧽', label: tx('Erase'), hint: tx('Tap to take water and tunnel away, or the last field of the path.') },
];

/** New fields on the path: a kind at random (not one that has to lead somewhere). */
const FRESH = KINDS.filter((k) => k !== 'back-bridge' && k !== 'mole' && k !== 'bridge');

const SIDES = [
  { x: 0, y: 1, name: 'n' },
  { x: 0, y: -1, name: 's' },
  { x: 1, y: 0, name: 'e' },
  { x: -1, y: 0, name: 'w' },
] as const;

interface Props {
  board: Board;
  /** Making a new board from this one (else changing it). */
  asNew: boolean;
  onSave: (b: Board) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

/**
 * Your own board, cell by cell: lay the path, put fields on it, water and the mole's tunnels round
 * it. Water and tunnels join their neighbours, round corners too.
 */
export default function Editor({ board, asNew, onSave, onDelete, onCancel }: Props) {
  const [name, setName] = useState(asNew ? '' : board.name);
  const [spots, setSpots] = useState<Cell[]>(board.spots);
  const [kinds, setKinds] = useState<Field[]>(board.fields);
  const [water, setWater] = useState(() => new Set(board.water.map(cellKey)));
  const [tunnels, setTunnels] = useState(() => new Set(board.tunnels.map(cellKey)));
  const [tool, setTool] = useState<Tool>('path');
  const [editing, setEditing] = useState<number | null>(null);
  const [clearing, setClearing] = useState(false);
  const cols = MAX_COLS;
  const used = [...spots.map((c) => c.y), ...[...water, ...tunnels].map((k) => +k.split(',')[1])];
  const rows = Math.min(MAX_ROWS, Math.max(12, board.rows, (used.length ? Math.max(...used) : 0) + 3));

  const at = useMemo(() => new Map(spots.map((c, i) => [cellKey(c), i])), [spots]);
  const last = spots.length - 1;
  /** The fields as they'd be played: start and finish at the ends. */
  const fields = kinds.map((f, i) => (i === 0 ? field('start') : i === last ? field('goal') : f));
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
  const canExtend = (c: Cell) => !at.has(cellKey(c)) && (!end || Math.abs(end.x - c.x) + Math.abs(end.y - c.y) === 1);

  const shorten = () => {
    setSpots(spots.slice(0, -1));
    setKinds(kinds.slice(0, -1));
    sfx.tick();
    buzz(8);
  };

  const setKind = (i: number, next: Field) => {
    sfx.tick();
    buzz(8);
    setKinds(kinds.map((x, k) => (k === i ? next : x)));
  };

  const tap = (c: Cell) => {
    const k = cellKey(c);
    const i = at.get(k);
    const toggle = (set: Set<string>, update: (s: Set<string>) => void) => {
      const next = new Set(set);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      update(next);
    };
    if (tool === 'path') {
      if (i === last && last >= 0) return shorten();
      if (i != null || (end && !canExtend(c))) return;
      setSpots([...spots, c]);
      setKinds([...kinds, field(pick(FRESH))]);
      if (tunnels.has(k)) toggle(tunnels, setTunnels);
    } else if (tool === 'fields') {
      if (i == null || i === 0 || i === last) return;
      setEditing(i);
    } else if (tool === 'water') toggle(water, setWater);
    else if (tool === 'tunnel') {
      if (i != null) return;
      toggle(tunnels, setTunnels);
    } else if (water.has(k)) toggle(water, setWater);
    else if (tunnels.has(k)) toggle(tunnels, setTunnels);
    else if (i === last && last >= 0) return shorten();
    else return;
    sfx.tick();
    buzz(8);
  };

  const save = () => {
    const keep = (k: string) => toCell(k).y < rows;
    onSave({
      id: asNew ? `own-${Date.now().toString(36)}` : board.id,
      name: name.trim() || t('My board'),
      theme: board.theme,
      cols,
      rows,
      spots,
      fields,
      water: [...water].filter(keep).map(toCell),
      tunnels: [...tunnels].filter((k) => keep(k) && !at.has(k)).map(toCell),
      custom: true,
    });
  };

  const f = editing != null ? fields[editing] : null;
  const hint = TOOLS.find((x) => x.id === tool)!.hint;

  return (
    <div className="bd pt-editor">
      <section className="section">
        <label className="section-title" htmlFor="pt-board-name">
          {t('Name')}
        </label>
        <input
          id="pt-board-name"
          type="search"
          className="add-player-input"
          value={name}
          maxLength={40}
          placeholder={t('My board')}
          autoComplete="off"
          enterKeyHint="done"
          onChange={(e) => setName(e.target.value)}
        />
      </section>

      <div className="pt-tools" role="radiogroup">
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
      </div>
      <p className="fine-print pt-tool-hint">{t(hint)}</p>

      <div className="pt-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
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
            const here = i != null ? fields[i] : null;
            const next = tool === 'path' && i == null && canExtend(c);
            // Where the path comes from and where it goes on: a line to each.
            const links = i != null ? [spots[i - 1], spots[i + 1]].filter(Boolean).map((n) => (n.x > x ? 'e' : n.x < x ? 'w' : n.y > y ? 'n' : 's')) : [];
            const jump = here && (here.kind === 'back-bridge' || here.kind === 'mole');
            return (
              <button key={k} type="button" className={`pt-cell${next ? ' next' : ''}`} aria-label={`${x + 1}, ${y + 1}`} onClick={() => tap(c)}>
                {water.has(k) && <span className="pt-cell-water" style={waterStyle} />}
                {tunnels.has(k) && (
                  <span className="pt-cell-tunnel">
                    {SIDES.filter((d) => near(d.x, d.y, tunnels) || tunnelEnds.has(`${x + d.x},${y + d.y}`)).map((d) => (
                      <span key={d.name} className={`pt-arm ${d.name}`} />
                    ))}
                  </span>
                )}
                {links.map((d) => (
                  <span key={d} className={`pt-route ${d}`} />
                ))}
                {here && (
                  <span className={`pt-cell-field${i === 0 || i === last ? ' end' : ''}${jump && targets[i!] == null ? ' broken' : ''}`} style={{ '--field': FIELDS[here.kind].color } as CSSProperties}>
                    {i !== 0 && i !== last && <span className="pt-cell-n">{i}</span>}
                    <span className="pt-cell-emoji">{FIELDS[here.kind].emoji}</span>
                    {jump && <span className="pt-cell-to">{targets[i!] != null ? `→ ${targets[i!]}` : '⚠️'}</span>}
                  </span>
                )}
                {next && <span className="pt-cell-plus">+</span>}
              </button>
            );
          }),
        )}
      </div>

      <div className="sticky-action stack">
        <BigButton size="xl" onClick={save} disabled={spots.length < MIN_FIELDS}>
          {spots.length < MIN_FIELDS ? t('At least {n} fields', { n: MIN_FIELDS }) : t('Save board · {n} fields', { n: spots.length - 1 })}
        </BigButton>
        <div className="pt-editor-tools">
          <button type="button" className="text-btn pt-link" onClick={onCancel}>
            {t('Cancel')}
          </button>
          {spots.length > 0 && (
            <button type="button" className="text-btn" onClick={() => setClearing(true)}>
              {t('Start the path over')}
            </button>
          )}
          {onDelete && (
            <button type="button" className="text-btn" onClick={onDelete}>
              {t('Delete board')}
            </button>
          )}
        </div>
      </div>

      <Sheet open={clearing} onClose={() => setClearing(false)} title={t('Start the path over?')} closeLabel={t('Cancel')}>
        <p className="fine-print">{t('The path and its fields go; water and tunnels stay.')}</p>
        <BigButton
          variant="danger"
          onClick={() => {
            setSpots([]);
            setKinds([]);
            setTool('path');
            setClearing(false);
          }}
        >
          {t('Start over')}
        </BigButton>
      </Sheet>

      <Sheet open={f != null} onClose={() => setEditing(null)} title={editing != null ? t('Field {n}', { n: editing }) : ''}>
        {f && editing != null && (
          <div className="pt-kinds">
            {FIELDS[f.kind].param && (
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
                      className={`pt-kind${f.kind === k ? ' on' : ''}`}
                      style={{ '--field': FIELDS[k].color } as CSSProperties}
                      disabled={jump && to == null}
                      onClick={() => setKind(editing, field(k as FieldKind, f.kind === k ? f.n : undefined))}
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
