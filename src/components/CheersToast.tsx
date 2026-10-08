import { useEffect, useState } from 'react';
import { useRoom } from '../net/RoomProvider';

/** Big pop-up when anyone in the room taps "Cheers!". Shows on every screen. */
export default function CheersToast() {
  const { cheers } = useRoom();
  const [visible, setVisible] = useState<typeof cheers>(null);

  useEffect(() => {
    if (!cheers) return;
    setVisible(cheers);
    const t = setTimeout(() => setVisible(null), 2200);
    return () => clearTimeout(t);
  }, [cheers]);

  if (!visible) return null;
  return (
    <div key={visible.key} className="toast" role="status">
      <span className="toast-emoji">🍻</span>
      <span>
        <strong>{visible.name}</strong> says cheers!
      </span>
    </div>
  );
}
