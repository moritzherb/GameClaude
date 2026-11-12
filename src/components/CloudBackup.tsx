import { useMemo, useState } from 'react';
import { RowIcon, type RowGlyph } from './Icons';
import { t } from '../i18n';
import { backUp, deleteMyData, groupCode, restore } from '../net/cloud';
import BigButton from './BigButton';
import { CodeCard, CodeForm, cloudMessage, useCloud } from './CloudBits';
import Sheet from './Sheet';

type Open = 'backup' | 'restore' | 'delete' | null;

/** Settings → "New phone?": everything under a code, and back onto another phone with it. */
export default function CloudBackup() {
  const [open, setOpen] = useState<Open>(null);
  const close = () => setOpen(null);
  return (
    <section className="section">
      <h2 className="section-title">{t('New phone?')}</h2>
      <p className="fine-print">{t('Back up your players, boards, settings and stats under a code. On the new phone, bring them in with that code.')}</p>
      <div className="settings-list">
        <Row icon="backup" label={t('Make a backup code')} hint={t('A new code each time, the old one stops working')} onClick={() => setOpen('backup')} />
        <Row icon="restore" label={t('Bring in a backup')} hint={t('Replaces what’s on this phone')} onClick={() => setOpen('restore')} />
        <Row icon="trash" label={t('Delete my data on the server')} hint={t('Your backup and the boards you shared')} onClick={() => setOpen('delete')} />
      </div>
      <BackupSheet open={open === 'backup'} onClose={close} />
      <RestoreSheet open={open === 'restore'} onClose={close} />
      <DeleteSheet open={open === 'delete'} onClose={close} />
    </section>
  );
}

function Row({ icon, label, hint, onClick }: { icon: RowGlyph; label: string; hint: string; onClick: () => void }) {
  return (
    <button type="button" className="setting-row" onClick={onClick}>
      <span className="setting-emoji" aria-hidden="true">
        <RowIcon name={icon} />
      </span>
      <span className="setting-text">
        <span className="setting-label">{label}</span>
        <span className="setting-hint">{hint}</span>
      </span>
    </button>
  );
}

function BackupSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const run = useMemo(() => (open ? backUp : null), [open]);
  const { busy, value, error } = useCloud(run);
  return (
    <Sheet open={open} onClose={onClose} title={t('Backup code')} closeLabel={t('Done')}>
      {busy && <p className="lead">{t('One moment…')}</p>}
      {error && <p className="lead">{error}</p>}
      {value && (
        <>
          <p className="lead">{t('Write it down or send it to yourself. Whoever has it can bring your data onto their phone.')}</p>
          <CodeCard code={groupCode(value)} text={t('My prost! backup code: {code}', { code: groupCode(value) })} />
        </>
      )}
    </Sheet>
  );
}

function RestoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <Sheet open={open} onClose={onClose} title={t('Bring in a backup')} closeLabel={t('Cancel')}>
      <p className="lead">{t('Type the 12-letter backup code. Everything on this phone is replaced by the backup.')}</p>
      <CodeForm
        length={12}
        label={t('Backup code')}
        busy={busy}
        onSubmit={(code) => {
          setBusy(true);
          setError('');
          restore(code).catch((e) => {
            setError(cloudMessage(e));
            setBusy(false);
          });
        }}
      />
      {error && <p className="fine-print cloud-error">{error}</p>}
    </Sheet>
  );
}

function DeleteSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [state, setState] = useState<'ask' | 'busy' | 'done' | string>('ask');
  return (
    <Sheet
      open={open}
      onClose={() => {
        setState('ask');
        onClose();
      }}
      title={t('Delete my data on the server')}
      closeLabel={state === 'done' ? t('Done') : t('Cancel')}
    >
      {state === 'done' ? (
        <p className="lead">{t('Deleted. What’s on this phone stays.')}</p>
      ) : (
        <>
          <p className="lead">{t('Your backup and the boards you shared are deleted from the server. What’s on this phone stays.')}</p>
          {state !== 'ask' && state !== 'busy' && <p className="fine-print cloud-error">{state}</p>}
          <BigButton
            variant="danger"
            disabled={state === 'busy'}
            onClick={() => {
              setState('busy');
              deleteMyData().then(
                () => setState('done'),
                (e) => setState(cloudMessage(e)),
              );
            }}
          >
            {t('Delete')}
          </BigButton>
        </>
      )}
    </Sheet>
  );
}
