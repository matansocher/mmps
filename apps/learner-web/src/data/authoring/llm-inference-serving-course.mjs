export default {
  id: 'llm-inference-serving-course',
  title: 'LLM Inference & Serving',
  icon: '⚙️',
  color: '#7ee787',
  lessons: [
    {
      id: 'autoregressive-decoding',
      group: 'Foundations',
      nav: '1 · How generation works',
      title: 'What actually happens when a model generates',
      lede: 'A model does not write a sentence. It plays a very expensive game of "guess the next token" — one token at a time, forever.',
      html: `
        <p>Here is the mental model that will save you in every interview: <span class='kicker'>an LLM is a next-token predictor in a loop</span>. It never plans the whole answer. It looks at everything so far, produces a probability distribution over the vocabulary (~32k–128k tokens), picks one, appends it, and does the whole thing again. This is <strong>autoregressive decoding</strong>.</p>

        <div class='diagram'>
          <svg viewBox='0 0 640 190' width='640'>
            <defs><marker id='arrow' markerWidth='10' markerHeight='10' refX='8' refY='3' orient='auto'><path d='M0,0 L8,3 L0,6 Z' fill='#8b98a9'/></marker></defs>
            <rect class='node-box' x='20' y='70' width='150' height='60' rx='8'/>
            <text class='node-text' x='95' y='95' text-anchor='middle'>Tokens so far</text>
            <text class='node-sub' x='95' y='113' text-anchor='middle'>'The cat sat on'</text>
            <line class='edge' x1='170' y1='100' x2='260' y2='100' marker-end='url(#arrow)'/>
            <rect class='node-box worker' x='260' y='70' width='150' height='60' rx='8'/>
            <text class='node-text' x='335' y='95' text-anchor='middle'>Forward pass</text>
            <text class='node-sub' x='335' y='113' text-anchor='middle'>logits over vocab</text>
            <line class='edge' x1='410' y1='100' x2='500' y2='100' marker-end='url(#arrow)'/>
            <rect class='node-box tool' x='500' y='70' width='120' height='60' rx='8'/>
            <text class='node-text' x='560' y='95' text-anchor='middle'>Sample 1 token</text>
            <text class='node-sub' x='560' y='113' text-anchor='middle'>'the'</text>
            <line class='edge' x1='560' y1='70' x2='560' y2='30' marker-end='url(#arrow)'/>
            <line class='edge' x1='560' y1='30' x2='95' y2='30' marker-end='url(#arrow)'/>
            <line class='edge' x1='95' y1='30' x2='95' y2='70' marker-end='url(#arrow)'/>
            <text class='edge-label' x='330' y='22' text-anchor='middle'>append &amp; repeat</text>
          </svg>
          <div class='diagram-caption'>The generation loop: every new token requires a full forward pass through all layers.</div>
        </div>

        <h3>Tokens, not words</h3>
        <p>Text is chopped into <span class='kicker'>tokens</span> by a tokenizer (usually byte-pair encoding). A token is roughly <strong>~4 characters</strong> or <strong>~0.75 words</strong> of English. So "unbelievable" might be 3 tokens, and a 500-word answer is ~650 tokens. This matters because <em>you are billed per token and you compute per token</em>.</p>

        <h4>How the next token is chosen</h4>
        <ul>
          <li><strong>Greedy</strong>: always take the argmax. Deterministic, can be dull/looping.</li>
          <li><strong>Temperature</strong>: divide logits by T before softmax. T&lt;1 sharpens, T&gt;1 flattens (more random).</li>
          <li><strong>top-k / top-p (nucleus)</strong>: only sample from the k most likely, or the smallest set covering probability mass p.</li>
        </ul>

        <div class='callout warn'>
          <div class='c-title'>Gotcha</div>
          Sampling settings do not change how <em>fast</em> a token is produced — the forward pass cost is identical. They only change <em>which</em> token you pick. Latency is a systems problem, not a temperature problem.
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "Generation is a serial loop of next-token prediction. Each token costs one full forward pass, which is why decoding is inherently sequential and hard to parallelize."
        </div>
      `,
    },
    {
      id: 'prefill-decode-kv-cache',
      group: 'Foundations',
      nav: '2 · Prefill, decode & KV cache',
      title: 'Prefill vs decode & the KV cache',
      lede: 'If you learn one thing in this course, learn this. Inference has two totally different phases, and a cache is the reason it is even affordable.',
      html: `
        <p>A single request runs in <span class='kicker'>two phases</span> with wildly different performance profiles. Confusing them is the #1 way to sound junior.</p>

        <table>
          <tr><th>Phase</th><th>What it does</th><th>Bottleneck</th><th>Parallel?</th></tr>
          <tr><td><strong>Prefill</strong></td><td>Process the whole prompt at once, build the cache</td><td>Compute-bound (FLOPs)</td><td>Yes — all prompt tokens in one pass</td></tr>
          <tr><td><strong>Decode</strong></td><td>Generate output tokens one at a time</td><td>Memory-bandwidth-bound</td><td>No — strictly sequential</td></tr>
        </table>

        <h3>Why the KV cache exists</h3>
        <p>Attention needs, for every previous token, its <strong>Key</strong> and <strong>Value</strong> vectors. Naively, generating token #1000 would recompute K and V for all 999 earlier tokens — every single step. That is O(n²) wasted work.</p>
        <p>The fix: after computing each token's K and V, <span class='kicker'>store them</span>. On the next step you only compute K/V for the <em>one</em> new token and reuse the rest. That store is the <strong>KV cache</strong>. It turns decode from "recompute everything" into "append one column."</p>

        <div class='diagram'>
          <svg viewBox='0 0 640 180' width='640'>
            <rect class='node-box' x='20' y='40' width='90' height='40' rx='6'/><text class='node-text' x='65' y='65' text-anchor='middle'>K/V t0</text>
            <rect class='node-box' x='115' y='40' width='90' height='40' rx='6'/><text class='node-text' x='160' y='65' text-anchor='middle'>K/V t1</text>
            <rect class='node-box' x='210' y='40' width='90' height='40' rx='6'/><text class='node-text' x='255' y='65' text-anchor='middle'>K/V t2</text>
            <text class='node-sub' x='160' y='105' text-anchor='middle'>cached during prefill (reused, never recomputed)</text>
            <rect class='node-box worker' x='330' y='40' width='110' height='40' rx='6'/><text class='node-text' x='385' y='65' text-anchor='middle'>K/V t3 (new)</text>
            <text class='node-sub' x='385' y='105' text-anchor='middle'>only this is computed at decode step</text>
          </svg>
          <div class='diagram-caption'>Decode step: reuse all cached K/V, append one new column. Cheap compute, but it lives in VRAM.</div>
        </div>

        <div class='callout danger'>
          <div class='c-title'>The catch</div>
          The KV cache is <strong>huge and grows with every token and every concurrent user</strong>. It is the reason you run out of GPU memory long before you run out of compute. We do the sizing math in the memory lesson.
        </div>

        <div class='callout good'>
          <div class='c-title'>Rule of thumb</div>
          Prefill is a sprint (compute-heavy, one shot). Decode is a slow drip (one token per pass, limited by how fast you can read weights + cache from memory).
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "Prefill is compute-bound and parallel; decode is memory-bandwidth-bound and serial. The KV cache is what makes decode cheap in FLOPs but expensive in VRAM."
        </div>
      `,
    },
    {
      id: 'latency-metrics',
      group: 'Performance',
      nav: '3 · Latency metrics',
      title: 'Latency metrics that actually matter',
      lede: 'Average latency is a lie for streaming systems. You need TTFT, TPOT, and throughput — and you need to know they fight each other.',
      html: `
        <p>Because generation streams token-by-token, "response time" splits into distinct numbers. Know the acronyms cold.</p>

        <table>
          <tr><th>Metric</th><th>Means</th><th>Driven by</th></tr>
          <tr><td><span class='kicker'>TTFT</span></td><td>Time To First Token — how long until the user sees <em>anything</em></td><td>Prefill (prompt length, queueing)</td></tr>
          <tr><td><span class='kicker'>TPOT / ITL</span></td><td>Time Per Output Token / Inter-Token Latency — the drip speed after the first token</td><td>Decode (memory bandwidth, batch size)</td></tr>
          <tr><td><span class='kicker'>Throughput</span></td><td>Total tokens/sec across ALL users on the GPU</td><td>Batching efficiency</td></tr>
          <tr><td>E2E latency</td><td>TTFT + (num_output_tokens × TPOT)</td><td>Both phases</td></tr>
        </table>

        <h4>The napkin formula</h4>
        <pre><code>total_latency = TTFT + (output_tokens * TPOT)

# Example: chat reply of 300 tokens
# TTFT = 0.2s, TPOT = 20ms
# total = 0.2 + 300 * 0.020 = 6.2s to finish
# ...but the user starts reading at 0.2s, so it FEELS fast</code></pre>

        <div class='callout warn'>
          <div class='c-title'>The fundamental tension</div>
          <strong>Latency vs throughput is a tradeoff.</strong> Bigger batches → more tokens/sec per GPU (great $/token) but each individual user waits longer per token (worse TPOT). Smaller batches → snappy per-user latency but you waste the GPU. There is no free lunch; you tune the batch to your SLA.
        </div>

        <h4>Always talk in percentiles</h4>
        <p>Report <strong>p50 / p95 / p99</strong>, never averages. One slow request stuck behind a giant prompt tanks p99 while the mean stays pretty. Tail latency is what users actually feel and what SLAs are written against.</p>

        <div class='callout good'>
          <div class='c-title'>Rule of thumb</div>
          For a chat UX, target TTFT under ~200ms and TPOT under ~50ms (≈20 tokens/sec) — that reads faster than most people can. For batch/offline jobs, ignore latency and max out throughput.
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "I optimize TTFT for perceived responsiveness, TPOT for reading speed, and throughput for cost — and I know that increasing batch size trades TPOT for throughput."
        </div>
      `,
    },
    {
      id: 'batching',
      group: 'Performance',
      nav: '4 · Batching',
      title: 'Batching: static, dynamic & continuous',
      lede: 'A GPU running one request is like a 40-ton truck delivering a single envelope. Batching is how you fill the truck — and continuous batching is the killer feature.',
      html: `
        <p>GPUs are throughput monsters that are terrible at doing one small thing. Decode is memory-bound: you pay to stream the model weights from VRAM whether you process 1 sequence or 64. So process 64 — the weight read is <span class='kicker'>amortized across the whole batch for free</span>. That is why batching exists.</p>

        <h3>Three flavors</h3>

        <div class='pattern-card'>
          <h4>Static batching</h4>
          <p>Collect N requests, run them together, wait for ALL to finish, then start the next batch. Simple, but requests finish at different lengths — short ones sit idle waiting for the longest one. The GPU develops "bubbles."</p>
          <div class='tag-row'><span class='tag use'>use when offline / uniform lengths</span><span class='tag avoid'>avoid for interactive traffic</span></div>
        </div>

        <div class='pattern-card'>
          <h4>Dynamic batching</h4>
          <p>Wait a tiny window (e.g. 5–10ms) to gather whatever requests arrive, then batch them. Better GPU use than fixed static, but it still batches at the <em>request</em> level — a finished sequence can not leave early and a new one can not join mid-flight.</p>
          <div class='tag-row'><span class='tag use'>use when bursty traffic</span><span class='tag avoid'>avoid if you need max utilization</span></div>
        </div>

        <div class='pattern-card'>
          <h4>Continuous (in-flight) batching ⭐</h4>
          <p>Batch at the <span class='kicker'>token/iteration level</span>, not the request level. After every decode step, finished sequences are evicted and waiting requests slot into the freed spots — immediately. The GPU basically never idles. This is what vLLM, TGI, and TensorRT-LLM do, and it can lift throughput <strong>2–20×</strong> over static batching.</p>
          <div class='tag-row'><span class='tag use'>use for all serving</span><span class='tag avoid'>avoid... basically never</span></div>
        </div>

        <div class='diagram'>
          <svg viewBox='0 0 640 170' width='640'>
            <text class='edge-label' x='40' y='25' text-anchor='start'>Static: everyone waits for the slowest</text>
            <rect class='node-box' x='40' y='35' width='60' height='22' rx='4'/><text class='node-sub' x='70' y='50' text-anchor='middle'>req A</text>
            <rect class='node-box' x='40' y='60' width='200' height='22' rx='4'/><text class='node-sub' x='140' y='75' text-anchor='middle'>req B (long)</text>
            <rect class='node-box' x='40' y='85' width='90' height='22' rx='4'/><text class='node-sub' x='85' y='100' text-anchor='middle'>req C (idle after)</text>
            <text class='edge-label' x='360' y='25' text-anchor='start'>Continuous: slots refill instantly</text>
            <rect class='node-box worker' x='360' y='35' width='60' height='22' rx='4'/><text class='node-sub' x='390' y='50' text-anchor='middle'>A</text>
            <rect class='node-box worker' x='425' y='35' width='90' height='22' rx='4'/><text class='node-sub' x='470' y='50' text-anchor='middle'>D joins</text>
            <rect class='node-box worker' x='360' y='60' width='200' height='22' rx='4'/><text class='node-sub' x='460' y='75' text-anchor='middle'>B</text>
            <rect class='node-box worker' x='360' y='85' width='90' height='22' rx='4'/><text class='node-sub' x='405' y='100' text-anchor='middle'>C</text>
            <rect class='node-box worker' x='455' y='85' width='105' height='22' rx='4'/><text class='node-sub' x='507' y='100' text-anchor='middle'>E joins</text>
          </svg>
          <div class='diagram-caption'>Static leaves bubbles; continuous batching packs new work into freed slots every iteration.</div>
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "Continuous batching schedules at the iteration level: it evicts finished sequences and admits new ones every decode step, so the GPU stays saturated instead of waiting for the longest request."
        </div>
      `,
    },
    {
      id: 'memory-math',
      group: 'Resources',
      nav: '5 · Memory math',
      title: 'Memory math: why you run out of VRAM',
      lede: 'Two things eat your GPU memory: the weights (fixed) and the KV cache (grows with every user and every token). Let us actually do the arithmetic.',
      html: `
        <p>Interviewers love "will this fit?" questions. You need two back-of-envelope formulas.</p>

        <h3>1) Model weights</h3>
        <pre><code>weights_bytes ≈ params × bytes_per_param

# 7B params in fp16 (2 bytes):
7e9 × 2 = 14 GB
# 70B in fp16:
70e9 × 2 = 140 GB  -> does NOT fit on one 80GB A100/H100</code></pre>
        <p>Rule: <span class='kicker'>fp16 needs ~2 bytes/param, int8 ~1, int4 ~0.5</span>. So "GB for weights ≈ billions of params × bytes/param." A 70B model in int4 is ~35GB — now it fits on one 80GB card with room for cache.</p>

        <h3>2) KV cache (the sneaky one)</h3>
        <pre><code>kv_bytes_per_token = 2 × n_layers × n_kv_heads × head_dim × bytes
#   the 2 is for K AND V

# Llama-2-13B-ish: 40 layers, hidden 5120, fp16
# ~ 2 × 40 × 5120 × 2  ≈ 800 KB per token

# One user with 4k context:
800KB × 4096 ≈ 3.2 GB  (for ONE request!)
# 32 concurrent users at 4k context:
3.2GB × 32 ≈ 100 GB  -> you are out of memory</code></pre>

        <div class='callout danger'>
          <div class='c-title'>War story</div>
          Teams provision GPUs for the model weights, launch, and then fall over at 20 concurrent users. The weights fit fine — it was the KV cache that exploded. <strong>KV cache, not weights, usually caps your concurrency.</strong>
        </div>

        <h4>Total budget</h4>
        <pre><code>VRAM = weights + (kv_per_token × avg_context × concurrent_requests) + activations/overhead</code></pre>
        <p>Grouped-Query Attention (GQA) shrinks the KV cache by sharing K/V across query heads (fewer <code>n_kv_heads</code>) — that is a big reason modern models like Llama-3 serve so many users per GPU.</p>

        <div class='callout good'>
          <div class='c-title'>Rule of thumb</div>
          Longer context is quadratically painful for compute and linearly painful for KV memory. A 32k-context feature can cost 8× the KV of a 4k one — plan capacity around context length, not just user count.
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "Weights are a fixed cost; the KV cache is a per-token, per-user cost that usually determines max concurrency. GQA and quantization are the main levers to shrink it."
        </div>
      `,
    },
    {
      id: 'quantization',
      group: 'Resources',
      nav: '6 · Quantization',
      title: 'Quantization: smaller, faster, mostly-as-good',
      lede: 'Store the weights in fewer bits. You halve (or quarter) memory and speed up the memory-bound decode — for a small, usually acceptable, quality hit.',
      html: `
        <p><span class='kicker'>Quantization</span> = represent weights (and sometimes activations/KV) with fewer bits than fp16. Because decode is memory-bandwidth-bound, moving fewer bytes per weight = faster tokens AND less VRAM. It is often the single highest-leverage optimization.</p>

        <table>
          <tr><th>Precision</th><th>Bytes/param</th><th>70B weights</th><th>Quality</th></tr>
          <tr><td>fp32</td><td>4</td><td>280 GB</td><td>reference (overkill)</td></tr>
          <tr><td>fp16 / bf16</td><td>2</td><td>140 GB</td><td>the standard baseline</td></tr>
          <tr><td>int8</td><td>1</td><td>70 GB</td><td>near-lossless</td></tr>
          <tr><td>int4</td><td>0.5</td><td>35 GB</td><td>small but real drop</td></tr>
        </table>

        <h3>The method zoo</h3>
        <ul>
          <li><strong>GPTQ</strong> — post-training, one-shot, layer-by-layer error minimization. Fast to apply, great for int4 weights.</li>
          <li><strong>AWQ</strong> (Activation-aware) — protects the ~1% of "salient" weight channels that matter most; often better quality than GPTQ at int4.</li>
          <li><strong>bitsandbytes / NF4</strong> — easy on-the-fly 8-bit and 4-bit, popular for QLoRA fine-tuning.</li>
          <li><strong>FP8</strong> — hardware-native on H100/Ada; strong quality with real speedups.</li>
          <li><strong>KV-cache quantization</strong> — quantize the <em>cache</em> (e.g. to int8/fp8) to fit more concurrent users, separate from weight quantization.</li>
        </ul>

        <div class='callout warn'>
          <div class='c-title'>Gotcha</div>
          "4-bit" usually means the <em>weights</em> are 4-bit, but math often runs in fp16 after dequantizing. And quality loss is <strong>not uniform</strong> — coding, math, and long-context reasoning degrade first. Always eval on <em>your</em> task, not just perplexity.
        </div>

        <div class='callout good'>
          <div class='c-title'>Rule of thumb</div>
          int8 is a nearly-free win. int4 (AWQ/GPTQ) is the sweet spot for fitting big models on one GPU — validate quality. Below 4-bit, degradation gets steep fast.
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "Quantization trades a little quality for big memory and bandwidth wins. int8 is almost free; int4 with AWQ or GPTQ is the standard way to squeeze a 70B onto a single 80GB GPU."
        </div>
      `,
    },
    {
      id: 'paged-attention-vllm',
      group: 'Serving stacks',
      nav: '7 · PagedAttention & vLLM',
      title: 'PagedAttention & vLLM: the big deal',
      lede: 'The KV cache was being stored in giant contiguous blocks, wasting 60–80% of memory to fragmentation. vLLM borrowed an idea from operating systems and fixed it.',
      html: `
        <p>Before vLLM, servers pre-allocated one big <em>contiguous</em> KV buffer per request, sized for the max possible length. If a request only used 100 of 2048 reserved slots, the rest was <span class='kicker'>reserved but wasted</span>. Studies found real systems wasted <strong>60–80% of KV memory</strong> to internal fragmentation and over-reservation.</p>

        <h3>The OS analogy</h3>
        <p><span class='kicker'>PagedAttention</span> treats the KV cache like virtual memory. The cache is split into fixed-size <strong>blocks (pages)</strong>. A sequence's tokens map to a list of blocks via a <strong>block table</strong> — the blocks do not need to be contiguous in physical VRAM. Allocate pages on demand, free them when a sequence finishes. Just like an OS paging RAM.</p>

        <div class='diagram'>
          <svg viewBox='0 0 640 170' width='640'>
            <rect class='node-box' x='20' y='40' width='120' height='40' rx='6'/><text class='node-text' x='80' y='60' text-anchor='middle'>Seq A</text><text class='node-sub' x='80' y='74' text-anchor='middle'>block table</text>
            <line class='edge' x1='140' y1='55' x2='250' y2='45' marker-end='url(#arrow)'/>
            <line class='edge' x1='140' y1='65' x2='250' y2='120' marker-end='url(#arrow)'/>
            <defs><marker id='arrow' markerWidth='10' markerHeight='10' refX='8' refY='3' orient='auto'><path d='M0,0 L8,3 L0,6 Z' fill='#8b98a9'/></marker></defs>
            <rect class='node-box worker' x='250' y='30' width='70' height='30' rx='4'/><text class='node-sub' x='285' y='50' text-anchor='middle'>page 7</text>
            <rect class='node-box worker' x='250' y='105' width='70' height='30' rx='4'/><text class='node-sub' x='285' y='125' text-anchor='middle'>page 2</text>
            <rect class='node-box' x='360' y='30' width='70' height='30' rx='4'/><text class='node-sub' x='395' y='50' text-anchor='middle'>page 3</text>
            <rect class='node-box tool' x='360' y='105' width='70' height='30' rx='4'/><text class='node-sub' x='395' y='125' text-anchor='middle'>shared</text>
            <text class='edge-label' x='500' y='85' text-anchor='middle'>physical VRAM pool (non-contiguous)</text>
          </svg>
          <div class='diagram-caption'>A block table maps logical tokens to scattered physical pages — near-zero waste, and pages can be shared.</div>
        </div>

        <h4>Why it was a landmark</h4>
        <ul>
          <li><strong>Almost no fragmentation</strong> → 2–4× more requests fit in the same VRAM → much higher throughput.</li>
          <li><strong>Copy-on-write sharing</strong>: parallel samples or a shared system prompt can point at the <em>same</em> physical pages until they diverge.</li>
          <li>It pairs naturally with continuous batching — together they are why vLLM became the default open serving engine.</li>
        </ul>

        <div class='callout good'>
          <div class='c-title'>Rule of thumb</div>
          If someone asks "how would you cut serving cost 3× without touching the model," PagedAttention-style memory management + continuous batching is the textbook answer.
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "PagedAttention applies OS virtual-memory paging to the KV cache: fixed-size blocks plus a block table kill fragmentation and enable prefix sharing, roughly tripling how many requests fit per GPU."
        </div>
      `,
    },
    {
      id: 'speculative-decoding',
      group: 'Serving stacks',
      nav: '8 · Latency tricks',
      title: 'Speculative decoding & other latency tricks',
      lede: 'Decode is serial and slow. But what if a tiny model guessed several tokens ahead and the big model just checked them in one pass? That is speculative decoding.',
      html: `
        <p>The decode bottleneck is that each token needs a full pass through the big model, and you can not do token N+1 before N. Several clever tricks attack this.</p>

        <h3>Speculative decoding ⭐</h3>
        <p>Use a small, fast <strong>draft model</strong> to propose the next <em>k</em> tokens cheaply. Then run the big <strong>target model</strong> <span class='kicker'>once</span> to verify all k in parallel (verification is a prefill-style parallel op, which the GPU loves). Accept the longest correct prefix; on the first mismatch, keep the target's own token and continue.</p>

        <pre><code>draft = small_model.generate(k=4)      # cheap guesses: 'the quick brown fox'
verified = big_model.verify(draft)     # one parallel pass
accept_prefix(verified)                # keep 'the quick brown', reject 'fox'</code></pre>

        <div class='callout good'>
          <div class='c-title'>Why it is free quality</div>
          The output distribution is <strong>mathematically identical</strong> to normal decoding from the big model (rejection sampling guarantees it). You get 2–3× fewer big-model steps with <em>zero</em> quality loss when the draft is a good guesser. Variants: Medusa (extra heads), EAGLE, n-gram/lookahead drafting.
        </div>

        <h3>Prefix caching (a.k.a. prompt caching)</h3>
        <p>If many requests share a prefix — a long system prompt, a RAG document, few-shot examples — cache its KV once and reuse it. New requests skip re-prefilling the shared part → <strong>much lower TTFT</strong> and less compute. This is the same page-sharing PagedAttention enables.</p>

        <h3>Chunked prefill</h3>
        <p>A giant prompt monopolizes the GPU during prefill and stalls everyone else's decode (TPOT spikes). <span class='kicker'>Chunked prefill</span> slices the big prefill into pieces and interleaves them with ongoing decode steps, smoothing tail latency.</p>

        <table>
          <tr><th>Trick</th><th>Helps</th><th>Cost</th></tr>
          <tr><td>Speculative decoding</td><td>TPOT (2–3×)</td><td>extra draft model + memory</td></tr>
          <tr><td>Prefix caching</td><td>TTFT + compute</td><td>cache memory / bookkeeping</td></tr>
          <tr><td>Chunked prefill</td><td>p99 TPOT under load</td><td>slightly higher TTFT</td></tr>
        </table>

        <div class='callout warn'>
          <div class='c-title'>Gotcha</div>
          Speculative decoding only wins when acceptance is high. On very unpredictable outputs (or a bad draft model) you pay for the draft work AND still do target passes — it can be a net loss. Measure acceptance rate.
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "Speculative decoding drafts k tokens with a small model and verifies them in one parallel pass of the big model — 2–3× faster decode with provably identical output distribution."
        </div>
      `,
    },
    {
      id: 'cost-capacity-planning',
      group: 'Operations',
      nav: '9 · Cost & capacity',
      title: 'Cost & capacity planning',
      lede: 'How many GPUs do I need, and what does a token cost? Turn tokens/sec and concurrency into a spreadsheet you can defend.',
      html: `
        <p>Capacity planning is just Little's Law plus token arithmetic. Interviewers want to see you reason with numbers, not vibes.</p>

        <h3>Little's Law for LLMs</h3>
        <pre><code>concurrency = arrival_rate × avg_request_duration

# 10 requests/sec, each takes 6s end-to-end:
concurrency = 10 × 6 = 60 in-flight requests
# Your batch/KV budget must hold ~60 sequences at once</code></pre>

        <h3>Tokens/sec per GPU</h3>
        <p>A single H100 might do, say, <strong>~2,500 output tokens/sec</strong> aggregate for a well-batched 13B model (numbers vary wildly by model, quant, and batch). Convert to capacity:</p>
        <pre><code>tokens_per_gpu_per_day = 2500 tok/s × 86400 s ≈ 216M tokens/day
# If avg request outputs 300 tokens:
requests_per_gpu_per_day ≈ 216M / 300 ≈ 720k requests/day</code></pre>

        <h3>Cost per token</h3>
        <pre><code>cost_per_1k_tokens = (gpu_hourly_cost / tokens_per_hour) × 1000

# H100 at ~$3/hr, 2500 tok/s = 9M tok/hr:
= (3 / 9_000_000) × 1000 ≈ $0.00033 per 1k tokens
# Higher batch → more tok/hr → lower $/token (until latency SLA breaks)</code></pre>

        <div class='callout warn'>
          <div class='c-title'>The utilization trap</div>
          Your beautiful $/token assumes the GPU is <strong>busy</strong>. Real traffic is spiky, so average utilization might be 30%. Cost per token in practice = ideal cost ÷ utilization. Autoscaling and batching exist to push utilization up.
        </div>

        <h4>Autoscaling reality</h4>
        <ul>
          <li>Scale on <strong>queue depth / in-flight requests</strong>, not CPU%. GPUs pin one metric poorly.</li>
          <li><strong>Cold starts are brutal</strong>: loading 40GB of weights can take 30–120s. Keep warm pools; scaling to zero means users wait minutes.</li>
          <li>Separate pools for latency-sensitive (small batch) vs batch/offline (max batch) traffic.</li>
        </ul>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "I size capacity with Little's Law for concurrency and tokens/sec for throughput, then divide GPU cost by realistic (not peak) utilization to get true cost per token."
        </div>
      `,
    },
    {
      id: 'hosted-vs-self-hosted',
      group: 'Operations',
      nav: '10 · Build vs buy',
      title: 'Hosted vs self-hosted & choosing a stack',
      lede: 'An API you call vs a fleet you babysit. The right answer depends on volume, data policy, and how much you love PagerDuty.',
      html: `
        <p>The classic build-vs-buy decision, LLM edition. There is no universal winner — there is a break-even.</p>

        <div class='two-col'>
          <div>
            <h4>Hosted API (OpenAI, Anthropic, Bedrock…)</h4>
            <ul>
              <li>Zero ops, instant frontier models, elastic scale.</li>
              <li>Pay per token — cheap at low volume, expensive at high volume.</li>
              <li>Data leaves your boundary (check compliance).</li>
              <li>Rate limits, model deprecations, less control.</li>
            </ul>
          </div>
          <div>
            <h4>Self-hosted (vLLM/TGI/TRT-LLM on your GPUs)</h4>
            <ul>
              <li>Full control: model choice, quant, latency, privacy.</li>
              <li>Fixed GPU cost — cheap per token at high utilization.</li>
              <li>You own scaling, upgrades, incidents, and GPU supply.</li>
              <li>Open models trail the frontier in raw capability.</li>
            </ul>
          </div>
        </div>

        <div class='callout good'>
          <div class='c-title'>The break-even heuristic</div>
          Below a few hundred million tokens/month, hosted APIs almost always win on total cost (ops included). Above that — with steady, high utilization — self-hosting open models can be <strong>5–10× cheaper per token</strong>. Data-residency or hard privacy requirements can force self-hosting regardless of volume.
        </div>

        <h3>Picking a serving engine</h3>
        <div class='pattern-card'>
          <h4>vLLM</h4>
          <p>The open-source default. PagedAttention + continuous batching, huge model coverage, easy OpenAI-compatible server. Great throughput out of the box.</p>
          <div class='tag-row'><span class='tag use'>use for most self-hosting</span><span class='tag avoid'>avoid if you need last-mile NVIDIA-specific tuning</span></div>
        </div>
        <div class='pattern-card'>
          <h4>TensorRT-LLM</h4>
          <p>NVIDIA's compiled-kernel engine. Best raw latency/throughput on NVIDIA hardware, but heavier build step and less flexible.</p>
          <div class='tag-row'><span class='tag use'>use for max NVIDIA performance</span><span class='tag avoid'>avoid if you want quick iteration</span></div>
        </div>
        <div class='pattern-card'>
          <h4>TGI / SGLang / Ollama</h4>
          <p>TGI = HuggingFace's production server. SGLang = strong at structured/programmatic generation and prefix caching. Ollama = dead-simple local/dev.</p>
          <div class='tag-row'><span class='tag use'>use TGI for HF ecosystems, Ollama for dev</span><span class='tag avoid'>avoid Ollama for high-scale prod</span></div>
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "Hosted APIs win on convenience and low volume; self-hosting on vLLM wins on cost and control once you have steady high-volume traffic or strict data requirements. It is a utilization-driven break-even, not a religion."
        </div>
      `,
    },
    {
      id: 'pitfalls-cheatsheet',
      group: 'Recap',
      nav: '11 · Pitfalls & rapid-fire recap',
      title: 'Pitfalls + rapid-fire interview cheat-sheet',
      lede: 'Everything that matters, compressed. Read this on the train to the interview.',
      html: `
        <h3>Top serving pitfalls (a.k.a. how prod falls over)</h3>
        <div class='callout danger'>
          <div class='c-title'>The classics</div>
          <ul>
            <li><strong>KV cache OOM under load</strong> — sized GPUs for weights, forgot the cache grows per user × per token. Cap concurrency or quantize the KV.</li>
            <li><strong>One giant prompt stalls everyone</strong> — prefill monopolizes the GPU, TPOT p99 spikes. Fix with chunked prefill.</li>
            <li><strong>Scale-to-zero cold starts</strong> — 30–120s to load weights; users time out. Keep a warm pool.</li>
            <li><strong>Averaging latency</strong> — hides the p99 tail your users actually feel.</li>
            <li><strong>Quantizing without evals</strong> — int4 tanks math/coding silently. Eval on your task.</li>
            <li><strong>Static batching in prod</strong> — bubbles waste 50%+ of the GPU. Use continuous batching.</li>
          </ul>
        </div>

        <h3>Rapid-fire Q&amp;A</h3>
        <table>
          <tr><th>Question</th><th>Crisp answer</th></tr>
          <tr><td>Two phases of inference?</td><td>Prefill (compute-bound, parallel) and decode (memory-bound, serial).</td></tr>
          <tr><td>What is the KV cache?</td><td>Stored K/V of past tokens so decode appends one column instead of recomputing O(n²).</td></tr>
          <tr><td>Why is decode slow?</td><td>Serial, one full forward pass per token, bottlenecked by memory bandwidth.</td></tr>
          <tr><td>TTFT vs TPOT?</td><td>Time to first token (prefill) vs time per output token (decode drip).</td></tr>
          <tr><td>Latency vs throughput?</td><td>Bigger batch → higher throughput but worse per-user TPOT. Tune to SLA.</td></tr>
          <tr><td>Continuous batching?</td><td>Iteration-level scheduling: evict finished, admit new every step. Keeps GPU full.</td></tr>
          <tr><td>PagedAttention?</td><td>OS-style paging of the KV cache — kills fragmentation, enables prefix sharing.</td></tr>
          <tr><td>What usually caps concurrency?</td><td>KV cache memory, not weights.</td></tr>
          <tr><td>int8 vs int4?</td><td>int8 near-lossless; int4 (AWQ/GPTQ) fits big models on one GPU with a small quality hit.</td></tr>
          <tr><td>Speculative decoding?</td><td>Small draft model proposes k tokens, big model verifies in one pass — same distribution, 2–3× faster.</td></tr>
          <tr><td>GQA?</td><td>Shares K/V across query heads → smaller KV cache → more concurrent users.</td></tr>
          <tr><td>Cut cost 3× no model change?</td><td>Continuous batching + PagedAttention + quantization + raise utilization.</td></tr>
        </table>

        <h4>The one-breath summary</h4>
        <div class='callout good'>
          <div class='c-title'>Say this and you sound senior</div>
          "LLM inference is prefill then serial decode. The KV cache makes decode cheap in compute but expensive in memory, so KV memory caps concurrency. You win by keeping the GPU saturated (continuous batching), packing memory tightly (PagedAttention + quantization + GQA), and shortening the serial path (speculative decoding, prefix caching) — all tuned against TTFT/TPOT/throughput SLAs."
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "Every serving optimization does one of three things: keep the GPU busy, use less memory per token, or shorten the serial decode path. Name which one and you have framed the answer."
        </div>
      `,
    },
  ],
  quizzes: [
    {
      question: 'During the decode phase of LLM inference, what is the primary hardware bottleneck?',
      options: [
        { text: 'Raw compute (FLOPs), because each token runs a heavy matrix multiply', correct: false },
        { text: 'Memory bandwidth, because weights and the KV cache must be streamed from VRAM for each single-token pass', correct: true },
        { text: 'Network I/O between the client and the server', correct: false },
      ],
      explain: 'Decode generates one token per forward pass, so there is little parallel work to amortize the cost of reading weights and KV from memory — it is memory-bandwidth-bound, unlike compute-bound prefill.',
    },
    {
      question: 'What does the KV cache store, and why does it matter for serving?',
      options: [
        { text: 'The final generated text so it can be returned faster on retries', correct: false },
        { text: 'The Key and Value vectors of previous tokens, avoiding O(n²) recomputation but consuming VRAM that grows per token and per user', correct: true },
        { text: 'The tokenizer vocabulary, cached to speed up encoding', correct: false },
      ],
      explain: 'Caching K/V means decode appends one column instead of recomputing all prior tokens. But the cache scales with context length × concurrency, which is what usually causes VRAM OOM and caps concurrency.',
    },
    {
      question: 'Increasing the serving batch size generally has what effect?',
      options: [
        { text: 'Higher throughput (tokens/sec per GPU) but worse per-user TPOT', correct: true },
        { text: 'Lower throughput and better per-user latency', correct: false },
        { text: 'No effect on either, only on output quality', correct: false },
      ],
      explain: 'Batching amortizes the memory-bound weight read across more sequences, raising aggregate throughput, but each user shares the GPU so their inter-token latency rises. It is the core latency-vs-throughput tradeoff.',
    },
    {
      question: 'What makes continuous (in-flight) batching better than static batching?',
      options: [
        { text: 'It uses larger fixed batches that never change', correct: false },
        { text: 'It schedules at the iteration/token level, evicting finished sequences and admitting new ones each decode step so the GPU stays saturated', correct: true },
        { text: 'It runs each request on a dedicated GPU to avoid interference', correct: false },
      ],
      explain: 'Static batching waits for the longest request, creating idle "bubbles." Continuous batching refills freed slots every iteration, lifting throughput 2–20× on interactive traffic.',
    },
    {
      question: 'What core idea does PagedAttention borrow from operating systems?',
      options: [
        { text: 'Preemptive process scheduling with time slices', correct: false },
        { text: 'Virtual-memory paging: fixed-size KV blocks mapped via a block table, so the cache need not be contiguous', correct: true },
        { text: 'Filesystem journaling for crash recovery', correct: false },
      ],
      explain: 'By paging the KV cache into fixed blocks with a block table, PagedAttention nearly eliminates fragmentation (previously wasting 60–80% of KV memory) and enables copy-on-write prefix sharing.',
    },
    {
      question: 'Why does speculative decoding not change output quality?',
      options: [
        { text: 'It only runs when the temperature is set to zero', correct: false },
        { text: 'The big target model verifies the draft tokens with rejection sampling, so the resulting distribution is mathematically identical to standard decoding', correct: true },
        { text: 'It averages the draft and target model outputs together', correct: false },
      ],
      explain: 'The draft model only proposes candidates; the target verifies them in one parallel pass and rejects any that violate its own distribution, guaranteeing identical output while cutting big-model steps 2–3×.',
    },
    {
      question: 'For a 70B-parameter model, roughly how much VRAM do the weights alone need in fp16 versus int4?',
      options: [
        { text: '~35 GB in fp16 and ~140 GB in int4', correct: false },
        { text: '~140 GB in fp16 and ~35 GB in int4', correct: true },
        { text: '~70 GB in both, since quantization only affects speed', correct: false },
      ],
      explain: 'Weights ≈ params × bytes/param. fp16 is 2 bytes (70e9 × 2 = 140 GB); int4 is 0.5 bytes (70e9 × 0.5 = 35 GB), which is why int4 lets a 70B model fit on a single 80 GB GPU with room for the KV cache.',
    },
  ],
};
