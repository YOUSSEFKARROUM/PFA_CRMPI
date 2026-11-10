import type { ConsistencyCheck, ConsistencyKind } from '../../api/types';

const KIND_LABEL: Record<ConsistencyKind, string> = {
  declaration: 'Réponses contradictoires',
  prerequisite: 'Prérequis manquant',
};

interface ConsistencyChecksProps {
  checks: readonly ConsistencyCheck[];
}

/**
 * Points à revérifier : écarts entre réponses détectés par des règles fixes.
 * Information en lecture seule, distincte des priorités : aucun effet sur le score.
 */
export function ConsistencyChecks({ checks }: ConsistencyChecksProps) {
  if (checks.length === 0) return null;

  return (
    <section className="checks" aria-labelledby="checks-title">
      <div className="checks-intro">
        <h2 id="checks-title">Points à revérifier</h2>
        <p>
          {checks.length === 1 ? 'Deux de vos réponses semblent' : `${checks.length} paires de réponses semblent`} incompatibles.
          Ces points n’ont aucun effet sur votre score : relisez les questions concernées avant de diffuser le rapport.
        </p>
      </div>
      <ul className="check-list">
        {checks.map((check) => (
          <li key={check.id} className="check">
            <span className="data check-kind">
              {KIND_LABEL[check.kind]} · {check.id}
            </span>
            <p className="check-title">{check.title}</p>
            <dl className="check-answers">
              {check.questions.map((question) => (
                <div key={question.id} className="check-answer">
                  <dt className="data">Question {question.number}</dt>
                  <dd>
                    <span className="check-question">{question.text}</span>
                    <span className="check-choice">Votre réponse : « {question.answer} »</span>
                  </dd>
                </div>
              ))}
            </dl>
            <p className="check-rationale">{check.rationale}</p>
            <span className="data check-reference">Repère : {check.reference}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
