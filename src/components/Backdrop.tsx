/** Slow-moving colour glows behind everything. Pure CSS. */
export default function Backdrop() {
  return (
    <div className="backdrop" aria-hidden>
      <span className="glow glow-1" />
      <span className="glow glow-2" />
      <span className="glow glow-3" />
    </div>
  );
}
