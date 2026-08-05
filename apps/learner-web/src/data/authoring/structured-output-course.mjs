export default {
  id: 'structured-output-course',
  title: 'Structured Output & Function Calling',
  icon: '🧱',
  color: '#d2a8ff',
  lessons: [
    {
      id: 'why-structured-output',
      group: 'Foundations',
      nav: '0 · Why it matters',
      title: 'Why structured output is the backbone of real LLM apps',
      lede: 'A chatbot returns prose; a product returns data. Structured output is the bridge that turns a text generator into a system component.',
      html: `
        <p>Here's the uncomfortable truth every senior engineer hits on day one of building with LLMs: <strong>a paragraph of beautiful prose is useless to the rest of your stack.</strong> Your database wants a row. Your React component wants a prop. Your <code>if</code> statement wants a boolean. The moment an LLM output has to be consumed by <em>code</em> instead of a human, you need <span class='kicker'>structured output</span> — output that conforms to a shape you defined in advance.</p>

        <p>Think of the LLM as a brilliant, slightly chaotic intern who's fantastic at reading messy inputs (emails, PDFs, transcripts, screenshots) and terrible at coloring inside the lines. Structured output is the clipboard with pre-printed boxes you hand them so they stop writing essays in the margins. 📋</p>

        <h3>The job to be done</h3>
        <p>Almost every "AI feature" is secretly one of these four verbs, and every one of them needs a typed payload back:</p>
        <ul>
          <li><span class='kicker'>Extract</span> — pull fields out of unstructured text (invoice → <code>{ total, currency, dueDate }</code>).</li>
          <li><span class='kicker'>Classify</span> — assign a label (support ticket → <code>{ category: 'billing' }</code>).</li>
          <li><span class='kicker'>Route</span> — decide the next step (query → <code>{ tool: 'search', args: {...} }</code>).</li>
          <li><span class='kicker'>Act</span> — call a function/tool with well-typed arguments (an agent step).</li>
        </ul>

        <div class='callout'>
          <div class='c-title'>The mental model</div>
          An LLM app is a pipeline: <strong>unstructured in → LLM → structured out → your code</strong>. The LLM is the fuzzy front door; structured output is the type-safe boundary where your normal engineering discipline resumes.
        </div>

        <h3>What breaks without it</h3>
        <p>The naive approach — "just ask for JSON in the prompt and <code>JSON.parse</code> it" — fails in production in gloriously varied ways: the model wraps JSON in a chatty preamble ("Sure! Here's your JSON:"), adds a trailing comma, emits <code>NaN</code>, hallucinates a field name, uses single quotes, or wraps everything in a Markdown fence. Every one of those is a 3am pager alert.</p>

        <div class='callout warn'>
          <div class='c-title'>War story</div>
          A classification pipeline ran fine for weeks, then silently started dropping 4% of records. Cause: the model occasionally prefixed responses with <code>Here is the classification:</code>. The <code>JSON.parse</code> threw, the <code>catch</code> logged and moved on, and nobody noticed until the weekly numbers looked off. <strong>Unvalidated parsing hides failures.</strong>
        </div>

        <div class='callout good'>
          <div class='c-title'>Interview soundbite</div>
          "Structured output is the type boundary of an LLM system. Prose is for humans; my code needs a schema-validated object, so I treat every model call as an untyped API response that must be parsed <em>and</em> validated before it touches business logic."
        </div>
      `,
    },
    {
      id: 'the-options',
      group: 'Foundations',
      nav: '1 · The options',
      title: 'The options — prompt-and-pray vs JSON mode vs tool calling vs constrained decoding',
      lede: 'There are four rungs on the reliability ladder. Knowing which one you are standing on is half of every interview answer.',
      html: `
        <p>When someone asks "how do you get JSON out of an LLM?", the junior answer is "I ask nicely." The senior answer is "it depends on the reliability tier I need," followed by naming four distinct mechanisms. Let's climb the ladder from <em>hope</em> to <em>guarantee</em>. 🪜</p>

        <div class='diagram'>
          <svg viewBox='0 0 640 220' width='640'>
            <rect class='node-box' x='20' y='150' width='140' height='50' rx='8'/>
            <text class='node-text' x='90' y='172' text-anchor='middle'>Prompt & pray</text>
            <text class='node-sub' x='90' y='190' text-anchor='middle'>weakest</text>
            <rect class='node-box' x='180' y='110' width='140' height='50' rx='8'/>
            <text class='node-text' x='250' y='132' text-anchor='middle'>JSON mode</text>
            <text class='node-sub' x='250' y='150' text-anchor='middle'>valid, untyped</text>
            <rect class='node-box worker' x='340' y='70' width='140' height='50' rx='8'/>
            <text class='node-text' x='410' y='92' text-anchor='middle'>Tool calling</text>
            <text class='node-sub' x='410' y='110' text-anchor='middle'>schema-shaped</text>
            <rect class='node-box tool' x='480' y='30' width='150' height='50' rx='8'/>
            <text class='node-text' x='555' y='52' text-anchor='middle'>Constrained</text>
            <text class='node-sub' x='555' y='70' text-anchor='middle'>guaranteed</text>
          </svg>
          <div class='diagram-caption'>Reliability climbs left to right — each rung trades a little flexibility for a lot of guarantee.</div>
        </div>

        <div class='pattern-card'>
          <h4>1 · Prompt-and-pray</h4>
          <p>Put "Respond ONLY with JSON matching this shape…" in the prompt, then <code>JSON.parse</code> and cross your fingers. Zero infrastructure, works with any model, and is <em>fine for a prototype</em>. In production it leaks preambles, fences, and drift.</p>
          <div class='tag-row'><span class='tag use'>use when prototyping / any model</span><span class='tag avoid'>avoid when it hits real users</span></div>
        </div>

        <div class='pattern-card'>
          <h4>2 · JSON mode</h4>
          <p>A provider flag (e.g. <code>response_format: { type: 'json_object' }</code>) that forces the output to be <em>syntactically valid JSON</em>. It guarantees the thing parses — but <strong>not</strong> that it has your fields or types. You still validate.</p>
          <div class='tag-row'><span class='tag use'>use when you want valid syntax cheaply</span><span class='tag avoid'>avoid when field/type shape matters</span></div>
        </div>

        <div class='pattern-card'>
          <h4>3 · Function / tool calling</h4>
          <p>You give the model a named function with a JSON Schema for its arguments; the model returns a call with arguments shaped to that schema. This is the workhorse of real apps and agents — schema-shaped output <em>plus</em> a routing signal (which tool).</p>
          <div class='tag-row'><span class='tag use'>use when you need typed args or agent routing</span><span class='tag avoid'>avoid when a plain object is simpler</span></div>
        </div>

        <div class='pattern-card'>
          <h4>4 · Constrained decoding (structured outputs / grammars)</h4>
          <p>The decoder is <em>masked</em> at every token so only tokens that keep the output valid against your schema/grammar are allowed. This is what "Structured Outputs" with <code>strict: true</code> does under the hood. Output is <strong>guaranteed</strong> to match the schema shape.</p>
          <div class='tag-row'><span class='tag use'>use when you need a hard guarantee</span><span class='tag avoid'>avoid when schema/model support is missing</span></div>
        </div>

        <div class='callout warn'>
          <div class='c-title'>Gotcha — the classic trap</div>
          "JSON mode" and "Structured Outputs" are <strong>not</strong> the same thing. JSON mode = valid syntax. Structured Outputs / constrained decoding = valid syntax <em>and</em> matches <em>your</em> schema. Interviewers love catching people who conflate them.
        </div>

        <div class='callout good'>
          <div class='c-title'>Interview soundbite</div>
          "There are four tiers: prompt-and-pray, JSON mode, tool/function calling, and constrained decoding. I pick the lowest tier that meets my reliability SLA — and I validate on every tier, because only constrained decoding actually guarantees my schema."
        </div>
      `,
    },
    {
      id: 'json-schema-zod',
      group: 'Defining shapes',
      nav: '2 · Schemas & Zod',
      title: 'JSON Schema & validation — defining and enforcing shapes with Zod',
      lede: 'A schema is a contract. Zod lets you write it once in TypeScript and use it as both the request spec and the runtime validator.',
      html: `
        <p>Every reliable LLM feature starts with the same question: <strong>what exactly do I want back?</strong> Answer it in code, not in your head. The industry-standard answer format is <span class='kicker'>JSON Schema</span> — the same spec that powers OpenAPI. But hand-writing JSON Schema is verbose and error-prone, so in TypeScript land we write <span class='kicker'>Zod</span> and convert.</p>

        <h3>One schema, two jobs</h3>
        <p>The beautiful thing about a Zod schema is that it does double duty:</p>
        <ol>
          <li><strong>Request spec</strong> — convert it to JSON Schema and hand it to the model (as a tool/response_format) so the model knows the target shape.</li>
          <li><strong>Runtime guard</strong> — <code>schema.parse(json)</code> validates the model's response and gives you a <em>typed</em> object. If it doesn't conform, it throws with a precise error.</li>
        </ol>

        <pre><code>import { z } from 'zod';

const InvoiceSchema = z.object({
  vendor: z.string(),
  total: z.number().positive(),
  currency: z.enum(['USD', 'EUR', 'ILS']),
  dueDate: z.string().describe('ISO 8601 date, e.g. 2026-07-01'),
  lineItems: z.array(z.object({
    description: z.string(),
    amount: z.number(),
  })),
});

type Invoice = z.infer&lt;typeof InvoiceSchema&gt;; // free TS type

// After the model responds:
const invoice = InvoiceSchema.parse(JSON.parse(raw)); // typed + validated</code></pre>

        <div class='callout'>
          <div class='c-title'>The .describe() superpower</div>
          Every <code>.describe('...')</code> becomes the field's <code>description</code> in JSON Schema, which the model reads as inline documentation. This is your cheapest, highest-leverage prompt engineering: put units, formats, and examples <em>on the field</em>, not buried in the system prompt.
        </div>

        <h3>Constrain the space, don't just describe it</h3>
        <p>Loose types invite drift; tight types eliminate whole classes of errors. Compare:</p>
        <table>
          <tr><th>Loose (invites bugs)</th><th>Tight (prevents them)</th></tr>
          <tr><td><code>z.string()</code> for status</td><td><code>z.enum(['open','closed','pending'])</code></td></tr>
          <tr><td><code>z.number()</code> for rating</td><td><code>z.number().int().min(1).max(5)</code></td></tr>
          <tr><td><code>z.string()</code> for a date</td><td><code>z.string().datetime()</code></td></tr>
          <tr><td>free-text category</td><td>closed enum + <code>'other'</code> escape hatch</td></tr>
        </table>

        <div class='callout warn'>
          <div class='c-title'>Gotcha — strict-mode schema limits</div>
          Provider "strict" structured outputs support only a <em>subset</em> of JSON Schema. Common casualties: <code>z.record()</code> with open keys, some regex patterns, <code>min</code>/<code>max</code> on numbers, and defaults. Model the shape with enums/objects instead, and enforce the fine-grained rules in Zod <em>after</em> parsing.
        </div>

        <div class='callout good'>
          <div class='c-title'>Interview soundbite</div>
          "I define the target shape once as a Zod schema — it's my request spec via JSON Schema <em>and</em> my runtime validator via <code>.parse</code>. Tight types (enums, ranges, ISO formats) do more for reliability than any amount of prompt prose."
        </div>
      `,
    },
    {
      id: 'constrained-decoding',
      group: 'Defining shapes',
      nav: '3 · Constrained decoding',
      title: 'Constrained decoding — how "guaranteed valid JSON" actually works',
      lede: 'The magic behind strict Structured Outputs is not a smarter model — it is a filtered dice roll at every single token.',
      html: `
        <p>Here's the interview question that separates the people who <em>use</em> the API from the people who <em>understand</em> it: "How can a probabilistic token generator <strong>guarantee</strong> valid JSON?" The answer is delightfully mechanical, and it has nothing to do with the model trying harder. 🎲</p>

        <h3>Token sampling, normally</h3>
        <p>At each step an LLM produces a probability distribution over the entire vocabulary (~100k+ tokens) and samples one. Nothing stops it from picking a token that makes the output invalid — a stray <code>}</code>, a word where a number should go, a missing quote.</p>

        <h3>Constrained decoding, the trick</h3>
        <p>Constrained decoding inserts a <span class='kicker'>grammar</span> (compiled from your JSON Schema) that acts as a bouncer. At every token step it computes the set of tokens that are <em>legal given what's been emitted so far</em>, sets the probability of every illegal token to zero (a "logit mask"), and the model samples only from the survivors.</p>

        <div class='diagram'>
          <svg viewBox='0 0 640 200' width='640'>
            <defs><marker id='arrow' markerWidth='10' markerHeight='10' refX='8' refY='3' orient='auto'><path d='M0,0 L8,3 L0,6 Z' fill='#8b98a9'/></marker></defs>
            <rect class='node-box' x='20' y='70' width='130' height='60' rx='8'/>
            <text class='node-text' x='85' y='100' text-anchor='middle'>Model logits</text>
            <text class='node-sub' x='85' y='118' text-anchor='middle'>all tokens</text>
            <line class='edge' x1='150' y1='100' x2='250' y2='100' marker-end='url(#arrow)'/>
            <rect class='node-box tool' x='250' y='70' width='150' height='60' rx='8'/>
            <text class='node-text' x='325' y='100' text-anchor='middle'>Grammar mask</text>
            <text class='node-sub' x='325' y='118' text-anchor='middle'>zero illegal tokens</text>
            <line class='edge' x1='400' y1='100' x2='500' y2='100' marker-end='url(#arrow)'/>
            <rect class='node-box worker' x='500' y='70' width='120' height='60' rx='8'/>
            <text class='node-text' x='560' y='100' text-anchor='middle'>Sample</text>
            <text class='node-sub' x='560' y='118' text-anchor='middle'>always valid</text>
          </svg>
          <div class='diagram-caption'>The mask runs between logits and sampling, so an invalid token is literally impossible to select.</div>
        </div>

        <p>If the schema says "the next thing after this key is a number," then quote tokens and letter tokens get masked to zero probability. The model <em>cannot</em> produce them. This is how libraries like <strong>Outlines</strong>, <strong>llguidance</strong>, <strong>XGrammar</strong>, and provider "Structured Outputs" work.</p>

        <div class='callout'>
          <div class='c-title'>The two-sided coin</div>
          <strong>Structure is guaranteed. Correctness is not.</strong> Constrained decoding guarantees the output <em>parses and matches the schema</em>. It cannot guarantee the <code>total</code> is the right number — that's still the model's judgment. Shape ≠ truth.
        </div>

        <div class='callout warn'>
          <div class='c-title'>Gotcha — constraint can hurt quality</div>
          Forcing the model onto a narrow path can occasionally lower answer quality (it can't "think out loud" first if the grammar forbids it). Fix: give it a <code>reasoning</code> string field <em>before</em> the answer fields, so it can reason within the schema. Order matters — the model fills fields top to bottom.
        </div>

        <div class='callout warn'>
          <div class='c-title'>Gotcha — first-call latency</div>
          Compiling a schema into a grammar/FSM has a one-time cost. Providers cache it, but a brand-new complex schema can add latency on the first request. Reuse schemas; don't generate them dynamically per-request.
        </div>

        <div class='callout good'>
          <div class='c-title'>Interview soundbite</div>
          "Constrained decoding applies a per-token logit mask derived from a grammar compiled from my schema, so illegal tokens have zero probability. It guarantees the <em>shape</em> of the output — never the <em>correctness</em> of the values."
        </div>
      `,
    },
    {
      id: 'reliability-patterns',
      group: 'Making it reliable',
      nav: '4 · Reliability patterns',
      title: 'Reliability patterns — retries, self-repair, validate-then-fix loops',
      lede: 'Even with great tooling, some models drift. The senior move is a validation loop that turns a failure into a corrected retry.',
      html: `
        <p>If you don't have constrained decoding (older model, self-hosted, or a schema feature the provider doesn't support in strict mode), you defend in layers. The pattern is always the same shape: <strong>generate → validate → if invalid, repair → re-validate</strong>. 🔁</p>

        <h3>The validate-then-fix loop</h3>
        <pre><code>async function extract(input, schema, maxTries = 3) {
  let messages = [systemPrompt, userMessage(input)];
  for (let attempt = 0; attempt &lt; maxTries; attempt++) {
    const raw = await llm(messages);
    const parsed = safeJson(raw);
    const result = schema.safeParse(parsed);
    if (result.success) return result.data; // typed + valid

    // Feed the exact validation error back to the model:
    messages.push(assistant(raw));
    messages.push(user(\`Your output failed validation:
\${formatZodError(result.error)}
Return ONLY corrected JSON matching the schema.\`));
  }
  throw new Error('Failed to produce valid output after retries');
}</code></pre>

        <p>The key insight: <strong>the validation error is the best prompt.</strong> Don't just retry blindly — tell the model precisely what was wrong ("<code>currency</code> must be one of USD/EUR/ILS, you sent 'dollars'") and it usually nails the correction on attempt two.</p>

        <div class='two-col'>
          <div>
            <h4>Layers of defense</h4>
            <ul>
              <li><strong>Robust parse</strong> — strip Markdown fences, grab the outer <code>{...}</code>, tolerate trailing commas.</li>
              <li><strong>Schema validate</strong> — <code>safeParse</code>, never trust raw JSON.</li>
              <li><strong>Self-repair</strong> — feed the error back, bounded retries.</li>
              <li><strong>Fallback</strong> — after N tries, degrade gracefully (null, human review, cheaper heuristic).</li>
            </ul>
          </div>
          <div>
            <h4>Rules of thumb</h4>
            <ul>
              <li>Cap retries (2–3). Infinite loops burn tokens and money.</li>
              <li>Lower <code>temperature</code> for extraction (0–0.2). Creativity is the enemy of conformance.</li>
              <li>Make invalid states unrepresentable in the schema first — cheaper than fixing at runtime.</li>
              <li>Log every repair. A rising repair rate is a regression signal.</li>
            </ul>
          </div>
        </div>

        <div class='callout danger'>
          <div class='c-title'>War story — the retry storm</div>
          A team wrapped extraction in "retry until valid" with no cap. One malformed input the model couldn't satisfy sent it into an infinite loop across thousands of concurrent requests. The bill for that afternoon bought a very nice laptop. <strong>Always bound your loops.</strong>
        </div>

        <div class='callout good'>
          <div class='c-title'>Interview soundbite</div>
          "I treat model output like network I/O: robust parse, then <code>safeParse</code>, then a bounded self-repair loop that feeds the exact validation error back to the model. Constrained decoding removes most of this — but I always keep validation as the backstop."
        </div>
      `,
    },
    {
      id: 'streaming',
      group: 'Making it reliable',
      nav: '5 · Streaming',
      title: 'Streaming structured output — partial JSON & incremental parsing',
      lede: 'Users hate spinners. Streaming JSON lets you render fields as they arrive — but a half-written object is not valid JSON.',
      html: `
        <p>You want the perceived-latency win of streaming (fields popping in live, like a form filling itself) but there's a catch: at any instant mid-stream you're holding a <em>truncated</em> string like <code>{ "vendor": "Acme", "total": 12</code>. That's not parseable JSON. So how do the good UIs do it? ⚡</p>

        <h3>Partial / lenient parsing</h3>
        <p>Use a <span class='kicker'>partial JSON parser</span> (e.g. the streaming parsers in Vercel AI SDK, LangChain's partial JSON, or <code>partial-json</code>). These auto-close open braces/quotes to produce the best valid object <em>so far</em>, so you can render <code>vendor</code> the moment it's complete, before <code>total</code> even arrives.</p>

        <pre><code>let buffer = '';
for await (const chunk of stream) {
  buffer += chunk;
  const partial = parsePartialJson(buffer); // best-effort object
  render(partial);                           // update UI incrementally
}
const final = FullSchema.parse(JSON.parse(buffer)); // validate at the end</code></pre>

        <div class='callout'>
          <div class='c-title'>The golden rule of streaming</div>
          <strong>Render partials, but validate the final.</strong> Partial parsing is a UI convenience. It must NEVER be the thing that decides your business logic — only the complete, schema-validated object is trustworthy.
        </div>

        <h3>Field ordering is a UX decision</h3>
        <p>Because the model emits fields top-to-bottom, schema order controls what users see first. Put a fast-to-decide <code>title</code> or <code>status</code> early so something appears immediately; push long free-text (<code>summary</code>) last. And if you use a <code>reasoning</code> field for quality, decide whether to stream it (transparency) or hide it (cleaner UI).</p>

        <div class='callout warn'>
          <div class='c-title'>Gotcha — streaming + tool calling</div>
          When streaming tool-call <em>arguments</em>, providers send them as deltas of a stringified JSON. You must accumulate the argument fragments and only parse once the tool call is complete — parsing each delta will throw constantly.
        </div>

        <div class='callout warn'>
          <div class='c-title'>Gotcha — don't act on partials</div>
          Never fire a side effect (send the email, charge the card) off a partially-streamed object. A field can still change as more tokens arrive. Side effects wait for the validated final object.
        </div>

        <div class='callout good'>
          <div class='c-title'>Interview soundbite</div>
          "Streaming structured output means lenient partial parsing for the UI plus strict schema validation on the completed buffer. Partials are for pixels; only the validated final object is allowed to touch business logic."
        </div>
      `,
    },
    {
      id: 'modeling-complex-data',
      group: 'Modeling data',
      nav: '6 · Complex shapes',
      title: 'Modeling complex data — nesting, arrays, enums, unions, optionals',
      lede: 'Half of reliability is schema design. A well-modeled schema makes bad output literally unrepresentable.',
      html: `
        <p>The best debugging you'll ever do happens <em>before</em> the model runs — in how you shape the schema. The goal, borrowed straight from type-driven design: <strong>make illegal states unrepresentable.</strong> If the model physically can't emit a nonsense combination, you never have to catch it. 🎯</p>

        <h3>The building blocks</h3>
        <table>
          <tr><th>Need</th><th>Zod tool</th><th>Why</th></tr>
          <tr><td>Fixed set of values</td><td><code>z.enum([...])</code></td><td>Closes the space; no free-text drift.</td></tr>
          <tr><td>Optional field</td><td><code>.optional()</code> / <code>.nullable()</code></td><td>Distinguish "absent" from "explicitly null".</td></tr>
          <tr><td>List</td><td><code>z.array(item)</code></td><td>Zero-to-many; add <code>.max()</code> to bound it.</td></tr>
          <tr><td>Nested record</td><td><code>z.object({...})</code></td><td>Group related fields.</td></tr>
          <tr><td>"One of these variants"</td><td><code>z.discriminatedUnion('type', [...])</code></td><td>Tagged unions — the star of the show.</td></tr>
        </table>

        <h3>Discriminated unions are the power tool</h3>
        <p>When the output can be one of several <em>differently-shaped</em> things, a discriminated union nails it. Each variant carries a literal <code>type</code> tag, and each has its own fields. This is exactly how you model routing, multi-intent extraction, and agent actions.</p>

        <pre><code>const Action = z.discriminatedUnion('type', [
  z.object({ type: z.literal('search'),  query: z.string() }),
  z.object({ type: z.literal('booking'), date: z.string(), guests: z.number().int() }),
  z.object({ type: z.literal('refund'),  orderId: z.string(), reason: z.string() }),
]);

// The model returns exactly ONE variant, fully typed:
// { type: 'booking', date: '2026-07-04', guests: 2 }</code></pre>

        <div class='callout'>
          <div class='c-title'>optional vs nullable — know the difference</div>
          <code>.optional()</code> means the key may be <em>missing</em> (<code>undefined</code>). <code>.nullable()</code> means the key is present but <code>null</code>. For "the model looked and found nothing," prefer <strong>explicit <code>null</code></strong> — it proves the model considered the field rather than forgetting it. Interviewers probe this exact distinction.
        </div>

        <div class='callout warn'>
          <div class='c-title'>Gotcha — depth and required fields</div>
          Deeply nested schemas are harder for models and cost more tokens; flatten when you can. And in strict Structured Outputs, providers often require <em>every</em> object property to be listed as required — you express "optional" via a union with <code>null</code>, not by omitting the key. Design for that up front.
        </div>

        <div class='callout good'>
          <div class='c-title'>Interview soundbite</div>
          "I design schemas to make illegal states unrepresentable: enums over free text, discriminated unions for variant outputs, and explicit <code>null</code> over missing keys. Good schema design prevents more bugs than any retry loop fixes."
        </div>
      `,
    },
    {
      id: 'failure-ambiguity',
      group: 'Modeling data',
      nav: '7 · Failure & ambiguity',
      title: 'Handling failure & ambiguity — refusals, nulls, "I don\'t know", partial extraction',
      lede: 'The dangerous failure is not the crash — it is the confident hallucination. Give the model a legitimate way to say "not found".',
      html: `
        <p>Force a model to produce a value and it will produce <em>something</em> — even when the honest answer is "that field isn't in the document." A schema that demands <code>total: number</code> with no escape hatch is an <span class='kicker'>invitation to hallucinate</span>. The senior fix is to make "I don't know" a first-class, structured outcome. 🕳️</p>

        <h3>Build the escape hatches into the schema</h3>
        <ul>
          <li><strong>Nullable fields</strong> — <code>total: z.number().nullable()</code> lets the model say "absent" without inventing a number.</li>
          <li><strong>Confidence scores</strong> — <code>confidence: z.enum(['high','medium','low'])</code> lets downstream code gate on certainty.</li>
          <li><strong>An 'other'/'unknown' enum member</strong> — always give closed classifiers an escape value so they never force-fit.</li>
          <li><strong>A found/notFound envelope</strong> — a discriminated union of <code>{ status: 'found', data }</code> vs <code>{ status: 'not_found', reason }</code>.</li>
        </ul>

        <pre><code>const Result = z.discriminatedUnion('status', [
  z.object({ status: z.literal('extracted'), invoice: InvoiceSchema }),
  z.object({ status: z.literal('not_found'), reason: z.string() }),
  z.object({ status: z.literal('refused'),  reason: z.string() }),
]);</code></pre>

        <div class='callout'>
          <div class='c-title'>Partial extraction beats all-or-nothing</div>
          For multi-field extraction, let each field be independently nullable rather than failing the whole object if one field is missing. Get 8 of 10 fields with 2 explicit <code>null</code>s — that's a win. An all-or-nothing schema throws away good data.
        </div>

        <div class='callout warn'>
          <div class='c-title'>Gotcha — refusals still have a shape</div>
          Safety refusals ("I can't help with that") arrive as prose and will blow up a strict JSON parse. Model a <code>refused</code> branch, and with provider Structured Outputs check the response's <code>refusal</code> field before parsing. Don't let a refusal masquerade as a validation error.
        </div>

        <div class='callout warn'>
          <div class='c-title'>Gotcha — the prompt must permit humility</div>
          Even with a nullable field, if the system prompt says "always return a total," the model obeys the prose over the schema and hallucinates. Explicitly instruct: "If a field is not present in the source, return <code>null</code> — do not guess."
        </div>

        <div class='callout good'>
          <div class='c-title'>Interview soundbite</div>
          "I never force a value the source doesn't contain. I bake 'I don't know' into the schema — nullable fields, an 'other' enum, confidence scores, and a found/not_found/refused union — so the model's uncertainty becomes structured data instead of a confident hallucination."
        </div>
      `,
    },
    {
      id: 'testing-evaluating',
      group: 'Shipping it',
      nav: '8 · Testing & eval',
      title: 'Testing & evaluating structured output',
      lede: 'Two different questions: did it fit the shape (conformance) and did it get the right values (accuracy)? Measure both, separately.',
      html: `
        <p>You can't improve what you don't measure, and "it looked fine when I tried it" is not a metric. Structured-output quality splits cleanly into two axes that you should <em>never</em> conflate. 📏</p>

        <div class='two-col'>
          <div>
            <h4>Schema conformance</h4>
            <p>Does the output <code>safeParse</code> against the schema? This is binary and cheap. Track it as a <strong>pass rate</strong> across your eval set. With constrained decoding it should be ~100%; anything less is a bug.</p>
          </div>
          <div>
            <h4>Field accuracy</h4>
            <p>Given it conformed, are the <em>values</em> right vs. a labeled gold set? Compute per-field precision/recall/exact-match. A schema-perfect output with the wrong <code>total</code> is still a failure.</p>
          </div>
        </div>

        <h3>How to actually measure</h3>
        <ul>
          <li><strong>Gold set</strong> — hand-label 50–200 real examples with the correct structured answer. This is your ground truth.</li>
          <li><strong>Per-field metrics</strong> — exact match for enums/IDs; numeric tolerance for amounts; set F1 for array/list fields.</li>
          <li><strong>Conformance in CI</strong> — assert 100% parse rate on the eval set; fail the build if a prompt/schema change regresses it.</li>
          <li><strong>LLM-as-judge (carefully)</strong> — for fuzzy free-text fields where exact match is too strict; validate the judge against human labels first.</li>
        </ul>

        <table>
          <tr><th>Metric</th><th>Question it answers</th><th>Good tool</th></tr>
          <tr><td>Parse/conformance rate</td><td>Does it fit the shape?</td><td><code>safeParse</code> over eval set</td></tr>
          <tr><td>Field exact-match</td><td>Right enum/ID/date?</td><td>equality vs gold</td></tr>
          <tr><td>Numeric tolerance</td><td>Right amount (±ε)?</td><td><code>abs(a-b) &lt; eps</code></td></tr>
          <tr><td>List F1</td><td>Right set of items?</td><td>precision/recall on sets</td></tr>
        </table>

        <div class='callout warn'>
          <div class='c-title'>Gotcha — deterministic tests, non-deterministic model</div>
          The same input can yield different outputs. Set <code>temperature: 0</code>, pin the model version, and assert on <em>aggregate</em> metrics over a set (e.g. "≥ 95% accuracy") rather than snapshotting one exact response. Snapshot tests on raw LLM output are flaky by construction.
        </div>

        <div class='callout good'>
          <div class='c-title'>Interview soundbite</div>
          "I measure two independent things: schema conformance (a cheap binary parse rate, ~100% with constrained decoding) and field accuracy against a labeled gold set (per-field exact-match, numeric tolerance, list F1). Conformance without accuracy is a well-formatted lie."
        </div>
      `,
    },
    {
      id: 'real-world-patterns',
      group: 'Shipping it',
      nav: '9 · Real-world patterns',
      title: 'Real-world patterns — extraction, classification, routing, agents & pitfalls',
      lede: 'Four canonical shapes cover most production use cases. Recognize the pattern and the schema writes itself.',
      html: `
        <p>Ninety percent of structured-output features are variations on four archetypes. Learn to name them and you'll design the right schema in seconds — and answer any "how would you build X" interview prompt with a confident template. 🧩</p>

        <div class='pattern-card'>
          <h4>Extraction</h4>
          <p>Unstructured doc → typed fields. Invoices, resumes, contracts, medical notes. Schema = the fields you want, each nullable so missing data is honest.</p>
          <div class='tag-row'><span class='tag use'>use when digitizing documents</span><span class='tag avoid'>avoid forcing values not in the source</span></div>
        </div>

        <div class='pattern-card'>
          <h4>Classification</h4>
          <p>Input → one or more labels. Sentiment, ticket routing, moderation. Schema = <code>z.enum([...])</code> (single) or <code>z.array(z.enum([...]))</code> (multi-label), plus an <code>'other'</code> escape and optional confidence.</p>
          <div class='tag-row'><span class='tag use'>use when the label set is known</span><span class='tag avoid'>avoid open-ended free-text labels</span></div>
        </div>

        <div class='pattern-card'>
          <h4>Routing</h4>
          <p>Input → which handler + its args. The front door of agents and workflows. Schema = a discriminated union over <code>type</code>, each variant carrying its own typed arguments.</p>
          <div class='tag-row'><span class='tag use'>use when dispatching to tools/handlers</span><span class='tag avoid'>avoid when a single fixed path suffices</span></div>
        </div>

        <div class='pattern-card'>
          <h4>Agent tool-calling</h4>
          <p>The loop: model picks a tool (schema-validated args) → you execute → feed the result back → repeat. Structured output <em>is</em> the agent's action space; every tool is a schema.</p>
          <div class='tag-row'><span class='tag use'>use when multi-step, tool-using tasks</span><span class='tag avoid'>avoid for one-shot deterministic calls</span></div>
        </div>

        <h3>Pitfalls that bite in production</h3>
        <ul>
          <li><strong>Over-nesting</strong> — deep schemas cost tokens and confuse models. Flatten.</li>
          <li><strong>Enum sprawl</strong> — 50-value enums degrade accuracy; group hierarchically or add a second field.</li>
          <li><strong>Silent schema drift</strong> — you change the schema, the prompt still describes the old shape. Keep them in sync (single source of truth).</li>
          <li><strong>Trusting shape as truth</strong> — valid JSON with wrong values. Always evaluate accuracy separately.</li>
          <li><strong>Cost blindness</strong> — every field the model writes is output tokens. Big schemas are expensive at scale.</li>
        </ul>

        <div class='callout good'>
          <div class='c-title'>Interview soundbite</div>
          "Most features are extraction, classification, routing, or agent tool-calling. Extraction wants nullable fields; classification wants an enum with an escape hatch; routing and agents want discriminated unions. Name the pattern and the schema falls out."
        </div>
      `,
    },
    {
      id: 'cheat-sheet',
      group: 'Recap',
      nav: '10 · Cheat-sheet',
      title: 'Rapid-fire interview Q&A cheat-sheet',
      lede: 'The whole course compressed into snappy answers you can fire off under pressure. Read it the morning of the interview.',
      html: `
        <p>You've done the work. Here's the dense recap — the soundbites, the traps, and the one-liners that make you sound like you've shipped this. 🎤</p>

        <h3>Rapid-fire Q&amp;A</h3>
        <table>
          <tr><th>Question</th><th>Crisp answer</th></tr>
          <tr><td>Why structured output?</td><td>It's the type boundary — code needs a schema-validated object, not prose.</td></tr>
          <tr><td>JSON mode vs Structured Outputs?</td><td>JSON mode = valid syntax. Structured Outputs = valid syntax <em>and</em> matches my schema (constrained decoding).</td></tr>
          <tr><td>How does "guaranteed JSON" work?</td><td>Per-token logit mask from a grammar compiled from the schema; illegal tokens get zero probability.</td></tr>
          <tr><td>Does that guarantee correctness?</td><td>No — it guarantees <em>shape</em>, never the truth of the values.</td></tr>
          <tr><td>No constrained decoding available?</td><td>Robust parse → <code>safeParse</code> → bounded self-repair feeding the validation error back.</td></tr>
          <tr><td>optional vs nullable?</td><td><code>optional</code> = key may be missing; <code>nullable</code> = present but null. Prefer explicit null for "not found".</td></tr>
          <tr><td>Variant outputs?</td><td>Discriminated union on a literal <code>type</code> tag.</td></tr>
          <tr><td>Avoid hallucinated fields?</td><td>Nullable fields + <code>'other'</code> enum + a found/not_found/refused union, and tell the model to return null.</td></tr>
          <tr><td>Streaming?</td><td>Lenient partial parse for UI; strict schema validation on the final buffer. Never act on partials.</td></tr>
          <tr><td>How to evaluate?</td><td>Two axes: conformance (parse rate) and accuracy (per-field vs a gold set).</td></tr>
          <tr><td>Reduce drift cheaply?</td><td>Tighten the schema (enums, ranges, ISO), lower temperature, use <code>.describe()</code> on fields.</td></tr>
        </table>

        <h3>Mnemonic — S.H.A.P.E.</h3>
        <ul>
          <li><strong>S</strong>chema first — model the shape before the prompt.</li>
          <li><strong>H</strong>umility — build in null / unknown / refused.</li>
          <li><strong>A</strong>lways validate — <code>safeParse</code> even after constrained decoding.</li>
          <li><strong>P</strong>artials for pixels — stream to the UI, validate the final.</li>
          <li><strong>E</strong>valuate both axes — conformance <em>and</em> accuracy.</li>
        </ul>

        <div class='callout danger'>
          <div class='c-title'>The three traps that fail candidates</div>
          <ol>
            <li>Conflating JSON mode with Structured Outputs.</li>
            <li>Claiming constrained decoding guarantees <em>correct</em> values (it only guarantees shape).</li>
            <li>Forgetting to validate because "the API returns typed JSON now."</li>
          </ol>
        </div>

        <div class='callout good'>
          <div class='c-title'>The one soundbite to remember</div>
          "Structured output guarantees the <strong>shape</strong>, never the <strong>truth</strong>. So I design tight schemas that make illegal states unrepresentable, use constrained decoding where I can, and <em>always</em> validate — because a well-formatted wrong answer is still wrong."
        </div>
      `,
    },
  ],
  quizzes: [
    {
      question: 'What is the precise difference between a provider\'s "JSON mode" and "Structured Outputs" (strict)?',
      options: [
        { text: 'JSON mode is faster; Structured Outputs is slower but identical in guarantees', correct: false },
        { text: 'JSON mode guarantees syntactically valid JSON; Structured Outputs also guarantees the output matches your specific schema', correct: true },
        { text: 'They are two names for the same feature', correct: false },
        { text: 'JSON mode validates against your schema; Structured Outputs only ensures valid syntax', correct: false },
      ],
      explain: 'JSON mode only forces valid JSON syntax. Structured Outputs uses constrained decoding to also guarantee the output conforms to your provided schema (fields and types).',
    },
    {
      question: 'How does constrained decoding guarantee that output matches a schema?',
      options: [
        { text: 'It re-prompts the model until the output happens to be valid', correct: false },
        { text: 'It fine-tunes the model on the schema before each call', correct: false },
        { text: 'At each token step it masks (zeroes) the probability of any token that would violate the grammar, so only valid tokens can be sampled', correct: true },
        { text: 'It parses the completed text and repairs any errors afterward', correct: false },
      ],
      explain: 'A grammar compiled from the schema produces a per-token logit mask: illegal next-tokens get zero probability, so the sampled token is always schema-valid. It is enforcement during decoding, not after.',
    },
    {
      question: 'Constrained decoding guarantees which of the following?',
      options: [
        { text: 'Both the shape and the factual correctness of the values', correct: false },
        { text: 'The shape/structure of the output, but not the correctness of the values', correct: true },
        { text: 'The correctness of the values, but not the shape', correct: false },
        { text: 'That the model will never refuse the request', correct: false },
      ],
      explain: 'It guarantees the output parses and matches the schema. It cannot guarantee the extracted total or label is actually correct — that is still the model\'s judgment, so accuracy must be evaluated separately.',
    },
    {
      question: 'For "the model looked for a field and it was not present in the source," which schema choice is best?',
      options: [
        { text: 'Make the field required and hope the model leaves it blank', correct: false },
        { text: 'Make the field an explicit nullable value and instruct the model to return null when absent', correct: true },
        { text: 'Omit the field entirely from the schema', correct: false },
        { text: 'Use a random default so parsing never fails', correct: false },
      ],
      explain: 'An explicit nullable field (plus a prompt instruction to return null, not guess) proves the model considered the field and found nothing, preventing hallucinated values while keeping the output valid.',
    },
    {
      question: 'You are streaming structured output to a UI. What is the correct handling?',
      options: [
        { text: 'Validate every streamed chunk against the full schema and act on it immediately', correct: false },
        { text: 'Use lenient partial parsing to render incrementally, but only trust and act on the schema-validated final buffer', correct: true },
        { text: 'Never stream structured output — it is impossible to parse', correct: false },
        { text: 'Fire side effects as soon as each field first appears', correct: false },
      ],
      explain: 'Partial parsing auto-closes the truncated JSON for progressive rendering, but a mid-stream field can still change. Only the complete, schema-validated object is trustworthy for business logic and side effects.',
    },
    {
      question: 'Which Zod construct best models an output that is exactly one of several differently-shaped variants (e.g., an agent action)?',
      options: [
        { text: 'z.object() with every possible field marked optional', correct: false },
        { text: 'z.record() with open string keys', correct: false },
        { text: 'z.discriminatedUnion() keyed on a literal type tag, with each variant carrying its own fields', correct: true },
        { text: 'z.string() and parse it manually', correct: false },
      ],
      explain: 'A discriminated union on a literal tag (e.g. type) lets each variant have its own typed shape, cleanly modeling routing and agent action spaces while keeping everything type-safe.',
    },
    {
      question: 'When evaluating structured output quality, why measure conformance and field accuracy separately?',
      options: [
        { text: 'They always move together, so one metric is enough', correct: false },
        { text: 'Conformance (does it fit the shape) is distinct from accuracy (are the values right); a schema-valid output can still contain wrong values', correct: true },
        { text: 'Accuracy is only relevant for classification, never extraction', correct: false },
        { text: 'Conformance cannot be automated, so accuracy substitutes for it', correct: false },
      ],
      explain: 'Conformance is a cheap binary parse rate (~100% with constrained decoding). Accuracy compares values to a gold set. A well-formatted output with the wrong total still fails — so both axes must be tracked independently.',
    },
  ],
};
