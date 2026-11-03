import { useCallback, useMemo, useState } from 'react';
import { CodeCard, CodeForm, cloudMessage, useCloud } from '../../components/CloudBits';
import Sheet from '../../components/Sheet';
import { t } from '../../i18n';
import { fetchBoard, shareBoard } from '../../net/cloud';
import { fromStored, toStored, type Board } from './boards';

/** Share a board you made: it goes up to the server and comes back as a 6-letter code. */
export function ShareBoardSheet({ board, onClose }: { board: Board | null; onClose: () => void }) {
  const run = useMemo(() => (board ? () => shareBoard(board.name, toStored(board)) : null), [board]);
  const { busy, value, error } = useCloud(run);
  return (
    <Sheet open={!!board} onClose={onClose} title={t('Share this board')} closeLabel={t('Done')}>
      {busy && <p className="lead">{t('One moment…')}</p>}
      {error && <p className="lead">{error}</p>}
      {value && (
        <>
          <p className="lead">{t('Friends load it in Party with this code:')}</p>
          <CodeCard code={value} text={t('My prost! Party board “{name}”. Code: {code}', { name: board?.name ?? '', code: value })} />
        </>
      )}
    </Sheet>
  );
}

/** Load a board someone shared, by its code. It's checked like a saved one before it can be played. */
export function FetchBoardSheet({ open, onClose, onBoard }: { open: boolean; onClose: () => void; onBoard: (b: Board) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(
    async (code: string) => {
      setBusy(true);
      setError('');
      try {
        const { name, board } = await fetchBoard(code);
        const b = fromStored({ ...(board as object), id: `shared-${code}-${Date.now().toString(36)}`, name: name || t('Shared board') });
        if (!b) throw new Error('damaged');
        onBoard(b);
      } catch (e) {
        setError(e instanceof Error && e.message === 'damaged' ? t('This board can’t be played.') : cloudMessage(e));
      } finally {
        setBusy(false);
      }
    },
    [onBoard],
  );
  return (
    <Sheet open={open} onClose={onClose} title={t('Board from a code')} closeLabel={t('Cancel')}>
      <p className="lead">{t('Type the 6-letter code of a board someone shared.')}</p>
      <CodeForm length={6} label={t('Board code')} busy={busy} onSubmit={(code) => void load(code)} />
      {error && <p className="fine-print cloud-error">{error}</p>}
    </Sheet>
  );
}
