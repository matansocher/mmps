export default {
  id: 'embeddings-vector-databases-course',
  title: 'Embeddings & Vector DBs',
  icon: '📐',
  color: '#f0883e',
  lessons: [
    {
      id: 'intro',
      group: 'Foundations',
      nav: '0 · How to use this',
      title: 'Course overview & mental model',
      lede: 'A dense, interview-focused tour of embeddings and vector databases: from meaning-as-geometry up to production ANN systems and RAG.',
      html: `
        <p>This course targets a <strong>senior engineer</strong> who already ships software and understands LLMs and APIs, but wants a crisp, testable vocabulary for <span class='kicker'>embeddings</span> and <span class='kicker'>vector databases</span> — the plumbing under semantic search, RAG, recommendations, deduplication, and clustering.</p>

        <h3>The one mental model to anchor everything</h3>
        <p>An <strong>embedding</strong> is a dense vector (a list of floats) produced by an encoder model that places <strong>semantically similar items near each other</strong> in a high-dimensional space. A <strong>vector database</strong> is infrastructure that stores millions or billions of those vectors and answers one question fast: <em>"what is nearest to this query vector?"</em> in milliseconds.</p>

        <div class='diagram'>
          <svg viewBox='0 0 620 240' xmlns='http://www.w3.org/2000/svg'>
            <defs>
              <marker id='arrow' markerWidth='10' markerHeight='10' refX='8' refY='3' orient='auto' markerUnits='strokeWidth'>
                <path d='M0,0 L8,3 L0,6 Z' fill='#8b98a9'></path>
              </marker>
            </defs>
            <rect class='node-box' x='30' y='95' width='120' height='55' rx='8'></rect>
            <text class='node-text' x='90' y='118' text-anchor='middle'>Raw data</text>
            <text class='node-sub' x='90' y='135' text-anchor='middle'>text / image / audio</text>

            <rect class='node-box tool' x='230' y='95' width='140' height='55' rx='8'></rect>
            <text class='node-text' x='300' y='118' text-anchor='middle'>Encoder model</text>
            <text class='node-sub' x='300' y='135' text-anchor='middle'>produces vector</text>

            <rect class='node-box worker' x='450' y='95' width='140' height='55' rx='8'></rect>
            <text class='node-text' x='520' y='118' text-anchor='middle'>Vector DB</text>
            <text class='node-sub' x='520' y='135' text-anchor='middle'>store + ANN search</text>

            <path class='edge' d='M150 122 L228 122' marker-end='url(#arrow)'></path>
            <path class='edge' d='M370 122 L448 122' marker-end='url(#arrow)'></path>
            <text class='edge-label' x='185' y='112'>embed</text>
            <text class='edge-label' x='400' y='112'>upsert</text>
          </svg>
          <div class='diagram-caption'>The pipeline: encode data into vectors, store them, then search by nearest-neighbor at query time.</div>
        </div>

        <h3>Why this matters right now</h3>
        <p>Every RAG system, semantic search bar, "related items" widget, and dedupe pipeline in the last few years rides on this stack. Keyword search (BM25) matches <em>tokens</em>; embeddings match <em>meaning</em>. Ask "how do I fix a slow laptop" and an embedding index will surface a doc titled "improving computer performance" that shares zero keywords.</p>

        <h3>What you'll be able to say in an interview</h3>
        <ul>
          <li>Define an embedding and explain why proximity encodes meaning.</li>
          <li>Pick the right similarity metric and explain the cosine/dot equivalence on normalized vectors.</li>
          <li>Explain why exact kNN doesn't scale and how HNSW / IVF / PQ buy speed by trading recall.</li>
          <li>Choose between Pinecone, Milvus, Qdrant, Weaviate, pgvector, and FAISS — and justify it.</li>
          <li>Design chunking, hybrid search, reranking, and a re-embedding/migration plan.</li>
          <li>Measure retrieval quality with recall@k, MRR, and nDCG.</li>
        </ul>

        <div class='callout'>
          <div class='c-title'>How to read this</div>
          Each lesson ends with an <strong>Interview soundbite</strong> — a one-liner you can repeat under pressure. Steal them shamelessly. The final lesson is a rapid-fire cheat-sheet.
        </div>

        <div class='callout good'>
          <div class='c-title'>Interview soundbite</div>
          "Embeddings turn meaning into geometry; a vector DB makes nearest-neighbor search over that geometry fast at scale by trading a little recall for a lot of speed."
        </div>
      `,
    },
    {
      id: 'what-is-embedding',
      group: 'Foundations',
      nav: '1 · What is an embedding?',
      title: 'What actually is an embedding?',
      lede: 'How vectors are produced, what dimensionality means, and why proximity encodes meaning.',
      html: `
        <h3>A vector is a coordinate in "meaning space"</h3>
        <p>Feed text (or an image, or audio) into an encoder model and it returns a fixed-length list of floats, e.g. <code>[0.021, -0.44, 0.17, ...]</code> of length 768, 1024, 1536, or 3072. Each dimension is a learned <em>latent feature</em> — not human-labeled like "formality" or "sentiment", but an axis the model discovered during training. The magic: the model is trained so that <strong>things that mean similar things land close together</strong>.</p>

        <div class='callout'>
          <div class='c-title'>The famous analogy</div>
          <code>king − man + woman ≈ queen</code>. Directions in the space carry meaning (gender, tense, plurality). Modern contextual embeddings are far richer than these early word2vec tricks, but the geometry intuition still holds: <strong>meaning is direction and distance</strong>.
        </div>

        <h3>Where the numbers come from</h3>
        <p>Encoders are neural nets (usually Transformers) trained with objectives that pull related items together and push unrelated ones apart:</p>
        <ul>
          <li><strong>Contrastive learning</strong> — show the model positive pairs (a question and its answer, an image and its caption) and negatives; train so positives are close, negatives far. This is how most modern retrieval embedders (E5, BGE, GTE) are built.</li>
          <li><strong>Masked language modeling</strong> (BERT-style) — predict hidden tokens; a pooled hidden state becomes the embedding.</li>
          <li><strong>Pooling</strong> — token vectors get combined into one sentence vector via <strong>mean pooling</strong> or the <code>[CLS]</code> token. Sentence-Transformers popularized mean pooling for retrieval quality.</li>
        </ul>

        <h3>Dimensionality: the space you live in</h3>
        <table>
          <tbody><tr><th>Dims</th><th>Example models</th><th>Trade-off</th></tr>
          <tr><td>384</td><td>all-MiniLM-L6-v2</td><td>Tiny, fast, cheap; lower ceiling on quality.</td></tr>
          <tr><td>768</td><td>BGE-base, E5-base</td><td>The classic sweet spot for many tasks.</td></tr>
          <tr><td>1024</td><td>BGE-large, E5-large, Cohere v3</td><td>Higher quality, more memory.</td></tr>
          <tr><td>1536 / 3072</td><td>OpenAI text-embedding-3-small / -large</td><td>Strong quality; 3072 is 4&times; the storage of 768.</td></tr>
        </tbody></table>

        <div class='callout warn'>
          <div class='c-title'>Gotcha: more dims is not free quality</div>
          Storage and RAM scale linearly with dimensions, and higher dims worsen the <strong>curse of dimensionality</strong> (in very high-D space, distances between random points concentrate, so "nearest" gets fuzzier). Pick dims for your quality/cost point, not because bigger sounds better.
        </div>

        <h3>Dense vs sparse — one crisp distinction</h3>
        <div class='two-col'>
          <div>
            <h4>Dense (what we mean by "embedding")</h4>
            <p>Every dimension is a nonzero float. ~768–3072 numbers capturing semantics. Great at meaning, weaker at exact rare terms (a specific SKU, a person's name).</p>
          </div>
          <div>
            <h4>Sparse (BM25 / SPLADE)</h4>
            <p>A vector the size of the vocabulary, mostly zeros, nonzero only for present terms. Great at exact lexical matches and rare tokens. This is the "keyword" side of hybrid search.</p>
          </div>
        </div>

        <div class='callout good'>
          <div class='c-title'>Interview soundbite</div>
          "An embedding is a dense float vector where geometric proximity equals semantic similarity, produced by a contrastively-trained encoder. Dimensionality trades quality for storage and latency."
        </div>
      `,
    },
    {
      id: 'types',
      group: 'Foundations',
      nav: '2 · Types of embeddings',
      title: 'Types of embeddings',
      lede: 'Word vs contextual vs sentence/document vs multimodal — and which to reach for.',
      html: `
        <h3>The four families</h3>
        <div class='pattern-card'>
          <h4>1 · Word embeddings (static)</h4>
          <p>word2vec, GloVe, fastText. One fixed vector per word, <em>regardless of context</em>. "bank" (river) and "bank" (money) share one vector — a real limitation. Mostly historical now, but the origin of the whole field.</p>
          <div class='tag-row'><span class='tag use'>use when: legacy / lightweight lexical features</span><span class='tag avoid'>avoid when: you need real semantics</span></div>
        </div>

        <div class='pattern-card'>
          <h4>2 · Contextual token embeddings</h4>
          <p>BERT, RoBERTa, and the internal layers of any LLM. The vector for a token <em>depends on the whole sentence</em>, so "bank" gets different vectors in different contexts. These are per-token; you pool them to get a sentence vector.</p>
          <div class='tag-row'><span class='tag use'>use when: token-level tasks, or as a base to pool</span><span class='tag avoid'>avoid when: you need one ready-made doc vector</span></div>
        </div>

        <div class='pattern-card'>
          <h4>3 · Sentence / document embeddings</h4>
          <p>Sentence-Transformers (SBERT), E5, BGE, GTE, OpenAI text-embedding-3, Cohere Embed, Voyage. One vector per sentence/paragraph/chunk, <strong>optimized for retrieval</strong>. <em>This is what you use for RAG and semantic search 95% of the time.</em></p>
          <div class='tag-row'><span class='tag use'>use when: search, RAG, clustering, dedupe</span><span class='tag avoid'>avoid when: you truly need token-level output</span></div>
        </div>

        <div class='pattern-card'>
          <h4>4 · Multimodal embeddings</h4>
          <p>CLIP, SigLIP, ImageBind, Cohere Embed v3 (multimodal), Voyage multimodal. Text and images (and sometimes audio) share <strong>one space</strong>, so a text query can retrieve images and vice versa. Powers "search my photos by describing them".</p>
          <div class='tag-row'><span class='tag use'>use when: cross-modal search / retrieval</span><span class='tag avoid'>avoid when: pure-text tasks (a text model beats CLIP on text)</span></div>
        </div>

        <h3>Query vs document asymmetry (the E5 trick)</h3>
        <p>Many retrieval models (E5, BGE, Nomic) are <strong>asymmetric</strong>: you must prefix inputs, e.g. <code>query: how do I reset my password</code> vs <code>passage: To reset your password...</code>. Skipping the prefix silently tanks recall. Instructor / Nomic models take an <em>instruction</em> per task. Always read the model card.</p>

        <div class='callout warn'>
          <div class='c-title'>War story</div>
          A team switched from OpenAI to <code>intfloat/e5-large</code> and saw retrieval quality crater. Cause: they forgot the <code>query:</code> / <code>passage:</code> prefixes. Adding them restored — and then beat — the old numbers. The model was fine; the usage was wrong.
        </div>

        <h3>Bi-encoder vs cross-encoder</h3>
        <p>Everything above is a <strong>bi-encoder</strong>: query and document are embedded <em>independently</em>, so document vectors can be precomputed and indexed. A <strong>cross-encoder</strong> feeds query+document <em>together</em> into a model and scores the pair — far more accurate but O(N) per query, so it can't index. The standard pattern: bi-encoder retrieves top-100, cross-encoder <strong>reranks</strong> them (covered later).</p>

        <div class='callout good'>
          <div class='c-title'>Interview soundbite</div>
          "For retrieval I default to a sentence embedding model (E5/BGE/OpenAI-3) as a bi-encoder for fast recall, then optionally rerank with a cross-encoder for precision. Multimodal? CLIP-family shared space."
        </div>
      `,
    },
    {
      id: 'choosing-model',
      group: 'Foundations',
      nav: '3 · Choosing a model',
      title: 'Choosing an embedding model',
      lede: 'The decision axes: dims, sequence length, domain, multilingual, cost, MTEB, open vs API, Matryoshka.',
      html: `
        <h3>The decision checklist</h3>
        <table>
          <tbody><tr><th>Axis</th><th>What to ask</th></tr>
          <tr><td><strong>Quality</strong></td><td>Where does it rank on <strong>MTEB</strong> for <em>your</em> task (retrieval, clustering, classification)? Don't trust one leaderboard number blindly.</td></tr>
          <tr><td><strong>Dimensions</strong></td><td>Higher = more storage/memory/latency. Match to your recall needs and budget.</td></tr>
          <tr><td><strong>Max sequence length</strong></td><td>512 tokens (many BERT models) vs 8k+ (OpenAI, Nomic, some long-context). Long docs may need chunking regardless.</td></tr>
          <tr><td><strong>Domain</strong></td><td>Legal, code, biomedical? A domain-tuned model (e.g. code embeddings) can beat a bigger general one.</td></tr>
          <tr><td><strong>Multilingual</strong></td><td>Need cross-lingual retrieval? Pick multilingual-e5, Cohere multilingual, or BGE-M3.</td></tr>
          <tr><td><strong>Cost &amp; ops</strong></td><td>API (no infra, per-token cost, data leaves your VPC) vs open/self-host (GPU cost, control, privacy).</td></tr>
          <tr><td><strong>Latency</strong></td><td>API round-trip vs local inference. High-QPS query embedding may need a small local model.</td></tr>
        </tbody></table>

        <h3>MTEB — the benchmark to name</h3>
        <p>The <strong>Massive Text Embedding Benchmark</strong> evaluates models across dozens of datasets and 8 task types (retrieval, reranking, clustering, classification, STS, summarization, pair-classification, bitext). Use it to <strong>shortlist</strong>, then <strong>validate on your own data</strong> — leaderboard rank rarely transfers perfectly to your domain, and some models are suspiciously tuned to the benchmark.</p>

        <h3>API vs open-source — a real trade table</h3>
        <table>
          <tbody><tr><th></th><th>API (OpenAI, Cohere, Voyage)</th><th>Open-source self-host (E5, BGE, GTE)</th></tr>
          <tr><td>Setup</td><td>Zero infra, one HTTP call</td><td>GPU, serving stack, autoscaling</td></tr>
          <tr><td>Cost model</td><td>Per-token; predictable per call</td><td>Fixed GPU cost; cheap at high volume</td></tr>
          <tr><td>Privacy</td><td>Data leaves your VPC</td><td>Stays in-house</td></tr>
          <tr><td>Control</td><td>Model can change under you</td><td>Pinned version; you own upgrades</td></tr>
          <tr><td>Fine-tuning</td><td>Limited/none</td><td>Full control</td></tr>
        </tbody></table>

        <div class='callout warn'>
          <div class='c-title'>Gotcha: a hosted model can change silently</div>
          If an API provider updates a model version, your <strong>old vectors and new vectors no longer live in the same space</strong>. Pin the model/version explicitly and treat any change as a full re-embedding event (see the migration lesson).
        </div>

        <h3>Matryoshka embeddings (MRL)</h3>
        <p><strong>Matryoshka Representation Learning</strong> trains a model so the <em>first K dimensions</em> of the vector are themselves a usable, high-quality embedding. You can <strong>truncate</strong> a 3072-dim vector to 512 dims and keep most of the quality — trading a little recall for large storage/latency savings. OpenAI text-embedding-3 supports this via the <code>dimensions</code> parameter; Nomic and others do too.</p>

        <div class='callout good'>
          <div class='c-title'>Why Matryoshka matters in production</div>
          Store the short version for a fast <strong>first-pass ANN</strong>, then rerank the top candidates with the full-length vector or a cross-encoder. You cut memory and latency without re-embedding your corpus.
        </div>

        <pre><code>// OpenAI: request a truncated Matryoshka embedding
const res = await openai.embeddings.create({
  model: 'text-embedding-3-large',  // native 3072 dims
  input: 'quarterly revenue guidance',
  dimensions: 512                    // truncate: keeps most quality, 6x smaller
});
const vec = res.data[0].embedding;   // length 512</code></pre>

        <div class='callout good'>
          <div class='c-title'>Interview soundbite</div>
          "I shortlist on MTEB for my task type, then A/B on my own queries. I weigh dims, max sequence, domain fit, multilingual need, and API-vs-self-host on privacy and cost. Matryoshka lets me shrink dims without re-embedding."
        </div>
      `,
    },
    {
      id: 'chunking',
      group: 'Applications & RAG',
      nav: '4 · Chunking strategy',
      title: 'Chunking: the quiet make-or-break of RAG',
      lede: 'How you split documents before embedding decides retrieval quality more than the model choice.',
      html: `
        <h3>Why chunking exists</h3>
        <p>Embedding models have a max sequence length, and — more importantly — <strong>one vector must represent one coherent idea</strong>. Embed a whole 40-page PDF into a single vector and you get mush: the vector averages away the specific paragraph the user actually needs. So we split documents into <span class='kicker'>chunks</span>, embed each, and retrieve at chunk granularity.</p>

        <div class='callout warn'>
          <div class='c-title'>The core tension</div>
          <strong>Small chunks</strong> = precise match, but lose surrounding context (the LLM gets a fragment). <strong>Large chunks</strong> = rich context, but the embedding is diluted and you waste the LLM's context window on irrelevant text. Chunking is the art of balancing these.
        </div>

        <h3>Strategies, roughly worst-to-best for prose</h3>
        <table>
          <tbody><tr><th>Strategy</th><th>How</th><th>Notes</th></tr>
          <tr><td>Fixed-size</td><td>Every N tokens (e.g. 512), hard cut</td><td>Simple, fast; cuts mid-sentence and splits ideas.</td></tr>
          <tr><td>Fixed + overlap</td><td>N tokens with 10–20% overlap</td><td>Overlap avoids losing info at boundaries. The common default.</td></tr>
          <tr><td>Recursive / structural</td><td>Split on paragraphs &rarr; sentences, respecting structure</td><td>LangChain's RecursiveCharacterTextSplitter; keeps ideas intact.</td></tr>
          <tr><td>Semantic</td><td>Split where embedding similarity between adjacent sentences drops</td><td>Best coherence; more compute at ingest.</td></tr>
          <tr><td>Document-aware</td><td>Respect Markdown headers, code blocks, tables, slides</td><td>Best for structured docs; attach header path as metadata.</td></tr>
        </tbody></table>

        <div class='diagram'>
          <svg viewBox='0 0 620 170' xmlns='http://www.w3.org/2000/svg'>
            <rect x='30' y='30' width='560' height='30' rx='4' fill='#1f6feb' opacity='0.35'></rect>
            <text class='node-sub' x='30' y='22'>Document</text>
            <rect x='30' y='95' width='170' height='30' rx='4' fill='#238636' opacity='0.6'></rect>
            <rect x='170' y='130' width='170' height='30' rx='4' fill='#238636' opacity='0.6'></rect>
            <rect x='310' y='95' width='170' height='30' rx='4' fill='#238636' opacity='0.6'></rect>
            <rect x='450' y='130' width='140' height='30' rx='4' fill='#238636' opacity='0.6'></rect>
            <text class='node-sub' x='30' y='88'>Overlapping chunks (shingled)</text>
          </svg>
          <div class='diagram-caption'>Overlapping chunks share a tail/head so an answer that straddles a boundary still lands fully in at least one chunk.</div>
        </div>

        <h3>Rules of thumb</h3>
        <ul>
          <li>Start around <strong>256–512 tokens with ~15% overlap</strong> for prose; tune from there.</li>
          <li>Attach <strong>metadata</strong> to every chunk: source, title, section header, page, timestamp. You'll filter and cite with it.</li>
          <li><strong>Chunk size should match your embedding model's sweet spot</strong>, not just its max — many models degrade well before their token limit.</li>
          <li>For code, split on function/class boundaries, not arbitrary characters.</li>
        </ul>

        <h3>Advanced patterns worth naming</h3>
        <div class='two-col'>
          <div>
            <h4>Small-to-big / parent-document</h4>
            <p>Embed small chunks for precise matching, but return the <em>parent</em> (larger surrounding section) to the LLM. Best of both worlds; supported by LangChain's ParentDocumentRetriever.</p>
          </div>
          <div>
            <h4>Contextual retrieval</h4>
            <p>Anthropic's trick: prepend an LLM-generated one-line "this chunk is about..." context to each chunk before embedding. Cuts retrieval failures markedly at the cost of an LLM call per chunk at ingest.</p>
          </div>
        </div>

        <div class='callout danger'>
          <div class='c-title'>Gotcha</div>
          If retrieval quality is bad, engineers reflexively swap the embedding model. Nine times out of ten the real culprit is <strong>chunking</strong> — too big, too small, or splitting mid-idea. Fix chunking first.
        </div>

        <div class='callout good'>
          <div class='c-title'>Interview soundbite</div>
          "Chunking decides RAG quality more than the model. I use recursive/structural splitting around 256–512 tokens with overlap, attach rich metadata, and reach for small-to-big or contextual retrieval when precision and context conflict."
        </div>
      `,
    },
    {
      id: 'similarity-metrics',
      group: 'Similarity & search',
      nav: '5 · Similarity metrics',
      title: 'Similarity metrics: cosine, dot, L2',
      lede: 'When each metric applies, why normalization matters, and the cosine/dot equivalence.',
      html: `
        <h3>The three you must know</h3>
        <table>
          <tbody><tr><th>Metric</th><th>Formula (intuition)</th><th>Measures</th><th>Range / direction</th></tr>
          <tr><td><strong>Cosine similarity</strong></td><td>(a&middot;b) / (&#8214;a&#8214;&#8214;b&#8214;)</td><td>Angle between vectors (direction only, ignores magnitude)</td><td>[-1, 1]; higher = closer</td></tr>
          <tr><td><strong>Dot product</strong></td><td>a&middot;b = &Sigma; a&#7522;b&#7522;</td><td>Direction AND magnitude</td><td>unbounded; higher = closer</td></tr>
          <tr><td><strong>Euclidean (L2)</strong></td><td>&#8214;a - b&#8214;</td><td>Straight-line distance</td><td>[0, &infin;); lower = closer</td></tr>
        </tbody></table>

        <div class='diagram'>
          <svg viewBox='0 0 620 260' xmlns='http://www.w3.org/2000/svg'>
            <line x1='60' y1='220' x2='560' y2='220' stroke='#2b3441' stroke-width='1.5'></line>
            <line x1='80' y1='30' x2='80' y2='240' stroke='#2b3441' stroke-width='1.5'></line>
            <line x1='80' y1='220' x2='420' y2='70' stroke='#58a6ff' stroke-width='2.5'></line>
            <line x1='80' y1='220' x2='360' y2='150' stroke='#7ee787' stroke-width='2.5'></line>
            <text class='node-text' x='430' y='66'>a</text>
            <text class='node-text' x='370' y='150'>b</text>
            <path d='M 150 190 A 60 60 0 0 1 175 155' fill='none' stroke='#f0883e' stroke-width='2'></path>
            <text class='edge-label' x='185' y='185' style='fill:#f0883e'>&theta; (cosine = cos &theta;)</text>
            <line x1='360' y1='150' x2='420' y2='70' stroke='#d2a8ff' stroke-width='1.5' stroke-dasharray='4 3'></line>
            <text class='edge-label' x='400' y='120' style='fill:#d2a8ff'>L2 distance</text>
          </svg>
          <div class='diagram-caption'>Cosine cares about the angle &theta;; L2 cares about the gap between endpoints; dot mixes angle and length.</div>
        </div>

        <h3>Normalization — the key insight</h3>
        <p>If you <strong>L2-normalize</strong> every vector (scale to unit length &#8214;v&#8214; = 1), then:</p>
        <ul>
          <li><strong>Cosine similarity = dot product</strong> (the denominator becomes 1).</li>
          <li>Cosine ranking and (negative) L2 ranking give the <strong>same nearest-neighbor order</strong>.</li>
        </ul>
        <p>This is why many systems normalize once at ingest and then use the cheaper <strong>dot product</strong> (inner product) internally — cosine semantics at dot-product speed. This is the classic <span class='kicker'>MIPS</span> (Maximum Inner Product Search) formulation.</p>

        <pre><code>// Cosine similarity from scratch
function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i &lt; a.length; i++) {
    dot += a[i] * b[i];
    na  += a[i] * a[i];
    nb  += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// If vectors are pre-normalized, cosine collapses to a plain dot product:
function dot(a, b) {
  let s = 0;
  for (let i = 0; i &lt; a.length; i++) s += a[i] * b[i];
  return s;   // == cosine when norm(a) = norm(b) = 1
}</code></pre>

        <h3>When to pick which</h3>
        <ul>
          <li><strong>Cosine</strong> — text semantic search where you care about topic/direction, not length. The most common default.</li>
          <li><strong>Dot product</strong> — when magnitude is meaningful (some recommender / MIPS setups), or as the fast path on normalized vectors.</li>
          <li><strong>L2</strong> — image/embedding spaces where absolute distance matters; equivalent to cosine on normalized data.</li>
        </ul>

        <div class='callout warn'>
          <div class='c-title'>Gotcha</div>
          The metric you query with must match the metric the <strong>index was built for</strong>. Building an index for L2 and querying with dot product silently returns wrong neighbors. Set the metric at collection-creation time and never mix.
        </div>

        <div class='callout good'>
          <div class='c-title'>Interview soundbite</div>
          "Cosine ignores magnitude and is the text default. If I L2-normalize at ingest, cosine equals dot product, so I store normalized vectors and let the index run fast inner-product search. Metric must match the index build."
        </div>
      `,
    },
    {
      id: 'ann-problem',
      group: 'Similarity & search',
      nav: '6 · kNN → ANN',
      title: 'The core problem: exact kNN is too slow',
      lede: 'Why brute-force nearest neighbor does not scale, and the recall-for-speed bargain of ANN.',
      html: `
        <h3>Exact kNN: correct but brutal</h3>
        <p>To find the true nearest neighbors of a query vector, you compare it against <em>every</em> stored vector. That's <strong>O(N &times; d)</strong>: N vectors, each d-dimensional. For 100M vectors at 1536 dims, that's ~150 billion multiply-adds <em>per query</em>. Even heavily SIMD-optimized, you're looking at seconds and a huge memory-bandwidth bill. Unusable for interactive search.</p>

        <div class='callout'>
          <div class='c-title'>The bargain</div>
          <strong>Approximate Nearest Neighbor (ANN)</strong> trades a little <span class='kicker'>recall</span> for orders-of-magnitude speed. Instead of guaranteeing the exact top-k, it returns <em>almost</em> the top-k — say 95–99% of them — in milliseconds. For search and RAG, missing 1 result in 100 is invisible; 10&times;–1000&times; latency is not.
        </div>

        <h3>Recall — the number to obsess over</h3>
        <p><strong>Recall@k</strong> = (relevant items the ANN index found in its top-k) / (true top-k from exact search). Recall@10 = 0.98 means the index found 98% of the true 10 nearest neighbors. Every ANN index exposes a knob that trades recall for latency; the whole game is picking the operating point.</p>

        <div class='diagram'>
          <svg viewBox='0 0 620 220' xmlns='http://www.w3.org/2000/svg'>
            <line x1='70' y1='180' x2='560' y2='180' stroke='#2b3441' stroke-width='1.5'></line>
            <line x1='70' y1='30' x2='70' y2='180' stroke='#2b3441' stroke-width='1.5'></line>
            <text class='node-sub' x='300' y='205' text-anchor='middle'>latency &rarr;</text>
            <text class='node-sub' x='30' y='105' text-anchor='middle' transform='rotate(-90 30 105)'>recall &rarr;</text>
            <path d='M90 170 C 180 90, 320 55, 540 48' fill='none' stroke='#7ee787' stroke-width='2.5'></path>
            <circle cx='150' cy='120' r='5' fill='#f0883e'></circle>
            <text class='edge-label' x='160' y='120'>cheap, lossy</text>
            <circle cx='430' cy='52' r='5' fill='#58a6ff'></circle>
            <text class='edge-label' x='350' y='45'>slow, near-exact</text>
          </svg>
          <div class='diagram-caption'>The recall/latency frontier. You pick a point on this curve; you cannot beat the curve without a better index.</div>
        </div>

        <h3>Why high-dimensional space is weird</h3>
        <p>The <strong>curse of dimensionality</strong>: as dimensions grow, points spread out and the distance between the nearest and farthest neighbor shrinks in relative terms. Classic spatial trees (kd-trees, ball trees) that work great in 2–3D <strong>collapse to brute force</strong> above ~20 dimensions. That failure is exactly why modern ANN uses graphs (HNSW), clustering (IVF), and hashing/quantization instead.</p>

        <div class='callout warn'>
          <div class='c-title'>Interview trap</div>
          If asked "why not just use a kd-tree / R-tree?", the answer is the curse of dimensionality — they degenerate to O(N) in high-D. Naming this instantly signals depth.
        </div>

        <div class='callout good'>
          <div class='c-title'>Interview soundbite</div>
          "Exact kNN is O(N&times;d) per query — fine at thousands, hopeless at millions. ANN trades a couple percent of recall for 100&times;+ speed by using graphs, clustering, or quantization instead of spatial trees, which the curse of dimensionality kills above ~20 dims."
        </div>
      `,
    },
    {
      id: 'ann-algorithms',
      group: 'Similarity & search',
      nav: '7 · ANN algorithms',
      title: 'ANN index algorithms: HNSW, IVF, PQ, Flat',
      lede: 'The building blocks every vector DB is assembled from — how they work and how they compare.',
      html: `
        <h3>1 · Flat (brute force) — the exact baseline</h3>
        <p>No index; compares against all vectors. <strong>100% recall</strong>, but O(N). Use it as a correctness baseline, for tiny corpora (&lt; ~10k), or to rerank a small candidate set exactly.</p>

        <h3>2 · HNSW — the dominant graph index</h3>
        <p><strong>Hierarchical Navigable Small World</strong> builds a multi-layer proximity graph. Upper layers are sparse "express lanes" with long-range links; lower layers are dense. A search <strong>greedily hops toward the query</strong> from the top layer down, reaching the right neighborhood in <strong>~O(log N)</strong> hops.</p>

        <div class='diagram'>
          <svg viewBox='0 0 620 260' xmlns='http://www.w3.org/2000/svg'>
            <text class='node-sub' x='20' y='40'>Layer 2 (sparse)</text>
            <circle cx='120' cy='40' r='8' fill='#58a6ff'></circle>
            <circle cx='480' cy='40' r='8' fill='#58a6ff'></circle>
            <line x1='120' y1='40' x2='480' y2='40' stroke='#8b98a9' stroke-width='1.2'></line>

            <text class='node-sub' x='20' y='130'>Layer 1</text>
            <circle cx='120' cy='130' r='7' fill='#7ee787'></circle>
            <circle cx='260' cy='130' r='7' fill='#7ee787'></circle>
            <circle cx='360' cy='130' r='7' fill='#7ee787'></circle>
            <circle cx='480' cy='130' r='7' fill='#7ee787'></circle>
            <line x1='120' y1='130' x2='260' y2='130' stroke='#8b98a9' stroke-width='1.2'></line>
            <line x1='260' y1='130' x2='360' y2='130' stroke='#8b98a9' stroke-width='1.2'></line>
            <line x1='360' y1='130' x2='480' y2='130' stroke='#8b98a9' stroke-width='1.2'></line>

            <text class='node-sub' x='20' y='220'>Layer 0 (dense, all nodes)</text>
            <circle cx='120' cy='220' r='6' fill='#d2a8ff'></circle>
            <circle cx='190' cy='220' r='6' fill='#d2a8ff'></circle>
            <circle cx='260' cy='220' r='6' fill='#d2a8ff'></circle>
            <circle cx='330' cy='220' r='6' fill='#d2a8ff'></circle>
            <circle cx='410' cy='220' r='6' fill='#d2a8ff'></circle>
            <circle cx='480' cy='220' r='6' fill='#d2a8ff'></circle>
            <line x1='120' y1='220' x2='190' y2='220' stroke='#8b98a9' stroke-width='1'></line>
            <line x1='190' y1='220' x2='260' y2='220' stroke='#8b98a9' stroke-width='1'></line>
            <line x1='260' y1='220' x2='330' y2='220' stroke='#8b98a9' stroke-width='1'></line>
            <line x1='330' y1='220' x2='410' y2='220' stroke='#8b98a9' stroke-width='1'></line>
            <line x1='410' y1='220' x2='480' y2='220' stroke='#8b98a9' stroke-width='1'></line>

            <line x1='480' y1='48' x2='480' y2='122' stroke='#f0883e' stroke-width='1.5' stroke-dasharray='4 3'></line>
            <line x1='360' y1='138' x2='330' y2='212' stroke='#f0883e' stroke-width='1.5' stroke-dasharray='4 3'></line>
            <text class='edge-label' x='500' y='90' style='fill:#f0883e'>descend</text>
          </svg>
          <div class='diagram-caption'>Enter at the top, greedily hop toward the query, drop a layer, repeat. Long links up top = few hops to the right region.</div>
        </div>

        <h4>HNSW parameters (know these cold)</h4>
        <table>
          <tbody><tr><th>Param</th><th>Controls</th><th>Effect of increasing</th></tr>
          <tr><td><code>M</code></td><td>Max links per node (graph degree)</td><td>Higher recall, more memory, slower build. Typical 16–64.</td></tr>
          <tr><td><code>efConstruction</code></td><td>Candidate breadth during <em>build</em></td><td>Better graph &rarr; higher recall; slower/heavier build. Typical 100–400.</td></tr>
          <tr><td><code>efSearch</code></td><td>Candidate breadth during <em>query</em></td><td>Higher recall, higher latency. <strong>Tunable per-query</strong> without rebuilding. Typical 50–500.</td></tr>
        </tbody></table>
        <p><strong>Weaknesses:</strong> high memory (graph lives in RAM), slower/costlier updates and deletes, expensive to build for huge corpora. Deletes are usually "soft" (tombstoned) until a rebuild.</p>

        <h3>3 · IVF — inverted file (clustering)</h3>
        <p><strong>IVF</strong> runs k-means to partition the space into <code>nlist</code> cells (Voronoi regions). At query time it finds the nearest centroids and only searches vectors in the <code>nprobe</code> closest cells — skipping the rest. Higher <code>nprobe</code> &rarr; higher recall, slower query. Needs a <strong>training step</strong> on sample data to learn centroids.</p>

        <div class='callout warn'>
          <div class='c-title'>The IVF edge gotcha</div>
          A query near a cell boundary may have its true neighbor sitting just across the border in an unprobed cell. That's why <code>nprobe=1</code> gives poor recall; you probe several neighboring cells to cover boundaries.
        </div>

        <h3>4 · PQ — product quantization (compression)</h3>
        <p><strong>Product Quantization</strong> compresses each vector by splitting it into sub-vectors and replacing each with the id of the nearest centroid from a small codebook. A 1536-dim float32 vector (~6&nbsp;KB) can shrink to <strong>tens of bytes</strong> — massive memory savings, at some precision loss. Almost always combined: <strong>IVF-PQ</strong> = coarse cells + compressed residuals (FAISS / Milvus staple for billion-scale).</p>

        <h3>Comparison table</h3>
        <table>
          <tbody><tr><th>Index</th><th>Recall</th><th>Query speed</th><th>Memory</th><th>Build time</th><th>Best for</th></tr>
          <tr><td>Flat</td><td>100% (exact)</td><td>Slow (O(N))</td><td>High (raw)</td><td>None</td><td>&lt;10k vectors, reranking, baseline</td></tr>
          <tr><td>HNSW</td><td>Very high</td><td>Very fast</td><td>High</td><td>Slow</td><td>Default for most workloads; low-latency search</td></tr>
          <tr><td>IVF</td><td>Tunable (nprobe)</td><td>Fast</td><td>Medium</td><td>Medium (train)</td><td>Large corpora, batch, cheaper RAM than HNSW</td></tr>
          <tr><td>IVF-PQ</td><td>Lower (lossy)</td><td>Fast</td><td>Very low</td><td>Medium</td><td>Billion-scale on limited RAM; cost-sensitive</td></tr>
        </tbody></table>

        <p>Two more worth naming: <strong>ScaNN</strong> (Google's anisotropic-quantization index, strong recall/speed) and <strong>DiskANN</strong> (Microsoft's SSD-resident graph — serves billions of vectors from disk when they won't fit in RAM). Interviewers love hearing DiskANN when you mention memory limits.</p>

        <pre><code>// HNSW: build once, tune efSearch per query for your recall/latency point (Qdrant-style)
const collection = {
  vectors: { size: 1536, distance: 'Cosine' },
  hnsw_config: { m: 32, ef_construct: 256 }   // degree; build breadth
};

// At search time, trade latency for recall WITHOUT rebuilding:
await client.search('docs', {
  vector: queryVec,
  limit: 10,
  params: { hnsw_ef: 128 }   // efSearch: raise for recall, lower for speed
});</code></pre>

        <div class='callout good'>
          <div class='c-title'>Interview soundbite</div>
          "HNSW is my default: a layered graph with ~O(log N) search, tuned by M, efConstruction, and per-query efSearch. IVF clusters and probes cells; PQ compresses vectors; IVF-PQ is the billion-scale, RAM-cheap combo. DiskANN when it won't fit in memory."
        </div>
      `,
    },
    {
      id: 'landscape',
      group: 'Vector databases',
      nav: '8 · The landscape',
      title: 'Vector database landscape',
      lede: 'Dedicated DBs vs SQL/search extensions vs libraries — and when each is the right call.',
      html: `
        <h3>Three categories</h3>
        <div class='pattern-card'>
          <h4>1 · Dedicated vector databases</h4>
          <p><strong>Pinecone</strong> (managed, serverless), <strong>Milvus</strong> / <strong>Zilliz</strong> (OSS, billion-scale, GPU), <strong>Qdrant</strong> (Rust, great filtering), <strong>Weaviate</strong> (built-in modules/hybrid), <strong>Vespa</strong> (heavy-duty search + ranking), <strong>Chroma</strong> (dev-friendly, local-first). Purpose-built: distribution, filtering, hybrid, CRUD, replication.</p>
          <div class='tag-row'><span class='tag use'>use when: vectors are core, scale + features matter</span><span class='tag avoid'>avoid when: a few thousand vectors beside existing SQL</span></div>
        </div>

        <div class='pattern-card'>
          <h4>2 · Extensions to existing stores</h4>
          <p><strong>pgvector</strong> (Postgres), <strong>Elasticsearch / OpenSearch</strong> (HNSW + BM25), <strong>Redis</strong> (RediSearch vectors), <strong>MongoDB Atlas Vector Search</strong>, <strong>SQLite (sqlite-vec)</strong>. Keep vectors <em>next to</em> your relational/document data — one system, transactional joins, no new ops surface.</p>
          <div class='tag-row'><span class='tag use'>use when: you already run Postgres/ES and scale is moderate</span><span class='tag avoid'>avoid when: billions of vectors or extreme QPS</span></div>
        </div>

        <div class='pattern-card'>
          <h4>3 · Libraries (not databases)</h4>
          <p><strong>FAISS</strong> (Meta), <strong>hnswlib</strong>, <strong>ScaNN</strong> (Google), <strong>Annoy</strong> (Spotify). Raw ANN indexes — blazing fast, but <em>you</em> handle persistence, updates, filtering, sharding, serving. Great for embedding inside an app or research.</p>
          <div class='tag-row'><span class='tag use'>use when: you want a fast in-process index and control</span><span class='tag avoid'>avoid when: you need CRUD, durability, and a server for free</span></div>
        </div>

        <h3>Decision heuristic</h3>
        <table>
          <tbody><tr><th>Situation</th><th>Reach for</th></tr>
          <tr><td>&lt;1M vectors, already on Postgres</td><td>pgvector (don't add a system)</td></tr>
          <tr><td>Managed, no ops team, fast start</td><td>Pinecone / Zilliz Cloud</td></tr>
          <tr><td>OSS, self-host, heavy filtering</td><td>Qdrant / Weaviate</td></tr>
          <tr><td>Billion-scale, GPU, cost control</td><td>Milvus</td></tr>
          <tr><td>Keyword + vector in one engine already</td><td>Elasticsearch / OpenSearch / Vespa</td></tr>
          <tr><td>In-process, embedded, research</td><td>FAISS / hnswlib</td></tr>
        </tbody></table>

        <div class='callout warn'>
          <div class='c-title'>Gotcha: pgvector is not free of trade-offs</div>
          pgvector is fantastic operationally, but heavy vector workloads compete with your OLTP traffic for the same RAM/CPU, and its ANN (IVFFlat / HNSW) tops out below dedicated engines at very high scale. Great until it isn't — know your ceiling.
        </div>

        <div class='callout good'>
          <div class='c-title'>Interview soundbite</div>
          "I don't add a vector DB by default. Under ~1M vectors next to Postgres, I use pgvector. When vectors are core — heavy filtering, billions of rows, high QPS — I move to a dedicated engine like Qdrant, Milvus, or managed Pinecone. FAISS/hnswlib when I just need an in-process index."
        </div>
      `,
    },
    {
      id: 'features',
      group: 'Vector databases',
      nav: '9 · Core features',
      title: 'Core vector DB features',
      lede: 'Metadata filtering, namespaces, CRUD, persistence, sharding, and consistency — the production surface.',
      html: `
        <h3>Beyond "find nearest" — what a real DB gives you</h3>

        <h4>Metadata filtering (the one everyone underestimates)</h4>
        <p>Store structured fields alongside each vector (<code>tenant_id</code>, <code>lang</code>, <code>date</code>, <code>doc_type</code>) and constrain the search: "nearest vectors <em>where tenant = 42 and date &gt; 2024</em>." Sounds trivial; it's the hardest thing a vector DB does well.</p>

        <div class='callout warn'>
          <div class='c-title'>Pre- vs post-filtering: the classic interview question</div>
          <strong>Post-filter:</strong> ANN returns top-k, then drop rows failing the filter — fast, but you may return &lt;k results (or zero) if the filter is selective. <strong>Pre-filter:</strong> restrict to the matching subset, then search — correct, but breaks the ANN graph/cell structure and can be slow. Good DBs (Qdrant, Weaviate) do <strong>filtered ANN</strong> with integrated payload indexes to get both. Naming this trade-off is a strong signal.
        </div>

        <h4>Namespaces / multi-tenancy</h4>
        <p>Partition one index into isolated namespaces (Pinecone) or collections/shards per tenant. Keeps tenants' data separated and queries scoped without a full index scan.</p>

        <h4>CRUD &amp; upserts</h4>
        <p><strong>Upsert</strong> (insert-or-update by id) is the core write. Deletes are often <em>soft</em> (tombstoned) in graph indexes and reclaimed on a rebuild/compaction. Update-heavy workloads stress ANN indexes far more than read-heavy ones.</p>

        <h4>Persistence &amp; durability</h4>
        <p>The index lives in RAM for speed but must survive restarts: write-ahead logs, snapshots to disk/object storage, and replicas. A "library" like raw FAISS gives you none of this — you build it.</p>

        <h4>Scaling: sharding &amp; replication</h4>
        <p><strong>Shard</strong> (partition vectors across nodes for capacity/throughput) and <strong>replicate</strong> (copies for availability and read QPS). A query fans out to shards, each returns local top-k, and results are merged.</p>

        <h4>Consistency</h4>
        <p>Most vector DBs are <strong>eventually consistent</strong> on indexing: an upsert may not be searchable for a short window while the index absorbs it. Ask about "read-your-writes" if your UX needs a just-added doc to appear immediately.</p>

        <table>
          <tbody><tr><th>Feature</th><th>Why it matters in production</th></tr>
          <tr><td>Filtered ANN</td><td>Real queries are scoped by tenant/time/type; correctness + speed both required.</td></tr>
          <tr><td>Hybrid search</td><td>Dense misses exact terms; sparse misses semantics. Combine them (next lesson).</td></tr>
          <tr><td>Quantization (SQ/PQ)</td><td>Cut RAM 4&times;–32&times;; the main cost lever at scale.</td></tr>
          <tr><td>Soft deletes / compaction</td><td>Determines update cost and index bloat over time.</td></tr>
          <tr><td>Snapshots / replicas</td><td>Durability + availability; RAM-only indexes are volatile.</td></tr>
        </tbody></table>

        <div class='callout good'>
          <div class='c-title'>Interview soundbite</div>
          "The hard part of a vector DB isn't nearest-neighbor — it's <em>filtered</em> nearest-neighbor, upserts against a graph index, durability of a RAM-resident structure, and sharding. I always ask pre- vs post-filter behavior and index consistency."
        </div>
      `,
    },
    {
      id: 'hybrid-rerank',
      group: 'Vector databases',
      nav: '10 · Hybrid & reranking',
      title: 'Hybrid search & reranking',
      lede: 'Why pure vector search loses, and the retrieve-then-rerank pattern that fixes precision.',
      html: `
        <h3>The failure mode of pure dense search</h3>
        <p>Embeddings are great at meaning but weak at <strong>exact tokens</strong> — a product SKU <code>XT-4429</code>, a rare surname, an error code, a legal citation. The embedding of a query mentioning <code>XT-4429</code> sits near "similar-looking products," not the exact one. Keyword search (BM25) nails these but misses paraphrases. The fix is to use <strong>both</strong>.</p>

        <h3>Hybrid search = dense + sparse, fused</h3>
        <p>Run a dense (vector) search and a sparse (BM25 / SPLADE) search, then combine the ranked lists. Two common fusion methods:</p>
        <table>
          <tbody><tr><th>Method</th><th>How</th><th>Note</th></tr>
          <tr><td><strong>RRF</strong> (Reciprocal Rank Fusion)</td><td>score = &Sigma; 1/(k + rank) across lists</td><td>Score-agnostic, robust, no tuning of incompatible score scales. The go-to default.</td></tr>
          <tr><td><strong>Weighted sum</strong></td><td>&alpha;&middot;dense + (1&minus;&alpha;)&middot;sparse</td><td>Needs score normalization; more tunable, more fragile.</td></tr>
        </tbody></table>

        <div class='callout'>
          <div class='c-title'>Why RRF wins in practice</div>
          Dense cosine scores (~0–1) and BM25 scores (unbounded) live on different scales — summing them directly is nonsense. RRF only uses <strong>rank position</strong>, sidestepping the scale problem entirely. Elasticsearch, OpenSearch, Weaviate, and Qdrant all ship RRF.
        </div>

        <h3>Reranking — the precision multiplier</h3>
        <p>First-stage retrieval (bi-encoder ANN) is tuned for <strong>recall</strong>: cast a wide net, grab the top 50–100 candidates cheaply. A <strong>cross-encoder reranker</strong> then reads each (query, candidate) pair <em>together</em> and produces a precise relevance score, reordering them. You feed only the reranked top-5 to the LLM.</p>

        <div class='diagram'>
          <svg viewBox='0 0 640 150' xmlns='http://www.w3.org/2000/svg'>
            <defs>
              <marker id='arrow2' markerWidth='10' markerHeight='10' refX='8' refY='3' orient='auto'><path d='M0,0 L8,3 L0,6 Z' fill='#8b98a9'></path></marker>
            </defs>
            <rect class='node-box' x='20' y='55' width='120' height='50' rx='8'></rect>
            <text class='node-text' x='80' y='78' text-anchor='middle'>Query</text>
            <rect class='node-box worker' x='190' y='55' width='150' height='50' rx='8'></rect>
            <text class='node-text' x='265' y='76' text-anchor='middle'>Bi-encoder ANN</text>
            <text class='node-sub' x='265' y='92' text-anchor='middle'>top-100 (recall)</text>
            <rect class='node-box tool' x='390' y='55' width='150' height='50' rx='8'></rect>
            <text class='node-text' x='465' y='76' text-anchor='middle'>Cross-encoder</text>
            <text class='node-sub' x='465' y='92' text-anchor='middle'>rerank &rarr; top-5</text>
            <line class='edge' x1='140' y1='80' x2='188' y2='80' marker-end='url(#arrow2)'></line>
            <line class='edge' x1='340' y1='80' x2='388' y2='80' marker-end='url(#arrow2)'></line>
            <text class='node-sub' x='560' y='83'>&rarr; LLM</text>
          </svg>
          <div class='diagram-caption'>Cheap wide recall first, expensive precise reranking on a small candidate set. Cross-encoders can't index — that's why they run second.</div>
        </div>

        <p>Named rerankers to drop: <strong>Cohere Rerank</strong>, <strong>Voyage rerank</strong>, <strong>BGE-reranker</strong>, <strong>Jina reranker</strong>, or an open cross-encoder like <code>ms-marco-MiniLM</code>. <strong>ColBERT</strong> is a middle ground — late-interaction, token-level matching that's more accurate than a bi-encoder and cheaper than a full cross-encoder.</p>

        <div class='callout warn'>
          <div class='c-title'>Gotcha: rerankers add latency</div>
          A cross-encoder scores each pair with a full model forward pass. Reranking 100 candidates can add 50–300&nbsp;ms. Rerank a <em>small</em> candidate set (top 50–100), not thousands, and cache aggressively.
        </div>

        <div class='callout good'>
          <div class='c-title'>Interview soundbite</div>
          "Pure dense search misses exact terms, so I run hybrid (dense + BM25) fused with RRF for robust recall, then rerank the top candidates with a cross-encoder for precision, and pass only the top few to the LLM. Recall stage cheap and wide; precision stage expensive and narrow."
        </div>
      `,
    },
    {
      id: 'rag-retrieval',
      group: 'Applications & RAG',
      nav: '11 · RAG retrieval',
      title: 'Putting it together: retrieval for RAG',
      lede: 'How embeddings and vector DBs plug into Retrieval-Augmented Generation, and where quality leaks.',
      html: `
        <h3>The RAG loop in one breath</h3>
        <p><strong>Ingest:</strong> chunk docs &rarr; embed chunks &rarr; upsert to vector DB with metadata. <strong>Query:</strong> embed the user question &rarr; ANN search (often hybrid) &rarr; rerank &rarr; stuff top-k chunks into the LLM prompt as context &rarr; generate a grounded, cited answer.</p>

        <div class='diagram'>
          <svg viewBox='0 0 640 170' xmlns='http://www.w3.org/2000/svg'>
            <defs><marker id='arrow3' markerWidth='10' markerHeight='10' refX='8' refY='3' orient='auto'><path d='M0,0 L8,3 L0,6 Z' fill='#8b98a9'></path></marker></defs>
            <rect class='node-box' x='15' y='60' width='110' height='48' rx='8'></rect>
            <text class='node-text' x='70' y='80' text-anchor='middle'>Question</text>
            <rect class='node-box tool' x='150' y='60' width='110' height='48' rx='8'></rect>
            <text class='node-text' x='205' y='80' text-anchor='middle'>Embed</text>
            <rect class='node-box worker' x='285' y='60' width='110' height='48' rx='8'></rect>
            <text class='node-text' x='340' y='80' text-anchor='middle'>Retrieve+rerank</text>
            <rect class='node-box tool' x='420' y='60' width='110' height='48' rx='8'></rect>
            <text class='node-text' x='475' y='80' text-anchor='middle'>LLM + context</text>
            <rect class='node-box' x='555' y='60' width='75' height='48' rx='8'></rect>
            <text class='node-text' x='592' y='80' text-anchor='middle'>Answer</text>
            <line class='edge' x1='125' y1='84' x2='148' y2='84' marker-end='url(#arrow3)'></line>
            <line class='edge' x1='260' y1='84' x2='283' y2='84' marker-end='url(#arrow3)'></line>
            <line class='edge' x1='395' y1='84' x2='418' y2='84' marker-end='url(#arrow3)'></line>
            <line class='edge' x1='530' y1='84' x2='553' y2='84' marker-end='url(#arrow3)'></line>
          </svg>
          <div class='diagram-caption'>Retrieval is the R in RAG — the generator is only as good as the chunks it's handed.</div>
        </div>

        <h3>Where RAG quality actually leaks</h3>
        <table>
          <tbody><tr><th>Leak</th><th>Symptom</th><th>Fix</th></tr>
          <tr><td>Bad chunking</td><td>Right doc retrieved, wrong fragment</td><td>Structural chunking, overlap, small-to-big</td></tr>
          <tr><td>Query/doc mismatch</td><td>Short questions vs long passages don't align</td><td>Query expansion, HyDE, multi-query</td></tr>
          <tr><td>Low recall</td><td>Relevant chunk never retrieved</td><td>Hybrid search, raise k, tune efSearch</td></tr>
          <tr><td>Low precision</td><td>Context full of noise, LLM distracted</td><td>Rerank, lower k after rerank</td></tr>
          <tr><td>Stale index</td><td>Answers from outdated docs</td><td>Incremental upserts, TTL, freshness metadata</td></tr>
        </tbody></table>

        <h3>Query-side techniques worth naming</h3>
        <ul>
          <li><strong>HyDE</strong> (Hypothetical Document Embeddings) — have the LLM draft a fake answer, embed <em>that</em>, and search with it; a hypothetical answer is closer to real answer passages than a terse question is.</li>
          <li><strong>Multi-query / query expansion</strong> — generate several paraphrases, retrieve for each, union the results.</li>
          <li><strong>Query routing</strong> — classify the query and send it to the right index/namespace.</li>
        </ul>

        <div class='callout warn'>
          <div class='c-title'>War story: the "lost in the middle" trap</div>
          Cramming 20 chunks into the prompt can <em>lower</em> accuracy — LLMs attend best to the start and end of context and lose the middle. Retrieve broadly, but after reranking pass a <strong>small, high-precision set</strong> (often 3–5 chunks). More context is not better context.
        </div>

        <div class='callout good'>
          <div class='c-title'>Interview soundbite</div>
          "RAG is only as good as retrieval. I chunk well, retrieve with hybrid search, rerank to a tight top-3–5, and use HyDE or multi-query when short questions don't match long passages. Fewer, better chunks beat dumping everything into the prompt."
        </div>
      `,
    },
    {
      id: 'evaluation',
      group: 'Applications & RAG',
      nav: '12 · Measuring quality',
      title: 'Measuring retrieval quality',
      lede: 'Recall@k, MRR, nDCG, and how to actually know your changes helped.',
      html: `
        <h3>You cannot tune what you cannot measure</h3>
        <p>"It feels better" is not an answer in an interview or a postmortem. Build a small <strong>golden set</strong> — queries paired with their known-relevant chunk ids — and score every change against it. A few hundred labeled queries beats endless eyeballing.</p>

        <h3>The metrics to name</h3>
        <table>
          <tbody><tr><th>Metric</th><th>Question it answers</th><th>Cares about order?</th></tr>
          <tr><td><strong>Recall@k</strong></td><td>Did the relevant item appear in the top-k at all?</td><td>No</td></tr>
          <tr><td><strong>Precision@k</strong></td><td>What fraction of the top-k are relevant?</td><td>No</td></tr>
          <tr><td><strong>MRR</strong></td><td>How high did the <em>first</em> relevant item rank? (1/rank)</td><td>Yes (first hit)</td></tr>
          <tr><td><strong>nDCG@k</strong></td><td>Are the most relevant items ranked highest? (graded)</td><td>Yes (full order)</td></tr>
          <tr><td><strong>Hit rate</strong></td><td>Fraction of queries with any relevant hit in top-k</td><td>No</td></tr>
        </tbody></table>

        <div class='callout'>
          <div class='c-title'>Which one to optimize?</div>
          For RAG, <strong>recall@k</strong> at the retrieval stage matters most — if the right chunk never gets retrieved, no reranker or LLM can save you. After reranking, <strong>nDCG</strong> / <strong>MRR</strong> tell you if the best chunk is at the top where the LLM will actually use it.
        </div>

        <h3>Two distinct evaluation layers</h3>
        <div class='two-col'>
          <div>
            <h4>Retrieval eval</h4>
            <p>Is the right context retrieved and ranked well? Pure IR metrics above, computed against your golden set. Fast, deterministic, cheap.</p>
          </div>
          <div>
            <h4>End-to-end (answer) eval</h4>
            <p>Given the retrieved context, is the generated answer <strong>faithful</strong> (grounded, no hallucination) and <strong>relevant</strong>? Tools: RAGAS (faithfulness, answer/context relevancy), TruLens, LLM-as-judge.</p>
          </div>
        </div>

        <div class='callout warn'>
          <div class='c-title'>Gotcha: recall@k has a hidden cost</div>
          You can always raise recall by increasing k — but every extra chunk costs LLM tokens and dilutes precision. Measure recall@k <em>and</em> the downstream answer quality; the best k is the smallest one that keeps recall high.
        </div>

        <h3>Also monitor in production</h3>
        <ul>
          <li><strong>Latency percentiles</strong> (p50/p95/p99) per stage: embed, ANN, rerank.</li>
          <li><strong>Recall drift</strong> — periodically compare ANN top-k against exact top-k on a sample.</li>
          <li><strong>Zero-result and low-score rate</strong> — a spike often means an ingest bug or a query-distribution shift.</li>
          <li><strong>Cost per query</strong> — embedding tokens + rerank calls + LLM tokens.</li>
        </ul>

        <div class='callout good'>
          <div class='c-title'>Interview soundbite</div>
          "I build a golden set and track recall@k for retrieval, nDCG/MRR for ranking, and faithfulness/relevancy (RAGAS or LLM-as-judge) end-to-end. Recall first — you can't rerank a chunk you never retrieved — then squeeze precision."
        </div>
      `,
    },
    {
      id: 'ingestion',
      group: 'Production',
      nav: '13 · Ingestion at scale',
      title: 'Indexing & ingestion at scale',
      lede: 'Batch embedding, incremental updates, re-indexing, build cost, and the dimension-mismatch trap.',
      html: `
        <h3>The ingest pipeline</h3>
        <p>Getting millions of documents into a vector DB is a data-engineering job, not a one-liner:</p>
        <ol>
          <li><strong>Load &amp; parse</strong> — PDFs, HTML, DB rows; extract clean text (strip boilerplate).</li>
          <li><strong>Chunk</strong> — split with overlap and structure (see the chunking lesson).</li>
          <li><strong>Embed in batches</strong> — send 64–256 chunks per call to amortize overhead; respect rate limits.</li>
          <li><strong>Upsert</strong> — write vectors + metadata with stable ids (so re-runs update, not duplicate).</li>
          <li><strong>Build/refresh index</strong> — HNSW graph or IVF centroids get built or updated.</li>
        </ol>

        <div class='callout'>
          <div class='c-title'>Batching is the throughput lever</div>
          Embedding one chunk per HTTP call wastes 90% of your time on round-trips. Batch. For a 10M-chunk corpus, batching plus parallel workers is the difference between hours and days — and on APIs, the difference in your bill.
        </div>

        <h3>Incremental updates vs full re-index</h3>
        <table>
          <tbody><tr><th></th><th>Incremental upsert</th><th>Full re-index</th></tr>
          <tr><td>When</td><td>New/changed docs trickle in</td><td>New model, new dims, corrupt index</td></tr>
          <tr><td>Cost</td><td>Cheap per doc</td><td>Re-embed + rebuild everything</td></tr>
          <tr><td>HNSW</td><td>Insert into graph; deletes tombstoned</td><td>Clean graph, best recall</td></tr>
          <tr><td>IVF</td><td>Add to cells; centroids may drift stale</td><td>Retrain centroids on current data</td></tr>
        </tbody></table>

        <div class='callout warn'>
          <div class='c-title'>IVF centroid drift</div>
          IVF learns centroids from a training sample. If your data distribution shifts a lot after that (new topics, new languages), the old centroids partition poorly and recall degrades. Periodically <strong>retrain</strong> on fresh data.
        </div>

        <h3>Idempotency &amp; deletes</h3>
        <p>Use <strong>deterministic ids</strong> (e.g. a hash of source + chunk index) so a re-ingest updates in place instead of duplicating. For deletes, remember many indexes soft-delete (tombstone) and only reclaim space on compaction/rebuild — plan capacity accordingly.</p>

        <div class='callout danger'>
          <div class='c-title'>The dimension-mismatch trap</div>
          Every vector in a collection must have the <strong>same dimensionality and come from the same model</strong>. Upserting a 1536-dim OpenAI vector into a 768-dim BGE index either errors or — worse — silently corrupts search. Pin the model + dims per collection and validate on write.
        </div>

        <pre><code>// Batched embed + upsert with stable ids (pseudo, Pinecone-style)
for (const batch of chunkize(allChunks, 128)) {
  const vectors = await embed(batch.map(c =&gt; c.text));   // one API call per 128
  await index.upsert(batch.map((c, i) =&gt; ({
    id: hash(c.source + ':' + c.chunkIndex),             // deterministic = idempotent
    values: vectors[i],
    metadata: { source: c.source, page: c.page, ts: c.ts }
  })));
}</code></pre>

        <div class='callout good'>
          <div class='c-title'>Interview soundbite</div>
          "Ingest = parse, chunk, batch-embed, upsert with deterministic ids, build index. Incremental upserts for the steady state; full re-index only for a model/dim change. Watch IVF centroid drift and never mix dims or models in one collection."
        </div>
      `,
    },
    {
      id: 'prod-concerns',
      group: 'Production',
      nav: '14 · Production concerns',
      title: 'Production concerns & the migration problem',
      lede: 'Cost, memory, latency/recall tuning, quantization, multi-tenancy, monitoring, and re-embedding.',
      html: `
        <h3>Memory is usually the bill</h3>
        <p>HNSW keeps the graph and vectors in RAM. Rough math: <strong>N &times; dims &times; 4 bytes</strong> for float32, plus graph overhead (often another 1.5–2&times;). 100M vectors at 1536 dims &asymp; <strong>~600&nbsp;GB just for the raw floats</strong>, before the graph. RAM, not CPU, is the scaling wall.</p>

        <h3>Quantization — the main cost lever</h3>
        <table>
          <tbody><tr><th>Technique</th><th>Compression</th><th>Cost</th></tr>
          <tr><td><strong>Scalar (SQ, int8)</strong></td><td>~4&times; smaller</td><td>Tiny recall loss; easy win, widely default.</td></tr>
          <tr><td><strong>Product (PQ)</strong></td><td>8&times;–32&times;+ smaller</td><td>Noticeable recall loss; rerank exact top candidates to recover.</td></tr>
          <tr><td><strong>Binary</strong></td><td>32&times; smaller</td><td>Big loss alone; great as a coarse first pass + rerank.</td></tr>
        </tbody></table>
        <p>Pattern: search on the <em>compressed</em> vectors for speed/RAM, then <strong>rerank the top candidates against full-precision vectors</strong> to recover accuracy. This "quantize + rerank" combo is how you serve billions cheaply.</p>

        <h3>Latency/recall tuning knobs</h3>
        <ul>
          <li><strong>HNSW:</strong> raise <code>efSearch</code> for recall, lower for latency — tunable per query, no rebuild.</li>
          <li><strong>IVF:</strong> raise <code>nprobe</code> for recall, lower for speed.</li>
          <li><strong>k:</strong> smaller candidate sets are faster but risk missing results before reranking.</li>
        </ul>

        <h3>Multi-tenancy</h3>
        <p>Namespaces/collections per tenant isolate data and scope queries. Watch the <strong>noisy-neighbor</strong> problem (one huge tenant starving others) and the <strong>small-tenant overhead</strong> problem (thousands of tiny indexes each with fixed cost). Some systems solve this with metadata-partitioned single indexes instead of per-tenant indexes.</p>

        <h3>Monitoring</h3>
        <ul>
          <li>Latency p50/p95/p99 per stage; QPS; error rate.</li>
          <li><strong>Recall drift</strong> vs an exact-search sample — the silent quality killer.</li>
          <li>Index size, memory headroom, tombstone/bloat ratio.</li>
          <li>Cost per query (embed + search + rerank + LLM).</li>
        </ul>

        <div class='callout danger'>
          <div class='c-title'>The migration / re-embedding problem — the killer interview question</div>
          Vectors from <strong>different models (or model versions) are not comparable</strong> — they live in different spaces. To upgrade your embedding model you must <strong>re-embed the entire corpus</strong> and rebuild the index. For billions of vectors that's a large, expensive, carefully-orchestrated job. Mitigations: <strong>dual-write / shadow index</strong> the new embeddings, backfill in the background, then cut over atomically. Never mix spaces during the transition.
        </div>

        <div class='callout warn'>
          <div class='c-title'>Gotcha: the query must use the same model as the corpus</div>
          If you re-embed docs with a new model but still embed queries with the old one (or vice versa), every result is garbage. Version the embedding model and pin query + corpus to the same version.
        </div>

        <div class='callout good'>
          <div class='c-title'>Interview soundbite</div>
          "RAM is the cost wall, so quantize (int8/PQ) and rerank against full precision. Tune efSearch/nprobe for the recall/latency point, monitor recall drift, and treat any embedding-model change as a full re-embed + rebuild — dual-write a shadow index and cut over atomically because vectors from different models don't share a space."
        </div>
      `,
    },
    {
      id: 'cheatsheet',
      group: 'Wrap-up',
      nav: '15 · Interview cheat-sheet',
      title: 'Interview cheat-sheet & rapid-fire Q&A',
      lede: 'Everything condensed into answers you can deliver under pressure.',
      html: `
        <h3>The 60-second summary</h3>
        <p>Embeddings map data to dense vectors where <strong>proximity = meaning</strong>. Vector DBs store them and do fast <strong>approximate</strong> nearest-neighbor search, trading a little recall for huge speed via HNSW/IVF/PQ. Real systems add filtering, hybrid search, reranking, quantization, and a re-embedding plan. Quality is chunking + retrieval, measured with recall@k and nDCG.</p>

        <h3>Rapid-fire Q&amp;A</h3>
        <table>
          <tbody>
          <tr><th>Question</th><th>Crisp answer</th></tr>
          <tr><td>What is an embedding?</td><td>A dense float vector from an encoder where semantic similarity = geometric proximity.</td></tr>
          <tr><td>Cosine vs dot vs L2?</td><td>Cosine = angle (ignores magnitude); dot = angle+magnitude; L2 = distance. On normalized vectors, cosine = dot, and cosine order = L2 order.</td></tr>
          <tr><td>Why normalize?</td><td>So cosine collapses to a cheaper dot product (MIPS) and metrics agree on ordering.</td></tr>
          <tr><td>Why not exact kNN?</td><td>O(N&times;d) per query — hopeless at millions. ANN trades ~1–2% recall for 100&times;+ speed.</td></tr>
          <tr><td>Why not kd-trees?</td><td>Curse of dimensionality — spatial trees degrade to brute force above ~20 dims.</td></tr>
          <tr><td>HNSW knobs?</td><td>M (degree), efConstruction (build breadth), efSearch (query breadth, per-query tunable).</td></tr>
          <tr><td>IVF knobs?</td><td>nlist (cells), nprobe (cells searched); needs training; watch centroid drift.</td></tr>
          <tr><td>What's PQ?</td><td>Compress sub-vectors to codebook ids; 8&times;–32&times; smaller, lossy; IVF-PQ for billion-scale.</td></tr>
          <tr><td>DiskANN?</td><td>SSD-resident graph index for when vectors don't fit in RAM.</td></tr>
          <tr><td>Recall@k?</td><td>Fraction of the true top-k the ANN index actually returned. The core quality knob.</td></tr>
          <tr><td>Pre vs post filter?</td><td>Post = fast but may under-return; pre = correct but slow; good DBs do integrated filtered ANN.</td></tr>
          <tr><td>Hybrid search?</td><td>Dense + BM25 fused, usually via RRF (rank-based, scale-agnostic).</td></tr>
          <tr><td>Bi- vs cross-encoder?</td><td>Bi-encoder embeds independently (indexable, fast recall); cross-encoder scores pairs jointly (precise, rerank only).</td></tr>
          <tr><td>Chunking default?</td><td>Structural/recursive, ~256–512 tokens, ~15% overlap, rich metadata; small-to-big for context.</td></tr>
          <tr><td>pgvector vs dedicated?</td><td>pgvector under ~1M beside Postgres; dedicated (Qdrant/Milvus/Pinecone) when vectors are core.</td></tr>
          <tr><td>Biggest scaling cost?</td><td>RAM. Quantize (int8/PQ) + rerank against full precision.</td></tr>
          <tr><td>Migration problem?</td><td>New model = new space = re-embed whole corpus + rebuild; dual-write shadow index, cut over atomically.</td></tr>
          <tr><td>Query/corpus model match?</td><td>Must be the same model/version, or results are meaningless.</td></tr>
          <tr><td>Lost in the middle?</td><td>LLMs ignore mid-context; rerank to a tight top-3–5 rather than dumping many chunks.</td></tr>
          </tbody>
        </table>

        <h3>Mnemonics</h3>
        <ul>
          <li><strong>"Normalize &rarr; cosine is dot."</strong> The equivalence, in four words.</li>
          <li><strong>HNSW = "M, and two efs."</strong> Degree, build breadth, query breadth.</li>
          <li><strong>"Recall wide, rerank narrow."</strong> Cheap first stage, precise second stage.</li>
          <li><strong>"Different model = different universe."</strong> Never compare vectors across models.</li>
          <li><strong>"RAM is the wall; quantize to climb it."</strong></li>
        </ul>

        <div class='callout'>
          <div class='c-title'>If you remember one thing</div>
          Every design choice is a point on a <strong>recall &harr; latency &harr; memory &harr; cost</strong> trade surface. Great answers name the knob (efSearch, nprobe, quantization, k, chunk size) and the trade it makes.
        </div>

        <div class='callout good'>
          <div class='c-title'>Interview soundbite</div>
          "Meaning becomes geometry; ANN makes nearest-neighbor over that geometry fast by trading a little recall for a lot of speed. Everything else — hybrid, reranking, filtering, quantization, re-embedding — is managing the recall/latency/memory/cost trade-offs at scale."
        </div>
      `,
    },
  ],
  quizzes: [
    {
      question: 'You L2-normalize every vector at ingest time. What becomes true about cosine similarity and dot product?',
      options: [
        { text: 'They now measure completely different things and must not be mixed', correct: false },
        { text: 'Cosine similarity equals the dot product, because each norm is 1', correct: true },
        { text: 'Dot product becomes unbounded while cosine stays in [-1, 1], so ranking differs', correct: false },
      ],
      explain: 'Cosine = (a·b)/(‖a‖‖b‖). When ‖a‖ = ‖b‖ = 1 the denominator is 1, so cosine collapses to the raw dot product — enabling fast inner-product (MIPS) search with cosine semantics.',
    },
    {
      question: 'Why do classic spatial data structures like kd-trees fail for high-dimensional embedding search?',
      options: [
        { text: 'The curse of dimensionality makes them degenerate to O(N), no better than brute force above ~20 dims', correct: true },
        { text: 'They cannot store floating-point coordinates, only integers', correct: false },
        { text: 'They require the vectors to be L2-normalized first, which loses information', correct: false },
      ],
      explain: 'In high dimensions, distances concentrate and pruning stops working, so kd-trees/R-trees visit nearly all nodes — collapsing to brute force. That is why ANN uses graphs (HNSW), clustering (IVF), and quantization instead.',
    },
    {
      question: 'Which HNSW parameter can you raise at query time to increase recall WITHOUT rebuilding the index?',
      options: [
        { text: 'M (the graph degree)', correct: false },
        { text: 'efConstruction (build-time candidate breadth)', correct: false },
        { text: 'efSearch (query-time candidate breadth)', correct: true },
      ],
      explain: 'M and efConstruction are fixed at build time. efSearch controls how many candidates are explored per query and can be tuned live to move along the recall/latency curve without rebuilding the graph.',
    },
    {
      question: 'A billion-vector corpus won\'t fit in RAM and cost is critical. Which index approach fits best?',
      options: [
        { text: 'Flat (brute-force) for guaranteed 100% recall', correct: false },
        { text: 'IVF-PQ — coarse clustering plus product quantization for heavy compression', correct: true },
        { text: 'A pure HNSW graph with M=64 for maximum recall', correct: false },
      ],
      explain: 'IVF-PQ partitions the space and stores heavily compressed (quantized) vectors, cutting memory 8×–32×+, which is the standard billion-scale, RAM-limited, cost-sensitive choice. Flat and large-M HNSW are memory-hungry.',
    },
    {
      question: 'In hybrid search, why is Reciprocal Rank Fusion (RRF) usually preferred over a weighted sum of scores?',
      options: [
        { text: 'RRF is the only method Elasticsearch supports', correct: false },
        { text: 'RRF fuses by rank position, so it avoids combining dense and BM25 scores that live on incompatible scales', correct: true },
        { text: 'RRF guarantees 100% recall by searching every document exactly', correct: false },
      ],
      explain: 'Dense cosine scores (~0–1) and BM25 scores (unbounded) are not directly comparable. RRF uses only rank position (1/(k+rank)), sidestepping score-scale normalization, which makes it robust and tuning-free.',
    },
    {
      question: 'What is the defining difference between a bi-encoder and a cross-encoder in retrieval?',
      options: [
        { text: 'A cross-encoder embeds query and document independently so both can be indexed', correct: false },
        { text: 'A bi-encoder embeds query and document independently (indexable); a cross-encoder scores the pair jointly (precise but not indexable)', correct: true },
        { text: 'They are the same thing; the names describe different vendors', correct: false },
      ],
      explain: 'Bi-encoders produce independent vectors, so document vectors are precomputed and indexed for fast recall. Cross-encoders feed query+document together for a precise relevance score but must run per pair at query time — hence the retrieve-then-rerank pattern.',
    },
    {
      question: 'You upgrade from OpenAI text-embedding-3 (1536-dim) to a new model. What must you do before serving queries?',
      options: [
        { text: 'Nothing — modern embedding spaces are standardized and interoperable', correct: false },
        { text: 'Re-embed and rebuild the entire corpus with the new model, because vectors from different models are not comparable', correct: true },
        { text: 'Only re-embed the query; existing document vectors remain valid', correct: false },
      ],
      explain: 'Different models (or even versions) live in different vector spaces, so old and new vectors cannot be compared. You must re-embed the whole corpus and rebuild the index — typically via a dual-write shadow index with an atomic cutover.',
    },
    {
      question: 'For measuring RAG retrieval quality, which metric matters MOST at the first (retrieval) stage?',
      options: [
        { text: 'Recall@k — if the relevant chunk is never retrieved, no reranker or LLM can recover it', correct: true },
        { text: 'BLEU score of the final generated answer', correct: false },
        { text: 'The raw cosine value of the top result', correct: false },
      ],
      explain: 'Retrieval is a funnel: nothing downstream can use a chunk that was never retrieved. So recall@k governs the ceiling on quality; nDCG/MRR then measure whether the best chunks are ranked highest after reranking.',
    },
    {
      question: 'A vector DB does a POST-filter (ANN first, then apply a highly selective metadata filter). What is the main risk?',
      options: [
        { text: 'It may return fewer than k results, or even zero, because most top-k candidates get filtered out', correct: true },
        { text: 'It guarantees exact results but is always slower than exact kNN', correct: false },
        { text: 'It silently changes the distance metric from cosine to L2', correct: false },
      ],
      explain: 'Post-filtering runs ANN for top-k then discards non-matching rows. If the filter is very selective, few or none of the top-k survive, so you under-return. Pre-filtering or integrated filtered-ANN avoids this at the cost of complexity/speed.',
    },
    {
      question: 'Retrieval quality is poor even though the correct document is clearly in your corpus. What is the most common root cause to check FIRST?',
      options: [
        { text: 'The embedding model is too small and must be replaced immediately', correct: false },
        { text: 'Chunking — chunks too large/small or splitting mid-idea so the right passage is never a clean match', correct: true },
        { text: 'The vector DB is using cosine instead of dot product', correct: false },
      ],
      explain: 'Engineers reflexively swap models, but poor chunking is the usual culprit: oversized chunks dilute the embedding, undersized ones lose context, and mid-idea splits prevent clean matches. Fix chunking before touching the model.',
    },
  ],
};
