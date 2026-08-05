export default {
  id: 'finetuning-vs-rag-vs-prompting-course',
  title: 'Fine-tuning vs RAG vs Prompting',
  icon: '🎛️',
  color: '#ff7b72',
  lessons: [
    {
      id: 'intro',
      group: 'Foundations',
      nav: '0 · Overview & mental model',
      title: 'Course overview & the three axes',
      lede: 'Three ways to change what an LLM does — and the one-sentence mental model that keeps them straight forever.',
      html: `
        <p>Every technique for steering a large language model reduces to changing one of three things. Interviewers love this question because it separates people who <em>use</em> LLMs from people who <em>understand</em> them.</p>

        <div class='diagram'>
          <svg viewBox='0 0 640 210' width='640'>
            <defs><marker id='arrow' markerWidth='10' markerHeight='10' refX='8' refY='3' orient='auto'><path d='M0,0 L8,3 L0,6 Z' fill='#8b98a9'/></marker></defs>
            <rect class='node-box' x='20' y='30' width='170' height='60' rx='8'/>
            <text class='node-text' x='105' y='55' text-anchor='middle'>Prompting</text>
            <text class='node-sub' x='105' y='73' text-anchor='middle'>changes INSTRUCTIONS</text>
            <rect class='node-box worker' x='235' y='30' width='170' height='60' rx='8'/>
            <text class='node-text' x='320' y='55' text-anchor='middle'>RAG</text>
            <text class='node-sub' x='320' y='73' text-anchor='middle'>changes KNOWLEDGE</text>
            <rect class='node-box tool' x='450' y='30' width='170' height='60' rx='8'/>
            <text class='node-text' x='535' y='55' text-anchor='middle'>Fine-tuning</text>
            <text class='node-sub' x='535' y='73' text-anchor='middle'>changes BEHAVIOR</text>
            <rect class='node-box' x='235' y='135' width='170' height='55' rx='8' style='fill:#1c2333'/>
            <text class='node-text' x='320' y='160' text-anchor='middle'>Same base model</text>
            <text class='node-sub' x='320' y='177' text-anchor='middle'>frozen weights underneath</text>
            <line class='edge' x1='105' y1='90' x2='300' y2='135'/>
            <line class='edge' x1='320' y1='90' x2='320' y2='135'/>
            <line class='edge' x1='535' y1='90' x2='340' y2='135'/>
          </svg>
          <div class='diagram-caption'>The three axes are orthogonal — you can turn all three knobs at once on the same base model.</div>
        </div>

        <h3>The one-liner that wins the room</h3>
        <p><span class='kicker'>Prompting</span> tells the model <em>what to do right now</em>. <span class='kicker'>RAG</span> gives it <em>facts it did not memorize</em>. <span class='kicker'>Fine-tuning</span> rewrites <em>how it behaves by default</em>. Prompting and RAG live in the <strong>context window</strong> (runtime, weights frozen); fine-tuning lives in the <strong>weights</strong> (a training step, changed forever).</p>

        <div class='two-col'>
          <div class='pattern-card'>
            <h4>Runtime knobs (no training)</h4>
            <p>Prompting + RAG. Cheap to iterate, versionable in git, revertible in seconds. This is where you start 90% of the time.</p>
            <div class='tag-row'><span class='tag use'>fast iteration</span><span class='tag use'>no GPUs</span></div>
          </div>
          <div class='pattern-card'>
            <h4>Weight knobs (training)</h4>
            <p>Fine-tuning. Slow to iterate, needs data + GPUs + eval harness, but bakes behavior in so you stop paying for it in every prompt.</p>
            <div class='tag-row'><span class='tag avoid'>needs data</span><span class='tag avoid'>needs eval</span></div>
          </div>
        </div>

        <h3>What we'll cover</h3>
        <ul>
          <li>The <strong>knowledge vs behavior</strong> distinction (the single most-probed idea).</li>
          <li>Prompting depth: in-context learning, structured outputs, <span class='kicker'>prompt caching</span>.</li>
          <li>Long-context windows vs RAG — the 2024–2025 debate.</li>
          <li>Fine-tuning internals: LoRA/QLoRA, SFT vs DPO vs continued pre-training, data, serving.</li>
          <li>Cost models, combining approaches (RAFT, distillation), and a decision framework.</li>
        </ul>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          <p>"Prompting changes instructions, RAG changes knowledge, fine-tuning changes behavior — the first two live in the context window with frozen weights, the third lives in the weights. Reach for the weight knob only after the runtime knobs plateau."</p>
        </div>
      `,
    },
    {
      id: 'core-distinction',
      group: 'Foundations',
      nav: '1 · Knowledge vs behavior',
      title: 'The core distinction interviewers probe',
      lede: 'The trap question: "just fine-tune it on our docs." Knowing why that is usually wrong is the whole interview.',
      html: `
        <p>Here is the highest-signal misconception in the entire topic: people assume <strong>fine-tuning teaches facts</strong>. It mostly does not. Fine-tuning is great at teaching <em>form, style, and behavior</em>; it is a poor, expensive, and dangerous way to inject <em>knowledge</em>.</p>

        <table>
          <tr><th>You want to change…</th><th>Reach for</th><th>Why</th></tr>
          <tr><td>Which facts the model can cite (docs, policies, tickets)</td><td><span class='kicker'>RAG</span></td><td>Fresh, attributable, access-controlled, updatable without retraining</td></tr>
          <tr><td>Output format / tone / persona / a fixed schema</td><td><span class='kicker'>Fine-tuning</span> (or a good system prompt)</td><td>Behavior is exactly what gradient descent bakes in well</td></tr>
          <tr><td>One-off task instructions for this request</td><td><span class='kicker'>Prompting</span></td><td>Zero cost to change, per-request flexibility</td></tr>
          <tr><td>A skill the base model literally cannot do (new language, niche format)</td><td><span class='kicker'>Fine-tuning</span> + data</td><td>Behavior/skill acquisition, not fact lookup</td></tr>
        </table>

        <div class='callout danger'>
          <div class='c-title'>War story: the "fine-tune on our docs" trap</div>
          <p>A team fine-tuned a 7B model on 5,000 internal wiki pages to build a support bot. Result: fluent, confident, and <strong>wrong</strong> — it hallucinated plausible-sounding policy numbers, and every doc edit meant a retrain. They rebuilt it as RAG in a week and accuracy jumped, with citations. <strong>Facts change; behavior is stable. Put the thing that changes in the retrievable layer.</strong></p>
        </div>

        <h3>Why weights are a bad database</h3>
        <ul>
          <li><strong>Lossy:</strong> facts get averaged into billions of parameters; the model interpolates and confabulates.</li>
          <li><strong>Stale:</strong> the moment training ends, the "database" is frozen. RAG is fresh on every query.</li>
          <li><strong>No provenance:</strong> you cannot show a source, redact a row, or enforce per-user ACLs on a weight.</li>
          <li><strong>Expensive to update:</strong> one changed fact ⇒ a full retrain + re-eval cycle.</li>
        </ul>

        <div class='callout warn'>
          <div class='c-title'>Gotcha — the exception that proves the rule</div>
          <p>Fine-tuning <em>can</em> teach facts, but you need <strong>massive redundancy</strong> (a fact repeated many ways, thousands of times) and you still lose freshness and citations. Continued pre-training on a domain corpus does inject knowledge — but it is the heaviest, most expensive tool in the box. Default to RAG for facts.</p>
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          <p>"RAG is for knowledge, fine-tuning is for behavior. Weights are a lossy, stale, un-citable database — so put facts in a retriever and use fine-tuning to shape <em>how</em> the model responds, not <em>what</em> it knows."</p>
        </div>
      `,
    },
    {
      id: 'prompting',
      group: 'The three approaches',
      nav: '2 · Prompting / in-context',
      title: 'Prompting & in-context learning',
      lede: 'The cheapest, fastest knob — and how far it actually goes before you need anything heavier.',
      html: `
        <p>Prompting is <span class='kicker'>in-context learning</span>: the model learns your task from the tokens in the context window at inference time, with <strong>zero weight updates</strong>. It is astonishingly capable and it is where you should always start.</p>

        <h3>The in-context ladder (climb it in order)</h3>
        <ol>
          <li><strong>Zero-shot:</strong> just ask. "Classify the sentiment."</li>
          <li><strong>Few-shot:</strong> add 2–8 worked examples. Often the single biggest quality jump for the least effort.</li>
          <li><strong>Chain-of-thought (CoT):</strong> "think step by step" — elicits reasoning for math/logic. Modern reasoning models (o-series, Claude with extended thinking) internalize this.</li>
          <li><strong>System prompt:</strong> a persistent persona/role/rules block that frames every turn.</li>
          <li><strong>Structured output:</strong> JSON mode / function-calling / constrained decoding to force a schema (OpenAI Structured Outputs, tool schemas, Outlines/Guidance grammars).</li>
          <li><strong>Agentic patterns:</strong> ReAct (reason + act + observe), tool use, self-reflection loops.</li>
        </ol>

        <div class='callout warn'>
          <div class='c-title'>The token tax (a.k.a. the forever cost)</div>
          <p>Everything you stuff into the prompt — the system block, the 8 few-shot examples, the retrieved docs — is <strong>re-sent and re-billed on every single call</strong>. A 4,000-token system+examples preamble at scale is a permanent line item. This "forever tax" is the classic argument <em>for</em> baking behavior into weights via fine-tuning… but see the next callout.</p>
        </div>

        <div class='callout good'>
          <div class='c-title'>Prompt caching changes the math</div>
          <p>Anthropic and OpenAI now offer <span class='kicker'>prompt caching</span>: a stable prefix (your big system prompt + few-shot block) is cached server-side, so repeat calls pay a fraction (often ~10% for a cache read) and run faster. This quietly undercut the "you must fine-tune to escape the token tax" argument — often you can just cache the preamble.</p>
        </div>

        <h3>Where prompting stops scaling</h3>
        <div class='two-col'>
          <div class='pattern-card'>
            <h4>Prompting shines</h4>
            <div class='tag-row'><span class='tag use'>prototyping</span><span class='tag use'>tasks base model can already do</span><span class='tag use'>frequently-changing instructions</span></div>
          </div>
          <div class='pattern-card'>
            <h4>Prompting strains</h4>
            <div class='tag-row'><span class='tag avoid'>very long, rigid formats</span><span class='tag avoid'>high per-call volume</span><span class='tag avoid'>latency-sensitive with huge preambles</span></div>
          </div>
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          <p>"Prompting is in-context learning — zero weight updates, iterate in seconds. Climb the ladder from zero-shot to few-shot to CoT to structured outputs. The classic downside is the per-call token tax, but prompt caching now makes a big stable preamble cheap, so exhaust prompting before you train anything."</p>
        </div>
      `,
    },
    {
      id: 'long-context-vs-rag',
      group: 'The three approaches',
      nav: '3 · Long context vs RAG',
      title: 'Long context windows vs RAG',
      lede: 'Gemini has a 1M–2M token window. Does that kill RAG? The nuanced answer is a favorite senior-level probe.',
      html: `
        <p>By 2024–2025, context windows exploded: <strong>GPT-4.1 and Claude at 200K+</strong>, <strong>Gemini 1.5/2.5 at 1M–2M tokens</strong>. A tempting take: "just paste the whole knowledge base in the prompt — RAG is dead." Interviewers want you to dismantle that.</p>

        <h3>Why long context does NOT replace RAG</h3>
        <table>
          <tr><th>Dimension</th><th>Stuff-it-all-in long context</th><th>RAG</th></tr>
          <tr><td>Cost per query</td><td>Pay for 1M tokens <em>every</em> call — brutal at scale</td><td>Pay for ~few K retrieved tokens</td></tr>
          <tr><td>Latency</td><td>Grows with context length (prefill is expensive)</td><td>Retrieval + small prompt = fast</td></tr>
          <tr><td>Freshness</td><td>Re-paste to update</td><td>Update the index; instant</td></tr>
          <tr><td>Access control</td><td>Hard — all-or-nothing in the prompt</td><td>Filter by ACL at retrieval time</td></tr>
          <tr><td>Accuracy at length</td><td><span class='kicker'>Lost in the middle</span> / context rot</td><td>Only relevant chunks in view</td></tr>
          <tr><td>Corpus size ceiling</td><td>Bounded by window (millions of tokens)</td><td>Unbounded (billions, in a vector DB)</td></tr>
        </table>

        <div class='callout warn'>
          <div class='c-title'>"Lost in the middle" &amp; context rot</div>
          <p>Empirical finding (Liu et al., 2023) and many follow-ups: models attend best to the <strong>start and end</strong> of a long context and degrade in the <strong>middle</strong>. Bigger windows ≠ uniform recall. A tight, reranked 4K-token RAG prompt often <em>beats</em> a 1M-token dump on precision — and costs 100× less.</p>
        </div>

        <h3>The real synthesis</h3>
        <p>Long context and RAG are <strong>complementary</strong>. Modern systems use retrieval to fill a <em>generous</em> window: retrieve broadly, rerank, then hand the model a rich-but-relevant 20–50K token context instead of a stingy 2K one. Long context makes RAG <em>better</em> (bigger, higher-recall chunks), it does not delete it.</p>

        <div class='pattern-card'>
          <h4>When long-context-only is fine</h4>
          <p>One-off analysis of a single big document (a 300-page contract, one codebase), low query volume, no freshness/ACL needs. Paste it and go — building a retriever would be over-engineering.</p>
          <div class='tag-row'><span class='tag use'>single doc, low volume</span><span class='tag avoid'>large corpus, high volume, ACLs</span></div>
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          <p>"Big windows don't kill RAG — cost, latency, freshness, access control, and 'lost in the middle' all still favor retrieval at scale. Long context and RAG are complementary: retrieve + rerank to fill a generous window with relevant tokens, don't dump the whole corpus every call."</p>
        </div>
      `,
    },
    {
      id: 'rag',
      group: 'The three approaches',
      nav: '4 · RAG recap',
      title: 'RAG in one lesson',
      lede: 'Retrieval-Augmented Generation: give the model an open-book exam instead of making it memorize.',
      html: `
        <p><span class='kicker'>RAG</span> = retrieve relevant chunks from an external store, then generate an answer grounded in them. The model takes an <strong>open-book exam</strong>: it does not need to have memorized your data, it just needs to read and synthesize what you hand it.</p>

        <div class='diagram'>
          <svg viewBox='0 0 660 200' width='660'>
            <defs><marker id='arrow2' markerWidth='10' markerHeight='10' refX='8' refY='3' orient='auto'><path d='M0,0 L8,3 L0,6 Z' fill='#8b98a9'/></marker></defs>
            <rect class='node-box' x='10' y='70' width='120' height='55' rx='8'/>
            <text class='node-text' x='70' y='95' text-anchor='middle'>Query</text>
            <text class='node-sub' x='70' y='112' text-anchor='middle'>embed</text>
            <line class='edge' x1='130' y1='97' x2='190' y2='97' marker-end='url(#arrow2)'/>
            <rect class='node-box tool' x='190' y='70' width='130' height='55' rx='8'/>
            <text class='node-text' x='255' y='95' text-anchor='middle'>Vector DB</text>
            <text class='node-sub' x='255' y='112' text-anchor='middle'>top-k + rerank</text>
            <line class='edge' x1='320' y1='97' x2='380' y2='97' marker-end='url(#arrow2)'/>
            <rect class='node-box' x='380' y='70' width='130' height='55' rx='8'/>
            <text class='node-text' x='445' y='95' text-anchor='middle'>Prompt</text>
            <text class='node-sub' x='445' y='112' text-anchor='middle'>query + chunks</text>
            <line class='edge' x1='510' y1='97' x2='560' y2='97' marker-end='url(#arrow2)'/>
            <rect class='node-box worker' x='540' y='70' width='110' height='55' rx='8'/>
            <text class='node-text' x='595' y='100' text-anchor='middle'>LLM answer</text>
          </svg>
          <div class='diagram-caption'>Embed → retrieve top-k → rerank → stuff into prompt → generate grounded answer (ideally with citations).</div>
        </div>

        <h3>Why teams reach for RAG first</h3>
        <ul>
          <li><strong>Freshness:</strong> update the index, not the weights. New policy at 9am is answerable at 9:01.</li>
          <li><strong>Citations:</strong> you can show sources — essential for trust, compliance, and debugging hallucinations.</li>
          <li><strong>Access control:</strong> filter retrieval by user/tenant/role so people only see what they may.</li>
          <li><strong>Scale:</strong> a vector DB holds billions of chunks; a context window holds thousands of tokens.</li>
          <li><strong>Cheap iteration:</strong> no GPUs, no training runs, no eval regressions from retraining.</li>
        </ul>

        <div class='callout warn'>
          <div class='c-title'>Gotcha — RAG quality is retrieval quality</div>
          <p>Garbage retrieval ⇒ garbage answer, confidently delivered. The hard parts are <strong>chunking</strong>, <strong>embedding choice</strong>, <strong>hybrid search</strong> (dense + BM25 keyword), and a <strong>reranker</strong> (Cohere Rerank, bge-reranker, cross-encoders). Most "RAG doesn't work" stories are actually "our retriever returns junk" stories.</p>
        </div>

        <p><strong>Real tools:</strong> orchestration with LlamaIndex / LangChain; vector stores Pinecone, Weaviate, Qdrant, pgvector, Milvus; embeddings from OpenAI, Cohere, or open <code>bge</code>/<code>e5</code>; rerankers from Cohere or open cross-encoders.</p>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          <p>"RAG turns a closed-book exam into an open-book one: retrieve relevant chunks, ground the answer, cite sources. It wins on freshness, citations, access control, and scale — and its failure mode is almost always the retriever, not the LLM, so invest in chunking, hybrid search, and reranking."</p>
        </div>
      `,
    },
    {
      id: 'finetuning-intro',
      group: 'The three approaches',
      nav: '5 · Fine-tuning basics',
      title: 'Fine-tuning: full vs parameter-efficient',
      lede: 'Actually changing the weights — the difference between full fine-tuning and PEFT, and why almost nobody does full anymore.',
      html: `
        <p><span class='kicker'>Fine-tuning</span> continues training a pretrained model on your data so new behavior is <strong>baked into the weights</strong>. Unlike prompting/RAG, this is a real training step: gradients, optimizer, GPUs, checkpoints, evals.</p>

        <h3>Full fine-tuning vs PEFT</h3>
        <table>
          <tr><th></th><th>Full fine-tuning</th><th>PEFT (e.g. LoRA)</th></tr>
          <tr><td>What updates</td><td><strong>All</strong> weights (billions)</td><td>Tiny <strong>added</strong> adapter (&lt;1% of params)</td></tr>
          <tr><td>GPU memory</td><td>Huge — weights + grads + optimizer states (Adam ≈ 3–4× weights)</td><td>Small — only adapter grads/states</td></tr>
          <tr><td>Output artifact</td><td>A full model copy (13B → ~26GB fp16)</td><td>A few MB adapter file</td></tr>
          <tr><td>Catastrophic forgetting</td><td>Higher risk</td><td>Lower (base is frozen)</td></tr>
          <tr><td>Multi-task serving</td><td>N full models</td><td>N adapters, one base — hot-swappable</td></tr>
          <tr><td>When</td><td>Big domain shift, you own the base, lots of data + GPUs</td><td>The default for 95% of use cases</td></tr>
        </table>

        <div class='callout good'>
          <div class='c-title'>Rule of thumb</div>
          <p>Start with <strong>LoRA/QLoRA</strong>. It gets you 90–99% of full fine-tuning quality at a fraction of the memory, produces a tiny portable artifact, and lets you serve many adapters on one base. Reach for full fine-tuning only when PEFT demonstrably plateaus and you have the budget.</p>
        </div>

        <p><strong>Toolchain:</strong> HuggingFace <code>transformers</code> + <code>peft</code> + <code>trl</code>, <code>Axolotl</code> and <code>Unsloth</code> (2× faster, less VRAM) for open models; the OpenAI / Google / Cohere <em>fine-tuning APIs</em> for hosted models where you just upload a JSONL and get an adapter back.</p>

        <div class='callout warn'>
          <div class='c-title'>Gotcha — you can only fine-tune what you can access</div>
          <p>You cannot fine-tune GPT-4-class frontier weights directly; you use the provider's fine-tuning <em>API</em> (limited to certain models). Full control (LoRA on any layer, continued pre-training) requires <strong>open-weight</strong> models: Llama, Mistral, Qwen, Gemma.</p>
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          <p>"Full fine-tuning updates every weight — huge memory, a full model copy, more forgetting. PEFT like LoRA freezes the base and trains a &lt;1% adapter: near-equal quality, tiny artifact, many adapters per base. Default to LoRA/QLoRA and only go full when it plateaus."</p>
        </div>
      `,
    },
    {
      id: 'lora',
      group: 'Fine-tuning deep dive',
      nav: '6 · LoRA & QLoRA',
      title: 'LoRA & QLoRA, explained',
      lede: 'The low-rank trick that made fine-tuning fit on a single consumer GPU — with the exact math and hyperparameters interviewers ask for.',
      html: `
        <p><span class='kicker'>LoRA</span> (Low-Rank Adaptation) is the insight that a fine-tuning weight update is <strong>low-rank</strong> — it lives in a tiny subspace. So instead of learning the full update matrix <code>ΔW</code> (d×d, millions of numbers), you learn two skinny matrices whose product approximates it.</p>

        <h3>The math (know this cold)</h3>
        <pre><code>W_effective = W_frozen + ΔW
ΔW = B · A            # B is d×r, A is r×d, rank r is small (4–64)
h = W_frozen·x + (α / r) · (B · A · x)</code></pre>
        <ul>
          <li><code>W_frozen</code> stays fixed — no gradients flow to it.</li>
          <li>Only <code>A</code> and <code>B</code> train. If d=4096 and r=8, you learn ~65K params instead of ~16M per matrix — a ~250× reduction.</li>
          <li><code>A</code> is init random (Gaussian), <code>B</code> init <strong>zero</strong>, so <code>ΔW = 0</code> at step 0 — training starts exactly at the base model, no shock.</li>
          <li><code>α</code> (alpha) is a scaling constant; the effective update scales by <code>α/r</code>. Common practice: set <strong>α = 2×r</strong> (or α = r), then tune learning rate.</li>
        </ul>

        <h3>Hyperparameters that matter</h3>
        <table>
          <tr><th>Knob</th><th>Typical</th><th>Intuition</th></tr>
          <tr><td>rank <code>r</code></td><td>8–16 (up to 64 for hard tasks)</td><td>Higher r = more capacity + more params; diminishing returns</td></tr>
          <tr><td><code>α</code> (alpha)</td><td>16–32 (≈ 2r)</td><td>Effective LR multiplier on the adapter</td></tr>
          <tr><td><code>target_modules</code></td><td><code>q_proj,k_proj,v_proj,o_proj</code> (often + MLP)</td><td>Which projections get adapters; attention is the usual minimum</td></tr>
          <tr><td>dropout</td><td>0.05–0.1</td><td>Regularize small-data runs</td></tr>
        </table>

        <h3>QLoRA — LoRA on a diet</h3>
        <p><span class='kicker'>QLoRA</span> (Dettmers et al., 2023) makes it fit on a single 24GB (or even smaller) GPU by <strong>quantizing the frozen base to 4-bit</strong> while training LoRA adapters in higher precision on top:</p>
        <ul>
          <li><strong>4-bit NF4</strong> (NormalFloat4) — a data type tuned for the normal distribution of weights.</li>
          <li><strong>Double quantization</strong> — quantize the quantization constants too, saving more memory.</li>
          <li><strong>Paged optimizers</strong> — offload optimizer state to CPU to survive memory spikes.</li>
          <li>Result: fine-tune a 65B model on a single 48GB GPU; a 7B on a laptop-class 24GB card.</li>
        </ul>

        <div class='callout warn'>
          <div class='c-title'>Gotcha — merge vs keep separate</div>
          <p>You can <strong>merge</strong> an adapter back into the base (<code>W + BA</code>) for zero inference overhead — but then you lose hot-swapping and get one monolithic model. Keep adapters <strong>separate</strong> if you serve many tasks on one base. QLoRA adapters trained on a 4-bit base should generally be merged into an fp16 base carefully — quantization mismatch can cost a little quality.</p>
        </div>

        <div class='callout good'>
          <div class='c-title'>Beyond LoRA</div>
          <p><strong>DoRA</strong> (weight-decomposed LoRA) splits magnitude/direction for a bit more quality; <strong>rsLoRA</strong> rescales for stability at high rank. Nice to name-drop, but plain LoRA/QLoRA is still the workhorse.</p>
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          <p>"LoRA freezes W and learns a low-rank update ΔW = B·A scaled by α/r, so you train &lt;1% of params; B starts at zero so you begin exactly at the base. QLoRA adds a 4-bit NF4 frozen base plus double-quant and paged optimizers to fit huge models on one GPU."</p>
        </div>
      `,
    },
    {
      id: 'ft-types',
      group: 'Fine-tuning deep dive',
      nav: '7 · SFT / DPO / pretraining',
      title: 'Types of fine-tuning',
      lede: 'SFT teaches the model to imitate; preference tuning teaches it to choose; continued pre-training refills its knowledge. Know which is which.',
      html: `
        <p>"Fine-tuning" is an umbrella. Interviewers want you to distinguish the three families and, crucially, <strong>DPO vs RLHF</strong>.</p>

        <h3>1 · Supervised fine-tuning (SFT)</h3>
        <p>The workhorse. Show the model <code>(prompt → ideal response)</code> pairs; it learns to <strong>imitate</strong>. Formatted with the model's <span class='kicker'>chat template</span> and trained with next-token cross-entropy. This is what "instruction tuning" is. 90% of practical fine-tuning is SFT.</p>

        <h3>2 · Preference / alignment tuning</h3>
        <p>SFT teaches one good answer; preference tuning teaches the model to <strong>prefer better over worse</strong> from <code>(prompt, chosen, rejected)</code> triples.</p>
        <table>
          <tr><th>Method</th><th>How</th><th>Trade-off</th></tr>
          <tr><td><strong>RLHF (PPO)</strong></td><td>Train a reward model, then RL-optimize the policy against it</td><td>Powerful, but complex, unstable, needs a reward model + RL loop</td></tr>
          <tr><td><strong>DPO</strong></td><td>Skip the reward model — a clever loss directly raises P(chosen) over P(rejected)</td><td>Simple, stable, no RL; the modern default for preference tuning</td></tr>
          <tr><td><strong>ORPO</strong></td><td>Combines SFT + preference in <em>one</em> stage, no reference model</td><td>Cheaper pipeline; newer</td></tr>
          <tr><td><strong>KTO</strong></td><td>Needs only per-example good/bad labels, not paired comparisons</td><td>Easier data collection</td></tr>
        </table>

        <div class='callout good'>
          <div class='c-title'>The DPO one-liner</div>
          <p><strong>DPO turns RLHF into a simple classification-style loss.</strong> No separate reward model, no PPO rollout instability — just a supervised objective over (chosen, rejected) pairs with a reference model to stay anchored. It is why alignment got accessible to small teams.</p>
        </div>

        <h3>3 · Continued pre-training (domain-adaptive)</h3>
        <p>Keep doing <em>next-token prediction</em> on a big <strong>unlabeled</strong> domain corpus (legal, medical, code). This is the one form of fine-tuning that genuinely <strong>injects knowledge</strong> — but it is the heaviest tool, needs the most data (billions of tokens), and risks catastrophic forgetting of general ability.</p>

        <div class='diagram'>
          <svg viewBox='0 0 640 120' width='640'>
            <rect class='node-box tool' x='10' y='35' width='150' height='50' rx='8'/>
            <text class='node-text' x='85' y='58' text-anchor='middle'>Continued pretrain</text>
            <text class='node-sub' x='85' y='74' text-anchor='middle'>knowledge</text>
            <line class='edge' x1='160' y1='60' x2='245' y2='60'/>
            <rect class='node-box' x='245' y='35' width='150' height='50' rx='8'/>
            <text class='node-text' x='320' y='58' text-anchor='middle'>SFT</text>
            <text class='node-sub' x='320' y='74' text-anchor='middle'>instruction-follow</text>
            <line class='edge' x1='395' y1='60' x2='480' y2='60'/>
            <rect class='node-box worker' x='480' y='35' width='150' height='50' rx='8'/>
            <text class='node-text' x='555' y='58' text-anchor='middle'>DPO / RLHF</text>
            <text class='node-sub' x='555' y='74' text-anchor='middle'>align to preference</text>
          </svg>
          <div class='diagram-caption'>The canonical post-training pipeline: (optional) continued pre-training → SFT → preference tuning.</div>
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          <p>"SFT teaches imitation from prompt→response pairs; DPO/RLHF teach preference from chosen/rejected pairs — DPO is the modern default because it drops the reward model and RL loop for a simple supervised loss; continued pre-training on raw domain text is the only variant that really injects knowledge, and it's the heaviest."</p>
        </div>
      `,
    },
    {
      id: 'ft-data',
      group: 'Fine-tuning deep dive',
      nav: '8 · Data & training',
      title: 'Data requirements & training mechanics',
      lede: 'The dirty secret: fine-tuning success is 80% data quality. Plus the failure modes that will burn you.',
      html: `
        <p>Ask any practitioner and they will tell you the model architecture barely matters compared to <strong>the data</strong>. Fine-tuning is a data-engineering problem wearing an ML hat.</p>

        <h3>Quality &gt; quantity (by a mile)</h3>
        <ul>
          <li><strong>Hundreds to a few thousand</strong> high-quality examples usually beat tens of thousands of noisy ones. LIMA showed ~1,000 curated examples can align a strong base model.</li>
          <li><strong>Consistency is everything:</strong> the model imitates <em>exactly</em> what you show — including your mistakes, formatting drift, and contradictory labels.</li>
          <li><strong>Diversity within the task:</strong> cover edge cases, refusals, and the hard tail, not 2,000 near-duplicates.</li>
          <li>Format with the base model's <span class='kicker'>chat template</span> (special tokens matter — a wrong template silently tanks results).</li>
        </ul>

        <div class='callout danger'>
          <div class='c-title'>Failure mode 1 — catastrophic forgetting</div>
          <p>Fine-tune too hard on a narrow task and the model <strong>forgets general abilities</strong> it had. Your JSON-extractor stops being able to hold a conversation. Mitigate with: LoRA (base frozen), low learning rate, fewer epochs, and mixing in a slice of general/instruction data.</p>
        </div>

        <div class='callout danger'>
          <div class='c-title'>Failure mode 2 — overfitting</div>
          <p>Train too many epochs on too little data and it <strong>memorizes</strong> rather than generalizes. The tell: <strong>training loss keeps dropping while eval/validation loss turns up</strong> (the divergence). Fix: early stopping on a held-out set, 1–3 epochs, more/diverse data, weight decay.</p>
        </div>

        <div class='diagram'>
          <svg viewBox='0 0 460 200' width='460'>
            <line class='edge' x1='50' y1='170' x2='430' y2='170'/>
            <line class='edge' x1='50' y1='170' x2='50' y2='20'/>
            <text class='node-sub' x='240' y='192' text-anchor='middle'>epochs →</text>
            <text class='node-sub' x='20' y='95' text-anchor='middle' transform='rotate(-90 20 95)'>loss</text>
            <path d='M50,40 C150,110 300,150 430,162' fill='none' stroke='#3fb950' stroke-width='2'/>
            <text class='node-sub' x='360' y='150' fill='#3fb950'>train loss ↓</text>
            <path d='M50,60 C160,130 260,120 430,60' fill='none' stroke='#f85149' stroke-width='2'/>
            <text class='node-sub' x='330' y='70' fill='#f85149'>eval loss ↑ (overfit)</text>
            <line x1='250' y1='20' x2='250' y2='170' stroke='#8b98a9' stroke-dasharray='4 4'/>
            <text class='node-sub' x='250' y='34' text-anchor='middle'>stop here</text>
          </svg>
          <div class='diagram-caption'>Overfitting signature: train loss falls, eval loss bottoms then rises. Early-stop at the divergence.</div>
        </div>

        <div class='callout warn'>
          <div class='c-title'>Gotcha — you still need an eval set BEFORE you train</div>
          <p>Hold out a representative test set the model never sees, and define your success metric first. Without it you cannot tell improvement from overfitting, and you cannot prove the fine-tune beat the prompt-only baseline.</p>
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          <p>"Fine-tuning is a data problem: a few hundred to a few thousand clean, consistent, diverse examples in the right chat template beat tens of thousands of noisy ones. Watch for catastrophic forgetting and overfitting — the tell is eval loss rising while train loss falls — and hold out an eval set before you start."</p>
        </div>
      `,
    },
    {
      id: 'evaluation',
      group: 'Fine-tuning deep dive',
      nav: '9 · Evaluation',
      title: 'Measuring lift: did it actually help?',
      lede: 'The question that ends most hand-wavy answers: "how do you know your fine-tune / RAG change was better?"',
      html: `
        <p>Any senior interview drills into <strong>evaluation</strong>, because "it feels better" is how teams ship regressions. The discipline is the same whether you changed a prompt, a retriever, or the weights: <strong>define a metric, hold out data, compare against a baseline, guard against regressions.</strong></p>

        <h3>The non-negotiables</h3>
        <ul>
          <li><strong>Held-out / golden set:</strong> representative examples the system never trained or was tuned on. Freeze it. This is your ruler.</li>
          <li><strong>A baseline:</strong> always compare the change to the prior approach (prompt-only, or the previous model). A fine-tune that merely matches a good prompt is not worth the ops burden.</li>
          <li><strong>Regression testing:</strong> re-run the golden set on every change so you catch the thing you accidentally broke.</li>
        </ul>

        <h3>How to score, per approach</h3>
        <table>
          <tr><th>Signal type</th><th>Method</th><th>Notes</th></tr>
          <tr><td>Exact/structured (classification, extraction, JSON)</td><td>Accuracy, F1, exact-match, schema-valid rate</td><td>Cheap, deterministic — use wherever possible</td></tr>
          <tr><td>Open-ended generation</td><td><span class='kicker'>LLM-as-judge</span> with a rubric; pairwise A/B</td><td>Scalable but biased — calibrate and spot-check</td></tr>
          <tr><td>RAG-specific</td><td>Retrieval recall@k, faithfulness/groundedness, answer relevance (RAGAS)</td><td>Separate <em>retrieval</em> quality from <em>generation</em> quality</td></tr>
          <tr><td>Ground truth from users</td><td>Thumbs up/down, task completion, escalation rate</td><td>Best signal; laggy and noisy</td></tr>
        </table>

        <div class='callout warn'>
          <div class='c-title'>Gotcha — LLM-as-judge is biased</div>
          <p>Judge models favor longer, more confident, first-listed answers and can be gamed. Mitigate: randomize option order, use a rubric, require citations, and periodically check the judge against human labels. Never let the judge be the <em>only</em> gate for a high-stakes ship.</p>
        </div>

        <div class='callout danger'>
          <div class='c-title'>War story — the leaked test set</div>
          <p>A team's fine-tune scored 98% offline and flopped in prod. Cause: eval examples had leaked into the training data (dedup bug), so the model had memorized the test. <strong>Always dedup train vs eval, and keep a truly untouched holdout.</strong> Contamination is the silent killer of eval.</p>
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          <p>"You prove a change with a frozen golden set, a real baseline, and regression tests — exact-match/F1 where you can, LLM-as-judge with a rubric where you can't, and for RAG you measure retrieval and generation separately. Watch for judge bias and train/test contamination."</p>
        </div>
      `,
    },
    {
      id: 'serving',
      group: 'Fine-tuning deep dive',
      nav: '10 · Serving fine-tuned models',
      title: 'Serving: multi-LoRA & deployment',
      lede: 'Training is half the job. Serving many fine-tuned variants efficiently is where LoRA quietly wins again.',
      html: `
        <p>Once you have adapters, how do you <strong>serve</strong> them? This is where PEFT pays a second dividend and where interviewers separate the "trained a notebook once" crowd from people who ran it in production.</p>

        <h3>The multi-LoRA superpower</h3>
        <p>Because a LoRA adapter is a few MB and the base is frozen, you can host <strong>one base model in GPU memory and hot-swap hundreds of adapters</strong> on top — even batching requests for <em>different</em> adapters together. One 13B base can serve per-customer, per-task fine-tunes without loading N full models.</p>

        <div class='diagram'>
          <svg viewBox='0 0 640 190' width='640'>
            <rect class='node-box' x='240' y='115' width='170' height='55' rx='8'/>
            <text class='node-text' x='325' y='140' text-anchor='middle'>Frozen base (13B)</text>
            <text class='node-sub' x='325' y='157' text-anchor='middle'>loaded once</text>
            <rect class='node-box tool' x='30' y='20' width='120' height='45' rx='8'/>
            <text class='node-text' x='90' y='47' text-anchor='middle'>Adapter A</text>
            <rect class='node-box tool' x='260' y='20' width='120' height='45' rx='8'/>
            <text class='node-text' x='320' y='47' text-anchor='middle'>Adapter B</text>
            <rect class='node-box tool' x='490' y='20' width='120' height='45' rx='8'/>
            <text class='node-text' x='550' y='47' text-anchor='middle'>Adapter C</text>
            <line class='edge' x1='90' y1='65' x2='270' y2='115'/>
            <line class='edge' x1='320' y1='65' x2='323' y2='115'/>
            <line class='edge' x1='550' y1='65' x2='380' y2='115'/>
          </svg>
          <div class='diagram-caption'>Multi-LoRA serving: one base in VRAM, many swappable/mergeable adapters — even mixed in a single batch.</div>
        </div>

        <h3>Real serving stacks</h3>
        <table>
          <tr><th>Tool</th><th>What it gives you</th></tr>
          <tr><td><strong>vLLM</strong></td><td>PagedAttention, high-throughput serving, built-in multi-LoRA support</td></tr>
          <tr><td><strong>LoRAX / S-LoRA / Punica</strong></td><td>Dynamic loading + batched inference across many adapters on one GPU</td></tr>
          <tr><td><strong>TGI (HF)</strong></td><td>Production text-generation server with adapter support</td></tr>
          <tr><td>Hosted FT APIs</td><td>OpenAI/Google/Cohere serve your adapter behind their endpoint — zero infra</td></tr>
        </table>

        <div class='callout warn'>
          <div class='c-title'>Merge vs keep-separate (serving edition)</div>
          <p><strong>Merge</strong> the adapter into the base ⇒ zero per-token adapter overhead, but one model per task and no batching across tasks. <strong>Keep separate</strong> ⇒ tiny runtime cost, but one base serves many tasks and you hot-swap in ms. Multi-tenant SaaS almost always keeps them separate.</p>
        </div>

        <div class='callout warn'>
          <div class='c-title'>Gotcha — cold starts & quantized serving</div>
          <p>Loading a big base is slow; keep it warm. And a model fine-tuned in fp16 then <strong>quantized to 4/8-bit for cheaper serving</strong> can lose a little quality — evaluate the <em>quantized</em> artifact, not just the training checkpoint.</p>
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          <p>"LoRA's second win is serving: one frozen base in VRAM plus many MB-sized adapters, hot-swapped and even batched across tasks with vLLM or LoRAX. Merge for zero overhead on a single task; keep adapters separate for multi-tenant serving — and always eval the quantized artifact you actually ship."</p>
        </div>
      `,
    },
    {
      id: 'cost-table',
      group: 'Decision framework',
      nav: '11 · Cost & tradeoffs',
      title: 'Cost & operational tradeoffs',
      lede: 'Follow the money: fine-tuning is CapEx, prompting is OpEx, and there is a break-even volume where each wins.',
      html: `
        <p>The cleanest way to reason about which approach to use is <strong>CapEx vs OpEx</strong>. Fine-tuning is a big up-front investment (CapEx) that lowers per-call cost; prompting/RAG is pay-as-you-go (OpEx) with near-zero setup.</p>

        <table>
          <tr><th></th><th>Prompting</th><th>RAG</th><th>Fine-tuning</th></tr>
          <tr><td>Up-front cost</td><td>~0</td><td>Low–med (index + pipeline)</td><td>High (data + GPUs + eval)</td></tr>
          <tr><td>Per-call cost</td><td>High (big prompts re-billed)</td><td>Med (retrieved tokens)</td><td>Low (short prompts)</td></tr>
          <tr><td>Iteration speed</td><td>Seconds</td><td>Minutes</td><td>Hours–days</td></tr>
          <tr><td>Freshness</td><td>Per-call</td><td>Instant (reindex)</td><td>Stale until retrain</td></tr>
          <tr><td>Skill/behavior change</td><td>Limited</td><td>None</td><td>Strong</td></tr>
          <tr><td>Ops burden</td><td>Low</td><td>Med (retriever)</td><td>High (training + serving + evals)</td></tr>
        </table>

        <div class='diagram'>
          <svg viewBox='0 0 460 210' width='460'>
            <line class='edge' x1='50' y1='180' x2='430' y2='180'/>
            <line class='edge' x1='50' y1='180' x2='50' y2='20'/>
            <text class='node-sub' x='240' y='202' text-anchor='middle'>call volume →</text>
            <text class='node-sub' x='22' y='100' text-anchor='middle' transform='rotate(-90 22 100)'>total cost</text>
            <path d='M50,150 L430,40' fill='none' stroke='#f0883e' stroke-width='2'/>
            <text class='node-sub' x='400' y='36' fill='#f0883e'>prompting</text>
            <path d='M50,60 L430,120' fill='none' stroke='#a371f7' stroke-width='2'/>
            <text class='node-sub' x='380' y='134' fill='#a371f7'>fine-tuning</text>
            <line x1='250' y1='20' x2='250' y2='180' stroke='#8b98a9' stroke-dasharray='4 4'/>
            <text class='node-sub' x='250' y='34' text-anchor='middle'>break-even</text>
          </svg>
          <div class='diagram-caption'>High fixed cost + low marginal cost (fine-tuning) beats low fixed + high marginal (prompting) past a break-even volume.</div>
        </div>

        <div class='callout good'>
          <div class='c-title'>The break-even mental model</div>
          <p>Fine-tuning wins when you have <strong>high, stable call volume</strong> over a <strong>stable task</strong> — the CapEx amortizes and the cheaper short prompts dominate. Below break-even, or when the task keeps changing, prompting/RAG's zero setup wins. Prompt caching pushes the break-even <em>further out</em> by lowering prompting's marginal cost.</p>
        </div>

        <div class='callout warn'>
          <div class='c-title'>Gotcha — count the hidden costs</div>
          <p>Fine-tuning's true cost is not the GPU hours; it is the <strong>eval harness, data pipeline, and the retrain-on-every-drift treadmill</strong>. A fine-tune that needs monthly refreshes because the domain moves can cost more than a well-cached prompt. Total cost of ownership, not sticker price.</p>
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          <p>"Fine-tuning is CapEx (big up-front, cheap per call); prompting/RAG is OpEx (zero setup, pricey per call). There's a break-even call volume — fine-tuning pays off at high, stable volume on a stable task. Count TCO: data pipeline, eval harness, and retrain treadmill, not just GPU hours."</p>
        </div>
      `,
    },
    {
      id: 'combining',
      group: 'Decision framework',
      nav: '12 · Combining approaches',
      title: 'Combining: RAFT, hybrid stacks, distillation',
      lede: 'The pros do not pick one. Production systems fine-tune for form, RAG for facts, and prompt for control — all at once.',
      html: `
        <p>The three axes are orthogonal, so the strongest systems <strong>combine</strong> them. The senior move in an interview is to refuse the false choice: "it's not fine-tuning <em>vs</em> RAG — I'd fine-tune the <em>behavior</em> and retrieve the <em>facts</em>."</p>

        <div class='two-col'>
          <div class='pattern-card'>
            <h4>Fine-tune for FORM</h4>
            <p>Bake in the persona, the strict output schema, the domain tone, the tool-calling style. Stable, so it belongs in weights.</p>
            <div class='tag-row'><span class='tag use'>format &amp; style</span><span class='tag use'>skills</span></div>
          </div>
          <div class='pattern-card'>
            <h4>RAG for FACTS</h4>
            <p>Retrieve the live docs, policies, and per-user data. Fresh and citable, so it belongs in the retriever.</p>
            <div class='tag-row'><span class='tag use'>knowledge</span><span class='tag use'>citations</span></div>
          </div>
        </div>

        <h3>RAFT — teaching a model to do RAG well</h3>
        <p><span class='kicker'>RAFT</span> (Retrieval-Augmented Fine-Tuning) fine-tunes a model on training examples that include a <strong>gold document plus distractor documents</strong>, teaching it to <strong>cite the relevant one and ignore the noise</strong>. It is "open-book exam prep": the model learns the <em>skill</em> of using retrieved context, which you then feed at runtime via RAG.</p>

        <h3>Distillation — bottling a big model's behavior</h3>
        <p><span class='kicker'>Distillation</span>: use a strong teacher (GPT-4-class) to generate high-quality outputs, then SFT a smaller, cheaper student on them. You get most of the teacher's behavior at a fraction of the serving cost/latency — the dominant way teams produce small task-specialized models.</p>

        <div class='callout danger'>
          <div class='c-title'>Gotcha — distillation ToS &amp; drift</div>
          <p>Some providers' terms restrict using their outputs to train competing models — check the license. Also, a distilled student inherits the teacher's <strong>biases and mistakes</strong>, and only covers the distribution you sampled; it will not generalize past it.</p>
        </div>

        <div class='callout good'>
          <div class='c-title'>Canonical production stack</div>
          <p>Open base → (optional) continued pre-training for domain → SFT for task/format → DPO for alignment → <strong>served with RAG</strong> for live facts → wrapped in a controlled <strong>prompt</strong> with structured outputs. All three axes, working together.</p>
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          <p>"Don't pick one — fine-tune for form, retrieve for facts, prompt for control. RAFT fine-tunes a model to use retrieved context (gold + distractors) so it cites the right doc; distillation SFTs a small student on a big teacher's outputs to bottle behavior cheaply."</p>
        </div>
      `,
    },
    {
      id: 'decision-tree',
      group: 'Decision framework',
      nav: '13 · The decision tree',
      title: 'The decision framework',
      lede: 'A repeatable flowchart you can literally draw on the whiteboard when asked "how would you approach this?"',
      html: `
        <p>When an interviewer describes a use case and asks how you'd build it, do not guess — <strong>walk the tree out loud</strong>. Start cheap, escalate only when a real requirement forces it.</p>

        <div class='diagram'>
          <svg viewBox='0 0 640 300' width='640'>
            <rect class='node-box' x='230' y='10' width='180' height='45' rx='8'/>
            <text class='node-text' x='320' y='37' text-anchor='middle'>Can a good prompt do it?</text>
            <line class='edge' x1='320' y1='55' x2='320' y2='85'/>
            <text class='edge-label' x='345' y='75'>no</text>
            <rect class='node-box worker' x='470' y='30' width='150' height='40' rx='8'/>
            <text class='node-text' x='545' y='55' text-anchor='middle'>Ship prompt ✓</text>
            <line class='edge' x1='410' y1='32' x2='470' y2='45'/>
            <text class='edge-label' x='440' y='30'>yes</text>
            <rect class='node-box' x='215' y='85' width='210' height='45' rx='8'/>
            <text class='node-text' x='320' y='104' text-anchor='middle'>Is the gap missing KNOWLEDGE?</text>
            <text class='node-sub' x='320' y='120' text-anchor='middle'>facts, docs, fresh data</text>
            <line class='edge' x1='425' y1='107' x2='500' y2='107'/>
            <text class='edge-label' x='465' y='100'>yes</text>
            <rect class='node-box tool' x='500' y='88' width='120' height='40' rx='8'/>
            <text class='node-text' x='560' y='112' text-anchor='middle'>Add RAG</text>
            <line class='edge' x1='320' y1='130' x2='320' y2='160'/>
            <text class='edge-label' x='345' y='150'>no</text>
            <rect class='node-box' x='215' y='160' width='210' height='45' rx='8'/>
            <text class='node-text' x='320' y='179' text-anchor='middle'>Is the gap BEHAVIOR/FORM?</text>
            <text class='node-sub' x='320' y='195' text-anchor='middle'>style, schema, skill</text>
            <line class='edge' x1='320' y1='205' x2='320' y2='235'/>
            <text class='edge-label' x='345' y='225'>yes + enough data</text>
            <rect class='node-box worker' x='215' y='235' width='210' height='45' rx='8'/>
            <text class='node-text' x='320' y='260' text-anchor='middle'>Fine-tune (LoRA)</text>
            <text class='node-sub' x='320' y='276' text-anchor='middle'>then re-add RAG for facts</text>
          </svg>
          <div class='diagram-caption'>Prompt → RAG (knowledge gap) → Fine-tune (behavior gap). Combine as needed; never start at the bottom.</div>
        </div>

        <h3>The escalation ladder in words</h3>
        <ol>
          <li><strong>Prompt engineering.</strong> Zero-shot → few-shot → CoT → structured outputs. Cache the preamble. 90% of problems stop here.</li>
          <li><strong>Add RAG</strong> if the failure is <em>missing/stale/private knowledge</em>. Fix retrieval before anything else.</li>
          <li><strong>Fine-tune</strong> if the failure is <em>behavior/format/skill</em>, prompting has plateaued, and you have data + volume + an eval harness.</li>
          <li><strong>Combine</strong>: fine-tune behavior + RAG facts + controlled prompt. This is where mature systems land.</li>
        </ol>

        <div class='callout warn'>
          <div class='c-title'>Gotcha — never lead with fine-tuning</div>
          <p>Jumping straight to fine-tuning is the most common junior mistake. It's the slowest, priciest, least reversible knob. If you can't articulate why prompting and RAG are insufficient, you're not ready to train.</p>
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          <p>"Walk the ladder: prompt first, add RAG when the gap is knowledge, fine-tune only when the gap is behavior and prompting has plateaued — then combine. Start cheap and reversible; escalate to weights only when a concrete requirement forces it."</p>
        </div>
      `,
    },
    {
      id: 'when-finetune',
      group: 'Decision framework',
      nav: '14 · When to fine-tune',
      title: 'When fine-tuning is the RIGHT (and wrong) call',
      lede: 'A crisp yes/no checklist so you can defend the decision instead of hand-waving.',
      html: `
        <p>Fine-tuning is a real tool with real wins — the skill is knowing its lane. Here are the signals, both directions.</p>

        <div class='two-col'>
          <div class='pattern-card'>
            <h4>✅ Fine-tune WHEN</h4>
            <ul>
              <li>You need a <strong>consistent output format/schema</strong> prompting can't reliably enforce.</li>
              <li>You need a <strong>specific tone/persona/domain style</strong> at scale.</li>
              <li>A <strong>skill</strong> the base lacks (niche language, specialized format, tool-call style).</li>
              <li><strong>Shorter prompts</strong> matter — bake in instructions to cut per-call tokens/latency.</li>
              <li><strong>High, stable volume</strong> so CapEx amortizes; the task isn't churning weekly.</li>
              <li>You want to <strong>distill</strong> a big model into a cheaper small one.</li>
              <li>You have <strong>quality labeled data + an eval harness</strong>.</li>
            </ul>
            <div class='tag-row'><span class='tag use'>behavior, form, skill, scale</span></div>
          </div>
          <div class='pattern-card'>
            <h4>❌ Do NOT fine-tune WHEN</h4>
            <ul>
              <li>You just need the model to <strong>know facts</strong> → that's RAG.</li>
              <li>The knowledge <strong>changes often</strong> → retrain treadmill; use RAG.</li>
              <li>You <strong>lack quality data</strong> (a few hundred good examples minimum).</li>
              <li>You <strong>haven't exhausted prompting</strong> + few-shot + caching yet.</li>
              <li><strong>Low volume</strong> — you'll never hit break-even.</li>
              <li>You need <strong>citations / provenance / per-user ACLs</strong> → RAG.</li>
              <li>You can't <strong>measure</strong> whether it helped.</li>
            </ul>
            <div class='tag-row'><span class='tag avoid'>facts, churn, no data, no eval</span></div>
          </div>
        </div>

        <div class='callout danger'>
          <div class='c-title'>War story — the format that a prompt already nailed</div>
          <p>A team spent two weeks fine-tuning for JSON output. A reviewer pointed out the provider had shipped <strong>Structured Outputs / JSON mode</strong> that guarantees valid schema for free. The fine-tune was deleted. <strong>Always check whether a platform feature (structured outputs, function calling, prompt caching) solves it before training.</strong></p>
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          <p>"Fine-tune for stable behavior/format/skill at high volume when you have clean data and an eval harness. Don't fine-tune for facts, fast-changing knowledge, citations, low volume, or before exhausting prompting — and check platform features like structured outputs first."</p>
        </div>
      `,
    },
    {
      id: 'cheatsheet',
      group: 'Wrap-up',
      nav: '15 · Cheat-sheet & rapid-fire',
      title: 'Interview cheat-sheet & rapid-fire Q&A',
      lede: 'Everything compressed into repeatable one-liners. Read this the morning of the interview.',
      html: `
        <h3>The 10-second frame</h3>
        <p><strong>Prompting = instructions. RAG = knowledge. Fine-tuning = behavior.</strong> First two live in the context window (frozen weights, runtime); the third lives in the weights (a training step). Start cheap and reversible; escalate only when forced.</p>

        <h3>Rapid-fire Q&A</h3>
        <table>
          <tr><th>Question</th><th>Crisp answer</th></tr>
          <tr><td>Fine-tune to add company facts?</td><td>No — use RAG. Weights are a lossy, stale, un-citable database.</td></tr>
          <tr><td>What does fine-tuning do well?</td><td>Behavior, format, tone, persona, skills — not fact lookup.</td></tr>
          <tr><td>LoRA in one line?</td><td>Freeze W, learn low-rank ΔW = B·A scaled by α/r; train &lt;1% of params.</td></tr>
          <tr><td>Why does B init to zero?</td><td>So ΔW = 0 at step 0 — training starts exactly at the base model.</td></tr>
          <tr><td>QLoRA additions?</td><td>4-bit NF4 frozen base + double quantization + paged optimizers.</td></tr>
          <tr><td>DPO vs RLHF?</td><td>DPO drops the reward model + RL loop for a simple supervised loss on (chosen, rejected).</td></tr>
          <tr><td>SFT vs continued pre-training?</td><td>SFT = imitate prompt→response; continued pretrain = next-token on raw domain text (injects knowledge).</td></tr>
          <tr><td>Overfitting tell?</td><td>Train loss ↓ while eval loss ↑ — early-stop at the divergence.</td></tr>
          <tr><td>Catastrophic forgetting fix?</td><td>LoRA, low LR, few epochs, mix in general data.</td></tr>
          <tr><td>How much data?</td><td>Hundreds–thousands of clean, consistent, diverse examples; quality &gt; quantity.</td></tr>
          <tr><td>Does 1M-token context kill RAG?</td><td>No — cost, latency, freshness, ACLs, 'lost in the middle' still favor retrieval at scale.</td></tr>
          <tr><td>Escape the token tax without training?</td><td>Prompt caching — cache the stable preamble.</td></tr>
          <tr><td>Serve many fine-tunes cheaply?</td><td>Multi-LoRA: one frozen base + many MB adapters (vLLM / LoRAX), hot-swapped.</td></tr>
          <tr><td>Merge vs keep adapter separate?</td><td>Merge = zero overhead, one task; separate = multi-tenant, hot-swap.</td></tr>
          <tr><td>RAFT?</td><td>Fine-tune with gold + distractor docs so the model learns to use retrieval.</td></tr>
          <tr><td>Distillation?</td><td>SFT a small student on a strong teacher's outputs to bottle behavior cheaply.</td></tr>
          <tr><td>Prove a change helped?</td><td>Frozen golden set + baseline + regression tests; watch judge bias &amp; contamination.</td></tr>
          <tr><td>Right order to try things?</td><td>Prompt → RAG (knowledge gap) → fine-tune (behavior gap) → combine.</td></tr>
        </table>

        <div class='callout good'>
          <div class='c-title'>Name-drop bank (shows range)</div>
          <p><strong>Fine-tuning:</strong> HF PEFT/TRL, Axolotl, Unsloth, LoRA/QLoRA/DoRA, DPO/ORPO/KTO. <strong>RAG:</strong> LlamaIndex, LangChain, Pinecone/Weaviate/Qdrant/pgvector, Cohere Rerank, RAGAS. <strong>Serving:</strong> vLLM, LoRAX, S-LoRA, TGI. <strong>Prompting:</strong> Structured Outputs, function calling, prompt caching, ReAct.</p>
        </div>

        <div class='callout warn'>
          <div class='c-title'>The three traps to never fall into</div>
          <p>1) "Fine-tune on our docs" for facts (use RAG). 2) Leading with fine-tuning before exhausting prompting/RAG. 3) Claiming a win with no held-out eval and no baseline.</p>
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite (the closer)</div>
          <p>"Prompting changes instructions, RAG changes knowledge, fine-tuning changes behavior. Start with prompting, add RAG for a knowledge gap, fine-tune only for a behavior gap once prompting plateaus and you have data + eval — then combine all three. Facts go in the retriever, behavior goes in the weights."</p>
        </div>
      `,
    },
  ],
  quizzes: [
    {
      question: 'A team wants their support bot to answer questions about company policies that are updated weekly. Which approach is the best primary fit?',
      options: [
        { text: 'Fine-tune the model weekly on the latest policy documents', correct: false },
        { text: 'Use RAG to retrieve the current policies at query time', correct: true },
        { text: 'Continued pre-training on the policy corpus', correct: false },
        { text: 'Put all policies in a huge static system prompt', correct: false },
      ],
      explain: 'This is a knowledge problem with frequently-changing facts that need citations — RAG updates instantly by reindexing, while fine-tuning bakes stale facts into weights and forces a retrain treadmill.',
    },
    {
      question: 'In LoRA, why is the B matrix initialized to zero while A is random?',
      options: [
        { text: 'To make the adapter smaller in memory', correct: false },
        { text: 'So the initial update ΔW = B·A is zero, starting training exactly at the base model', correct: true },
        { text: 'Because zero-init matrices train faster', correct: false },
        { text: 'To prevent the base weights from receiving gradients', correct: false },
      ],
      explain: 'With B=0, the product B·A is zero at step 0, so the effective weights equal the frozen base — training begins from the original model with no disruptive shock, then the adapter learns from there.',
    },
    {
      question: 'What is the core innovation of QLoRA over standard LoRA?',
      options: [
        { text: 'It trains all model weights instead of just an adapter', correct: false },
        { text: 'It quantizes the frozen base model to 4-bit (NF4) with double quantization and paged optimizers', correct: true },
        { text: 'It replaces the low-rank decomposition with full-rank updates', correct: false },
        { text: 'It removes the need for any training data', correct: false },
      ],
      explain: 'QLoRA keeps the base frozen but stores it in 4-bit NormalFloat (NF4) with double quantization and paged optimizers, drastically cutting memory so large models fine-tune on a single GPU.',
    },
    {
      question: 'Which statement best captures the difference between DPO and RLHF (PPO)?',
      options: [
        { text: 'DPO requires a separate reward model and an RL loop; RLHF does not', correct: false },
        { text: 'DPO optimizes preferences with a simple supervised loss on (chosen, rejected) pairs, dropping the reward model and RL loop', correct: true },
        { text: 'DPO injects new factual knowledge while RLHF only changes style', correct: false },
        { text: 'They are identical; DPO is just a rebrand of PPO', correct: false },
      ],
      explain: 'DPO reformulates preference optimization as a direct classification-style loss over chosen/rejected pairs, eliminating the separate reward model and unstable PPO rollout that classic RLHF requires.',
    },
    {
      question: 'You fine-tune a model and notice training loss keeps dropping while validation loss starts rising. What is happening and what should you do?',
      options: [
        { text: 'Underfitting — train for many more epochs', correct: false },
        { text: 'Overfitting — apply early stopping, reduce epochs, or add more/diverse data', correct: true },
        { text: 'Catastrophic forgetting — switch to full fine-tuning', correct: false },
        { text: 'Normal behavior — ship it', correct: false },
      ],
      explain: 'Diverging train and validation loss is the classic overfitting signature: the model memorizes the training set instead of generalizing. Early-stop at the divergence and add data or regularization.',
    },
    {
      question: 'Does a 1M-token context window make RAG obsolete?',
      options: [
        { text: 'Yes — you can just paste the entire knowledge base into the prompt', correct: false },
        { text: 'No — cost, latency, freshness, access control, and degraded recall in the middle still favor retrieval at scale', correct: true },
        { text: 'Yes, but only for models under 7B parameters', correct: false },
        { text: 'No, because long context windows cannot process documents at all', correct: false },
      ],
      explain: 'Stuffing everything in context re-bills the full window every call, adds latency, has no ACLs or freshness, and suffers "lost in the middle" degradation. Long context and RAG are complementary, not substitutes.',
    },
    {
      question: 'Which technique lets you escape the per-call "token tax" of a large stable system prompt WITHOUT fine-tuning?',
      options: [
        { text: 'Chain-of-thought prompting', correct: false },
        { text: 'Prompt caching of the stable prefix', correct: true },
        { text: 'Quantizing the model to 4-bit', correct: false },
        { text: 'Increasing the temperature', correct: false },
      ],
      explain: 'Prompt caching stores a stable prompt prefix server-side so repeat calls pay a small fraction for a cache read, lowering the marginal cost of prompting and pushing the fine-tuning break-even further out.',
    },
    {
      question: 'What is the main serving advantage of LoRA adapters in a multi-tenant deployment?',
      options: [
        { text: 'Each tenant requires a full copy of the model in GPU memory', correct: false },
        { text: 'One frozen base stays in memory while many small adapters are hot-swapped (and even batched) on top', correct: true },
        { text: 'Adapters eliminate the need for a base model entirely', correct: false },
        { text: 'LoRA adapters cannot be served in production', correct: false },
      ],
      explain: 'Because an adapter is a few MB and the base is frozen, systems like vLLM and LoRAX keep one base in VRAM and dynamically load/batch hundreds of adapters, avoiding N full model copies.',
    },
    {
      question: 'What does RAFT (Retrieval-Augmented Fine-Tuning) specifically train a model to do?',
      options: [
        { text: 'Memorize the entire document corpus so retrieval is unnecessary', correct: false },
        { text: 'Use retrieved context well — cite the gold document and ignore distractor documents', correct: true },
        { text: 'Compress a large teacher model into a small student', correct: false },
        { text: 'Replace the reward model in RLHF', correct: false },
      ],
      explain: 'RAFT fine-tunes on examples containing a gold document plus distractors, teaching the model the skill of grounding its answer in the relevant retrieved chunk — "open-book exam prep" that pairs with RAG at runtime.',
    },
    {
      question: 'You want a fine-tune to reliably emit a fixed JSON schema. What should you check FIRST before training?',
      options: [
        { text: 'Whether the platform offers Structured Outputs / JSON mode / function calling that guarantees the schema for free', correct: true },
        { text: 'Whether you can rent enough GPUs for full fine-tuning', correct: false },
        { text: 'Whether the model supports a 1M-token context window', correct: false },
        { text: 'Whether you can quantize the model to 4-bit', correct: false },
      ],
      explain: 'Structured Outputs / JSON mode / constrained decoding already guarantee valid schemas without any training. Always check for a platform feature that solves the problem before spending time and money fine-tuning.',
    },
  ],
};
