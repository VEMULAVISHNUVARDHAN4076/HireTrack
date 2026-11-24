import { Chip, ScoreBar } from './ui';

/** Displays a resume-to-job match. Scores are estimates; the disclaimer is always shown. */
export default function MatchPanel({ match }) {
  if (!match) return null;
  return (
    <section className="card space-y-4" aria-labelledby="match-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id="match-heading" className="text-base font-semibold text-slate-900">AI resume match</h3>
        <ScoreBar score={match.score} />
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <div><dt className="text-slate-500">Skill coverage</dt><dd>{match.skill_score == null ? 'n/a' : `${match.skill_score}%`}</dd></div>
        <div><dt className="text-slate-500">Semantic similarity</dt><dd>{match.semantic_score}%</dd></div>
        <div><dt className="text-slate-500">Method</dt><dd>{match.method}</dd></div>
      </dl>
      <div>
        <p className="mb-1 text-sm font-medium text-slate-700">Matching skills</p>
        {match.matched_skills?.length ? (
          match.matched_skills.map((s) => <Chip key={s} tone="green">{s}</Chip>)
        ) : (
          <p className="text-sm text-slate-500">No required skills were found in the resume.</p>
        )}
      </div>
      <div>
        <p className="mb-1 text-sm font-medium text-slate-700">Not found in resume</p>
        {match.missing_skills?.length ? (
          match.missing_skills.map((s) => <Chip key={s} tone="red">{s}</Chip>)
        ) : (
          <p className="text-sm text-slate-500">None.</p>
        )}
      </div>
      {match.unconfirmed_skills?.length > 0 && (
        <div>
          <p className="mb-1 text-sm font-medium text-slate-700">Unconfirmed (resume text too limited to judge)</p>
          {match.unconfirmed_skills.map((s) => <Chip key={s} tone="amber">{s}</Chip>)}
        </div>
      )}
      {match.note && <p className="text-xs text-slate-500">{match.note}</p>}
      <p className="text-xs text-slate-500">{match.disclaimer}</p>
    </section>
  );
}
