import type { Metadata } from "next";

// The project synopsis, served from this site's own domain at /synopsis so it
// can be shared as a link without depending on any third-party host.
//
// Deliberately a route rather than a static file in public/: next.config.ts
// sends `style-src 'self' 'unsafe-inline'` and `font-src 'self' data:`, so a
// standalone HTML file loading fonts.googleapis.com would have every webfont
// silently blocked and fall back to system faces. As a route it inherits the
// four self-hosted families layout.tsx already loads (--display-font
// Newsreader, --body-font Archivo, --mono-font IBM Plex Mono, --pen-font
// Caveat) and the palette tokens from globals.css, which also means it
// follows the site's dark-mode toggle for free.
//
// Every figure quoted below was read from this repository or a real test run
// — see docs/legal-compliance.md for the same discipline applied to the
// legal pages. If the code changes materially, this page is stale and should
// be updated in the same commit.

export const metadata: Metadata = {
  title: "Project synopsis",
  description:
    "Project synopsis for GetAhead AI — an auditable AI exam answer-sheet evaluation platform, its measured findings and open gaps.",
  alternates: { canonical: "/synopsis" },
  // Not product marketing: shareable by link, but kept out of search results
  // and out of sitemap.ts on purpose.
  robots: { index: false, follow: false },
};

const CSS = `
.syn {
  --syn-measure: 50rem;
  max-width: var(--syn-measure);
  margin: 0 auto;
  padding-block: 56px 72px;
  color: var(--ink);
  font-family: var(--body-font), "Helvetica Neue", Arial, sans-serif;
  font-size: 16px;
  line-height: 1.6;
}
.syn-page { background: var(--paper); padding-inline: 20px; min-height: 100vh; }
.syn * { box-sizing: border-box; }

.syn-masthead { border-bottom: 2px solid var(--ink); padding-bottom: 22px; }
.syn-eyebrow {
  font-family: var(--mono-font), ui-monospace, Menlo, monospace;
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--graphite);
  margin: 0 0 14px;
}
.syn h1 {
  font-family: var(--display-font), Georgia, serif;
  font-weight: 700;
  font-size: clamp(2.1rem, 6vw, 3.1rem);
  line-height: 1.08;
  letter-spacing: -0.015em;
  text-wrap: balance;
  margin: 0 0 12px;
}
.syn-standfirst {
  font-family: var(--display-font), Georgia, serif;
  font-size: clamp(1.02rem, 2.4vw, 1.2rem);
  line-height: 1.5;
  color: var(--graphite);
  max-width: 38em;
  margin: 0;
}
.syn-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 26px;
  margin-top: 26px;
  font-family: var(--mono-font), ui-monospace, Menlo, monospace;
  font-size: 12px;
  color: var(--graphite);
}
.syn-meta b { color: var(--ink); font-weight: 500; }

.syn section { margin-top: 48px; }
.syn-sec-head {
  display: grid;
  grid-template-columns: 2.4rem 1fr;
  align-items: baseline;
  gap: 0 14px;
  border-bottom: 1px solid var(--rule);
  padding-bottom: 8px;
  margin-bottom: 20px;
}
.syn-sec-num {
  font-family: var(--mono-font), ui-monospace, Menlo, monospace;
  font-size: 12px;
  font-weight: 600;
  color: var(--examiner);
  letter-spacing: 0.04em;
}
.syn h2 {
  font-family: var(--display-font), Georgia, serif;
  font-weight: 600;
  font-size: clamp(1.3rem, 3.2vw, 1.6rem);
  line-height: 1.2;
  margin: 0;
  text-wrap: balance;
}
.syn-indent { padding-left: 0; }
@media (min-width: 42rem) { .syn-indent { padding-left: calc(2.4rem + 14px); } }

.syn p { margin: 0 0 15px; max-width: 65ch; }
.syn h3 {
  font-family: var(--body-font), Arial, sans-serif;
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--graphite);
  margin: 26px 0 10px;
}
.syn strong { font-weight: 600; }
.syn-num { font-family: var(--mono-font), ui-monospace, Menlo, monospace; font-variant-numeric: tabular-nums; font-size: 0.94em; }
.syn-term { font-family: var(--mono-font), ui-monospace, Menlo, monospace; font-size: 0.86em; background: var(--surface-2); padding: 1px 5px; border-radius: 3px; }

.syn-list { list-style: none; margin: 0 0 15px; padding: 0; display: flex; flex-direction: column; gap: 11px; }
.syn-list > li { display: grid; grid-template-columns: 1.1rem 1fr; gap: 10px; max-width: 66ch; }
.syn-list > li::before { content: "\\2014"; font-family: var(--mono-font), monospace; color: var(--examiner); line-height: 1.6; }

.syn-modules { display: flex; flex-direction: column; margin-bottom: 8px; }
.syn-module { display: grid; gap: 4px; padding: 16px 0; border-top: 1px solid var(--rule); }
.syn-module:last-child { border-bottom: 1px solid var(--rule); }
.syn-module .syn-name { font-family: var(--display-font), Georgia, serif; font-weight: 600; font-size: 1.06rem; }
.syn-module .syn-what { color: var(--graphite); max-width: 64ch; margin: 0; }

.syn-pipe { display: flex; flex-wrap: wrap; align-items: stretch; gap: 8px; margin: 4px 0 20px; }
.syn-pipe .syn-step {
  flex: 1 1 8rem;
  min-width: 0;
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: 2px;
  padding: 11px 13px;
}
.syn-pipe .syn-k {
  font-family: var(--mono-font), ui-monospace, Menlo, monospace;
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--examiner);
  display: block;
  margin-bottom: 3px;
}
.syn-pipe .syn-v { font-size: 0.9rem; line-height: 1.4; display: block; }
.syn-arrow { align-self: center; font-family: var(--mono-font), monospace; color: var(--graphite); flex: 0 0 auto; }
@media (max-width: 41.99rem) { .syn-arrow { display: none; } }

.syn-finding {
  background: var(--surface);
  border: 1px solid var(--rule);
  border-left: 3px solid var(--examiner);
  border-radius: 2px;
  padding: 18px 20px;
  margin: 4px 0 18px;
}
.syn-table-wrap { overflow-x: auto; margin: 12px 0 4px; }
.syn table {
  border-collapse: collapse;
  width: 100%;
  min-width: 24rem;
  font-family: var(--mono-font), ui-monospace, Menlo, monospace;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}
.syn caption { text-align: left; font-family: var(--body-font), Arial, sans-serif; font-size: 12px; color: var(--graphite); padding-bottom: 8px; }
.syn th, .syn td { text-align: right; padding: 6px 10px; border-bottom: 1px solid var(--rule); }
.syn th:first-child, .syn td:first-child { text-align: left; }
.syn thead th { color: var(--graphite); font-weight: 500; font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; }
.syn td.syn-off { color: var(--examiner); font-weight: 600; }
.syn tfoot td { border-bottom: none; padding-top: 9px; color: var(--graphite); }
.syn-pen {
  font-family: var(--pen-font), cursive;
  font-size: 1.22rem;
  color: var(--examiner);
  display: block;
  margin-top: 10px;
  transform: rotate(-1.1deg);
  transform-origin: left center;
}

.syn-stack { display: grid; grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr)); gap: 18px 26px; margin-bottom: 8px; }
.syn-stack dt {
  font-family: var(--mono-font), ui-monospace, Menlo, monospace;
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--graphite);
  margin-bottom: 4px;
}
.syn-stack dd { margin: 0; font-size: 0.93rem; line-height: 1.5; min-width: 0; }

.syn-counts { display: grid; grid-template-columns: repeat(auto-fit, minmax(7.5rem, 1fr)); gap: 1px; border: 1px solid var(--rule); border-radius: 2px; overflow: hidden; background: var(--rule); margin: 4px 0 18px; }
.syn-counts > div { background: var(--surface); padding: 13px 14px; }
.syn-counts .syn-n { font-family: var(--mono-font), ui-monospace, Menlo, monospace; font-size: 1.22rem; font-weight: 600; font-variant-numeric: tabular-nums; display: block; line-height: 1.2; }
.syn-counts .syn-l { font-size: 11px; color: var(--graphite); letter-spacing: 0.03em; display: block; margin-top: 3px; }

.syn-status { display: flex; flex-direction: column; gap: 12px; margin: 0 0 15px; }
.syn-status .syn-row { display: grid; grid-template-columns: 1.3rem 1fr; gap: 10px; align-items: start; max-width: 66ch; }
.syn-mark { font-family: var(--mono-font), ui-monospace, Menlo, monospace; font-size: 13px; font-weight: 600; line-height: 1.55; }
.syn-mark.syn-ok { color: var(--tick); }
.syn-mark.syn-gap { color: var(--examiner); }

.syn-footer {
  margin-top: 52px;
  padding-top: 18px;
  border-top: 1px solid var(--rule);
  font-family: var(--mono-font), ui-monospace, Menlo, monospace;
  font-size: 11px;
  color: var(--graphite);
  line-height: 1.7;
}
@media print {
  .syn-page { background: #fff; min-height: 0; }
  .syn-finding, .syn-pipe .syn-step, .syn-counts > div { background: #fff; }
}
`;

export default function SynopsisPage() {
  return (
    <div className="syn-page">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <main id="main-content" tabIndex={-1} className="syn">
        <header className="syn-masthead">
          <p className="syn-eyebrow">Project synopsis · BCA / AI-DS</p>
          <h1>GetAhead AI</h1>
          <p className="syn-standfirst">
            An exam answer-sheet evaluation platform that returns a question-by-question mark breakdown with its reasoning quoted from
            the student&apos;s own working, rather than a single score at the top of the page.
          </p>
          <div className="syn-meta">
            <span><b>Domain</b> Educational AI / assessment</span>
            <span><b>Built</b> Jul–Sep 2026</span>
            <span><b>Status</b> Deployed, beta</span>
          </div>
        </header>

        <section>
          <div className="syn-sec-head"><span className="syn-sec-num">01</span><h2>Problem</h2></div>
          <div className="syn-indent">
            <p>
              A school teacher in India marks thirty to sixty answer sheets per class test. Marking is slow, and what returns to the
              student is usually a total and a tick or cross per question. The student learns the score but not which step cost the mark,
              and by the time the sheet comes back the test has moved two chapters into the past.
            </p>
            <p>
              Existing AI grading tools return a number. A number cannot be checked, argued with, or learned from. The harder and more
              useful problem is producing a mark that is <strong>auditable</strong>: traceable to a specific line the student wrote,
              against a stated mark scheme.
            </p>
          </div>
        </section>

        <section>
          <div className="syn-sec-head"><span className="syn-sec-num">02</span><h2>Objectives</h2></div>
          <div className="syn-indent">
            <ul className="syn-list">
              <li>Accept a photographed or scanned answer sheet (PDF, PNG, JPEG) and grade each question independently against the marks printed on the paper.</li>
              <li>Ground every judgement: each mark carries a verbatim quote from that question&apos;s own answer, so a teacher can verify it without re-reading the sheet.</li>
              <li>Distinguish honest outcomes — a blank answer, an illegible answer, and a wrong answer are three different things and must not be collapsed into one.</li>
              <li>Generate practice question papers with a full mark scheme from a subject, grade, topic and difficulty.</li>
              <li>Keep the system usable under a free-tier AI quota, and make its behaviour reproducible from the user&apos;s point of view despite a non-deterministic model.</li>
            </ul>
          </div>
        </section>

        <section>
          <div className="syn-sec-head"><span className="syn-sec-num">03</span><h2>System design</h2></div>
          <div className="syn-indent">
            <p>
              A Next.js application with server-side route handlers, a MySQL database through Prisma, and Google Gemini 2.5 Flash as the
              only model. Evaluation is deliberately split into two stages so that reading the sheet and judging it are separate,
              individually testable steps.
            </p>

            <h3>Evaluation pipeline</h3>
            <div className="syn-pipe">
              <div className="syn-step"><span className="syn-k">Stage 1</span><span className="syn-v">Extract — per-question text, marks available, and answer status: readable, blank or unreadable</span></div>
              <span className="syn-arrow">→</span>
              <div className="syn-step"><span className="syn-k">Stage 2</span><span className="syn-v">Grade — one batched call for the whole sheet, judging each question in isolation</span></div>
              <span className="syn-arrow">→</span>
              <div className="syn-step"><span className="syn-k">Stage 3</span><span className="syn-v">Validate in code — bounds, grounding quote, full marks for a correct answer</span></div>
            </div>
            <p>
              The validation stage is ordinary code, not a second model call. A grade is rejected if marks fall outside{" "}
              <span className="syn-num">0…marks available</span>, if the grounding quote is not a verbatim substring of that
              question&apos;s extracted answer, or if a question labelled correct was not awarded full marks. Totals are always the sum of
              the questions actually graded, never a declared denominator; an unreadable answer leaves the denominator, while a blank
              answer scores zero and stays in it, exactly as on a real marked script.
            </p>

            <h3>Paper generation pipeline</h3>
            <div className="syn-pipe">
              <div className="syn-step"><span className="syn-k">Agent 1</span><span className="syn-v">Planner — allocates questions and marks across sections to hit the target total</span></div>
              <span className="syn-arrow">→</span>
              <div className="syn-step"><span className="syn-k">Agent 2</span><span className="syn-v">Generator — writes questions and the mark scheme to that plan</span></div>
              <span className="syn-arrow">→</span>
              <div className="syn-step"><span className="syn-k">Agent 3</span><span className="syn-v">Reviewer — audits options, answers and marks, then a validate-and-repair pass</span></div>
            </div>
            <p>
              Because a three-agent run outlives a serverless invocation, it is a durable step machine in the database rather than one
              long request: a job row records its current step (<span className="syn-term">planner → generator → reviewer → validate → done</span>),
              retries a failed step up to three times, and a sweep reclaims a job whose worker died mid-step instead of leaving it stuck.
            </p>
          </div>
        </section>

        <section>
          <div className="syn-sec-head"><span className="syn-sec-num">04</span><h2>Modules</h2></div>
          <div className="syn-indent">
            <div className="syn-modules">
              <div className="syn-module">
                <span className="syn-name">Answer-sheet evaluation</span>
                <p className="syn-what">Direct-to-storage upload, queued job, two-stage grading, and a report showing per-question marks, correct and incorrect points, the error category, the topic, and the grounding quote.</p>
              </div>
              <div className="syn-module">
                <span className="syn-name">Question paper generation</span>
                <p className="syn-what">Planner / Generator / Reviewer agents behind a live progress view, producing a printable paper with its mark scheme.</p>
              </div>
              <div className="syn-module">
                <span className="syn-name">AI tutor</span>
                <p className="syn-what">A streaming tutor scoped to one evaluation and grounded in that student&apos;s own transcribed answers, with quiz and flashcard modes built from the questions they actually got wrong.</p>
              </div>
              <div className="syn-module">
                <span className="syn-name">Analytics</span>
                <p className="syn-what">Subject-wise averages, score trend over time, and a topic breakdown that names which topics are costing marks across every evaluation on the account.</p>
              </div>
              <div className="syn-module">
                <span className="syn-name">Governance and operations</span>
                <p className="syn-what">Per-user daily quotas, a shared model-quota pre-flight gate, a spend kill-switch, rate limiting, audit and error logs, per-call model logging, and four scheduled sweeps.</p>
              </div>
              <div className="syn-module">
                <span className="syn-name">Admin and support</span>
                <p className="syn-what">Operator console for users, evaluations, papers, quota, spend, health and logs, plus a support ticket system with replies and internal notes.</p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="syn-sec-head"><span className="syn-sec-num">05</span><h2>Engineering contributions</h2></div>
          <div className="syn-indent">
            <p>Four problems in this build were not solved by prompting, and are the substance of the project.</p>

            <h3>A. Making a non-deterministic grader behave reproducibly</h3>
            <div className="syn-finding">
              <p style={{ marginBottom: 4 }}>
                The Gemini Developer API exposes no <span className="syn-term">seed</span> parameter, and{" "}
                <span className="syn-num">temperature 0</span> does not guarantee a repeatable response. Holding one answer sheet, one
                extraction and one prompt fixed, four live gradings produced:
              </p>
              <div className="syn-table-wrap">
                <table>
                  <caption>Same sheet, same prompt, temperature 0 — marks awarded per question</caption>
                  <thead>
                    <tr>
                      <th scope="col">Run</th>
                      <th scope="col">Q1 /5</th>
                      <th scope="col">Q2 /4</th>
                      <th scope="col">Q3 /5</th>
                      <th scope="col">Q4 /5</th>
                      <th scope="col">Q5 /6</th>
                      <th scope="col">Total /25</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><th scope="row">1</th><td>5</td><td>2</td><td>2</td><td>2</td><td>6</td><td>17</td></tr>
                    <tr><th scope="row">2</th><td>5</td><td>2</td><td className="syn-off">1</td><td className="syn-off">1</td><td>6</td><td className="syn-off">15</td></tr>
                    <tr><th scope="row">3</th><td>5</td><td>2</td><td>2</td><td>2</td><td>6</td><td>17</td></tr>
                    <tr><th scope="row">4</th><td>5</td><td>2</td><td>2</td><td>2</td><td>6</td><td>17</td></tr>
                  </tbody>
                  <tfoot>
                    <tr><td colSpan={7}>Spread: 2 marks on the paper; Q3 moved on an unambiguous error — the answer calls the reaction exothermic and then says energy is absorbed.</td></tr>
                  </tfoot>
                </table>
              </div>
              <span className="syn-pen">not a borderline call — a clear-cut one moved</span>
            </div>
            <p>
              Grading the same file twice is also the one thing a free-tier quota cannot afford, so a median-of-five vote was priced and
              rejected: at one extraction plus five gradings per sheet it would cut the whole deployment to roughly three evaluations a
              day. The fix is a content-addressed grading cache instead. A sheet&apos;s result is keyed by a hash of the file bytes,
              subject, grade, exam type, both prompt versions and the model id, so an identical submission is graded once and thereafter
              served from the stored result. A prompt or model change misses the cache by construction. Re-evaluation remains available
              as an explicit action that states up front that the marks may differ, and the report says when a stored result was reused
              rather than hiding it.
            </p>

            <h3>B. A regression suite that runs on zero API calls</h3>
            <p>
              The free tier allows <span className="syn-num">20</span> model requests per day for the entire project, which makes a live
              test suite impossible. Every model call is therefore recorded into a content-addressed replay cache keyed on its exact
              rendered prompt, so continuous integration replays real recorded responses and makes no network call at all. A prompt
              change naturally invalidates its recordings instead of silently replaying a stale answer, and re-recording can be scoped to
              the stage that actually changed — five calls instead of eleven.
            </p>

            <h3>C. Expectations that come from marking, never from output</h3>
            <p>
              Every expected value in the suite comes from marking the fixture by hand. This is enforced structurally, because it had
              already failed twice: a fixture&apos;s expected total had once been quietly moved to match a buggy run. The fixture
              generator now has no code path that can write an answer key, the committed keys are the sole source of truth, and a CI job
              runs the generator and fails the build if a single byte of any answer key changes.
            </p>

            <h3>D. Method marks versus accuracy marks</h3>
            <p>
              That discipline paid for itself. The suite stayed red for three weeks because the grader scored a fixture{" "}
              <span className="syn-num">10/15</span> where hand marking gave <span className="syn-num">7/15</span> — per question{" "}
              <span className="syn-num">3/4/3</span> against <span className="syn-num">3/2/2</span>, consistently a mark or two generous
              whenever the method was right and the final answer wrong. The band was correct and the rubric was incomplete: it awarded
              partial credit without ever saying that a wrong final answer forfeits the accuracy marks and keeps only the method marks,
              the distinction every board mark scheme draws. Adding that rule — with an explicit floor, so a wrong answer still earns
              credit for what was right instead of collapsing to zero — brought the grader onto the hand-marked total exactly.
            </p>
          </div>
        </section>

        <section>
          <div className="syn-sec-head"><span className="syn-sec-num">06</span><h2>Technology</h2></div>
          <div className="syn-indent">
            <dl className="syn-stack">
              <div><dt>Framework</dt><dd>Next.js 16.3 (App Router), React 19, TypeScript 5</dd></div>
              <div><dt>Model</dt><dd>Google Gemini 2.5 Flash, structured JSON output with response schemas</dd></div>
              <div><dt>Data</dt><dd>MySQL on Aiven via Prisma 6.19 — 22 models, 10 migrations</dd></div>
              <div><dt>Auth</dt><dd>NextAuth 4.24, encrypted JWT sessions (15 min), bcrypt cost 12</dd></div>
              <div><dt>Storage</dt><dd>Vercel Blob with per-user path scoping, direct client upload</dd></div>
              <div><dt>Interface</dt><dd>Tailwind CSS v4 tokens, Recharts, Framer Motion</dd></div>
              <div><dt>Validation</dt><dd>Zod on every route; Vitest for unit and regression tests</dd></div>
              <div><dt>Operations</dt><dd>Vercel hosting and cron, Sentry with content scrubbing, Resend email</dd></div>
            </dl>
            <div className="syn-counts">
              <div><span className="syn-n">31,400</span><span className="syn-l">lines TS / TSX</span></div>
              <div><span className="syn-n">47</span><span className="syn-l">API routes</span></div>
              <div><span className="syn-n">29</span><span className="syn-l">pages</span></div>
              <div><span className="syn-n">22</span><span className="syn-l">data models</span></div>
              <div><span className="syn-n">178</span><span className="syn-l">tests, 17 files</span></div>
              <div><span className="syn-n">5</span><span className="syn-l">CI workflows</span></div>
            </div>
          </div>
        </section>

        <section>
          <div className="syn-sec-head"><span className="syn-sec-num">07</span><h2>Testing and validation</h2></div>
          <div className="syn-indent">
            <p>
              Six regression fixtures cover the behaviours that matter: a fully correct paper that must not lose a mark, a paper with
              three planted arithmetic slips, a chemistry paper with three planted conceptual errors, an answer carrying an embedded
              prompt-injection attempt that must not be rewarded, an edge-case paper combining a blank answer with an unusual but valid
              method, and a blank page that must be refused rather than graded. All six replay in CI with no live call.
            </p>
            <p>
              A separate accuracy harness scores the pipeline against a golden set of real, photographed, teacher-marked sheets and
              refuses to write a baseline from fewer than thirty cases. Security scanning and dependency review run on every change.
            </p>
          </div>
        </section>

        <section>
          <div className="syn-sec-head"><span className="syn-sec-num">08</span><h2>Current status</h2></div>
          <div className="syn-indent">
            <div className="syn-status">
              <div className="syn-row"><span className="syn-mark syn-ok">✓</span><span>Deployed and running. Full suite green at 178 tests with zero live API calls.</span></div>
              <div className="syn-row"><span className="syn-mark syn-ok">✓</span><span>On the chemistry fixture the grader now lands on the hand-marked total exactly — <span className="syn-num">16/25</span>, with both fully-correct questions at full marks.</span></div>
              <div className="syn-row"><span className="syn-mark syn-ok">✓</span><span>Privacy and consent in place: a DPDP-aligned notice, recorded affirmative consent at signup, and deletion that reaches the uploaded files and the cached grading, not just the database rows.</span></div>
              <div className="syn-row"><span className="syn-mark syn-gap">!</span><span>No accuracy figure is published yet. The marketing page is built to display one and deliberately hides it until a real golden-set run exists, rather than printing an estimate.</span></div>
              <div className="syn-row"><span className="syn-mark syn-gap">!</span><span>Every regression fixture is a text-layer PDF, so the suite exercises grading rather than reading. The handwriting and phone-photograph path — the product&apos;s primary input — has no automated coverage.</span></div>
              <div className="syn-row"><span className="syn-mark syn-gap">!</span><span>The free model tier caps the entire deployment at roughly ten evaluations a day, and its terms permit the provider to use submitted content for product improvement, which is unsuitable for students&apos; answer sheets.</span></div>
            </div>
          </div>
        </section>

        <section>
          <div className="syn-sec-head"><span className="syn-sec-num">09</span><h2>Future scope</h2></div>
          <div className="syn-indent">
            <ul className="syn-list">
              <li>Move to the paid model tier, which removes the daily ceiling and the content-reuse terms in one step. This is the highest-priority item.</li>
              <li>Add photographed handwritten fixtures with independently marked ground truth, then publish the measured accuracy figure with its sample size and methodology.</li>
              <li>Bulk upload, so a teacher can submit a class set instead of one sheet at a time.</li>
              <li>Verifiable parental consent once the statutory mechanisms are practical, replacing the current self-declaration.</li>
              <li>A self-service data-export endpoint for the portability right the policy already grants.</li>
            </ul>
          </div>
        </section>

        <section>
          <div className="syn-sec-head"><span className="syn-sec-num">10</span><h2>Conclusion</h2></div>
          <div className="syn-indent">
            <p>
              The working system is a Next.js platform that grades an answer sheet question by question and shows its reasoning. The part
              worth defending is narrower and more interesting: a language model asked to mark an exam is neither repeatable nor reliably
              fair, and treating it as if it were produces marks that cannot be checked. This build answers that with code rather than
              prompting — validation gates that reject an ungrounded mark, a cache that makes one sheet&apos;s result stable, a test suite
              whose expectations come only from hand marking, and a rubric that encodes how marks are actually awarded. The measured
              variance and the untested handwriting path are stated here as findings, because a grading system that hides its own
              uncertainty is the thing this project set out not to build.
            </p>
          </div>
        </section>

        <footer className="syn-footer">
          GetAhead AI · exam answer-sheet evaluation · 72 commits, 6 July – 10 September 2026
          <br />
          Figures in this synopsis were read from the repository and its test runs, not estimated.
        </footer>
      </main>
    </div>
  );
}
