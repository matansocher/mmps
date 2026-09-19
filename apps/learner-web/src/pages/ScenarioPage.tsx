import { useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { AppIcon } from '../components/AppIcon';
import { getBite } from '../lib/bites';
import { scenarioForBite } from '../lib/scenarios';

export function ScenarioPage() {
  const { biteId = '' } = useParams();
  const location = useLocation();
  const [selected, setSelected] = useState<number | null>(null);
  const bite = useMemo(() => getBite(biteId), [biteId]);
  const scenario = useMemo(() => scenarioForBite(biteId), [biteId]);

  if (!bite || !scenario) {
    return (
      <div className="empty">
        <AppIcon name="unknown" size={48} />
        <p>No scenario is available for this bite.</p>
        <Link className="btn" to="/browse">Back to Browse</Link>
      </div>
    );
  }

  const choice = selected === null ? undefined : scenario.choices[selected];
  return (
    <div>
      <div className="reader-top">
        <Link className="back-link" to={`/bite/${encodeURIComponent(bite.id)}`} state={location.state}>
          ← Back to {bite.title}
        </Link>
      </div>
      <div className="page-head">
        <span className="eyebrow">Scenario mode · practical decision</span>
        <h1>
          <AppIcon name="scenario" /> {scenario.title}
        </h1>
        <p className="lead">Choose the response you would take. You&apos;ll see the tradeoff immediately—this is practice, not a scored quiz.</p>
      </div>
      <section className="scenario-card" aria-labelledby="scenario-prompt">
        <h2 id="scenario-prompt">{scenario.prompt}</h2>
        <div className="scenario-choices" role="group" aria-label="Scenario decisions">
          {scenario.choices.map((item, index) => (
            <button
              key={item.label}
              type="button"
              className={`scenario-choice ${selected === index ? 'selected' : ''}`}
              aria-pressed={selected === index}
              onClick={() => setSelected(index)}
            >
              {item.label}
            </button>
          ))}
        </div>
        {choice ? (
          <div className={`scenario-feedback ${choice.recommended ? 'recommended' : ''}`} role="status">
            <strong>{choice.recommended ? 'Recommended approach' : 'Consider the tradeoff'}</strong>
            <p>{choice.feedback}</p>
          </div>
        ) : null}
      </section>
      {choice ? (
        <div className="scenario-actions">
          <Link className="btn primary" to={`/bite/${encodeURIComponent(bite.id)}`} state={location.state}>
            <AppIcon name="check" size={18} /> Complete scenario & return to bite
          </Link>
          <button type="button" className="btn subtle" onClick={() => setSelected(null)}>Try another choice</button>
        </div>
      ) : null}
    </div>
  );
}
