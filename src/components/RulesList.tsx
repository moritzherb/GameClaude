export default function RulesList({ rules }: { rules: string[] }) {
  return (
    <ol className="rules-list">
      {rules.map((rule, i) => (
        <li key={i}>
          <span className="rule-num">{i + 1}</span>
          <span>{rule}</span>
        </li>
      ))}
    </ol>
  );
}
