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
        <p>Here is the mental model that will save you in every interview: <span class='kicker'>an LLM is a next-token predictor in a loop</span>. It never plans the whole answer. It looks at everything so far, produces a probability distribution over the vocabulary (~32k–256k tokens), picks one, appends it, and does the whole thing again. This is <strong>autoregressive decoding</strong>.</p>

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
        <p>Text is chopped into <span class='kicker'>tokens</span> by a tokenizer (usually byte-pair encoding — GPT models use <code>tiktoken</code>, Llama uses SentencePiece). A token is roughly <strong>~4 characters</strong> or <strong>~0.75 words</strong> of English. So "unbelievable" might be 3 tokens, and a 500-word answer is ~650 tokens. This matters because <em>you are billed per token and you compute per token</em>. Non-English text and code tokenize worse (more tokens per character), which quietly inflates cost and latency.</p>

        <h4>How the next token is chosen</h4>
        <ul>
          <li><strong>Greedy</strong>: always take the argmax. Deterministic, can be dull/looping.</li>
          <li><strong>Temperature</strong>: divide logits by T before softmax. T&lt;1 sharpens, T&gt;1 flattens (more random). T=0 collapses to greedy.</li>
          <li><strong>top-k / top-p (nucleus)</strong>: only sample from the k most likely, or the smallest set covering probability mass p.</li>
          <li><strong>Penalties</strong>: presence/frequency/repetition penalties push the distribution away from tokens you have already emitted, to fight loops.</li>
        </ul>

        <div class='callout warn'>
          <div class='c-title'>Gotcha</div>
          Sampling settings do not change how <em>fast</em> a token is produced — the forward pass cost is identical. They only change <em>which</em> token you pick. Latency is a systems problem, not a temperature problem.
        </div>

        <div class='callout danger'>
          <div class='c-title'>War story: "why isn't it deterministic at temperature 0?"</div>
          Even greedy decoding can drift run-to-run on GPUs. Floating-point reductions are non-associative, and batching changes the reduction order, so tiny logit differences occasionally flip an argmax tie. "Deterministic" means <em>reproducible given identical batch + kernels</em>, not "physically identical every time."
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
          <tr><th>Phase</th><th>What it does</th><th>Bottleneck</th><th>Parallel?</th><th>Drives</th></tr>
          <tr><td><strong>Prefill</strong></td><td>Process the whole prompt at once, build the cache</td><td>Compute-bound (FLOPs)</td><td>Yes — all prompt tokens in one pass</td><td>TTFT</td></tr>
          <tr><td><strong>Decode</strong></td><td>Generate output tokens one at a time</td><td>Memory-bandwidth-bound</td><td>No — strictly sequential</td><td>TPOT / throughput</td></tr>
        </table>

        <h3>Why the KV cache exists</h3>
        <p>Attention needs, for every previous token, its <strong>Key</strong> and <strong>Value</strong> vectors. Naively, generating token #1000 would recompute K and V for all 999 earlier tokens — every single step. That is O(n²) wasted work.</p>
        <p>The fix: after computing each token's K and V, <span class='kicker'>store them</span>. On the next step you only compute K/V for the <em>one</em> new token and reuse the rest. That store is the <strong>KV cache</strong>. It turns decode from "recompute everything" into "append one column." Compute per decode step drops from O(n²) to O(n), but you now pay in <em>memory</em>: the cache must live in VRAM for the whole request.</p>

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
          Prefill is a sprint (compute-heavy, one shot). Decode is a slow drip (one token per pass, limited by how fast you can read weights + cache from memory). A long prompt makes TTFT worse; a long answer makes total latency worse.
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "Prefill is compute-bound and parallel; decode is memory-bandwidth-bound and serial. The KV cache is what makes decode cheap in FLOPs but expensive in VRAM."
        </div>
      `,
    },
    {
      id: 'attention-internals',
      group: 'Foundations',
      nav: '3 · Attention internals',
      title: 'Attention internals: MHA, MQA, GQA & FlashAttention',
      lede: 'Everyone says "attention is the bottleneck." Fewer can say why decode is memory-bound, or why every modern model quietly shrank its KV cache with GQA.',
      html: `
        <p>Attention is the operation that lets each token look at every earlier token. For each query <code>Q</code>, you score it against all keys <code>K</code>, softmax the scores, and take a weighted sum of the values <code>V</code>. The shape that matters for serving is <span class='kicker'>how many K/V heads you keep</span>, because that is literally the size of your KV cache.</p>

        <h3>MHA → MQA → GQA: the KV-cache diet</h3>
        <table>
          <tr><th>Variant</th><th>Q heads</th><th>K/V heads</th><th>KV cache size</th><th>Quality</th></tr>
          <tr><td><strong>MHA</strong> (multi-head)</td><td>N</td><td>N</td><td>Full (baseline)</td><td>Best</td></tr>
          <tr><td><strong>MQA</strong> (multi-query)</td><td>N</td><td>1</td><td>~N× smaller</td><td>Slight drop</td></tr>
          <tr><td><strong>GQA</strong> (grouped-query)</td><td>N</td><td>G groups (e.g. 8)</td><td>N/G smaller</td><td>Near-MHA</td></tr>
        </table>
        <p><strong>GQA</strong> is the modern default (Llama 2 70B, Llama 3, Mistral, most others): a handful of K/V heads shared across many query heads. It shrinks the KV cache — often 4–8× — with almost no quality loss, which directly means more concurrent users per GPU. <span class='kicker'>Smaller KV cache = higher batch size = higher throughput.</span></p>

        <h3>FlashAttention: same math, better memory plan</h3>
        <p>Naive attention materializes the full <code>N×N</code> score matrix in slow HBM (GPU main memory), reads and writes it, then softmaxes. For long sequences that is enormous memory traffic. <strong>FlashAttention</strong> (and FA-2/FA-3) is an <em>IO-aware</em> kernel: it tiles the computation, keeps blocks in fast on-chip SRAM, and uses an online (streaming) softmax so it never writes the full matrix to HBM. Same numerical result, dramatically less memory movement — a 2–4× speedup and much lower memory for long contexts. <strong>PagedAttention</strong> (next lessons) is a complementary idea: it changes <em>where the KV cache lives</em>, not how attention is computed.</p>

        <div class='callout warn'>
          <div class='c-title'>Gotcha</div>
          Attention is famously O(n²) in compute, but during <em>decode</em> the model is memory-bandwidth-bound, not FLOP-bound: each step you must stream the entire weight matrix and the whole KV cache from HBM just to produce one token. That is why quantization and smaller KV caches speed decode up even though FLOPs barely change.
        </div>

        <div class='callout good'>
          <div class='c-title'>Rule of thumb</div>
          If someone asks "how do I fit more users on one GPU," three levers touch attention directly: <strong>GQA/MQA</strong> (fewer KV heads), <strong>KV-cache quantization</strong> (fp8/int8 K/V), and <strong>PagedAttention</strong> (no fragmentation waste).
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "GQA shrinks the KV cache by sharing K/V heads across query heads — that is a throughput lever, not just a modeling choice. FlashAttention is an IO-aware kernel that avoids writing the N×N matrix to HBM; it speeds things up without changing the result."
        </div>
      `,
    },
    {
      id: 'latency-metrics',
      group: 'Performance',
      nav: '4 · Latency metrics',
      title: 'Latency metrics that actually matter',
      lede: 'Average latency is a lie for streaming systems. You need TTFT, TPOT, and throughput — and you need to know they fight each other.',
      html: `
        <p>For a streaming LLM, "latency" is not one number. Interviewers want the vocabulary and the trade-offs.</p>

        <table>
          <tr><th>Metric</th><th>Meaning</th><th>Driven by</th><th>User feels it as</th></tr>
          <tr><td><span class='kicker'>TTFT</span> (time to first token)</td><td>Request start → first token</td><td>Prefill + queue wait</td><td>"Is it alive yet?"</td></tr>
          <tr><td><span class='kicker'>TPOT</span> / ITL</td><td>Time per output token (inter-token latency)</td><td>Decode speed</td><td>How fast text streams</td></tr>
          <tr><td><span class='kicker'>E2E latency</span></td><td>Total request time</td><td>TTFT + TPOT × output tokens</td><td>Total wait</td></tr>
          <tr><td><span class='kicker'>Throughput</span></td><td>Total tokens/sec across all users</td><td>Batch size, GPU</td><td>Your cloud bill</td></tr>
        </table>

        <p>Handy identity: <code>E2E ≈ TTFT + TPOT × (output_tokens − 1)</code>. For a chat UI, aim for TTFT under ~200–500 ms and TPOT under ~50 ms (~20 tokens/sec) so text streams faster than a person reads.</p>

        <h3>The tension you must be able to explain</h3>
        <p><strong>Throughput and per-user latency pull in opposite directions.</strong> Bigger batches → more tokens/sec (great for cost) but each user's TPOT goes up (their tokens share GPU time). This is the core serving trade-off, and it is why you tune to an <span class='kicker'>SLO</span>, not to a single "fast" number.</p>

        <div class='callout warn'>
          <div class='c-title'>Gotcha: report p50, p95, p99 — never the mean</div>
          One slow request (long prompt, cold cache, a big batch it landed in) wrecks tail latency while the average looks fine. SLOs live in the tail. "p99 TTFT under 800 ms" is a real target; "average latency 300 ms" is a vanity metric.
        </div>

        <div class='callout danger'>
          <div class='c-title'>War story: the queue is your latency</div>
          Under load, most of TTFT is often <em>time spent waiting in the scheduler queue</em>, not prefill compute. If TTFT spikes but GPU utilization is high, you are saturated — add replicas or shed load; don't "optimize the kernel."
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "I optimize TTFT and TPOT to an SLO, measured at p95/p99. Throughput and per-user latency trade off through batch size, so there is no single 'fast' — there is fast enough at the tail, at the right cost."
        </div>
      `,
    },
    {
      id: 'batching',
      group: 'Performance',
      nav: '5 · Batching',
      title: 'Batching: static, dynamic & continuous',
      lede: 'A GPU running one request is like a 40-ton truck delivering a single envelope. Batching is how you fill the truck — and continuous batching is the killer feature.',
      html: `
        <p>Decode is memory-bandwidth-bound: to produce one token you must read the entire weight matrix from HBM. If you read those same weights to serve <em>one</em> user or <em>fifty</em> users, the read cost is nearly identical. So <span class='kicker'>batching is almost free throughput</span> — until you run out of KV-cache memory.</p>

        <h3>Three generations of batching</h3>
        <div class='pattern-card'>
          <h4>Static batching</h4>
          <p>Collect N requests, run them together, return when <em>all</em> finish. Simple, but the whole batch waits for the slowest/longest generation. GPU sits idle as short requests finish early.</p>
          <div class='tag-row'><span class='tag use'>use when offline/uniform lengths</span><span class='tag avoid'>avoid for interactive traffic</span></div>
        </div>
        <div class='pattern-card'>
          <h4>Dynamic batching</h4>
          <p>Wait a few ms to gather whatever requests arrive, then batch them. Better GPU use than one-at-a-time, but still batch-at-the-boundary: a request that finishes early still holds its slot until the batch is done.</p>
          <div class='tag-row'><span class='tag use'>use for classic model servers (Triton)</span><span class='tag avoid'>avoid if generations vary wildly in length</span></div>
        </div>
        <div class='pattern-card'>
          <h4>Continuous (in-flight) batching ⭐</h4>
          <p>The batch is edited <em>every decode step</em>. A request that emits its stop token leaves immediately and a queued request takes its slot — no waiting for the batch to drain. This is the single biggest throughput win in modern serving and the reason vLLM/TGI/TensorRT-LLM feel so much faster.</p>
          <div class='tag-row'><span class='tag use'>use for all interactive LLM serving</span><span class='tag avoid'>avoid... basically never</span></div>
        </div>

        <div class='diagram'>
          <svg viewBox='0 0 640 200' width='640'>
            <text class='edge-label' x='60' y='20' text-anchor='middle'>Static</text>
            <rect class='node-box' x='20' y='30' width='200' height='22' rx='4'/><text class='node-sub' x='120' y='45' text-anchor='middle'>req A (short) — idle after finishing</text>
            <rect class='node-box' x='20' y='58' width='320' height='22' rx='4'/><text class='node-sub' x='180' y='73' text-anchor='middle'>req B (long) — everyone waits for this</text>
            <text class='edge-label' x='70' y='120' text-anchor='middle'>Continuous</text>
            <rect class='node-box worker' x='20' y='130' width='200' height='22' rx='4'/><text class='node-sub' x='120' y='145' text-anchor='middle'>req A finishes → slot freed</text>
            <rect class='node-box worker' x='230' y='130' width='150' height='22' rx='4'/><text class='node-sub' x='305' y='145' text-anchor='middle'>req C fills slot instantly</text>
            <rect class='node-box worker' x='20' y='158' width='360' height='22' rx='4'/><text class='node-sub' x='200' y='173' text-anchor='middle'>req B keeps going, no one blocked</text>
          </svg>
          <div class='diagram-caption'>Static batching wastes the GPU while short requests wait; continuous batching refills slots every step.</div>
        </div>

        <div class='callout warn'>
          <div class='c-title'>Gotcha: batching helps decode, not prefill</div>
          Prefill is already compute-bound, so throwing more requests at it fights for the same FLOPs. That is why modern schedulers use <strong>chunked prefill</strong> to interleave big prompts with ongoing decodes instead of letting one long prompt stall everyone (covered in the scheduling lesson).
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "Continuous batching edits the running batch every decode step, so finished requests free their slot immediately and queued ones fill it — that is what makes vLLM-class servers achieve high throughput without killing per-user latency."
        </div>
      `,
    },
    {
      id: 'memory-math',
      group: 'Resources',
      nav: '6 · Memory math',
      title: 'Memory math: why you run out of VRAM',
      lede: 'Two things eat your GPU memory: the weights (fixed) and the KV cache (grows with every user and every token). Let us actually do the arithmetic.',
      html: `
        <p>VRAM budgeting is the most common "back of the envelope" question in inference interviews. There are two buckets.</p>

        <h3>Bucket 1 — Weights (fixed)</h3>
        <p>Rule: <span class='kicker'>bytes per parameter × parameters</span>. fp16/bf16 = 2 bytes, fp8/int8 = 1 byte, int4 = 0.5 bytes.</p>
        <table>
          <tr><th>Model</th><th>fp16 (2B)</th><th>int8 (1B)</th><th>int4 (0.5B)</th></tr>
          <tr><td>7B</td><td>~14 GB</td><td>~7 GB</td><td>~3.5 GB</td></tr>
          <tr><td>13B</td><td>~26 GB</td><td>~13 GB</td><td>~6.5 GB</td></tr>
          <tr><td>70B</td><td>~140 GB</td><td>~70 GB</td><td>~35 GB</td></tr>
        </table>
        <p>A 70B model in fp16 does not fit on one 80 GB A100/H100 — you either quantize or shard across GPUs (tensor parallelism). A 7B fits comfortably and leaves room for KV cache.</p>

        <h3>Bucket 2 — KV cache (the sneaky one)</h3>
        <p>Per token, the cache stores K and V for every layer and every KV head:</p>
        <pre><code>kv_bytes_per_token = 2 (K and V)
                   × layers
                   × kv_heads × head_dim
                   × bytes_per_element</code></pre>
        <p>For a Llama-2-13B-style model (40 layers, hidden 5120, MHA) in fp16 this is on the order of <strong>~800 KB–1 MB per token</strong>. Multiply by sequence length and concurrent requests:</p>
        <pre><code>kv_total = kv_bytes_per_token × avg_seq_len × concurrent_requests</code></pre>
        <p>So 50 users at 2,000 tokens each can easily demand <strong>tens of GB</strong> of KV cache — often more than headroom left after weights. This is exactly why <strong>GQA</strong> (fewer KV heads) and <strong>KV-cache quantization</strong> exist, and why PagedAttention's anti-fragmentation matters so much.</p>

        <div class='callout warn'>
          <div class='c-title'>Gotcha</div>
          Don't forget activation/workspace overhead and CUDA/kernel reserves — budget ~10–20% slack. Running at 99% VRAM invites OOM crashes the moment a long prompt arrives.
        </div>

        <div class='callout good'>
          <div class='c-title'>Rule of thumb</div>
          <strong>Weights are a one-time tax; KV cache is a per-user, per-token rent.</strong> Your max concurrency is basically <code>(VRAM − weights − overhead) / kv_per_request</code>.
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "VRAM = weights (bytes-per-param × params, fixed) + KV cache (grows with tokens × concurrency). You usually run out of memory on the KV cache, not the weights — which is why GQA, KV quantization, and PagedAttention are throughput features."
        </div>
      `,
    },
    {
      id: 'quantization',
      group: 'Resources',
      nav: '7 · Quantization',
      title: 'Quantization: smaller, faster, mostly-as-good',
      lede: 'Store the weights in fewer bits. You halve (or quarter) memory and speed up the memory-bound decode — for a small, usually acceptable, quality hit.',
      html: `
        <p><span class='kicker'>Quantization</span> represents weights (and sometimes activations or the KV cache) in fewer bits than fp16. Because decode is memory-bandwidth-bound, moving fewer bytes per token means <em>faster decode</em>, not just smaller footprint — a double win.</p>

        <h3>The formats you should name-drop</h3>
        <table>
          <tr><th>Method</th><th>Bits</th><th>Type</th><th>Notes</th></tr>
          <tr><td><strong>GPTQ</strong></td><td>4</td><td>Weight-only, post-training</td><td>Calibration-based; great for single-GPU serving</td></tr>
          <tr><td><strong>AWQ</strong></td><td>4</td><td>Weight-only, activation-aware</td><td>Protects salient weights; strong quality/speed</td></tr>
          <tr><td><strong>GGUF (llama.cpp)</strong></td><td>2–8</td><td>Weight-only, CPU/edge</td><td>k-quants; the local/laptop ecosystem</td></tr>
          <tr><td><strong>FP8</strong></td><td>8</td><td>Weight + activation</td><td>Native on H100/Ada; near-lossless, hardware-accelerated</td></tr>
          <tr><td><strong>SmoothQuant / INT8</strong></td><td>8</td><td>Weight + activation (W8A8)</td><td>Migrates outliers so activations quantize cleanly</td></tr>
        </table>

        <h3>Weight-only vs weight+activation</h3>
        <p><strong>Weight-only</strong> (GPTQ, AWQ) shrinks the weights but computes in higher precision — biggest memory win, easiest quality. <strong>Weight+activation</strong> (FP8, INT8/W8A8) also quantizes the activations so the matmuls themselves run in low precision on tensor cores — bigger compute speedup, but activation outliers make it harder (hence SmoothQuant). Don't forget you can also <strong>quantize the KV cache</strong> (fp8/int8 K/V) to fit more concurrent users.</p>

        <div class='callout warn'>
          <div class='c-title'>Gotcha</div>
          "int4 = free" is a trap. Aggressive quantization degrades reasoning, math, and long-context fidelity first — and it often shows up on <em>your</em> eval, not the public benchmark. Always re-run task-specific evals after quantizing; perplexity barely moving does not mean your agent still passes.
        </div>

        <div class='callout good'>
          <div class='c-title'>Rule of thumb</div>
          For serving on H100-class hardware, <strong>FP8</strong> is often the sweet spot (near-lossless, hardware-accelerated). For squeezing a big model onto one GPU, <strong>4-bit AWQ/GPTQ</strong>. For laptops/edge, <strong>GGUF</strong>. QAT (quantization-aware training) beats post-training quantization at very low bits but costs a training run.
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "Quantization speeds up decode because it's memory-bound — fewer bytes per weight means faster reads. FP8 is near-lossless on modern GPUs; 4-bit AWQ/GPTQ trades a little quality to fit big models on one GPU. Always re-eval on your task, not just perplexity."
        </div>
      `,
    },
    {
      id: 'paged-attention-vllm',
      group: 'Serving stacks',
      nav: '8 · PagedAttention & vLLM',
      title: 'PagedAttention & vLLM: the big deal',
      lede: 'The KV cache was being stored in giant contiguous blocks, wasting 60–80% of memory to fragmentation. vLLM borrowed an idea from operating systems and fixed it.',
      html: `
        <p>Before vLLM, servers pre-allocated one big <em>contiguous</em> KV-cache buffer per request, sized to the maximum possible length. If a request only used 100 of a reserved 2,048 tokens, the rest was wasted. Between requests you also got fragmentation. Real utilization was often just <strong>20–40%</strong>.</p>

        <h3>The OS analogy that wins the interview</h3>
        <p><strong>PagedAttention</strong> treats the KV cache like <span class='kicker'>virtual memory</span>. Instead of one contiguous slab, the cache is split into fixed-size <strong>blocks (pages)</strong>. A per-request <em>block table</em> maps logical token positions to physical blocks — exactly like an OS page table maps virtual pages to physical frames. Blocks are allocated on demand as the sequence grows, and freed instantly when it ends. Fragmentation waste drops to near zero, so memory utilization jumps to ~<strong>90%+</strong>.</p>

        <div class='diagram'>
          <svg viewBox='0 0 640 200' width='640'>
            <defs><marker id='arrow2' markerWidth='10' markerHeight='10' refX='8' refY='3' orient='auto'><path d='M0,0 L8,3 L0,6 Z' fill='#8b98a9'/></marker></defs>
            <rect class='node-box' x='20' y='30' width='150' height='120' rx='8'/>
            <text class='node-text' x='95' y='55' text-anchor='middle'>Block table</text>
            <text class='node-sub' x='95' y='80' text-anchor='middle'>logical 0 → phys 7</text>
            <text class='node-sub' x='95' y='100' text-anchor='middle'>logical 1 → phys 2</text>
            <text class='node-sub' x='95' y='120' text-anchor='middle'>logical 2 → phys 9</text>
            <line class='edge' x1='170' y1='90' x2='260' y2='90' marker-end='url(#arrow2)'/>
            <text class='edge-label' x='215' y='82' text-anchor='middle'>maps to</text>
            <rect class='node-box worker' x='270' y='40' width='70' height='40' rx='6'/><text class='node-sub' x='305' y='64' text-anchor='middle'>phys 2</text>
            <rect class='node-box worker' x='350' y='40' width='70' height='40' rx='6'/><text class='node-sub' x='385' y='64' text-anchor='middle'>phys 7</text>
            <rect class='node-box worker' x='430' y='40' width='70' height='40' rx='6'/><text class='node-sub' x='465' y='64' text-anchor='middle'>phys 9</text>
            <text class='node-sub' x='390' y='120' text-anchor='middle'>Physical KV blocks — allocated on demand, shareable</text>
          </svg>
          <div class='diagram-caption'>A block table maps logical token positions to physical KV pages — just like OS virtual memory.</div>
        </div>

        <h3>The bonus superpower: sharing</h3>
        <p>Because the cache is paged, two requests with the same prefix (a shared system prompt, a few-shot preamble) can <strong>point at the same physical blocks</strong> — copy-on-write, like <code>fork()</code>. That is the foundation of <em>prefix caching</em> and cheap parallel sampling (multiple completions of one prompt share the prompt's KV).</p>

        <div class='callout good'>
          <div class='c-title'>Why it matters</div>
          Higher memory utilization means a <strong>bigger batch fits in the same VRAM</strong>, and bigger batches mean higher throughput. PagedAttention + continuous batching is why vLLM reported up to ~24× throughput over naive HuggingFace serving.
        </div>

        <div class='callout warn'>
          <div class='c-title'>Don't confuse the two</div>
          <strong>PagedAttention</strong> changes <em>where the KV cache lives</em> (anti-fragmentation, sharing). <strong>FlashAttention</strong> changes <em>how attention is computed</em> (IO-aware kernel). They are complementary and used together.
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "PagedAttention stores the KV cache in fixed-size pages with a per-request block table — OS virtual memory for the cache. It kills fragmentation (utilization ~90%+), enables prefix sharing, and is what lets vLLM pack huge batches for order-of-magnitude throughput gains."
        </div>
      `,
    },
    {
      id: 'prefix-caching-scheduling',
      group: 'Serving stacks',
      nav: '9 · Prefix caching & scheduling',
      title: 'Prefix caching, chunked prefill & disaggregation',
      lede: 'The prompt you already processed is free the second time. The scheduler decides who runs when — and modern stacks even split prefill and decode onto different GPUs.',
      html: `
        <p>Once the KV cache is paged, three powerful scheduling tricks fall out. Interviewers love these because they separate people who "ran vLLM once" from people who understand the system.</p>

        <h3>1 · Prefix caching (a.k.a. automatic KV reuse)</h3>
        <p>If many requests share a prefix — a long system prompt, RAG boilerplate, a few-shot preamble — you only need to prefill it <em>once</em> and reuse the KV blocks for every later request. vLLM's <strong>automatic prefix caching</strong> hashes prompt prefixes to blocks; SGLang's <strong>RadixAttention</strong> keeps a radix tree of cached prefixes across requests. Result: near-instant TTFT for the shared part, big savings for agents and chat with fixed system prompts.</p>

        <h3>2 · Chunked prefill</h3>
        <p>A 30k-token prompt would monopolize the GPU and stall every decoding user's stream (a TTFT/TPOT spike). <strong>Chunked prefill</strong> splits that prefill into smaller chunks and interleaves them with ongoing decode steps, so one giant prompt doesn't freeze everyone else. It smooths tail latency and keeps the GPU busy with a healthy mix of prefill + decode work.</p>

        <h3>3 · Prefill/decode disaggregation</h3>
        <p>Prefill is compute-bound; decode is memory-bandwidth-bound. Running both on the same GPU means they interfere. <strong>Disaggregated serving</strong> (DistServe, Mooncake, and now vLLM/TensorRT-LLM options) runs <em>prefill workers</em> and <em>decode workers</em> on separate GPU pools, transferring the KV cache between them. Each pool is tuned for its phase, improving goodput at a given latency SLO.</p>

        <div class='diagram'>
          <svg viewBox='0 0 640 170' width='640'>
            <defs><marker id='arrow3' markerWidth='10' markerHeight='10' refX='8' refY='3' orient='auto'><path d='M0,0 L8,3 L0,6 Z' fill='#8b98a9'/></marker></defs>
            <rect class='node-box' x='20' y='60' width='140' height='50' rx='8'/><text class='node-text' x='90' y='82' text-anchor='middle'>Prefill pool</text><text class='node-sub' x='90' y='100' text-anchor='middle'>compute-bound</text>
            <line class='edge' x1='160' y1='85' x2='300' y2='85' marker-end='url(#arrow3)'/>
            <text class='edge-label' x='230' y='77' text-anchor='middle'>ship KV cache</text>
            <rect class='node-box worker' x='300' y='60' width='140' height='50' rx='8'/><text class='node-text' x='370' y='82' text-anchor='middle'>Decode pool</text><text class='node-sub' x='370' y='100' text-anchor='middle'>bandwidth-bound</text>
            <line class='edge' x1='440' y1='85' x2='560' y2='85' marker-end='url(#arrow3)'/>
            <rect class='node-box tool' x='500' y='60' width='120' height='50' rx='8'/><text class='node-text' x='560' y='88' text-anchor='middle'>Stream tokens</text>
          </svg>
          <div class='diagram-caption'>Disaggregation: dedicate GPUs to prefill vs decode so the two phases stop fighting for the same resource.</div>
        </div>

        <div class='callout warn'>
          <div class='c-title'>Gotcha</div>
          Prefix caching only helps when prefixes actually repeat and are <em>prefixes</em> (shared from the start). Put stable content first (system prompt, few-shot, RAG context), user-specific/variable content last — otherwise the cache never hits. Cache eviction is real: under memory pressure old prefixes get dropped.
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "Three scheduler wins on top of paged KV: prefix caching reuses shared prompt KV (RadixAttention/vLLM APC), chunked prefill interleaves big prompts with decode to protect tail latency, and prefill/decode disaggregation puts each phase on hardware tuned for it."
        </div>
      `,
    },
    {
      id: 'speculative-decoding',
      group: 'Serving stacks',
      nav: '10 · Latency tricks',
      title: 'Speculative decoding & other latency tricks',
      lede: 'Decode is serial and slow. But what if a tiny model guessed several tokens ahead and the big model just checked them in one pass? That is speculative decoding.',
      html: `
        <p>Decode is bottlenecked by reading the big model's weights once per token. <span class='kicker'>Speculative decoding</span> attacks that: a cheap <strong>draft</strong> proposes several tokens at once, and the expensive <strong>target</strong> model <em>verifies</em> them all in a single forward pass. Accepted tokens are kept; the first rejected one is corrected. You get multiple tokens for roughly one big-model pass.</p>

        <div class='diagram'>
          <svg viewBox='0 0 640 170' width='640'>
            <defs><marker id='arrow4' markerWidth='10' markerHeight='10' refX='8' refY='3' orient='auto'><path d='M0,0 L8,3 L0,6 Z' fill='#8b98a9'/></marker></defs>
            <rect class='node-box' x='20' y='55' width='150' height='55' rx='8'/><text class='node-text' x='95' y='78' text-anchor='middle'>Draft model</text><text class='node-sub' x='95' y='96' text-anchor='middle'>guesses 4 tokens</text>
            <line class='edge' x1='170' y1='82' x2='280' y2='82' marker-end='url(#arrow4)'/>
            <rect class='node-box worker' x='280' y='55' width='170' height='55' rx='8'/><text class='node-text' x='365' y='78' text-anchor='middle'>Target verifies</text><text class='node-sub' x='365' y='96' text-anchor='middle'>1 parallel pass</text>
            <line class='edge' x1='450' y1='82' x2='560' y2='82' marker-end='url(#arrow4)'/>
            <rect class='node-box tool' x='500' y='55' width='120' height='55' rx='8'/><text class='node-text' x='560' y='78' text-anchor='middle'>Keep accepted</text><text class='node-sub' x='560' y='96' text-anchor='middle'>fix first reject</text>
          </svg>
          <div class='diagram-caption'>Draft proposes, target verifies in parallel. Verification is exact, so quality is unchanged.</div>
        </div>

        <h3>Why quality does not change</h3>
        <p>The target model still decides. Verification uses <strong>rejection sampling</strong> that provably yields the <em>same distribution</em> as the target decoding alone. Speculation only changes <em>speed</em>, never the output distribution. If the draft guesses well you go 2–3× faster; if it guesses badly you fall back to normal speed (plus a little overhead).</p>

        <h3>Flavors you should know</h3>
        <ul>
          <li><strong>Draft-model</strong>: a small model of the same family (e.g. Llama-1B drafting for Llama-70B).</li>
          <li><strong>Self-speculation / Medusa</strong>: extra prediction heads on the target model propose multiple tokens — no separate draft model.</li>
          <li><strong>EAGLE</strong>: predicts at the feature level for higher acceptance rates; a current SOTA approach.</li>
          <li><strong>Prompt lookup / n-gram</strong>: draft by copying repeated spans from the prompt — great for summarization, code edits, RAG.</li>
        </ul>

        <div class='callout warn'>
          <div class='c-title'>Gotcha</div>
          Speculative decoding lowers <em>latency</em> for the individual request but spends <em>extra compute</em> on verification. Under a saturated, large batch (already throughput-bound), that extra compute can <strong>reduce</strong> total throughput. It shines at low-to-moderate load where latency matters more than raw tokens/sec.
        </div>

        <div class='callout good'>
          <div class='c-title'>Other latency tricks</div>
          <strong>Chunked prefill</strong> and <strong>prefix caching</strong> (previous lesson) cut TTFT; <strong>continuous batching</strong> cuts queue wait; <strong>FP8/GQA</strong> cut TPOT. Speculative decoding is the tool specifically for cutting TPOT when you have spare compute.
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "A small draft proposes tokens; the big model verifies them in one parallel pass with rejection sampling, so output quality is identical. It trades extra compute for lower per-token latency — a win at low load, a possible loss when you're already throughput-bound."
        </div>
      `,
    },
    {
      id: 'parallelism-scaling',
      group: 'Scaling',
      nav: '11 · Multi-GPU parallelism',
      title: 'Parallelism: fitting and scaling across GPUs',
      lede: 'A 70B model does not fit on one card in fp16. Sharding it across GPUs is a menu of trade-offs — tensor, pipeline, data, and expert parallelism.',
      html: `
        <p>When a model (plus its KV cache) is too big for one GPU, or when you need more throughput than one GPU delivers, you split the work. Know the four axes and when each applies.</p>

        <table>
          <tr><th>Type</th><th>What it splits</th><th>Communication</th><th>Use when</th></tr>
          <tr><td><strong>Tensor (TP)</strong></td><td>Each layer's matrices across GPUs</td><td>Heavy (all-reduce every layer) → needs NVLink</td><td>Model too big for one GPU; low latency</td></tr>
          <tr><td><strong>Pipeline (PP)</strong></td><td>Layers into stages across GPUs</td><td>Light (activations at stage boundaries)</td><td>Scale across nodes; tolerate bubbles</td></tr>
          <tr><td><strong>Data (DP)</strong></td><td>Whole replicas, different requests</td><td>None between replicas</td><td>Model fits; scale throughput</td></tr>
          <tr><td><strong>Expert (EP)</strong></td><td>MoE experts across GPUs</td><td>All-to-all routing</td><td>Mixture-of-Experts models</td></tr>
        </table>

        <h3>The default recipe</h3>
        <p><strong>Tensor parallelism within a node, pipeline (or data) parallelism across nodes.</strong> TP needs a fast interconnect (NVLink/NVSwitch) because every layer does an all-reduce; running TP across a slow network kills performance. PP is communication-light but introduces <em>pipeline bubbles</em> (idle stages) that hurt latency. DP is the simplest: if the model fits, just run more replicas behind a load balancer.</p>

        <h3>MoE and expert parallelism</h3>
        <p>Mixture-of-Experts models (Mixtral, DeepSeek-V3, etc.) have many experts but activate only a few per token. That means huge total parameters but modest <em>active</em> FLOPs — cheaper compute, but the weights still must live in memory somewhere, so experts get sharded across GPUs (EP) with an all-to-all to route tokens to their chosen experts.</p>

        <div class='callout warn'>
          <div class='c-title'>Gotcha</div>
          More GPUs is not linear speedup. TP adds an all-reduce per layer; past ~8-way TP (one node) the communication tax dominates. Sharding also does not shrink the <em>total</em> KV cache — it just spreads it. If you're memory-bound, quantize before you shard.
        </div>

        <div class='callout good'>
          <div class='c-title'>Rule of thumb</div>
          Fit first (quantize / TP within a node), then scale out (DP replicas across nodes) for throughput. Reach for PP only when a single node cannot hold the model. In vLLM this is <code>tensor_parallel_size</code> and <code>pipeline_parallel_size</code>.
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "Tensor parallelism splits each layer and is communication-heavy, so keep it inside a NVLink node; pipeline parallelism splits layers across nodes but adds bubbles; data parallelism just replicates for throughput. Fit the model with TP/quantization, then scale throughput with DP replicas."
        </div>
      `,
    },
    {
      id: 'structured-decoding',
      group: 'Decoding',
      nav: '12 · Structured output',
      title: 'Structured output & constrained decoding',
      lede: 'When your app needs valid JSON or a function call, "please output JSON" is not a guarantee. Constrained decoding makes invalid output literally impossible.',
      html: `
        <p>Agents and tool-use pipelines need machine-parseable output — valid JSON, a specific schema, a SQL statement, a function call. Prompting for it works most of the time; <span class='kicker'>constrained (guided) decoding</span> makes it work every time by editing the sampling step itself.</p>

        <h3>How it works: mask the logits</h3>
        <p>At each decode step the model produces logits over the whole vocabulary. A constraint engine compiles your schema/grammar into a state machine and, at every step, <strong>masks out any token that would make the output invalid</strong> — sets its probability to zero before sampling. The model can only ever pick a token that keeps the output on a valid path. Output <em>cannot</em> violate the grammar because illegal tokens are unreachable.</p>

        <div class='diagram'>
          <svg viewBox='0 0 640 150' width='640'>
            <defs><marker id='arrow5' markerWidth='10' markerHeight='10' refX='8' refY='3' orient='auto'><path d='M0,0 L8,3 L0,6 Z' fill='#8b98a9'/></marker></defs>
            <rect class='node-box' x='20' y='50' width='140' height='50' rx='8'/><text class='node-text' x='90' y='72' text-anchor='middle'>Logits</text><text class='node-sub' x='90' y='90' text-anchor='middle'>full vocab</text>
            <line class='edge' x1='160' y1='75' x2='260' y2='75' marker-end='url(#arrow5)'/>
            <rect class='node-box tool' x='260' y='50' width='160' height='50' rx='8'/><text class='node-text' x='340' y='72' text-anchor='middle'>Grammar mask</text><text class='node-sub' x='340' y='90' text-anchor='middle'>zero illegal tokens</text>
            <line class='edge' x1='420' y1='75' x2='520' y2='75' marker-end='url(#arrow5)'/>
            <rect class='node-box worker' x='520' y='50' width='100' height='50' rx='8'/><text class='node-text' x='570' y='78' text-anchor='middle'>Sample</text>
          </svg>
          <div class='diagram-caption'>Constrained decoding masks invalid tokens each step, so only schema-valid outputs are reachable.</div>
        </div>

        <h3>Tools & names to drop</h3>
        <ul>
          <li><strong>Outlines</strong>, <strong>lm-format-enforcer</strong>, <strong>XGrammar</strong>, <strong>llguidance</strong> — grammar/JSON-schema engines integrated into vLLM/TGI/SGLang.</li>
          <li>OpenAI <strong>Structured Outputs</strong> / <code>json_schema</code> response format is the hosted-API version of the same idea.</li>
          <li>Regex, JSON Schema, EBNF/context-free grammars are all supported constraint types.</li>
        </ul>

        <div class='callout warn'>
          <div class='c-title'>Gotcha</div>
          Constraints guarantee <em>syntactic</em> validity, not <em>semantic</em> correctness — the JSON parses, but the values can still be wrong or hallucinated. Also, a naive grammar compiler can add per-token overhead; modern engines (XGrammar) precompute masks to keep it fast. And over-constraining can hurt quality by forbidding tokens the model "wanted" for good reasons.
        </div>

        <div class='callout good'>
          <div class='c-title'>Rule of thumb</div>
          If a downstream parser depends on the format, use constrained decoding — do not rely on prompt-and-pray plus retries. It removes an entire class of production failures (malformed JSON) for near-zero latency cost with a good engine.
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "Constrained decoding compiles a schema/grammar into a state machine and masks invalid tokens at each step, so the output is guaranteed to parse. It fixes syntax, not semantics — engines like Outlines and XGrammar make it cheap enough for production."
        </div>
      `,
    },
    {
      id: 'cost-capacity-planning',
      group: 'Operations',
      nav: '13 · Cost & capacity',
      title: 'Cost & capacity planning',
      lede: 'How many GPUs do I need, and what does a token cost? Turn tokens/sec and concurrency into a spreadsheet you can defend.',
      html: `
        <p>Capacity planning is where all the earlier concepts pay off. The interviewer wants to see you reason from <span class='kicker'>demand</span> to <span class='kicker'>GPUs</span> to <span class='kicker'>dollars</span>.</p>

        <h3>Step 1 — Demand</h3>
        <p>Estimate peak <strong>concurrent requests</strong> and the token profile: average input tokens (prefill work) and output tokens (decode work). Output tokens usually dominate latency; input tokens dominate prefill and often cost.</p>

        <h3>Step 2 — Per-GPU capacity</h3>
        <p>From benchmarks (or vLLM's own metrics) get <strong>throughput in output tokens/sec</strong> at your target batch size and SLO. Concurrency is bounded by KV-cache memory: <code>max_concurrency ≈ (VRAM − weights − overhead) / kv_per_request</code>. You are always limited by whichever hits first — compute (tokens/sec) or memory (KV cache).</p>

        <h3>Step 3 — GPUs and cost</h3>
        <pre><code>gpus_needed = peak_tokens_per_sec / tokens_per_sec_per_gpu   (then add headroom + redundancy)

cost_per_1M_tokens = gpu_hourly_cost / (tokens_per_sec_per_gpu × 3600) × 1e6</code></pre>
        <p>Example: an H100 at ~\\$3/hr producing 3,000 output tok/s ⇒ 3000 × 3600 = 10.8M tok/hr ⇒ ~\\$0.28 per 1M output tokens at full utilization. Real-world utilization is 30–60%, so multiply cost by 2–3×. This is why <strong>utilization is the whole game</strong>: continuous batching and PagedAttention directly cut your \\$/token by packing the GPU.</p>

        <div class='callout warn'>
          <div class='c-title'>Gotcha</div>
          Input and output tokens are not equal cost. Prefill (input) is cheap per token but happens once; decode (output) is expensive per token because it's serial. That is why hosted APIs price output tokens ~2–4× higher than input, and why cached input tokens are cheaper still.
        </div>

        <div class='callout good'>
          <div class='c-title'>Rule of thumb</div>
          Size for <strong>peak</strong>, autoscale toward the trough, and keep ~20% headroom for tail spikes and node failures. Batch offline/async workloads (embeddings, evals, bulk generation) separately at huge batch sizes — that's where GPUs are cheapest per token.
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "Cost/token = GPU \\$/hr ÷ (tokens/sec × 3600). The lever is utilization: continuous batching and PagedAttention pack the GPU, so more concurrent tokens ride the same weight reads. Plan from peak concurrency and the token profile, then add headroom."
        </div>
      `,
    },
    {
      id: 'hosted-vs-self-hosted',
      group: 'Operations',
      nav: '14 · Build vs buy',
      title: 'Hosted vs self-hosted & choosing a stack',
      lede: 'An API you call vs a fleet you babysit. The right answer depends on volume, data policy, and how much you love PagerDuty.',
      html: `
        <p>The classic build-vs-buy decision, LLM edition. Have a crisp framework, not a religion.</p>

        <div class='two-col'>
          <div>
            <div class='pattern-card'>
              <h4>Hosted API</h4>
              <p>OpenAI, Anthropic, Google, plus model-serving clouds (Together, Fireworks, Groq, Bedrock, Vertex). Pay per token, zero ops, frontier quality, instant scaling.</p>
              <div class='tag-row'><span class='tag use'>use for early stage / spiky / low volume</span><span class='tag avoid'>avoid if strict data residency</span></div>
            </div>
          </div>
          <div>
            <div class='pattern-card'>
              <h4>Self-hosted</h4>
              <p>Open-weight model on your GPUs (vLLM/TGI/TensorRT-LLM/SGLang). You own latency, data, and cost curve — and the on-call pager.</p>
              <div class='tag-row'><span class='tag use'>use for high steady volume / data control / fine-tunes</span><span class='tag avoid'>avoid if tiny team / bursty traffic</span></div>
            </div>
          </div>
        </div>

        <h3>Decision drivers</h3>
        <table>
          <tr><th>Factor</th><th>Leans hosted</th><th>Leans self-hosted</th></tr>
          <tr><td>Volume</td><td>Low / spiky</td><td>High / steady (better \\$/token at scale)</td></tr>
          <tr><td>Data policy</td><td>OK to send out</td><td>Must stay in your VPC / on-prem</td></tr>
          <tr><td>Model</td><td>Want frontier closed models</td><td>Open weights / custom fine-tunes / LoRA</td></tr>
          <tr><td>Latency</td><td>Fine with public endpoint</td><td>Need tight/predictable tail control</td></tr>
          <tr><td>Team</td><td>Small, no GPU ops</td><td>Have MLOps / SRE muscle</td></tr>
        </table>

        <h3>Self-hosted serving stacks</h3>
        <table>
          <tr><th>Stack</th><th>Sweet spot</th></tr>
          <tr><td><strong>vLLM</strong></td><td>De-facto default; PagedAttention, continuous batching, wide model support, OpenAI-compatible API</td></tr>
          <tr><td><strong>TensorRT-LLM</strong> (+ Triton)</td><td>Max NVIDIA performance; compiled kernels, FP8; more setup effort</td></tr>
          <tr><td><strong>TGI</strong> (Hugging Face)</td><td>Easy HF ecosystem integration, solid production defaults</td></tr>
          <tr><td><strong>SGLang</strong></td><td>RadixAttention prefix cache, strong for agents/structured/multi-turn</td></tr>
          <tr><td><strong>llama.cpp / Ollama</strong></td><td>Local, CPU/edge, laptops, quick prototypes (GGUF)</td></tr>
        </table>

        <div class='callout warn'>
          <div class='c-title'>Gotcha: the hidden costs of self-hosting</div>
          The GPU bill is the visible cost. The invisible ones: autoscaling for spiky traffic (GPUs boot slowly), model/weight updates, evals + safety, on-call, and idle-time waste. Many teams start hosted, then self-host <em>only the high-volume, stable</em> workloads once economics flip.
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "Start hosted for speed and to validate; self-host when volume is high and steady, data must stay in your VPC, or you need custom fine-tunes. For self-hosting, vLLM is the sane default; TensorRT-LLM for peak NVIDIA perf; SGLang for prefix-heavy agent workloads."
        </div>
      `,
    },
    {
      id: 'production-ops',
      group: 'Operations',
      nav: '15 · Production ops',
      title: 'Production ops: autoscaling, routing & observability',
      lede: 'Getting one GPU fast is a demo. Keeping a fleet fast, cheap, and up under real traffic is the job — and where most systems quietly fall over.',
      html: `
        <p>Beyond a single server, LLM serving is a distributed-systems problem with a few LLM-specific twists. This is the lesson that separates "I ran vLLM" from "I ran it in production."</p>

        <h3>Autoscaling — the cold-start problem</h3>
        <p>GPUs don't scale like stateless web pods. A new replica must be scheduled on a scarce GPU node, pull tens of GB of weights, load them into VRAM, and warm up — often <strong>minutes</strong>, not seconds. So you scale on <em>leading</em> signals (queue depth, pending tokens, GPU utilization), keep <strong>warm pools</strong> for burst, and cache weights on fast local storage. Scaling to zero saves money but pays a brutal first-request latency.</p>

        <h3>Load balancing & KV-aware routing</h3>
        <p>Round-robin is wrong for LLMs. Requests are long-lived and stateful (their KV cache lives on a specific replica). Smart routers use:</p>
        <ul>
          <li><strong>Least-loaded / least-pending-tokens</strong> instead of round-robin.</li>
          <li><strong>Prefix-aware / session-affinity routing</strong>: send requests sharing a prefix (or a multi-turn session) to the replica that already has those KV blocks cached → instant prefix-cache hits.</li>
          <li><strong>Separate queues/pools</strong> for interactive vs batch, and sometimes for prefill vs decode (disaggregation).</li>
        </ul>

        <h3>Observability — the metrics that matter</h3>
        <table>
          <tr><th>Signal</th><th>Watch for</th></tr>
          <tr><td>TTFT / TPOT (p50/p95/p99)</td><td>Tail SLO breaches — the real user pain</td></tr>
          <tr><td>Queue depth / wait time</td><td>Saturation; rising queue = add capacity or shed</td></tr>
          <tr><td>KV-cache utilization &amp; evictions</td><td>Memory pressure, preemptions</td></tr>
          <tr><td>Batch size / GPU utilization</td><td>Under-batching (waste) vs over-batching (latency)</td></tr>
          <tr><td>Preemption / recompute rate</td><td>Requests being paused/swapped under load</td></tr>
          <tr><td>Tokens/sec &amp; \\$/token</td><td>Efficiency and cost regressions</td></tr>
        </table>

        <div class='callout danger'>
          <div class='c-title'>War story: KV-cache preemption death spiral</div>
          When VRAM fills, servers <strong>preempt</strong> in-flight requests — swapping their KV cache to CPU or recomputing it later. Under sustained overload, recompute work piles on top of new load, latency explodes, and the system thrashes. The fix is <strong>admission control</strong>: reject or queue at the door (backpressure) rather than accept everything and melt down. Load-shed early.
        </div>

        <div class='callout warn'>
          <div class='c-title'>Gotcha</div>
          Also budget for: <strong>rate limiting / quotas</strong> per tenant, <strong>timeouts</strong> (a runaway generation can burn a slot forever — cap max tokens), <strong>streaming disconnects</strong> (stop compute when the client hangs up), and <strong>safe rollouts</strong> (canary a new model/quant, watch quality + latency, roll back fast).
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "LLM ops twists: cold starts are minutes because weights are huge (keep warm pools, scale on queue depth); route with prefix/session affinity and least-pending-tokens, not round-robin; and use admission control to avoid the KV-preemption death spiral under overload."
        </div>
      `,
    },
    {
      id: 'pitfalls-cheatsheet',
      group: 'Recap',
      nav: '16 · Pitfalls & rapid-fire recap',
      title: 'Pitfalls + rapid-fire interview cheat-sheet',
      lede: 'Everything that matters, compressed. Read this on the train to the interview.',
      html: `
        <p>The last-mile review. If you can riff on every line below, you can hold your own in any LLM-serving interview.</p>

        <h3>The one-paragraph mental model</h3>
        <p>An LLM generates one token per forward pass in a serial loop. Each request has a <strong>compute-bound prefill</strong> (builds the KV cache, drives TTFT) and a <strong>memory-bandwidth-bound decode</strong> (one token at a time, drives TPOT). The <strong>KV cache</strong> makes decode cheap in FLOPs but expensive in VRAM, so you usually run out of memory before compute. Serving is the art of packing GPUs — <strong>continuous batching</strong> + <strong>PagedAttention</strong> — to hit latency SLOs at the lowest \\$/token.</p>

        <h3>Rapid-fire Q&amp;A</h3>
        <table>
          <tr><th>Question</th><th>Crisp answer</th></tr>
          <tr><td>Decode bottleneck?</td><td>Memory bandwidth (streaming weights + KV cache per token)</td></tr>
          <tr><td>Prefill bottleneck?</td><td>Compute / FLOPs (whole prompt in one parallel pass)</td></tr>
          <tr><td>What's in the KV cache?</td><td>Per-token Key &amp; Value vectors for every layer/KV-head, kept to avoid O(n²) recompute</td></tr>
          <tr><td>TTFT vs TPOT?</td><td>Time to first token (prefill+queue) vs time per output token (decode)</td></tr>
          <tr><td>Best batching?</td><td>Continuous / in-flight — refills slots every decode step</td></tr>
          <tr><td>PagedAttention?</td><td>OS-style paged KV cache; kills fragmentation, enables prefix sharing</td></tr>
          <tr><td>GQA/MQA?</td><td>Fewer K/V heads → smaller KV cache → more concurrency, ~no quality loss</td></tr>
          <tr><td>FlashAttention?</td><td>IO-aware kernel; avoids writing N×N matrix to HBM; same result, faster</td></tr>
          <tr><td>Quantization win?</td><td>Fewer bytes/weight → faster memory-bound decode + smaller footprint; FP8 near-lossless</td></tr>
          <tr><td>Speculative decoding?</td><td>Draft proposes, target verifies in one pass; identical quality, lower latency</td></tr>
          <tr><td>Prefix caching?</td><td>Reuse KV of a shared prompt prefix; instant TTFT for the shared part</td></tr>
          <tr><td>Chunked prefill?</td><td>Interleave big prompt prefill with decode so it doesn't stall streams</td></tr>
          <tr><td>Tensor vs pipeline parallel?</td><td>TP splits each layer (comms-heavy, keep in NVLink node); PP splits layers across nodes (bubbles)</td></tr>
          <tr><td>Structured output?</td><td>Constrained decoding masks invalid tokens → guaranteed-valid JSON/grammar</td></tr>
          <tr><td>Cost/token lever?</td><td>Utilization — pack the GPU via batching + paging</td></tr>
        </table>

        <h3>Top pitfalls that make you sound junior</h3>
        <div class='callout danger'>
          <div class='c-title'>Don't say these</div>
          <ul>
            <li>"Decode is compute-bound." (It's memory-bandwidth-bound.)</li>
            <li>"Just increase batch size to make it faster." (Raises throughput but hurts per-user TPOT and can OOM the KV cache.)</li>
            <li>"Bigger GPU fixes latency." (Decode latency is bandwidth + serial-loop limited; often quantization/spec-decoding help more.)</li>
            <li>"Quantization is free." (Re-eval on your task; it degrades reasoning/long-context first.)</li>
            <li>"Report average latency." (Use p95/p99 — SLOs live in the tail.)</li>
            <li>"Round-robin the requests." (Use prefix/session-affinity + least-pending-tokens routing.)</li>
          </ul>
        </div>

        <div class='callout good'>
          <div class='c-title'>The five levers to raise throughput / cut cost</div>
          <ol>
            <li><strong>Continuous batching</strong> — pack the GPU every step.</li>
            <li><strong>PagedAttention + prefix caching</strong> — no wasted KV memory, reuse shared prompts.</li>
            <li><strong>Quantization (FP8 / int4) + GQA / KV-quant</strong> — fewer bytes, more concurrency.</li>
            <li><strong>Speculative decoding</strong> — more tokens per big-model pass (at low load).</li>
            <li><strong>Right hardware + parallelism + utilization</strong> — the ultimate \\$/token driver.</li>
          </ol>
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "Serving LLMs is memory-and-scheduling engineering: prefill is compute-bound, decode is bandwidth-bound, the KV cache is the scarce resource, and every big win — continuous batching, PagedAttention, quantization, speculative decoding — is really about packing more useful tokens through the same GPU at a latency SLO."
        </div>
      `,
    },
  ],
  quizzes: [
    {
      question: 'During the decode phase of LLM inference, what is the primary hardware bottleneck?',
      options: [
        { text: 'Compute (FLOPs), because attention is O(n²)', correct: false },
        { text: 'Memory bandwidth — every token requires streaming the weights and KV cache from HBM', correct: true },
        { text: 'Network bandwidth between GPUs', correct: false },
        { text: 'CPU-side tokenization overhead', correct: false },
      ],
      explain: 'Decode produces one token per forward pass; the dominant cost is reading the entire weight matrix (and KV cache) from GPU memory each step, so it is memory-bandwidth-bound, not compute-bound.',
    },
    {
      question: 'What does the KV cache store, and why does it matter for serving?',
      options: [
        { text: 'The output tokens generated so far, to avoid re-tokenizing', correct: false },
        { text: 'The Key and Value vectors of previous tokens, so attention avoids O(n²) recomputation — but it grows with tokens × concurrency and eats VRAM', correct: true },
        { text: 'A cache of common prompts and their full responses', correct: false },
        { text: 'The model weights in a compressed format', correct: false },
      ],
      explain: 'The KV cache holds per-token K/V vectors so each decode step reuses them instead of recomputing. It makes decode cheap in FLOPs but expensive in memory, and is usually what limits concurrency.',
    },
    {
      question: 'Why is continuous (in-flight) batching better than static batching for interactive serving?',
      options: [
        { text: 'It runs each request on a dedicated GPU', correct: false },
        { text: 'It edits the batch every decode step, so a finished request frees its slot immediately and a queued request fills it — no waiting for the whole batch to drain', correct: true },
        { text: 'It disables the KV cache to save memory', correct: false },
        { text: 'It increases the temperature to produce tokens faster', correct: false },
      ],
      explain: 'Static batching makes every request wait for the slowest one. Continuous batching adds/removes requests at each step, keeping the GPU full and slashing queue wait, which is the biggest modern throughput win.',
    },
    {
      question: 'GQA (grouped-query attention) improves serving primarily because it…',
      options: [
        { text: 'increases the number of attention heads for better quality', correct: false },
        { text: 'shares K/V heads across many query heads, shrinking the KV cache so more requests fit per GPU with almost no quality loss', correct: true },
        { text: 'removes the KV cache entirely', correct: false },
        { text: 'quantizes the weights to 4 bits', correct: false },
      ],
      explain: 'GQA uses fewer K/V heads (grouped) than query heads. A smaller KV cache means higher achievable batch size and concurrency — a throughput lever — while staying near full-MHA quality.',
    },
    {
      question: 'What core idea does PagedAttention borrow from operating systems?',
      options: [
        { text: 'Round-robin CPU scheduling', correct: false },
        { text: 'Virtual memory: the KV cache is split into fixed-size pages mapped by a per-request block table, eliminating fragmentation and enabling prefix sharing', correct: true },
        { text: 'Copy-on-write forking of the entire model', correct: false },
        { text: 'Swapping the model weights to disk', correct: false },
      ],
      explain: 'PagedAttention stores the KV cache in non-contiguous fixed-size blocks with a block table, exactly like OS page tables. This raises memory utilization to ~90%+ and lets requests share prefix blocks.',
    },
    {
      question: 'Why does speculative decoding not change the model output distribution?',
      options: [
        { text: 'The draft model is a fine-tuned copy of the target', correct: false },
        { text: 'The target model verifies proposed tokens with rejection sampling that provably preserves its own decoding distribution — it only changes speed', correct: true },
        { text: 'It only runs at temperature 0', correct: false },
        { text: 'It averages the draft and target logits', correct: false },
      ],
      explain: 'The draft merely proposes; the target verifies in one parallel pass using rejection sampling, which mathematically yields the same distribution as normal target decoding. Speed changes, quality does not.',
    },
    {
      question: 'For a 70B-parameter model, roughly how much VRAM do the weights alone need in fp16 versus int4?',
      options: [
        { text: '~70 GB in fp16 and ~140 GB in int4', correct: false },
        { text: '~140 GB in fp16 and ~35 GB in int4', correct: true },
        { text: '~35 GB in fp16 and ~70 GB in int4', correct: false },
        { text: 'Both about 70 GB regardless of precision', correct: false },
      ],
      explain: 'Weights ≈ bytes-per-param × params. fp16 is 2 bytes → 70B × 2 = ~140 GB; int4 is 0.5 bytes → 70B × 0.5 = ~35 GB. (KV cache and overhead are on top of this.)',
    },
    {
      question: 'You are on a single GPU node and need to fit a model too big for one card while keeping latency low. Which parallelism fits best, and what is its main constraint?',
      options: [
        { text: 'Pipeline parallelism — but it needs the whole model on each GPU', correct: false },
        { text: 'Tensor parallelism — it splits each layer across GPUs but is communication-heavy, so it needs a fast interconnect like NVLink', correct: true },
        { text: 'Data parallelism — it splits each layer across GPUs with no communication', correct: false },
        { text: 'Expert parallelism — required for all dense models', correct: false },
      ],
      explain: 'Tensor parallelism shards each layer\'s matrices and does an all-reduce every layer, so it only performs well over a fast intra-node interconnect (NVLink/NVSwitch). Pipeline parallelism is for scaling across nodes; data parallelism just replicates.',
    },
    {
      question: 'Your app must always receive valid JSON matching a schema. What is the most reliable technique?',
      options: [
        { text: 'Lower the temperature to 0 and add "output only JSON" to the prompt', correct: false },
        { text: 'Constrained (guided) decoding — compile the schema to a state machine and mask any token that would make the output invalid at each step', correct: true },
        { text: 'Retry the request until the JSON happens to parse', correct: false },
        { text: 'Increase top_p so the model considers more tokens', correct: false },
      ],
      explain: 'Constrained decoding (Outlines, XGrammar, lm-format-enforcer) masks invalid logits every step so only schema-valid outputs are reachable — guaranteeing syntactic validity, unlike prompt-and-pray or retries.',
    },
    {
      question: 'Under sustained overload, an LLM server enters a latency "death spiral." What is the correct mitigation?',
      options: [
        { text: 'Increase batch size to process everything faster', correct: false },
        { text: 'Admission control / backpressure — reject or queue requests at the door instead of accepting everything and thrashing on KV-cache preemption and recompute', correct: true },
        { text: 'Disable the KV cache to save memory', correct: false },
        { text: 'Switch to round-robin load balancing', correct: false },
      ],
      explain: 'When VRAM fills, in-flight requests get preempted (swapped/recomputed), piling work on top of new load. Load-shedding and admission control at the entry point prevent the thrash; accepting more work makes it worse.',
    },
  ],
};
