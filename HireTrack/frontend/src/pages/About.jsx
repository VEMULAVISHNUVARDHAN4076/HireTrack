export default function About() {
  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="page-title">About HireTrack</h1>
      <p className="text-slate-700">
        HireTrack is an AI-assisted job recruitment management system. Candidates build profiles, upload resumes and track
        applications. Recruiters post jobs, review applicants and manage the hiring pipeline. Administrators verify
        recruiters and keep the platform safe.
      </p>
      <section className="card space-y-3">
        <h2 className="text-lg font-semibold">How resume matching works</h2>
        <p className="text-sm text-slate-700">
          Each match combines two signals: how many of the job's required skills appear in the resume and profile, and how
          similar the resume text is to the job description. The weights are configurable by the administrator. Skills that
          are absent are reported as missing only when the resume has enough readable text to support that claim.
        </p>
        <p className="text-sm text-slate-700">
          Scores are estimates. They are never used to reject or hire anyone automatically. Recruiters make all decisions.
        </p>
      </section>
    </div>
  );
}
