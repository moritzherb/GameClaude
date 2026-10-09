import { t } from '../i18n';

/** Rules are English data (marked with tx()); translated here. */
export default function RulesList({ rules }: { rules: string[] }) {
  return (
    <ol className="rules-list">
      {rules.map((rule, i) => (
        <li key={i}>
          <span className="rule-num">{i + 1}</span>
          <span>{t(rule)}</span>
        </li>
      ))}
    </ol>
  );
}
