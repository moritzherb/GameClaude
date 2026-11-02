import { useState, type CSSProperties } from 'react';
import BigButton from '../../components/BigButton';
import Sheet from '../../components/Sheet';
import { t } from '../../i18n';
import { buzz, sfx } from '../../lib/fx';
import { layout, type Board } from './boards';
import { field, FIELDS, GROUPS, KINDS, param, type Field } from './fields';

interface Props {
  board: Board;
  /** Making a new board from this one (else changing it). */
  asNew: boolean;
  onSave: (b: Board) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

/**
 * Your own board: the path of the board it starts from, with whatever fields you put where. Start
 * and finish stay where they are.
 */
export default function Editor({ board, asNew, onSave, onDelete, onCancel }: Props) {
  const [name, setName] = useState(asNew ? '' : board.name);
  const [fields, setFields] = useState<Field[]>(board.fields);
  const [editing, setEditing] = useState<number | null>(null);
  const spots = layout(fields.length, board.cols);
  const top = spots[spots.length - 1].y;
  const f = editing != null ? fields[editing] : null;

  const set = (i: number, next: Field) => {
    sfx.tick();
    buzz(8);
    setFields(fields.map((x, k) => (k === i ? next : x)));
  };

  const save = () => {
    const base = board.base ?? board.id;
    onSave({
      ...board,
      id: asNew ? `own-${Date.now().toString(36)}` : board.id,
      name: name.trim() || t('My board'),
      fields,
      custom: true,
      base,
    });
  };

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
        <p className="fine-print">{t('Tap a field to put another one there. Start and finish stay where they are.')}</p>
      </section>

      <div className="pt-map" style={{ gridTemplateColumns: `repeat(${board.cols}, 1fr)` } as CSSProperties}>
        {spots.map((s, i) => {
          const x = fields[i];
          const info = FIELDS[x.kind];
          const fixed = x.kind === 'start' || x.kind === 'goal';
          return (
            <button
              key={i}
              type="button"
              className={`pt-map-field${fixed ? ' fixed' : ''}`}
              style={{ gridColumn: s.x + 1, gridRow: top - s.y + 1, '--field': info.color } as CSSProperties}
              disabled={fixed}
              onClick={() => setEditing(i)}
            >
              {!fixed && <span className="pt-map-n">{i}</span>}
              <span className="pt-map-emoji">{info.emoji}</span>
              <span className="pt-map-label">{info.label(param(x))}</span>
            </button>
          );
        })}
      </div>

      <div className="sticky-action stack">
        <BigButton size="xl" onClick={save}>
          {t('Save board')}
        </BigButton>
        <div className="pt-editor-tools">
          <button type="button" className="text-btn pt-link" onClick={onCancel}>
            {t('Cancel')}
          </button>
          {onDelete && (
            <button type="button" className="text-btn" onClick={onDelete}>
              {t('Delete board')}
            </button>
          )}
        </div>
      </div>

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
                    <button key={v} type="button" className={`pt-param-btn${param(f) === v ? ' on' : ''}`} onClick={() => set(editing, field(f.kind, v))}>
                      {FIELDS[f.kind].param!.label(v)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {GROUPS.map((group) => (
              <div key={group.id} className="pt-kind-group">
                <span className="pt-kind-group-title">{t(group.label)}</span>
                {KINDS.filter((k) => FIELDS[k].group === group.id).map((k) => (
                  <button
                    key={k}
                    type="button"
                    className={`pt-kind${f.kind === k ? ' on' : ''}`}
                    style={{ '--field': FIELDS[k].color } as CSSProperties}
                    onClick={() => set(editing, field(k, f.kind === k ? f.n : undefined))}
                  >
                    <span className="pt-kind-emoji">{FIELDS[k].emoji}</span>
                    <span className="pt-kind-text">
                      <span className="pt-kind-title">{FIELDS[k].title(FIELDS[k].param?.def ?? 0)}</span>
                      <span className="pt-kind-sub">{FIELDS[k].text(FIELDS[k].param?.def ?? 0, '')}</span>
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </Sheet>
    </div>
  );
}
