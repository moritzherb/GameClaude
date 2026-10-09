import { useEffect, useState } from 'react';
import { t } from '../i18n';
import { useRoom } from '../net/RoomProvider';

/** Big pop-up when anyone in the room taps "Cheers!". Shows on every screen. */
export default function CheersToast() {
  const { cheers } = useRoom();
  const [visible, setVisible] = useState<typeof cheers>(null);

  useEffect(() => {
    if (!cheers) return;
    setVisible(cheers);
    const timeout = setTimeout(() => setVisible(null), 2200);
    return () => clearTimeout(timeout);
  }, [cheers]);

  if (!visible) return null;
  // The name is bold, so split the sentence around it.
  const [before, after] = t('{name} says cheers!').split('{name}');
  return (
    <div key={visible.key} className="toast" role="status">
      <span className="toast-emoji">🍻</span>
      <span>
        {before}
        <strong>{visible.name}</strong>
        {after}
      </span>
    </div>
  );
}
