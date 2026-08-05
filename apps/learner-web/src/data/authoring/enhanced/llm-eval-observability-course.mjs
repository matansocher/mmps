// LLM Eval & Observability — enhanced interactive course
// Authored per _SPEC.md. Self-contained ES module.

const lessons = [];
const quizzes = [];

lessons.push({
  id: 'intro',
  group: 'Foundations',
  nav: '0 · Overview',
  title: 'Why eval & observability is the whole game',
  lede: 'Shipping an LLM feature is easy. Knowing whether it is good, staying good, and getting better is the hard part — and it is an engineering discipline, not a vibe.',
  html: `
    <p>Anyone can wire a prompt to an API and get a demo working in an afternoon. The thing that separates a toy from a product is a brutal question: <strong>is it actually good, and how would you even know?</strong> Traditional software has a binary oracle — the test passes or it fails. LLM systems have no such oracle. The same input can produce different outputs, "correct" is fuzzy, and quality silently rots as models, prompts, and data drift underneath you.</p>

    <p><span class='kicker'>Eval</span> answers "how good is it?" — measuring output quality against a bar. <span class='kicker'>Observability</span> answers "what is it actually doing in production?" — tracing every request so you can debug, attribute cost, and catch regressions. You need both: eval without observability is theater; observability without eval is a firehose of data with no verdict.</p>

    <div class='diagram'>
      <svg viewBox='0 0 640 210' width='640'>
        <defs><marker id='arrow' markerWidth='10' markerHeight='10' refX='8' refY='3' orient='auto'><path d='M0,0 L8,3 L0,6 Z' fill='#8b98a9'/></marker></defs>
        <rect class='node-box' x='20' y='30' width='150' height='54' rx='8'/>
        <text class='node-text' x='95' y='54' text-anchor='middle'>Build / change</text>
        <text class='node-sub' x='95' y='72' text-anchor='middle'>prompt · model · RAG</text>
        <line class='edge' x1='170' y1='57' x2='250' y2='57' marker-end='url(#arrow)'/>
        <rect class='node-box worker' x='250' y='30' width='150' height='54' rx='8'/>
        <text class='node-text' x='325' y='54' text-anchor='middle'>Evaluate</text>
        <text class='node-sub' x='325' y='72' text-anchor='middle'>offline test set</text>
        <line class='edge' x1='400' y1='57' x2='480' y2='57' marker-end='url(#arrow)'/>
        <rect class='node-box' x='480' y='30' width='140' height='54' rx='8'/>
        <text class='node-text' x='550' y='60' text-anchor='middle'>Ship</text>
        <line class='edge' x1='550' y1='84' x2='550' y2='130' marker-end='url(#arrow)'/>
        <rect class='node-box tool' x='470' y='130' width='160' height='54' rx='8'/>
        <text class='node-text' x='550' y='154' text-anchor='middle'>Observe in prod</text>
        <text class='node-sub' x='550' y='172' text-anchor='middle'>traces · online evals</text>
        <line class='edge' x1='470' y1='157' x2='95' y2='157' marker-end='url(#arrow)'/>
        <line class='edge' x1='95' y1='157' x2='95' y2='84' marker-end='url(#arrow)'/>
        <text class='edge-label' x='280' y='150' text-anchor='middle'>findings feed next change</text>
      </svg>
      <div class='diagram-caption'>The eval-driven development (EDD) loop: every change is gated by evals, and production observations become tomorrow's test cases.</div>
    </div>

    <h3>The mental model: treat quality like a metric you can move</h3>
    <p>Great teams run <span class='kicker'>eval-driven development</span> — the LLM analog of TDD. Before you tweak a prompt, you have a test set and a score. After the tweak, you re-score. If the number went down, you don't ship, no matter how good the change "felt". This turns arguing about prompts (subjective, endless) into moving a number (objective, fast).</p>

    <div class='callout warn'>
      <div class='c-title'>War story: the "obvious improvement" that wasn't</div>
      A team added a polite preamble to their support-bot prompt. It read better to everyone on the team. Their eval set showed a <strong>7% drop</strong> in answer-correctness because the preamble pushed the retrieved context further from the question and the model started ignoring it. Without the eval set, they'd have shipped a regression and blamed it on "the model getting worse".
    </div>

    <h3>What you'll be able to do after this course</h3>
    <ul>
      <li>Design an offline eval harness with the right metrics for the task (not just BLEU on everything).</li>
      <li>Use LLM-as-judge without fooling yourself — knowing its biases and how to calibrate it.</li>
      <li>Reason about statistical significance so you don't ship noise as signal.</li>
      <li>Instrument production with traces/spans, run online evals, and build guardrails.</li>
      <li>Catch drift and regressions before your users (and your CEO) do.</li>
    </ul>

    <div class='callout'>
      <div class='c-title'>Interview soundbite</div>
      "Eval measures how good the output is; observability shows what the system actually did. Eval-driven development gates every change on an offline score, and production traces become new test cases — that closed loop is what keeps an LLM product from silently rotting."
    </div>
  `,
});

lessons.push({
  id: 'why-hard',
  group: 'Foundations',
  nav: '1 · Why it is hard',
  title: 'Why evaluating LLMs is genuinely hard',
  lede: 'It is not that we are lazy — the medium fights back. Non-determinism, fuzzy correctness, and open-ended outputs break every assumption from classic testing.',
  html: `
    <p>If you come from classic software testing, your instincts will betray you here. Let's enumerate exactly <em>why</em>, because interviewers love this question — it separates people who've shipped LLM systems from people who've read about them.</p>

    <table>
      <tr><th>Difficulty</th><th>What breaks</th><th>Consequence</th></tr>
      <tr><td><strong>No single correct answer</strong></td><td>"Summarize this" has infinitely many good outputs</td><td>Exact-match assertions are useless; you need semantic or judged scoring</td></tr>
      <tr><td><strong>Non-determinism</strong></td><td>Same input → different output, even at temperature 0</td><td>A test can pass then fail with zero code changes</td></tr>
      <tr><td><strong>Fuzzy correctness</strong></td><td>Outputs are "80% right", partially hallucinated</td><td>Binary pass/fail hides most of the signal</td></tr>
      <tr><td><strong>Multi-dimensional quality</strong></td><td>Correct but rude, accurate but verbose, safe but useless</td><td>One score can't capture it — you need a rubric of dimensions</td></tr>
      <tr><td><strong>Expensive ground truth</strong></td><td>Labeling needs domain experts and time</td><td>Test sets stay small; every example is precious</td></tr>
      <tr><td><strong>Moving target</strong></td><td>Providers silently update models; your data shifts</td><td>Yesterday's passing eval fails today for external reasons</td></tr>
    </table>

    <h3>The temperature=0 myth</h3>
    <p>Engineers assume <code>temperature=0</code> gives determinism. It usually doesn't, for reasons below the API surface:</p>
    <ul>
      <li><strong>Floating-point non-associativity:</strong> GPU kernels sum in nondeterministic order; <code>(a+b)+c != a+(b+c)</code> at the bit level. Tiny differences flip the argmax on near-tied tokens.</li>
      <li><strong>MoE routing:</strong> mixture-of-experts models (GPT-4-class, Mixtral) route tokens to experts based on batch composition — <em>who else is in your batch</em> changes your output.</li>
      <li><strong>Backend changes:</strong> the provider swaps hardware, quantization, or kernels without telling you.</li>
    </ul>

    <div class='callout danger'>
      <div class='c-title'>Gotcha: chasing bit-for-bit determinism is a trap</div>
      Don't waste weeks trying to make outputs identical. Accept variance and <strong>measure it</strong>: run each eval case 3–5 times, report mean and spread. If your metric's noise band is wider than the improvement you're claiming, you haven't improved anything — you've observed sampling noise.
    </div>

    <h3>Correctness is a distribution, not a point</h3>
    <p>The right frame: an LLM defines a probability distribution over outputs. A single call is one sample. Evaluating on one sample is like judging a dice as "a 4". You must sample repeatedly and reason about the distribution — which is exactly why statistical rigor (a later lesson) matters so much.</p>

    <div class='callout'>
      <div class='c-title'>Interview soundbite</div>
      "LLM eval is hard because there's no oracle: outputs are non-deterministic even at temp 0 (FP non-associativity, MoE batch routing), correctness is fuzzy and multi-dimensional, ground truth is expensive, and the model itself is a moving target. So you measure distributions, not points."
    </div>
  `,
});

lessons.push({
  id: 'taxonomy',
  group: 'Foundations',
  nav: '2 · A map of eval',
  title: 'The evaluation taxonomy: a map you can navigate',
  lede: 'Three axes organize every LLM eval technique. Learn the map once and you can place any tool, metric, or interview question instantly.',
  html: `
    <p>The eval landscape looks chaotic until you see the three axes that structure it. Any technique — BLEU, RAGAS, LLM-as-judge, a thumbs-up button — is just a coordinate in this space.</p>

    <div class='diagram'>
      <svg viewBox='0 0 640 230' width='640'>
        <rect class='node-box' x='30' y='20' width='250' height='60' rx='8'/>
        <text class='node-text' x='155' y='44' text-anchor='middle'>Axis 1 · When</text>
        <text class='node-sub' x='155' y='64' text-anchor='middle'>Offline (pre-ship) ↔ Online (in prod)</text>
        <rect class='node-box worker' x='30' y='90' width='250' height='60' rx='8'/>
        <text class='node-text' x='155' y='114' text-anchor='middle'>Axis 2 · Ground truth</text>
        <text class='node-sub' x='155' y='134' text-anchor='middle'>Reference-based ↔ Reference-free</text>
        <rect class='node-box tool' x='30' y='160' width='250' height='60' rx='8'/>
        <text class='node-text' x='155' y='184' text-anchor='middle'>Axis 3 · Scope</text>
        <text class='node-sub' x='155' y='204' text-anchor='middle'>Component ↔ End-to-end system</text>
        <rect class='node-box' x='330' y='60' width='280' height='110' rx='8'/>
        <text class='node-text' x='470' y='90' text-anchor='middle'>Any technique = one point</text>
        <text class='node-sub' x='470' y='112' text-anchor='middle'>e.g. RAGAS faithfulness =</text>
        <text class='node-sub' x='470' y='130' text-anchor='middle'>offline · reference-free · component</text>
        <text class='node-sub' x='470' y='150' text-anchor='middle'>Arena thumbs-up =</text>
        <text class='node-sub' x='470' y='168' text-anchor='middle'>online · reference-free · system</text>
      </svg>
      <div class='diagram-caption'>Three axes place every eval method. Naming the coordinates is half of sounding senior in an interview.</div>
    </div>

    <h3>Axis 1 — Offline vs Online</h3>
    <p><strong>Offline</strong> runs before shipping, on a fixed test set, in CI. Fast, cheap, repeatable, but only as good as your test set's coverage. <strong>Online</strong> runs on live traffic — real distribution, real stakes, but noisy and you can only measure what users reveal.</p>

    <h3>Axis 2 — Reference-based vs Reference-free</h3>
    <p><strong>Reference-based</strong> compares output to a known-good answer (needs labels; enables exact-match, BLEU, ROUGE, semantic similarity). <strong>Reference-free</strong> judges the output on its own merits or against its inputs (LLM-as-judge, RAGAS faithfulness, toxicity classifiers) — no labels needed, scales to production.</p>

    <h3>Axis 3 — Component vs System</h3>
    <p>A RAG pipeline has a retriever, a reranker, and a generator. <strong>Component evals</strong> isolate each (retriever recall@k, generator faithfulness) so you know <em>where</em> it broke. <strong>System evals</strong> judge the end-to-end answer the user sees. You need both: system tells you <em>that</em> it's broken, component tells you <em>why</em>.</p>

    <div class='callout good'>
      <div class='c-title'>Rule of thumb</div>
      Debug with <strong>component</strong> evals, decide-to-ship with <strong>system</strong> evals. If your end-to-end score drops, component evals are your bisect tool.
    </div>

    <div class='callout'>
      <div class='c-title'>Interview soundbite</div>
      "Three axes: when (offline vs online), ground truth (reference-based vs reference-free), and scope (component vs system). Every metric is a point in that cube — say the coordinates and you sound like you've built the whole pipeline."
    </div>
  `,
});

lessons.push({
  id: 'deterministic-metrics',
  group: 'Evaluation methods',
  nav: '3 · Deterministic metrics',
  title: 'Deterministic metrics: cheap, fast, and often wrong',
  lede: 'String-overlap and embedding metrics cost nothing and run in milliseconds. Know exactly where they shine and where they lie to you.',
  html: `
    <p>Before reaching for an expensive LLM judge, ask: can a deterministic metric do the job? These are free, instant, and perfectly repeatable — ideal for CI. The catch is they measure <em>surface form</em>, not meaning.</p>

    <h3>The toolbox, from strict to fuzzy</h3>
    <table>
      <tr><th>Metric</th><th>Measures</th><th>Good for</th><th>Fails on</th></tr>
      <tr><td><strong>Exact match</strong></td><td>Byte-identical output</td><td>Classification, structured extraction, math answers</td><td>Any open-ended text</td></tr>
      <tr><td><strong>Regex / assertions</strong></td><td>Pattern presence/absence</td><td>Format checks, forbidden-word bans, must-contain-X</td><td>Semantic correctness</td></tr>
      <tr><td><strong>JSON schema validation</strong></td><td>Structural validity</td><td>Tool-calling, function args, API responses</td><td>Whether the values are <em>right</em></td></tr>
      <tr><td><strong>BLEU / ROUGE</strong></td><td>n-gram overlap with reference</td><td>Translation, summarization (rough signal)</td><td>Paraphrases, synonyms — punishes correct rewordings</td></tr>
      <tr><td><strong>Embedding similarity</strong></td><td>Cosine of sentence vectors</td><td>Semantic "is this close to the reference"</td><td>Negation, precise facts, numbers ("$5" vs "$500")</td></tr>
    </table>

    <div class='callout danger'>
      <div class='c-title'>Why BLEU/ROUGE lie</div>
      BLEU rewards n-gram overlap. "The cat sat on the mat" vs "A feline rested upon the rug" means the same thing and scores near <strong>zero</strong>. Meanwhile "The mat sat on the cat" — nonsense — scores <strong>high</strong> because the words overlap. Never gate a summarization or chat product on BLEU alone.
    </div>

    <h3>Embedding similarity: the reasonable middle ground</h3>
    <p>Encode output and reference with a sentence model (e.g. <code>all-MiniLM-L6-v2</code> from sentence-transformers, 384-dim, ~fast on CPU) and take cosine similarity. It captures paraphrase. But it has sharp edges:</p>
    <pre><code>from sentence_transformers import SentenceTransformer, util
m = SentenceTransformer('all-MiniLM-L6-v2')
a = m.encode('The refund will arrive in 3 business days')
b = m.encode('You will NOT receive a refund')
print(util.cos_sim(a, b))  # ~0.6 — dangerously high despite opposite meaning</code></pre>
    <p>Embeddings smear over <span class='kicker'>negation</span> and <span class='kicker'>precise facts</span>. A "3 days" vs "30 days" answer can look 95% similar while being catastrophically wrong for the user.</p>

    <div class='callout good'>
      <div class='c-title'>Rule of thumb</div>
      Use deterministic metrics as <strong>guardrails and fast filters</strong>, not as your quality verdict. Exact-match/schema for anything structured; embedding similarity as a cheap regression tripwire; escalate the fuzzy stuff to an LLM judge or human.
    </div>

    <div class='pattern-card'>
      <h4>Layered scoring</h4>
      <p>Run the cheap gate first, escalate only failures. Schema-valid? → embedding-close to a golden? → if borderline, send to LLM judge. Cuts judge cost by 5–10x on a passing test set.</p>
      <div class='tag-row'><span class='tag use'>use when high volume + cost matters</span><span class='tag avoid'>avoid when every case needs nuance</span></div>
    </div>

    <div class='callout'>
      <div class='c-title'>Interview soundbite</div>
      "Deterministic metrics are free and repeatable but measure form, not meaning. BLEU punishes paraphrase and rewards word-salad; embedding similarity misses negation and exact facts. I use them as fast CI gates and escalate ambiguous cases to a judge."
    </div>
  `,
});

lessons.push({
  id: 'llm-as-judge',
  group: 'Evaluation methods',
  nav: '4 · LLM-as-judge',
  title: 'LLM-as-a-judge: scalable, powerful, and biased',
  lede: 'Using a strong model to grade outputs is the workhorse of modern eval. It also has systematic biases that will fool you if you do not defend against them.',
  html: `
    <p>The breakthrough idea: use a capable model (GPT-4-class, Claude) to score outputs against a rubric. It approximates human judgment at a fraction of the cost and scales to thousands of cases. Research (MT-Bench, Zheng et al. 2023) found strong judges agree with human preferences <strong>~80%+</strong> of the time — roughly the rate humans agree with each other. But a judge is a model, and models have biases.</p>

    <h3>Three modes of judging</h3>
    <table>
      <tr><th>Mode</th><th>Prompt</th><th>Best for</th></tr>
      <tr><td><strong>Direct scoring</strong></td><td>"Rate this answer 1–5 on faithfulness"</td><td>Absolute quality, monitoring dashboards</td></tr>
      <tr><td><strong>Pairwise</strong></td><td>"Is answer A or B better?"</td><td>Comparing two prompts/models; more reliable than absolute scores</td></tr>
      <tr><td><strong>Reference-guided</strong></td><td>"Given this gold answer, grade the candidate"</td><td>When you have labels and want grounded grading</td></tr>
    </table>
    <div class='callout good'>
      <div class='c-title'>Rule of thumb</div>
      Humans (and judges) are far better at <strong>comparing</strong> than at assigning absolute scores. Prefer pairwise when you can; it has lower variance and clearer signal.
    </div>

    <h3>The bias rogues' gallery</h3>
    <table>
      <tr><th>Bias</th><th>What happens</th><th>Mitigation</th></tr>
      <tr><td><strong>Position bias</strong></td><td>Prefers whichever answer is shown first (or second)</td><td>Run both orders, average; only count if verdict is consistent</td></tr>
      <tr><td><strong>Verbosity bias</strong></td><td>Longer answers score higher regardless of quality</td><td>Add "ignore length" to rubric; normalize; penalize fluff explicitly</td></tr>
      <tr><td><strong>Self-preference</strong></td><td>Judge favors outputs from its own model family</td><td>Use a different model family as judge; or a panel</td></tr>
      <tr><td><strong>Sycophancy</strong></td><td>Agrees with assertions embedded in the prompt</td><td>Don't leak the "expected" answer; neutral framing</td></tr>
      <tr><td><strong>Format bias</strong></td><td>Markdown/bullets score higher than plain prose</td><td>Control for format; strip formatting before judging if irrelevant</td></tr>
    </table>

    <h3>Controlling position bias (the code you should know)</h3>
    <pre><code>def pairwise(judge, question, a, b):
    v1 = judge(question, first=a, second=b)   # A then B
    v2 = judge(question, first=b, second=a)   # B then A (swapped)
    if v1 == 'first' and v2 == 'second':
        return 'A'      # A won in both orders — trustworthy
    if v1 == 'second' and v2 == 'first':
        return 'B'      # B won in both orders
    return 'tie'        # inconsistent → position bias detected, call it a tie</code></pre>

    <div class='callout warn'>
      <div class='c-title'>Gotcha: a judge is only as trustworthy as its calibration</div>
      Before you believe a judge, measure its agreement with human labels on a sample — report <strong>Cohen's kappa</strong> (agreement beyond chance). Kappa &gt; 0.6 is decent; &lt; 0.4 means your judge (or rubric) is unreliable and you're grading with a broken ruler. Recalibrate the rubric until kappa is acceptable, then scale.
    </div>

    <h3>Rubric design tips</h3>
    <ul>
      <li>Score <strong>one dimension per call</strong> (faithfulness, then relevance) — combined "overall quality" is mushy and unstable.</li>
      <li>Give the judge a <strong>rubric with explicit anchors</strong> ("5 = every claim supported by context; 1 = fabricated claims").</li>
      <li>Ask for a <strong>rationale before the score</strong> (chain-of-thought lifts judge accuracy).</li>
      <li>Use a <strong>lower temperature</strong> (0–0.3) for the judge to reduce its own variance.</li>
    </ul>

    <div class='callout'>
      <div class='c-title'>Interview soundbite</div>
      "LLM-as-judge scales human-like grading but has systematic biases — position, verbosity, self-preference, sycophancy, format. I mitigate by swapping order and averaging, using a different-family judge, one dimension per call with anchored rubrics, and I validate the judge against human labels with Cohen's kappa before trusting it."
    </div>
  `,
});

lessons.push({
  id: 'statistical-rigor',
  group: 'Evaluation methods',
  nav: '5 · Statistical rigor',
  title: 'Statistical rigor: are you measuring signal or noise?',
  lede: 'A prompt tweak moved your score from 82% to 84%. Real improvement or coin-flip luck? Without confidence intervals you are shipping vibes.',
  html: `
    <p>This is the lesson that separates people who <em>run</em> evals from people who <em>trust</em> them. Every eval score is an estimate from a finite sample. It has uncertainty. If you ignore that uncertainty, you'll ship noise, chase ghosts, and "improve" your way in circles.</p>

    <h3>The core problem: your test set is a sample</h3>
    <p>You measured 84% on 100 examples. The <strong>true</strong> quality (over all possible inputs) could be anywhere in a band around 84%. How wide? For a proportion, the standard error is roughly <code>sqrt(p(1-p)/n)</code>. At p=0.84, n=100 that's ~0.037 — so a 95% confidence interval is about <strong>84% ± 7%</strong>, i.e. [77%, 91%]. Your "82→84" improvement is comfortably inside the noise.</p>

    <div class='callout danger'>
      <div class='c-title'>The 2-point trap</div>
      With a 100-example test set, differences under ~7–10 points are usually <strong>not significant</strong>. Teams routinely celebrate a "2% gain", ship it, and are baffled when production doesn't move. It never moved — they measured noise.
    </div>

    <h3>Bootstrap: confidence intervals without formulas</h3>
    <p>You don't need to remember stats formulas. <span class='kicker'>Bootstrapping</span> gets you a CI empirically: resample your per-example scores with replacement many times, recompute the mean each time, and read off the 2.5th and 97.5th percentiles.</p>
    <pre><code>import numpy as np
scores = np.array(per_example_scores)   # e.g. 0/1 correctness per case
boot = [np.mean(np.random.choice(scores, len(scores), replace=True))
        for _ in range(10000)]
lo, hi = np.percentile(boot, [2.5, 97.5])
print(f'mean={scores.mean():.3f}  95% CI=[{lo:.3f}, {hi:.3f}]')</code></pre>
    <p>Now you report "84% [77%, 91%]" instead of a naked "84%". If two variants' CIs overlap heavily, you cannot claim one is better.</p>

    <h3>Comparing two variants: paired testing</h3>
    <p>Best practice: run both variants on the <strong>same</strong> examples (paired). Then bootstrap the <em>difference</em> per example. If the 95% CI of the difference excludes 0, the improvement is real. Pairing cancels per-example difficulty and dramatically tightens the interval — you'll detect real 3-point gains that an unpaired test would miss.</p>

    <h3>How big should the test set be?</h3>
    <table>
      <tr><th>To reliably detect...</th><th>Roughly need (per variant)</th></tr>
      <tr><td>A 10-point difference</td><td>~100 examples</td></tr>
      <tr><td>A 5-point difference</td><td>~400 examples</td></tr>
      <tr><td>A 2-point difference</td><td>~1,500+ examples</td></tr>
    </table>
    <p>Detecting smaller effects costs quadratically more data. This is why "just make the test set bigger" hits a wall — and why pairing and variance reduction matter.</p>

    <div class='callout warn'>
      <div class='c-title'>Gotcha: peeking / multiple comparisons</div>
      If you check your A/B test 20 times and stop when it looks good, you'll hit a false "significant" result by chance (~64% of the time at 20 peeks). Fix the sample size in advance, or use sequential-testing corrections. Same for testing 10 prompt variants: correct for multiple comparisons (Bonferroni) or you'll crown a lucky loser.
    </div>

    <div class='callout good'>
      <div class='c-title'>Variance reduction tricks</div>
      Run each case <strong>multiple times</strong> and average (kills sampling noise). <strong>Pair</strong> variants on identical inputs. <strong>Stratify</strong> your test set by category so an easy-example reshuffle can't swing the mean.
    </div>

    <div class='callout'>
      <div class='c-title'>Interview soundbite</div>
      "Every eval score is a sample with a confidence interval. On 100 examples, sub-7-point differences are usually noise. I bootstrap CIs, compare variants paired on the same inputs, fix sample size to avoid peeking, and correct for multiple comparisons — so I ship real gains, not lucky ones."
    </div>
  `,
});

lessons.push({
  id: 'datasets',
  group: 'Evaluation methods',
  nav: '6 · Building test sets',
  title: 'Building eval datasets: your test set is the product',
  lede: 'A mediocre metric on a great test set beats a great metric on a garbage one. The dataset is where most of the leverage — and most of the neglect — lives.',
  html: `
    <p>Everyone obsesses over metrics; the test set is the actual bottleneck. A biased or tiny dataset makes every downstream number meaningless. Treat curating it as a first-class engineering task, versioned like code.</p>

    <h3>Four sources, blended</h3>
    <table>
      <tr><th>Source</th><th>Strength</th><th>Weakness</th></tr>
      <tr><td><strong>Golden (expert-labeled)</strong></td><td>High quality, trusted ground truth</td><td>Slow, expensive, small</td></tr>
      <tr><td><strong>Synthetic (LLM-generated)</strong></td><td>Cheap, scalable, fills coverage gaps</td><td>Can inherit the generator's blind spots; needs human spot-check</td></tr>
      <tr><td><strong>Production (real traffic)</strong></td><td>True input distribution</td><td>Needs labeling; privacy/PII handling</td></tr>
      <tr><td><strong>Adversarial (hard cases)</strong></td><td>Surfaces failure modes, prompt injections, edge cases</td><td>Not representative of average traffic — weight separately</td></tr>
    </table>

    <div class='callout good'>
      <div class='c-title'>The flywheel</div>
      Mine <strong>production traces</strong> for interesting/failing cases → label them → add to the test set. Every incident becomes a permanent regression test. This is the single highest-leverage habit in LLM eval: your dataset compounds.
    </div>

    <h3>How many examples to start?</h3>
    <p>Start with <strong>50–100</strong> carefully chosen cases covering your main use cases and known failure modes. That's enough to catch big regressions and iterate fast. Grow toward hundreds/thousands as you need statistical power (see the previous lesson) — but 50 real cases beat 5,000 synthetic near-duplicates.</p>

    <h3>Coverage &gt; volume</h3>
    <p>Deliberately include: happy paths, edge cases, adversarial inputs, different languages/lengths, ambiguous queries, and the categories your users actually hit. Stratify so you can report per-category scores — an aggregate can hide that you tanked a 5%-of-traffic-but-high-value segment.</p>

    <div class='callout danger'>
      <div class='c-title'>Gotcha: never let your test set leak into your prompt</div>
      If you tune prompts by staring at your test set and hand-fixing each failure, you're <strong>overfitting</strong> to it — your score climbs while real quality stalls. Keep a <span class='kicker'>held-out set</span> you look at rarely (or never during iteration) to get an honest read. Rotate in fresh production cases regularly.
    </div>

    <div class='callout warn'>
      <div class='c-title'>Version everything</div>
      Pin a dataset version to every eval run. When a score changes you must know: did the model change, or did the test set change? Untracked dataset edits make eval history uninterpretable.
    </div>

    <div class='callout'>
      <div class='c-title'>Interview soundbite</div>
      "The test set is the product. I blend golden, synthetic, production, and adversarial cases; start with 50–100 covering real failure modes; mine production traces so every incident becomes a regression test; keep a held-out set to avoid overfitting; and version the dataset so score changes are attributable."
    </div>
  `,
});

lessons.push({
  id: 'task-specific',
  group: 'Evaluation methods',
  nav: '7 · Task-specific eval',
  title: 'Task-specific eval: RAG, agents, and friends',
  lede: 'Generic metrics get you 60% of the way. The last 40% comes from evals shaped to your actual task — RAG, agents, classification, summarization each need their own rubric.',
  html: `
    <p>"How good is my LLM app?" is unanswerable in the abstract. A RAG system fails differently from an agent, which fails differently from a classifier. Pick metrics that map to <em>how this task actually breaks</em>.</p>

    <h3>RAG: the RAGAS triad</h3>
    <p>Retrieval-augmented generation has two failure surfaces — retrieval and generation — so evaluate both. The <span class='kicker'>RAGAS</span> framework popularized a reference-free triad:</p>
    <table>
      <tr><th>Metric</th><th>Question it answers</th><th>Catches</th></tr>
      <tr><td><strong>Context relevance</strong></td><td>Did we retrieve the right chunks?</td><td>Bad retriever / chunking</td></tr>
      <tr><td><strong>Faithfulness (groundedness)</strong></td><td>Is the answer supported by the retrieved context?</td><td>Hallucination</td></tr>
      <tr><td><strong>Answer relevance</strong></td><td>Does the answer address the question?</td><td>On-topic-but-useless answers</td></tr>
    </table>
    <div class='callout good'>
      <div class='c-title'>Diagnostic power</div>
      Low context relevance → fix the retriever/embeddings/chunking. High context relevance but low faithfulness → fix the generation prompt (it's ignoring the context). This triad tells you <em>which half</em> to fix.
    </div>

    <h3>Retriever metrics (borrowed from IR)</h3>
    <ul>
      <li><strong>Recall@k</strong> — is the relevant doc in the top k? The single most important RAG retrieval metric.</li>
      <li><strong>MRR</strong> (Mean Reciprocal Rank) — how high is the first relevant doc? Rewards ranking it first.</li>
      <li><strong>NDCG</strong> — graded relevance with position discounting; use when some docs are more relevant than others.</li>
    </ul>

    <h3>Agents: evaluate the trajectory, not just the answer</h3>
    <p>An agent can reach the right answer via a nonsensical path (got lucky) or fail with perfect reasoning (bad tool). So score both the <strong>final outcome</strong> and the <span class='kicker'>trajectory</span>: did it pick the right tools, in a sensible order, with valid arguments, without looping? Track tool-call accuracy, step count vs. optimal, and cost per task.</p>

    <div class='two-col'>
      <div>
        <div class='pattern-card'>
          <h4>Classification / extraction</h4>
          <p>You have ground truth — use it. Precision, recall, F1, confusion matrix. For extraction, field-level exact/fuzzy match.</p>
          <div class='tag-row'><span class='tag use'>use when labels exist</span></div>
        </div>
        <div class='pattern-card'>
          <h4>Summarization</h4>
          <p>Judge faithfulness (no fabrication), coverage (key points kept), conciseness. LLM-judge on a rubric beats ROUGE.</p>
          <div class='tag-row'><span class='tag avoid'>avoid BLEU/ROUGE as sole metric</span></div>
        </div>
      </div>
      <div>
        <div class='pattern-card'>
          <h4>Safety / moderation</h4>
          <p>Precision/recall on a labeled harmful set; track false-positive rate (over-blocking) separately from false-negatives (leaks).</p>
          <div class='tag-row'><span class='tag use'>use a red-team set</span></div>
        </div>
        <div class='pattern-card'>
          <h4>Structured output</h4>
          <p>Schema validity (does it parse?) + value correctness (are fields right?). Two different metrics — don't conflate.</p>
          <div class='tag-row'><span class='tag use'>use for tool calling</span></div>
        </div>
      </div>
    </div>

    <div class='callout'>
      <div class='c-title'>Interview soundbite</div>
      "I match metrics to the task. For RAG I use the RAGAS triad — context relevance, faithfulness, answer relevance — plus recall@k on the retriever, so I know whether retrieval or generation broke. For agents I score the trajectory (tool choice, steps, cost), not just the final answer."
    </div>
  `,
});

lessons.push({
  id: 'benchmarks',
  group: 'Evaluation methods',
  nav: '8 · Public benchmarks',
  title: 'Public benchmarks & leaderboards: useful, and easy to misuse',
  lede: 'MMLU, GPQA, Chatbot Arena, HumanEval — you must know these by name and know exactly what they do and do not tell you about your app.',
  html: `
    <p>Interviewers will name-drop benchmarks to see if you know them and, crucially, whether you understand their limits. A high MMLU score does <strong>not</strong> mean the model is good at <em>your</em> task. Benchmarks are for model selection and research bragging rights; your custom eval set is for product decisions.</p>

    <h3>The benchmarks you must know</h3>
    <table>
      <tr><th>Benchmark</th><th>Tests</th><th>Format</th></tr>
      <tr><td><strong>MMLU</strong></td><td>Broad knowledge, 57 subjects</td><td>Multiple choice</td></tr>
      <tr><td><strong>GPQA</strong></td><td>Graduate-level science (hard, "Google-proof")</td><td>Multiple choice</td></tr>
      <tr><td><strong>HumanEval / MBPP</strong></td><td>Code generation correctness</td><td>Write function, run unit tests (pass@k)</td></tr>
      <tr><td><strong>GSM8K / MATH</strong></td><td>Grade-school & competition math reasoning</td><td>Numeric answer</td></tr>
      <tr><td><strong>MT-Bench</strong></td><td>Multi-turn chat quality</td><td>LLM-judge scored, 1–10</td></tr>
      <tr><td><strong>Chatbot Arena (LMSYS)</strong></td><td>Human preference, head-to-head</td><td>Crowd pairwise → Elo rating</td></tr>
      <tr><td><strong>HELM</strong></td><td>Holistic multi-metric evaluation</td><td>Many scenarios × metrics</td></tr>
      <tr><td><strong>SWE-bench</strong></td><td>Resolve real GitHub issues</td><td>Apply patch, run repo tests</td></tr>
    </table>

    <h3>Chatbot Arena and the Elo idea</h3>
    <p>LMSYS Chatbot Arena shows anonymous users two models' answers side by side; they vote for the better one. Aggregated votes produce an <span class='kicker'>Elo rating</span> (same math as chess) — a relative ranking from millions of human pairwise preferences. It's the closest thing to a "vibes but at scale" leaderboard and is much harder to game than static multiple-choice tests. Its weakness: it measures general preference, not your domain, and can favor style over correctness.</p>

    <div class='callout danger'>
      <div class='c-title'>The elephant: data contamination</div>
      Benchmarks are public, so their questions leak into training data. A model may have <strong>memorized</strong> MMLU answers rather than reasoned them. Signs: suspiciously high scores, big drops on freshly-written equivalents. This is why newer benchmarks (GPQA, "private" held-out test sets, live arenas) exist, and why you should distrust a single headline number.
    </div>

    <div class='callout warn'>
      <div class='c-title'>Gotcha: leaderboard ≠ your product</div>
      A model topping MMLU can still be worse for your customer-support RAG bot (wrong tone, worse at following your format, weaker on your jargon). Use public benchmarks to <strong>shortlist</strong> 2–3 models, then decide with <em>your</em> eval set on <em>your</em> data. Never ship a model swap on leaderboard rank alone.
    </div>

    <div class='callout good'>
      <div class='c-title'>Rule of thumb</div>
      Public benchmarks: model selection & shortlisting. Custom evals: product decisions. Human pairwise/Arena-style: hardest to game. Static multiple-choice: most contaminated.
    </div>

    <div class='callout'>
      <div class='c-title'>Interview soundbite</div>
      "Benchmarks like MMLU, GPQA, HumanEval (pass@k), GSM8K, MT-Bench and Chatbot Arena's Elo let me shortlist models — but they're contaminated by training-data leakage and don't reflect my task. I decide with a custom eval on my own data; a leaderboard rank never justifies a production model swap."
    </div>
  `,
});

lessons.push({
  id: 'human-eval',
  group: 'Evaluation methods',
  nav: '9 · Human evaluation',
  title: 'Human evaluation: the gold standard you must run well',
  lede: 'Humans are the ground truth every automated metric is trying to approximate. But humans are noisy too — run human eval like an experiment, not a hallway poll.',
  html: `
    <p>Every LLM judge and metric is ultimately a cheap approximation of "would a human like this?". So humans remain the gold standard for calibration and for the subjective stuff. But two humans often disagree — if you don't measure that disagreement, you can't trust your own labels.</p>

    <h3>Inter-annotator agreement (IAA)</h3>
    <p>Before trusting labels, ask: do annotators agree with <em>each other</em>? Raw percent-agreement is misleading (two people guessing "yes" agree 50% by luck). Use chance-corrected metrics:</p>
    <table>
      <tr><th>Metric</th><th>Use when</th></tr>
      <tr><td><strong>Cohen's kappa</strong></td><td>Two annotators, categorical labels</td></tr>
      <tr><td><strong>Fleiss' kappa</strong></td><td>Three+ annotators, categorical</td></tr>
      <tr><td><strong>Krippendorff's alpha</strong></td><td>Any # of annotators, missing data, ordinal/interval scales</td></tr>
    </table>
    <div class='callout warn'>
      <div class='c-title'>Interpreting kappa</div>
      &gt;0.8 excellent · 0.6–0.8 good · 0.4–0.6 moderate · &lt;0.4 poor. <strong>Low kappa is usually a rubric problem, not a people problem</strong> — your guidelines are ambiguous. Fix the rubric, add examples, re-train, re-measure.
    </div>

    <h3>Run it like an experiment</h3>
    <ul>
      <li><strong>Written guidelines</strong> with concrete examples for each score level — the rubric IS the experiment design.</li>
      <li><strong>Multiple annotators per item</strong> on at least a sample, so you can compute IAA and take majority/median.</li>
      <li><strong>Calibration round</strong>: everyone labels the same 20 items, discuss disagreements, align, then scale.</li>
      <li><strong>Blind & randomized</strong>: hide which model produced which output; shuffle order to kill position bias (humans have it too).</li>
      <li><strong>Prefer pairwise</strong>: "which is better, A or B?" is far more reliable than "rate 1–7".</li>
    </ul>

    <div class='callout good'>
      <div class='c-title'>The calibration chain</div>
      Humans calibrate the <strong>LLM judge</strong> (measure kappa between judge and humans); the judge scales to <strong>thousands of offline cases</strong>; offline evals gate what reaches <strong>production</strong>; production feedback surfaces new cases for humans to label. Each layer is cheaper and larger; each is anchored by the one above it.
    </div>

    <div class='callout danger'>
      <div class='c-title'>Gotcha: don't scale an uncalibrated judge</div>
      Teams skip the human-vs-judge kappa step and run an LLM judge on 10,000 cases. If the judge disagrees with humans, you've now got 10,000 confidently-wrong labels. Always validate the judge against a human-labeled sample first, then scale.
    </div>

    <div class='callout'>
      <div class='c-title'>Interview soundbite</div>
      "Humans are ground truth but noisy, so I measure inter-annotator agreement with kappa/Krippendorff's alpha, run a calibration round, and use blind randomized pairwise comparisons. Low agreement means a bad rubric, not bad people. Humans calibrate the judge; the judge scales — but only after kappa checks out."
    </div>
  `,
});

lessons.push({
  id: 'observability',
  group: 'Observability',
  nav: '10 · Tracing & spans',
  title: 'Observability: traces, spans, and seeing inside the box',
  lede: 'You cannot evaluate what you cannot see. Production observability means capturing every step of every request as a structured trace — the LLM version of distributed tracing.',
  html: `
    <p>An LLM request is rarely one API call. It's retrieval, reranking, prompt assembly, one or more model calls, tool invocations, and post-processing. When the answer is wrong, "the LLM messed up" is not a diagnosis. You need to see <em>which step</em> broke — which means structured tracing.</p>

    <h3>The trace / span model (it's just OpenTelemetry)</h3>
    <p>A <span class='kicker'>trace</span> is one end-to-end request. It's a tree of <span class='kicker'>spans</span>, each a timed operation (a retrieval, a model call, a tool call). Spans nest and carry attributes. This is the exact OpenTelemetry model that APM tools use — LLM observability tools (Langfuse, LangSmith, Arize Phoenix) extend it with LLM-specific fields.</p>

    <div class='diagram'>
      <svg viewBox='0 0 640 210' width='640'>
        <rect class='node-box' x='20' y='20' width='600' height='30' rx='6'/>
        <text class='node-text' x='320' y='40' text-anchor='middle'>TRACE · user question → answer · 2.4s · $0.011</text>
        <rect class='node-box worker' x='40' y='65' width='170' height='34' rx='6'/>
        <text class='node-text' x='125' y='86' text-anchor='middle'>span: retrieve (180ms)</text>
        <rect class='node-box worker' x='230' y='65' width='170' height='34' rx='6'/>
        <text class='node-text' x='315' y='86' text-anchor='middle'>span: rerank (60ms)</text>
        <rect class='node-box tool' x='420' y='65' width='190' height='34' rx='6'/>
        <text class='node-text' x='515' y='86' text-anchor='middle'>span: LLM call (2.1s)</text>
        <rect class='node-box' x='440' y='112' width='150' height='30' rx='6'/>
        <text class='node-sub' x='515' y='131' text-anchor='middle'>prompt · tokens · cost</text>
        <rect class='node-box tool' x='440' y='150' width='150' height='30' rx='6'/>
        <text class='node-sub' x='515' y='169' text-anchor='middle'>tool: get_weather</text>
      </svg>
      <div class='diagram-caption'>One trace, many nested spans. Latency, cost, and tokens roll up; each span is independently inspectable.</div>
    </div>

    <h3>What to log on every LLM span</h3>
    <ul>
      <li><strong>Inputs/outputs</strong>: full prompt (incl. system + retrieved context) and raw completion.</li>
      <li><strong>Model metadata</strong>: model name/version, temperature, top_p, max_tokens.</li>
      <li><strong>Tokens & cost</strong>: prompt/completion tokens, computed $ cost.</li>
      <li><strong>Latency</strong>: total and time-to-first-token (TTFT) for streaming.</li>
      <li><strong>Identifiers</strong>: trace id, user/session id, app version, prompt template version.</li>
      <li><strong>Outcome</strong>: errors, retries, tool results, any online eval scores.</li>
    </ul>

    <h3>LLM observability vs classic APM</h3>
    <table>
      <tr><th>Dimension</th><th>Classic APM</th><th>LLM observability</th></tr>
      <tr><td>Primary signal</td><td>Latency, error rate</td><td>+ Quality, cost, tokens</td></tr>
      <tr><td>Payloads</td><td>Usually omitted</td><td>Prompts/outputs are essential to keep</td></tr>
      <tr><td>Correctness</td><td>HTTP 200 = success</td><td>200 can still be a hallucination</td></tr>
      <tr><td>Cost</td><td>Infra $</td><td>Per-request token $ — can dominate</td></tr>
    </table>

    <pre><code>with tracer.start_as_current_span('llm.call') as span:
    span.set_attribute('llm.model', 'gpt-4o')
    span.set_attribute('llm.prompt', prompt)
    resp = client.chat.completions.create(...)
    span.set_attribute('llm.completion', resp.choices[0].message.content)
    span.set_attribute('llm.tokens.total', resp.usage.total_tokens)
    span.set_attribute('llm.cost_usd', cost(resp.usage))</code></pre>

    <div class='callout warn'>
      <div class='c-title'>Gotcha: PII in prompts</div>
      Logging full prompts means logging whatever users typed — often PII. Redact/mask before storage, set retention limits, and gate access. "Log everything" collides with privacy law; design for it up front.
    </div>

    <div class='callout'>
      <div class='c-title'>Interview soundbite</div>
      "LLM observability is distributed tracing for AI: a trace is one request, spans are its steps, built on the OpenTelemetry model. I log prompts, outputs, model/version, tokens, cost, latency/TTFT, and versions on every span — because an HTTP 200 can still be a hallucination, and you can't debug what you can't see. Just redact PII."
    </div>
  `,
});

lessons.push({
  id: 'production-monitoring',
  group: 'Observability',
  nav: '11 · Production monitoring',
  title: 'Production monitoring: the four things you watch',
  lede: 'Traces are the raw material; monitoring turns them into dashboards and alerts across four buckets — performance, cost, reliability, and quality.',
  html: `
    <p>Once you're tracing, you aggregate into live signals. Organize them into four buckets so nothing is forgotten — this framework itself is a great interview answer.</p>

    <table>
      <tr><th>Bucket</th><th>Key metrics</th><th>Why it bites</th></tr>
      <tr><td><strong>Performance</strong></td><td>Latency p50/p95/p99, TTFT, throughput</td><td>Tail latency drives churn; averages hide it</td></tr>
      <tr><td><strong>Cost</strong></td><td>$/request, tokens in/out, cost per user/feature</td><td>A prompt bloat or retry loop can 5x your bill overnight</td></tr>
      <tr><td><strong>Reliability</strong></td><td>Error rate, timeout rate, provider 429s, fallback rate</td><td>Upstream rate limits and outages are frequent</td></tr>
      <tr><td><strong>Quality</strong></td><td>Online eval scores, user feedback, refusal rate</td><td>The one that silently rots — needs online evals to see</td></tr>
    </table>

    <h3>Watch tails, not averages</h3>
    <p>Report <strong>p50/p95/p99</strong>, never just the mean. A 2s average can hide a p99 of 15s that's enraging 1-in-100 users. For streaming UIs, <span class='kicker'>time-to-first-token</span> matters more than total latency — users tolerate a long answer if it starts appearing fast.</p>

    <h3>Measuring quality online (without labels)</h3>
    <p>You can't human-label live traffic in real time, so:</p>
    <ul>
      <li><strong>Sampled LLM-judge</strong>: run a judge on 1–5% of production traffic for a rolling quality score.</li>
      <li><strong>Reference-free signals</strong>: groundedness/faithfulness checks, toxicity/PII classifiers, schema-valid rate, refusal rate.</li>
      <li><strong>Implicit feedback</strong>: did the user retry, rephrase, abandon, copy the answer, or convert? Behavior is a free quality signal.</li>
      <li><strong>Explicit feedback</strong>: thumbs up/down — high signal but sparse (only unhappy or delighted users click).</li>
    </ul>

    <div class='callout good'>
      <div class='c-title'>Cost control that pays for itself</div>
      Break cost down by feature and user. The usual wins: trim bloated prompts and few-shot examples, cache repeated calls, route easy queries to a cheaper model, and cap runaway agent loops. Teams routinely cut 30–60% off the bill just by <em>seeing</em> the breakdown.
    </div>

    <div class='callout warn'>
      <div class='c-title'>Gotcha: alert on rate-of-change, not just thresholds</div>
      A static "cost &gt; $X" alert misses a slow creep. Alert when tokens/request or cost/request jumps vs. the trailing baseline — that catches the accidental prompt-doubling PR the day it ships, not at month-end billing.
    </div>

    <div class='callout'>
      <div class='c-title'>Interview soundbite</div>
      "I monitor four buckets: performance (p50/p95/p99 + TTFT), cost (tokens and $ per request/user/feature), reliability (errors, 429s, fallbacks), and quality (sampled LLM-judge + implicit/explicit feedback). I watch tails not averages, and alert on rate-of-change so a cost or quality regression is caught the day it ships."
    </div>
  `,
});

lessons.push({
  id: 'online-guardrails',
  group: 'Production',
  nav: '12 · Guardrails',
  title: 'Online guardrails: catching bad outputs before the user does',
  lede: 'Offline eval prevents bad ships; guardrails catch the bad outputs that slip through at runtime. They are the seatbelt, not the driving test.',
  html: `
    <p>No matter how good your offline eval, some live outputs will be wrong, unsafe, or malformed. <span class='kicker'>Guardrails</span> are real-time checks in the request path that inspect inputs and outputs and act — block, regenerate, or fall back — before the user is harmed.</p>

    <div class='diagram'>
      <svg viewBox='0 0 640 170' width='640'>
        <defs><marker id='arrow2' markerWidth='10' markerHeight='10' refX='8' refY='3' orient='auto'><path d='M0,0 L8,3 L0,6 Z' fill='#8b98a9'/></marker></defs>
        <rect class='node-box' x='10' y='60' width='90' height='44' rx='6'/>
        <text class='node-text' x='55' y='86' text-anchor='middle'>User</text>
        <line class='edge' x1='100' y1='82' x2='140' y2='82' marker-end='url(#arrow2)'/>
        <rect class='node-box tool' x='140' y='60' width='110' height='44' rx='6'/>
        <text class='node-text' x='195' y='80' text-anchor='middle'>Input guard</text>
        <text class='node-sub' x='195' y='96' text-anchor='middle'>injection · PII</text>
        <line class='edge' x1='250' y1='82' x2='290' y2='82' marker-end='url(#arrow2)'/>
        <rect class='node-box worker' x='290' y='60' width='90' height='44' rx='6'/>
        <text class='node-text' x='335' y='86' text-anchor='middle'>LLM</text>
        <line class='edge' x1='380' y1='82' x2='420' y2='82' marker-end='url(#arrow2)'/>
        <rect class='node-box tool' x='420' y='60' width='120' height='44' rx='6'/>
        <text class='node-text' x='480' y='80' text-anchor='middle'>Output guard</text>
        <text class='node-sub' x='480' y='96' text-anchor='middle'>ground · safety</text>
        <line class='edge' x1='540' y1='82' x2='580' y2='82' marker-end='url(#arrow2)'/>
        <rect class='node-box' x='580' y='60' width='50' height='44' rx='6'/>
        <text class='node-text' x='605' y='86' text-anchor='middle'>User</text>
      </svg>
      <div class='diagram-caption'>Guardrails wrap the model on both sides: validate what goes in and what comes out.</div>
    </div>

    <h3>Input guardrails</h3>
    <ul>
      <li><strong>Prompt-injection / jailbreak</strong> detection ("ignore previous instructions...").</li>
      <li><strong>PII detection</strong> and redaction before the prompt hits the model/logs.</li>
      <li><strong>Off-topic / scope</strong> filtering so the support bot doesn't write poetry.</li>
    </ul>

    <h3>Output guardrails</h3>
    <ul>
      <li><strong>Groundedness / hallucination check</strong>: verify claims are supported by the retrieved context (an NLI or LLM entailment check).</li>
      <li><strong>Safety / toxicity / PII-leak</strong> classifiers on the output.</li>
      <li><strong>Format / schema</strong> validation; competitor-mention or policy filters.</li>
    </ul>

    <pre><code>def guarded_answer(q, ctx):
    ans = llm(q, ctx)
    if not grounded(ans, ctx):        # NLI: is every claim entailed by ctx?
        ans = llm(q, ctx, strict=True)  # retry, force 'answer only from context'
    if not grounded(ans, ctx):
        return 'I do not have enough information to answer that.'  # safe fallback
    return ans</code></pre>

    <div class='callout warn'>
      <div class='c-title'>The latency ↔ coverage tradeoff</div>
      Every guardrail adds latency and cost (extra model calls). A full groundedness + safety + injection stack can add 300ms–1s. Prioritize by risk: a medical/legal bot maxes out guardrails; a casual brainstorm tool uses few. Run cheap checks inline, expensive ones async/sampled where possible.
    </div>

    <div class='callout danger'>
      <div class='c-title'>Gotcha: guardrails are not a substitute for eval</div>
      Guardrails catch known bad patterns at runtime; they don't tell you if quality is trending down. And over-aggressive guards cause <strong>over-refusal</strong> — a bot that says "I can't help with that" to everything scores 100% safe and 0% useful. Track refusal/false-positive rate as a first-class metric.
    </div>

    <div class='callout'>
      <div class='c-title'>Interview soundbite</div>
      "Guardrails are runtime checks wrapping the model — input side catches injection and PII, output side checks groundedness, safety, and schema, with a safe fallback. They trade latency for safety, so I size them to risk. But they catch known failures, not quality drift, and I watch over-refusal so the seatbelt doesn't strangle the product."
    </div>
  `,
});

lessons.push({
  id: 'drift-regression',
  group: 'Production',
  nav: '13 · Drift & regression',
  title: 'Drift & regression: fighting silent decay',
  lede: 'Your system was great at launch. Six weeks later it is subtly worse and nobody changed anything. Welcome to drift — the quiet killer of LLM products.',
  html: `
    <p>Classic software doesn't degrade on its own. LLM systems do — the world moves, data shifts, and providers update models under you. If you're not actively watching, quality erodes invisibly until users complain (or churn without complaining).</p>

    <h3>Three kinds of drift</h3>
    <table>
      <tr><th>Type</th><th>Cause</th><th>Example</th></tr>
      <tr><td><strong>Model drift</strong></td><td>Provider silently updates the model behind the API</td><td>gpt-4o point-release changes formatting; your parser breaks</td></tr>
      <tr><td><strong>Data drift</strong></td><td>Input distribution shifts over time</td><td>New product launches → users ask questions your RAG index doesn't cover</td></tr>
      <tr><td><strong>Prompt drift</strong></td><td>Many small "harmless" prompt edits accumulate</td><td>Death by a thousand tweaks; no single change tested end-to-end</td></tr>
    </table>

    <div class='callout danger'>
      <div class='c-title'>War story: the silent model swap</div>
      A team pinned <code>gpt-4</code> and relaxed. The provider rolled a minor update; the model started wrapping JSON in markdown fences. Their strict parser threw on ~8% of requests — logged as generic errors, no quality alert. It took <strong>days</strong> to trace because "we didn't change anything". Pin versions where possible, and keep a canary eval that runs continuously against the live model.
    </div>

    <h3>Regression testing in CI</h3>
    <p>Treat quality like a build. Every prompt/model/RAG change runs the eval suite in CI and is <strong>blocked if the score drops</strong> beyond the noise band (remember: use the CI from your statistical-rigor lesson, not a raw threshold).</p>
    <pre><code>score, lo, hi = evaluate(candidate, test_set)   # bootstrap CI
if hi &lt; baseline_lo:            # candidate's CI is clearly below baseline
    fail_ci('Quality regression: {score} vs baseline {baseline}')
elif overlaps(candidate_ci, baseline_ci):
    warn('No significant change — do not claim an improvement')</code></pre>

    <h3>A/B testing in production</h3>
    <p>Offline eval can't capture everything; the final judge is real users. Run controlled experiments:</p>
    <ul>
      <li><strong>Randomize per user</strong> (not per request) so a user gets a consistent experience.</li>
      <li>Pick a <strong>primary metric</strong> up front (resolution rate, thumbs-up, conversion) and guardrail metrics (cost, latency).</li>
      <li>Compute the sample size in advance; don't peek-and-stop (multiple-comparisons trap again).</li>
      <li>Watch for novelty effects — new behavior can spike then regress.</li>
    </ul>

    <div class='callout warn'>
      <div class='c-title'>The silent-failure trap</div>
      The scariest failures return HTTP 200 with a confident wrong answer. No error, no exception, no alert — just a user quietly misled. Only <strong>quality</strong> monitoring (sampled evals, feedback, groundedness) catches these. Reliability dashboards will show all-green while quality bleeds out.
    </div>

    <div class='callout'>
      <div class='c-title'>Interview soundbite</div>
      "LLM systems decay silently from model, data, and prompt drift. I defend with a CI regression gate that blocks changes whose confidence interval drops below baseline, a continuous canary eval against the live model to catch silent provider swaps, and production A/B tests randomized per user. The nightmare is a confident wrong answer at HTTP 200 — only quality monitoring catches it."
    </div>
  `,
});

lessons.push({
  id: 'tools',
  group: 'Production',
  nav: '14 · The tooling landscape',
  title: 'The tooling landscape: what to actually use',
  lede: 'You do not build all this from scratch. Know the platforms, what each is best at, and how to choose — a very common interview closer.',
  html: `
    <p>A mature ecosystem exists. You should be able to name the players, say what each is strong at, and articulate a selection rationale. Categories overlap; many teams combine an observability platform with an eval library.</p>

    <h3>Observability & eval platforms</h3>
    <table>
      <tr><th>Tool</th><th>Sweet spot</th><th>Notes</th></tr>
      <tr><td><strong>LangSmith</strong></td><td>Tracing + eval, tight with LangChain</td><td>Great DX if you're in the LangChain ecosystem; hosted</td></tr>
      <tr><td><strong>Langfuse</strong></td><td>Open-source tracing, cost, evals</td><td>Self-hostable — popular when data can't leave your infra</td></tr>
      <tr><td><strong>Arize Phoenix</strong></td><td>OSS observability, drift/embedding analysis</td><td>Strong on embedding-drift visualization; OTel-native</td></tr>
      <tr><td><strong>Braintrust</strong></td><td>Eval-centric workflow, experiment diffs</td><td>Nice for fast prompt iteration + regression diffing</td></tr>
      <tr><td><strong>W&amp;B Weave</strong></td><td>Tracing + eval in the Weights &amp; Biases world</td><td>Good if your ML org already lives in W&amp;B</td></tr>
    </table>

    <h3>Eval libraries / frameworks</h3>
    <table>
      <tr><th>Library</th><th>Focus</th></tr>
      <tr><td><strong>RAGAS</strong></td><td>RAG-specific metrics (faithfulness, context/answer relevance)</td></tr>
      <tr><td><strong>DeepEval</strong></td><td>Pytest-style LLM unit tests; wide metric set</td></tr>
      <tr><td><strong>OpenAI Evals</strong></td><td>Registry-based eval definitions and runners</td></tr>
      <tr><td><strong>promptfoo</strong></td><td>Config-driven prompt/model comparison and red-teaming</td></tr>
    </table>

    <h3>How to choose</h3>
    <div class='two-col'>
      <div>
        <div class='pattern-card'>
          <h4>Data residency</h4>
          <p>Sensitive data / on-prem requirement? → self-hostable OSS (Langfuse, Phoenix) over hosted SaaS.</p>
          <div class='tag-row'><span class='tag use'>use OSS when data can't leave</span></div>
        </div>
        <div class='pattern-card'>
          <h4>Ecosystem fit</h4>
          <p>Already on LangChain? LangSmith. On W&amp;B? Weave. Minimize integration friction.</p>
          <div class='tag-row'><span class='tag use'>use what matches your stack</span></div>
        </div>
      </div>
      <div>
        <div class='pattern-card'>
          <h4>Primary need</h4>
          <p>Debugging prod → observability-first (traces). Rapid prompt iteration → eval-first (Braintrust, DeepEval).</p>
          <div class='tag-row'><span class='tag use'>match tool to the pain</span></div>
        </div>
        <div class='pattern-card'>
          <h4>Build vs buy</h4>
          <p>OTel + a warehouse + custom judges is viable but costly to maintain. Buy for speed; build only if you have unusual needs.</p>
          <div class='tag-row'><span class='tag avoid'>avoid rebuilding tracing from scratch</span></div>
        </div>
      </div>
    </div>

    <div class='callout good'>
      <div class='c-title'>Standardize on OpenTelemetry</div>
      Whatever platform you pick, emit OTel-compatible traces. It keeps you portable (swap vendors without re-instrumenting) and lets LLM traces sit alongside the rest of your APM.
    </div>

    <div class='callout'>
      <div class='c-title'>Interview soundbite</div>
      "For observability I'd reach for LangSmith or Langfuse (self-host when data can't leave), Arize Phoenix for drift; for eval, RAGAS for RAG and DeepEval for pytest-style tests. I choose on data residency, ecosystem fit, and whether the pain is debugging or iteration — and I emit OpenTelemetry so I'm not locked in."
    </div>
  `,
});

lessons.push({
  id: 'cheatsheet',
  group: 'Wrap-up',
  nav: '15 · Cheat-sheet',
  title: 'Rapid-fire cheat-sheet & interview Q&A recap',
  lede: 'Everything distilled into repeatable one-liners, decision rules, and a 60-second framework you can deploy on any LLM-eval interview question.',
  html: `
    <h3>The 60-second framework (structure any answer with this)</h3>
    <ol>
      <li><strong>Offline first</strong>: build a versioned test set (golden + synthetic + production + adversarial), pick task-fit metrics.</li>
      <li><strong>Score smart</strong>: deterministic gates → embedding tripwire → LLM-judge (calibrated) → humans for the hard/subjective.</li>
      <li><strong>Prove it</strong>: bootstrap CIs, paired comparisons, fixed sample size — ship real gains, not noise.</li>
      <li><strong>Observe</strong>: trace every request (OTel spans), monitor performance/cost/reliability/quality.</li>
      <li><strong>Guard & watch</strong>: runtime guardrails + online sampled evals + drift/regression CI gate + A/B tests.</li>
    </ol>

    <h3>Rapid-fire pattern cards</h3>
    <div class='two-col'>
      <div>
        <div class='pattern-card'><h4>Why is LLM eval hard?</h4><p>No oracle; non-deterministic even at temp 0; fuzzy, multi-dimensional correctness; expensive labels; moving-target models.</p></div>
        <div class='pattern-card'><h4>Why not BLEU everywhere?</h4><p>Rewards n-gram overlap, punishes paraphrase, rewards word-salad. Fine for MT/rough summarization signal only.</p></div>
        <div class='pattern-card'><h4>LLM-judge biases</h4><p>Position, verbosity, self-preference, sycophancy, format. Swap order + average; different-family judge; validate with kappa.</p></div>
        <div class='pattern-card'><h4>Is my 2% gain real?</h4><p>On 100 examples the CI is ~±7%. Bootstrap it; compare paired; probably noise.</p></div>
        <div class='pattern-card'><h4>RAGAS triad</h4><p>Context relevance (retriever), faithfulness (hallucination), answer relevance (usefulness).</p></div>
        <div class='pattern-card'><h4>Retriever metrics</h4><p>Recall@k (is it in top-k?), MRR (how high?), NDCG (graded + position).</p></div>
      </div>
      <div>
        <div class='pattern-card'><h4>Benchmarks vs your eval</h4><p>Benchmarks = shortlist models (beware contamination). Custom eval on your data = ship decisions.</p></div>
        <div class='pattern-card'><h4>Trace vs span</h4><p>Trace = one request; span = one timed step. OTel model. Log prompt/output/model/tokens/cost/latency/version.</p></div>
        <div class='pattern-card'><h4>Four monitoring buckets</h4><p>Performance (p50/95/99, TTFT), Cost (tokens/$), Reliability (errors/429s), Quality (sampled judge + feedback).</p></div>
        <div class='pattern-card'><h4>Guardrails</h4><p>Input: injection/PII. Output: groundedness/safety/schema + fallback. Trade latency for safety; watch over-refusal.</p></div>
        <div class='pattern-card'><h4>Drift types</h4><p>Model (silent provider update), data (input shift), prompt (accumulated tweaks). Canary eval + CI gate.</p></div>
        <div class='pattern-card'><h4>Scariest failure</h4><p>HTTP 200 + confident wrong answer. Reliability dashboards stay green; only quality monitoring catches it.</p></div>
      </div>
    </div>

    <h3>Decision rules to memorize</h3>
    <ul>
      <li><strong>Structured output?</strong> → exact-match / schema validation, not a judge.</li>
      <li><strong>Open-ended text?</strong> → LLM-judge (calibrated) or human; embedding similarity as a tripwire.</li>
      <li><strong>Comparing two variants?</strong> → pairwise, paired on same inputs, bootstrap the difference.</li>
      <li><strong>RAG broke?</strong> → component evals to bisect: retrieval (recall@k) vs generation (faithfulness).</li>
      <li><strong>Data can't leave?</strong> → self-hosted (Langfuse/Phoenix), emit OpenTelemetry.</li>
      <li><strong>Shipping a change?</strong> → CI regression gate on the CI-band, then A/B randomized per user.</li>
    </ul>

    <h3>Numbers worth knowing</h3>
    <table>
      <tr><th>Fact</th><th>Value</th></tr>
      <tr><td>Strong LLM-judge ↔ human agreement</td><td>~80%+ (≈ human-human)</td></tr>
      <tr><td>Usable Cohen's kappa</td><td>&gt;0.6 good, &lt;0.4 poor</td></tr>
      <tr><td>Starter test set size</td><td>50–100 curated cases</td></tr>
      <tr><td>CI half-width at n=100, p≈0.8</td><td>~±7 points</td></tr>
      <tr><td>Examples to detect a 5-pt diff</td><td>~400 per variant</td></tr>
      <tr><td>Typical prod judge sampling</td><td>1–5% of traffic</td></tr>
    </table>

    <div class='callout good'>
      <div class='c-title'>The one-sentence philosophy</div>
      Make quality a number you can move, prove the move is real, watch it in production, and turn every failure into a permanent test.
    </div>

    <div class='callout'>
      <div class='c-title'>Interview soundbite</div>
      "My loop: build a versioned test set, score with a layered stack (deterministic → judge → human), prove improvements with bootstrapped confidence intervals, trace everything with OpenTelemetry, monitor performance/cost/reliability/quality, guard at runtime, and gate every change on a CI regression test — closing the loop by turning production failures into new test cases."
    </div>
  `,
});

// __LESSONS__

quizzes.push(
  {
    question: 'You set temperature=0 and still get different outputs for the same prompt. What is the most accurate explanation?',
    options: [
      { text: 'temperature=0 is ignored by all providers; it always samples randomly', correct: false },
      { text: 'Floating-point non-associativity on GPUs and batch-dependent MoE routing make greedy decoding non-deterministic below the API surface', correct: true },
      { text: 'The prompt is being cached and returning stale results', correct: false },
      { text: 'A bug in your client library is mutating the request', correct: false },
    ],
    explain: 'Even greedy decoding is not bit-for-bit deterministic: GPU kernels sum floats in non-deterministic order (a+b+c differs at the bit level), flipping the argmax on near-tied tokens, and mixture-of-experts routing depends on the whole batch. Accept variance and measure it.',
  },
  {
    question: 'Your summarization quality gate uses BLEU against reference summaries. Why is this risky?',
    options: [
      { text: 'BLEU is too slow to run in CI', correct: false },
      { text: 'BLEU rewards n-gram overlap, so it punishes correct paraphrases and can reward word-salad that reuses reference words', correct: true },
      { text: 'BLEU requires a GPU to compute', correct: false },
      { text: 'BLEU only works for classification tasks', correct: false },
    ],
    explain: 'BLEU measures surface overlap, not meaning. A correct paraphrase with different words scores near zero, while a scrambled sentence reusing reference words can score high. Use judged or task-fit metrics for open-ended text.',
  },
  {
    question: 'A prompt change moved your eval score from 82% to 84% on a 100-example test set. What should you conclude?',
    options: [
      { text: 'A clear 2-point improvement — ship it', correct: false },
      { text: 'The difference is likely within the confidence interval (~±7% at n=100); bootstrap a paired CI before claiming an improvement', correct: true },
      { text: 'The model got worse and you should revert', correct: false },
      { text: 'You need to switch to a different judge model', correct: false },
    ],
    explain: 'At n=100 and p≈0.83 the 95% CI half-width is roughly 7 points, so a 2-point move is inside the noise. Bootstrap the difference on paired examples; if the CI of the difference includes 0, you cannot claim a real gain.',
  },
  {
    question: 'Which technique best controls for position bias when using an LLM to compare two answers pairwise?',
    options: [
      { text: 'Always put the shorter answer first', correct: false },
      { text: 'Run both orderings (A-then-B and B-then-A) and only count a win if the verdict is consistent across both', correct: true },
      { text: 'Raise the judge temperature to 1.0', correct: false },
      { text: 'Ask the judge to output a numeric score instead of a preference', correct: false },
    ],
    explain: 'Judges tend to favor a fixed position. Swapping the order and requiring a consistent verdict cancels that bias; inconsistent verdicts are scored as ties, which is itself a signal that position bias is present.',
  },
  {
    question: 'Before scaling an LLM judge to grade 10,000 offline cases, what is the essential validation step?',
    options: [
      { text: 'Confirm the judge runs at temperature 1.0 for diversity', correct: false },
      { text: 'Measure the judge-vs-human agreement (e.g. Cohen\'s kappa) on a labeled sample and only scale if it is acceptable', correct: true },
      { text: 'Make sure the judge is the same model family as the system being graded', correct: false },
      { text: 'Verify the judge produces longer rationales than the answers', correct: false },
    ],
    explain: 'A judge is a model that can be wrong. Validate it against human labels with a chance-corrected agreement metric (kappa > ~0.6). Scaling an uncalibrated judge produces thousands of confidently wrong labels. Also prefer a different model family to avoid self-preference bias.',
  },
  {
    question: 'In a RAG pipeline, the answer is fluent but fabricates facts not in the retrieved context. Which RAGAS metric most directly catches this?',
    options: [
      { text: 'Context relevance', correct: false },
      { text: 'Faithfulness (groundedness)', correct: true },
      { text: 'Answer relevance', correct: false },
      { text: 'Recall@k', correct: false },
    ],
    explain: 'Faithfulness measures whether every claim in the answer is supported by the retrieved context. High context relevance but low faithfulness means the generator is hallucinating despite good retrieval — fix the generation prompt.',
  },
  {
    question: 'A candidate model tops the MMLU leaderboard. What is the correct way to use that for a production model swap?',
    options: [
      { text: 'Swap immediately — leaderboard rank is the definitive quality signal', correct: false },
      { text: 'Use MMLU to shortlist candidates, then decide with a custom eval on your own task/data, mindful that public benchmarks suffer training-data contamination', correct: true },
      { text: 'Ignore it entirely; benchmarks are meaningless', correct: false },
      { text: 'Run MMLU on your production traffic to confirm', correct: false },
    ],
    explain: 'Public benchmarks are contaminated (questions leak into training data) and measure general ability, not your task. Use them to shortlist, then make the ship decision on a custom eval over your own data.',
  },
  {
    question: 'Why report p95/p99 latency instead of the mean, and why track time-to-first-token separately?',
    options: [
      { text: 'The mean is always higher than p99, so it overstates problems', correct: false },
      { text: 'Averages hide tail latency that enrages a minority of users, and for streaming UIs perceived speed depends on when tokens start appearing (TTFT), not total time', correct: true },
      { text: 'p99 is cheaper to compute than the mean', correct: false },
      { text: 'TTFT and total latency are always identical', correct: false },
    ],
    explain: 'A 2s average can hide a 15s p99 harming 1-in-100 users. And in streaming interfaces users tolerate a long total response if it starts rendering quickly, so time-to-first-token is the key perceived-latency signal.',
  },
  {
    question: 'What is the "silent failure" that reliability dashboards typically miss in LLM systems?',
    options: [
      { text: 'A 500 error from the model provider', correct: false },
      { text: 'An HTTP 200 response containing a confident but wrong/hallucinated answer, invisible to error-rate monitoring', correct: true },
      { text: 'A rate-limit (429) from the provider', correct: false },
      { text: 'A timeout on the retrieval step', correct: false },
    ],
    explain: 'Errors, 429s, and timeouts all show up on reliability dashboards. A wrong answer returned as HTTP 200 does not — only quality monitoring (sampled judge, groundedness checks, user feedback) catches it.',
  },
  {
    question: 'Your team keeps checking an in-progress A/B test and plans to stop as soon as it looks significant. What is the problem?',
    options: [
      { text: 'Nothing — stopping early when significant is best practice', correct: false },
      { text: 'Repeated peeking inflates the false-positive rate (multiple comparisons); you should fix the sample size in advance or use sequential-testing corrections', correct: true },
      { text: 'A/B tests cannot be used for LLM systems at all', correct: false },
      { text: 'You must randomize per request rather than per user', correct: false },
    ],
    explain: 'Checking repeatedly and stopping on significance dramatically raises the chance of a spurious result. Pre-commit the sample size or apply sequential-analysis corrections. (Separately, A/B tests should randomize per user for a consistent experience.)',
  },
);

// __QUIZZES__

export default {
  id: 'llm-eval-observability-course',
  title: 'LLM Eval & Observability',
  icon: '📊',
  color: '#39c5cf',
  lessons,
  quizzes,
};
