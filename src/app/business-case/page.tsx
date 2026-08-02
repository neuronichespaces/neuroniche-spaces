"use client";

// F3 business case (template-based) + F11 co-design survey (BUILD-SPEC-v1
// §4.2). The business case pulls the audit answers already saved by /audit
// (same localStorage key) so the two features connect without a backend.

import { useMemo, useState } from "react";
import { scoreAudit, type Answers } from "@/lib/aspectss/score";
import { buildBusinessCase, approve, type BusinessCase } from "@/lib/businesscase/generate";
import { businessCaseToCsv } from "@/lib/export/report";
import {
  DEFAULT_QUESTIONS,
  aggregateResponses,
  canOpenSurvey,
  generateRespondentToken,
  type Survey,
  type SurveyResponse,
} from "@/lib/codesign/survey";

function downloadCsv(businessCase: BusinessCase, orgName: string) {
  const csv = businessCaseToCsv(businessCase);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `business-case-${orgName || "neuroniche"}.csv`.replace(/\s+/g, "-").toLowerCase();
  a.click();
  URL.revokeObjectURL(url);
}

const AUDIT_STORAGE_KEY = "neuroniche-audit-answers";

export default function BusinessCasePage() {
  const [orgName, setOrgName] = useState("");
  const [businessCase, setBusinessCase] = useState<BusinessCase | null>(null);
  const [reviewerName, setReviewerName] = useState("");

  const [survey, setSurvey] = useState<Survey>({
    id: "s1",
    audience: "students",
    questions: DEFAULT_QUESTIONS,
    minorsInvolved: true,
    consentAttested: false,
  });
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const audit = useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(AUDIT_STORAGE_KEY);
      if (!raw) return null;
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
      return scoreAudit(parsed as Answers);
    } catch {
      return null;
    }
  }, []);

  const onGenerate = () => {
    setBusinessCase(buildBusinessCase({ organisationName: orgName, audit, costing: null, grants: [] }));
  };

  const onApprove = () => {
    if (businessCase && reviewerName.trim()) {
      setBusinessCase(approve(businessCase, reviewerName.trim()));
    }
  };

  const onSubmitResponse = () => {
    setResponses((prev) => [
      ...prev,
      { surveyId: survey.id, respondentToken: generateRespondentToken(), answers: draft },
    ]);
    setDraft({});
  };

  const aggregated = useMemo(() => aggregateResponses(survey, responses), [survey, responses]);

  return (
    <main className="mx-auto max-w-2xl p-6 flex flex-col gap-[var(--a11y-density-gap)]">
      <h1 className="no-print text-2xl font-semibold">Business case and co-design</h1>

      <section aria-labelledby="bc-h" className="flex flex-col gap-3">
        <h2 id="bc-h" className="no-print text-lg font-semibold">
          Business case
        </h2>
        <p className="no-print text-sm">
          This draft is built from your saved sensory audit. A person must
          review and approve it before it is used — it is never final on its
          own.
        </p>
        <label className="no-print flex items-center justify-between gap-3 a11y-target">
          Organisation name
          <input
            className="border rounded px-2 py-1 bg-[var(--a11y-surface)] border-[var(--a11y-border)] a11y-target"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
          />
        </label>
        <button
          type="button"
          onClick={onGenerate}
          className="no-print a11y-target self-start rounded border border-[var(--a11y-border)] px-4 bg-[var(--a11y-surface)]"
        >
          Generate draft
        </button>

        {businessCase && (
          <div className="flex flex-col gap-3 rounded border border-[var(--a11y-border)] p-4 print:border-0 print:p-0">
            {/* Printable report header — only meaningful once printed/exported, hidden on screen since the on-screen title above already says this */}
            <div className="hidden print:block">
              <h1 className="text-2xl font-semibold">{orgName || "Business case"}</h1>
              <p className="text-sm">Prepared {new Date().toLocaleDateString("en-AU", { year: "numeric", month: "long", day: "numeric" })}</p>
            </div>

            <p className="no-print text-sm border-b border-[var(--a11y-border)] pb-2">
              Drafted from your own data — review before use. Status:{" "}
              <strong>
                {businessCase.status === "draft_pending_review" ? "Draft, needs review" : "Approved"}
              </strong>
            </p>
            <p className="hidden print:block text-sm border-b border-black pb-2">
              Status: {businessCase.status === "draft_pending_review" ? "DRAFT — pending review, not yet approved" : `Approved by ${businessCase.reviewedBy} on ${new Date(businessCase.reviewedAt!).toLocaleDateString("en-AU")}`}
            </p>

            {businessCase.sections.map((s) => (
              <div key={s.heading}>
                <h3 className="font-semibold">{s.heading}</h3>
                <p className="text-sm">{s.body}</p>
              </div>
            ))}

            {businessCase.status === "draft_pending_review" && (
              <div className="no-print flex items-end gap-2 border-t border-[var(--a11y-border)] pt-3">
                <label className="flex-1 flex flex-col gap-1 text-sm">
                  Your name (reviewer)
                  <input
                    className="border rounded px-2 py-1 bg-[var(--a11y-surface)] border-[var(--a11y-border)] a11y-target"
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  onClick={onApprove}
                  disabled={!reviewerName.trim()}
                  className="a11y-target rounded border border-[var(--a11y-border)] px-4 bg-[var(--a11y-surface)] disabled:opacity-40"
                >
                  Approve
                </button>
              </div>
            )}
            {businessCase.status === "approved" && (
              <p className="no-print text-sm">
                Approved by {businessCase.reviewedBy} on{" "}
                {new Date(businessCase.reviewedAt!).toLocaleDateString()}.
              </p>
            )}

            <div className="no-print flex flex-wrap gap-2 border-t border-[var(--a11y-border)] pt-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="a11y-target rounded border border-[var(--a11y-border)] px-4 bg-[var(--a11y-surface)]"
              >
                Export as PDF
              </button>
              <button
                type="button"
                onClick={() => downloadCsv(businessCase, orgName)}
                className="a11y-target rounded border border-[var(--a11y-border)] px-4 bg-[var(--a11y-surface)]"
              >
                Download CSV
              </button>
            </div>
            <p className="no-print text-sm text-[var(--a11y-fg)] opacity-80">
              &quot;Export as PDF&quot; opens your browser&apos;s print dialog — choose
              &quot;Save as PDF&quot; as the destination. Nothing is uploaded anywhere.
            </p>
          </div>
        )}
      </section>

      <section aria-labelledby="cd-h" className="no-print flex flex-col gap-3">
        <h2 id="cd-h" className="text-lg font-semibold">
          Co-design survey
        </h2>
        <p className="text-sm">
          Responses never store a name or any identifying detail — only your
          answers.
        </p>

        <label className="flex items-center justify-between gap-3 a11y-target">
          I confirm this organisation holds guardian consent for student
          responses
          <input
            type="checkbox"
            className="size-5"
            checked={survey.consentAttested}
            onChange={(e) => setSurvey((s) => ({ ...s, consentAttested: e.target.checked }))}
          />
        </label>

        {!canOpenSurvey(survey) ? (
          <p role="alert" className="rounded border border-[#8a4a4a] p-3 text-sm">
            This survey involves students. Confirm consent above before it can
            open.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {survey.questions.map((q) => (
              <label key={q.id} className="flex flex-col gap-1 a11y-target">
                {q.text}
                {q.kind === "scale" ? (
                  <select
                    className="border rounded px-2 py-1 w-24 bg-[var(--a11y-surface)] border-[var(--a11y-border)] a11y-target"
                    value={draft[q.id] ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, [q.id]: e.target.value }))}
                  >
                    <option value="">—</option>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="border rounded px-2 py-1 bg-[var(--a11y-surface)] border-[var(--a11y-border)] a11y-target"
                    value={draft[q.id] ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, [q.id]: e.target.value }))}
                  />
                )}
              </label>
            ))}
            <button
              type="button"
              onClick={onSubmitResponse}
              className="a11y-target self-start rounded border border-[var(--a11y-border)] px-4 bg-[var(--a11y-surface)]"
            >
              Submit response
            </button>
          </div>
        )}

        {responses.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-[var(--a11y-border)] pt-3">
            <p className="text-sm">{responses.length} response(s) so far — de-identified summary:</p>
            <ul className="text-sm flex flex-col gap-2">
              {aggregated.map((a) => (
                <li key={a.questionId}>
                  <strong>{a.questionText}</strong>{" "}
                  {a.averageScore != null
                    ? `average ${a.averageScore} / 5 (${a.responseCount} responses)`
                    : a.textAnswers.length > 0
                      ? a.textAnswers.join("; ")
                      : "no responses yet"}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </main>
  );
}
