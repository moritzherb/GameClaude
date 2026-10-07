const LINES = [
  '💧 Water is also a drink',
  '🍕 Eat something, legend',
  '🚕 Plan your ride home',
  '🙅 Nobody has to drink – sips can be water',
  '🔊 Turn the music up',
  '📸 What happens at pregame stays at pregame',
  '🤝 Look after your mates',
];

/** Scrolling banner of friendly reminders at the bottom of the home screen. */
export default function Ticker() {
  const text = LINES.join('   ✦   ');
  return (
    <div className="ticker" aria-hidden>
      <div className="ticker-track">
        <span>{text}   ✦   </span>
        <span>{text}   ✦   </span>
      </div>
    </div>
  );
}
