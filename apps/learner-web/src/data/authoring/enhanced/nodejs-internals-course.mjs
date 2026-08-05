export default {
  id: 'nodejs-internals-course',
  title: 'Node.js Internals',
  icon: '🟢',
  color: '#83cd29',
  lessons: [
    {
      id: 'architecture',
      group: 'The Machine',
      nav: '1 · Architecture',
      title: 'Architecture: V8, libuv & the C++ glue',
      lede: 'Node.js is not "JavaScript on the server." It is a C++ program that happens to run your JavaScript. Meet the crew.',
      html: `
        <p>Picture Node.js as a small factory. 🏭 You wrote the instructions (JavaScript), but the actual heavy machinery is C++. When your code says <code>fs.readFile</code>, JavaScript doesn't read the file — it hands a note to the C++ workers, who do the dirty work and tap you on the shoulder later.</p>

        <h3>The cast of characters</h3>
        <ul>
          <li><span class='kicker'>V8</span> — Google's JavaScript + WebAssembly engine (also in Chrome, Deno, Cloudflare Workers). It parses, JIT-compiles, and executes your JS, and owns the <strong>heap</strong> where your objects live.</li>
          <li><span class='kicker'>libuv</span> — a C library giving Node the <strong>event loop</strong>, a <strong>thread pool</strong>, and cross-platform async I/O (<code>epoll</code> on Linux, <code>kqueue</code> on macOS/BSD, <code>IOCP</code> on Windows).</li>
          <li><span class='kicker'>C++ bindings</span> — the glue. Core modules (<code>fs</code>, <code>net</code>, <code>crypto</code>, <code>http</code>) are thin JS wrappers over C++ that call libuv or the OS.</li>
          <li><span class='kicker'>llhttp</span> — the tiny, fast HTTP parser. <span class='kicker'>c-ares</span> — async DNS. <span class='kicker'>OpenSSL</span> — TLS + crypto. <span class='kicker'>zlib</span> / <span class='kicker'>ncrypto</span> / <span class='kicker'>ada</span> (URL parser) round out the bundled C/C++ deps.</li>
        </ul>

        <div class='diagram'>
          <svg viewBox='0 0 640 240' width='640'>
            <defs><marker id='arrow' markerWidth='10' markerHeight='10' refX='8' refY='3' orient='auto'><path d='M0,0 L8,3 L0,6 Z' fill='#8b98a9'/></marker></defs>
            <rect class='node-box' x='240' y='16' width='160' height='48' rx='8'/>
            <text class='node-text' x='320' y='40' text-anchor='middle'>Your JS code</text>
            <text class='node-sub' x='320' y='56' text-anchor='middle'>app.js</text>
            <line class='edge' x1='320' y1='64' x2='320' y2='96' marker-end='url(#arrow)'/>
            <rect class='node-box' x='200' y='96' width='240' height='48' rx='8'/>
            <text class='node-text' x='320' y='120' text-anchor='middle'>Node bindings (C++)</text>
            <text class='node-sub' x='320' y='136' text-anchor='middle'>the glue layer</text>
            <line class='edge' x1='260' y1='144' x2='150' y2='188' marker-end='url(#arrow)'/>
            <line class='edge' x1='380' y1='144' x2='490' y2='188' marker-end='url(#arrow)'/>
            <rect class='node-box worker' x='40' y='188' width='220' height='48' rx='8'/>
            <text class='node-text' x='150' y='212' text-anchor='middle'>V8 engine</text>
            <text class='node-sub' x='150' y='228' text-anchor='middle'>execute JS + heap</text>
            <rect class='node-box tool' x='380' y='188' width='220' height='48' rx='8'/>
            <text class='node-text' x='490' y='212' text-anchor='middle'>libuv</text>
            <text class='node-sub' x='490' y='228' text-anchor='middle'>event loop + thread pool</text>
          </svg>
          <div class='diagram-caption'>Your JS talks to C++ bindings, which fan out to V8 (run code) and libuv (do async I/O).</div>
        </div>

        <h4>The JS/C++ boundary</h4>
        <p>Every crossing from JS into C++ (and back) has a <span class='kicker'>marshalling</span> cost — arguments convert between V8 values and C++ types. Tiny individually, but in hot loops calling native code millions of times it adds up (a real reason <code>Buffer</code> methods and <code>JSON</code> are optimized to minimize crossings). This boundary is also <em>where the magic happens</em>: it's how a single-threaded language pulls off thousands of concurrent connections.</p>

        <table>
          <tr><th>Layer</th><th>Language</th><th>Owns</th></tr>
          <tr><td>Your app + core JS modules</td><td>JavaScript</td><td>Business logic, ergonomic API</td></tr>
          <tr><td>Bindings</td><td>C++</td><td>Marshalling, calling into libs</td></tr>
          <tr><td>V8</td><td>C++</td><td>Parse, JIT, execute, GC, heap</td></tr>
          <tr><td>libuv</td><td>C</td><td>Event loop, thread pool, async I/O</td></tr>
          <tr><td>OS kernel</td><td>—</td><td>epoll/kqueue/IOCP, sockets, files</td></tr>
        </table>

        <div class='callout warn'>
          <div class='c-title'>Gotcha</div>
          "Node is single-threaded" is a half-truth. <strong>Your JavaScript</strong> runs on one thread. But libuv keeps a pool of background threads (default 4) plus the OS does much I/O asynchronously. Node is "single-threaded JS on top of a very multi-threaded C++ runtime."
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "Node = V8 to run my JavaScript, libuv for the event loop and async I/O, and a C++ bindings layer stitching them together, plus bundled libs like llhttp, c-ares and OpenSSL. My JS is single-threaded; the runtime underneath is not."
        </div>
      `,
    },
    {
      id: 'v8-optimization',
      group: 'The Machine',
      nav: '2 · V8 internals',
      title: 'V8 internals: JIT, hidden classes & deopt',
      lede: 'V8 bets that your objects have stable shapes. Break that bet and it silently deoptimizes your hot loop into interpreter-speed sludge.',
      html: `
        <p>V8 is a multi-tier engine. Your function starts interpreted, then — if it runs hot — gets promoted to faster and faster machine code. Understanding the tiers explains half of Node's "why is this slow?" mysteries. 🔥</p>

        <h3>The compilation pipeline</h3>
        <table>
          <tr><th>Tier</th><th>Component</th><th>Role</th></tr>
          <tr><td>Parse</td><td>Scanner + Parser</td><td>Source → AST (with lazy parsing to defer unused functions)</td></tr>
          <tr><td>Tier 0</td><td><strong>Ignition</strong></td><td>Bytecode interpreter — fast start, collects type feedback</td></tr>
          <tr><td>Tier 1</td><td><strong>Sparkplug</strong></td><td>Baseline non-optimizing compiler — quick machine code, no analysis</td></tr>
          <tr><td>Tier 2</td><td><strong>Maglev</strong></td><td>Mid-tier optimizer (newer) — good code, cheap to produce</td></tr>
          <tr><td>Tier 3</td><td><strong>TurboFan</strong></td><td>Fully optimizing compiler — speculative, uses type feedback</td></tr>
        </table>

        <h3>Hidden classes (aka "Shapes" / "Maps")</h3>
        <p>JavaScript objects are dynamic dictionaries — but hash lookups per property access would be brutally slow. So V8 gives every object a <span class='kicker'>hidden class</span>: a hidden struct describing which properties exist and at which memory offset. Objects created the same way <em>share</em> a hidden class, so V8 can compile property access to a simple offset read.</p>

        <pre><code>function Point(x, y) {
  this.x = x;   // transitions to hidden class C1 (has x)
  this.y = y;   // transitions to C2 (has x, y)
}
const a = new Point(1, 2);   // shape C2
const b = new Point(3, 4);   // SAME shape C2 -&gt; fast

b.z = 9;   // b now transitions to C3 -&gt; a and b diverge</code></pre>

        <div class='callout warn'>
          <div class='c-title'>Gotcha — shape stability</div>
          Add properties in a <strong>different order</strong>, or add them <em>after</em> construction, and V8 creates a different hidden class. Now your call site sees multiple shapes and its inline cache degrades. Initialize all fields in the constructor, in the same order, every time.
        </div>

        <h3>Inline caches: mono → poly → mega</h3>
        <p>Each property-access site remembers which hidden classes it has seen — an <span class='kicker'>inline cache (IC)</span>.</p>
        <ul>
          <li><strong>Monomorphic</strong> — 1 shape seen. Fastest; TurboFan loves it.</li>
          <li><strong>Polymorphic</strong> — 2–4 shapes. Still OK, a small check.</li>
          <li><strong>Megamorphic</strong> — 5+ shapes. IC gives up, falls back to a slow generic lookup. Optimization off the table.</li>
        </ul>

        <div class='diagram'>
          <svg viewBox='0 0 640 120' width='640'>
            <rect class='node-box worker' x='20' y='40' width='170' height='48' rx='8'/>
            <text class='node-text' x='105' y='62' text-anchor='middle'>Monomorphic</text>
            <text class='node-sub' x='105' y='80' text-anchor='middle'>1 shape · fastest</text>
            <rect class='node-box' x='235' y='40' width='170' height='48' rx='8'/>
            <text class='node-text' x='320' y='62' text-anchor='middle'>Polymorphic</text>
            <text class='node-sub' x='320' y='80' text-anchor='middle'>2-4 shapes · ok</text>
            <rect class='node-box tool' x='450' y='40' width='170' height='48' rx='8'/>
            <text class='node-text' x='535' y='62' text-anchor='middle'>Megamorphic</text>
            <text class='node-sub' x='535' y='80' text-anchor='middle'>5+ shapes · slow</text>
          </svg>
          <div class='diagram-caption'>Keep call sites monomorphic to stay on the fast path.</div>
        </div>

        <h3>Deoptimization</h3>
        <p>TurboFan is <em>speculative</em>: it compiles assuming "this variable was always a small integer." If a later call breaks that assumption (a string sneaks in, an array becomes a hole-y array, a number overflows to a float), V8 throws away the optimized code and <span class='kicker'>bails back</span> to Ignition — a "deopt." Frequent deopt/reopt thrashing is a classic silent perf killer. Trace it with <code>node --trace-deopt</code> and <code>--trace-opt</code>.</p>

        <div class='callout danger'>
          <div class='c-title'>War story</div>
          A team added an optional <code>debugInfo</code> field to a hot request object only in error cases. That second shape turned a monomorphic hot loop polymorphic; p99 latency doubled. The fix: always initialize <code>debugInfo = null</code> in the constructor so every object shared one shape.
        </div>

        <div class='callout good'>
          <div class='c-title'>Rules of thumb</div>
          Same field order, always. No <code>delete</code> on hot objects (it demotes to slow "dictionary mode"). Don't mix types in an array (<code>[1, 2, 'x']</code> loses the packed-int fast path). Avoid <code>arguments</code> leaking; use rest params.
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "V8 tiers up Ignition → Sparkplug → Maglev → TurboFan using type feedback. Objects share hidden classes when built identically, keeping call sites monomorphic and inline caches fast. Change shapes or types and you go megamorphic or trigger a deopt back to the interpreter."
        </div>
      `,
    },
    {
      id: 'event-loop',
      group: 'The Machine',
      nav: '3 · Event loop',
      title: 'The event loop and its six phases',
      lede: 'The heartbeat of Node. A while-loop in C, cycling through phases, each draining its own queue of callbacks.',
      html: `
        <p>The event loop is libuv's beating heart. ❤️ It literally asks: "Any timers due? Any I/O finished? Any <code>setImmediate</code>? Repeat." Each spin is a <span class='kicker'>tick</span>, and each tick walks ordered <strong>phases</strong>.</p>

        <h3>The phases, in order</h3>
        <div class='diagram'>
          <svg viewBox='0 0 640 300' width='640'>
            <defs><marker id='arrow2' markerWidth='10' markerHeight='10' refX='8' refY='3' orient='auto'><path d='M0,0 L8,3 L0,6 Z' fill='#8b98a9'/></marker></defs>
            <rect class='node-box' x='250' y='10' width='140' height='44' rx='8'/>
            <text class='node-text' x='320' y='30' text-anchor='middle'>timers</text>
            <text class='node-sub' x='320' y='46' text-anchor='middle'>setTimeout/Interval</text>
            <line class='edge' x1='390' y1='32' x2='470' y2='70' marker-end='url(#arrow2)'/>
            <rect class='node-box' x='440' y='70' width='150' height='44' rx='8'/>
            <text class='node-text' x='515' y='90' text-anchor='middle'>pending</text>
            <text class='node-sub' x='515' y='106' text-anchor='middle'>deferred TCP errs</text>
            <line class='edge' x1='515' y1='114' x2='515' y2='150' marker-end='url(#arrow2)'/>
            <rect class='node-box worker' x='440' y='150' width='150' height='44' rx='8'/>
            <text class='node-text' x='515' y='170' text-anchor='middle'>poll</text>
            <text class='node-sub' x='515' y='186' text-anchor='middle'>I/O callbacks</text>
            <line class='edge' x1='440' y1='185' x2='390' y2='215' marker-end='url(#arrow2)'/>
            <rect class='node-box tool' x='250' y='210' width='140' height='44' rx='8'/>
            <text class='node-text' x='320' y='230' text-anchor='middle'>check</text>
            <text class='node-sub' x='320' y='246' text-anchor='middle'>setImmediate</text>
            <line class='edge' x1='250' y1='232' x2='200' y2='186' marker-end='url(#arrow2)'/>
            <rect class='node-box' x='50' y='150' width='150' height='44' rx='8'/>
            <text class='node-text' x='125' y='170' text-anchor='middle'>close</text>
            <text class='node-sub' x='125' y='186' text-anchor='middle'>socket.on close</text>
            <line class='edge' x1='125' y1='150' x2='250' y2='40' marker-end='url(#arrow2)'/>
          </svg>
          <div class='diagram-caption'>One tick flows timers → pending → poll → check → close, then loops. (Internal idle/prepare omitted.)</div>
        </div>

        <table>
          <tr><th>Phase</th><th>What runs here</th></tr>
          <tr><td><strong>timers</strong></td><td>Callbacks from <code>setTimeout</code> / <code>setInterval</code> whose threshold elapsed.</td></tr>
          <tr><td><strong>pending callbacks</strong></td><td>Some deferred system callbacks (e.g. certain TCP <code>ECONNREFUSED</code> errors).</td></tr>
          <tr><td><strong>idle, prepare</strong></td><td>Internal libuv bookkeeping. You never see it.</td></tr>
          <tr><td><strong>poll</strong></td><td>The big one. Retrieves new I/O events; runs I/O callbacks; may <em>block here</em> waiting.</td></tr>
          <tr><td><strong>check</strong></td><td><code>setImmediate</code> callbacks fire here.</td></tr>
          <tr><td><strong>close</strong></td><td>Close callbacks like <code>socket.on('close', ...)</code>.</td></tr>
        </table>

        <h4>The poll phase decides how long to sleep</h4>
        <p>When Node reaches <strong>poll</strong> with no immediate work, it computes a timeout: sleep until the next timer is due (or forever if none), then <code>epoll_wait</code> parks the process — this is why idle Node servers use ~0% CPU instead of busy-looping. But if a <code>setImmediate</code> is queued, poll does <strong>not</strong> block; it moves straight to <strong>check</strong>.</p>

        <div class='callout warn'>
          <div class='c-title'>Gotcha — timers aren't precise</div>
          <code>setTimeout(fn, 100)</code> means "no <em>sooner</em> than 100ms," not "at exactly 100ms." A busy poll phase or a long callback pushes timers late. Also, the minimum delay is clamped: values below 1 are treated as 1ms.
        </div>

        <div class='callout good'>
          <div class='c-title'>Rule of thumb</div>
          <code>setImmediate</code> = "run after the current poll phase" (check). <code>setTimeout(fn, 0)</code> = "run in the next timers phase." Inside an I/O callback, <code>setImmediate</code> <strong>always</strong> beats <code>setTimeout(0)</code>. At the top level, their order is a coin-flip that depends on loop startup timing.
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "The loop cycles ordered phases — timers, pending, poll, check, close. Poll runs I/O callbacks and is where the loop parks itself on epoll waiting for events. setImmediate fires in check, right after poll, which is why it beats setTimeout(0) inside I/O."
        </div>
      `,
    },
    {
      id: 'micro-macro',
      group: 'The Machine',
      nav: '4 · Micro vs macro',
      title: 'Microtasks vs macrotasks: nextTick & Promises',
      lede: 'Between every phase, Node drains two special queues. Getting their order right is the classic senior interview trap.',
      html: `
        <p>Here's the twist most people miss: <strong>microtasks are not a phase</strong>. Node drains them <em>between</em> operations — after each macrotask callback and between event-loop phases. There are two microtask queues, and one jumps the line.</p>

        <h3>The pecking order</h3>
        <ol>
          <li><span class='kicker'>process.nextTick queue</span> — highest priority. Drained completely before anything else.</li>
          <li><span class='kicker'>Promise microtask queue</span> — <code>.then</code>, <code>await</code> continuations, <code>queueMicrotask</code>. Drained after nextTick.</li>
          <li><span class='kicker'>Macrotasks</span> — timers, I/O, <code>setImmediate</code>. One phase-visit, then microtasks drain again.</li>
        </ol>

        <p>Mental model: after every single macrotask callback, Node empties <strong>all</strong> of nextTick, then <strong>all</strong> of the Promise queue, before touching the next macrotask.</p>

        <pre><code>console.log('sync 1');

setTimeout(() =&gt; console.log('timeout'), 0);
setImmediate(() =&gt; console.log('immediate'));

Promise.resolve().then(() =&gt; console.log('promise'));
process.nextTick(() =&gt; console.log('nextTick'));

console.log('sync 2');

// Output:
// sync 1
// sync 2
// nextTick     &lt;- microtasks, nextTick first
// promise      &lt;- then promise queue
// timeout      &lt;- macrotasks after microtasks drain
// immediate</code></pre>

        <div class='callout danger'>
          <div class='c-title'>War story</div>
          A recursive <code>process.nextTick</code> can <strong>starve the event loop</strong> completely — because Node drains the entire nextTick queue before moving on, an infinitely-refilling queue means I/O never runs. Your server accepts connections but never responds. Use <code>setImmediate</code> if you need to yield to I/O.
        </div>

        <div class='callout warn'>
          <div class='c-title'>Gotcha — nested microtasks</div>
          A promise <code>.then</code> that schedules another promise keeps the <em>same</em> microtask drain going. Microtasks scheduled by microtasks run before the loop advances a phase — so a busy promise chain can also delay I/O, just like nextTick, though nextTick still wins priority.
        </div>

        <div class='two-col'>
          <div>
            <h4>Use process.nextTick when</h4>
            <ul>
              <li>You must run <em>before</em> any I/O or timer.</li>
              <li>Emitting an event on the same tick after construction.</li>
              <li>Deferring an error callback to keep APIs async-consistent.</li>
            </ul>
          </div>
          <div>
            <h4>Use queueMicrotask/Promise when</h4>
            <ul>
              <li>Normal async continuation work.</li>
              <li>You want to defer but not starve I/O as aggressively.</li>
              <li>Standard, cross-runtime microtask behavior (browsers too).</li>
            </ul>
          </div>
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "nextTick beats Promises, Promises beat timers. After every macrotask, Node fully drains nextTick then the Promise microtask queue before the next macrotask. Recursive nextTick — or an endless promise chain — can starve the loop."
        </div>
      `,
    },
    {
      id: 'async-io',
      group: 'Concurrency',
      nav: '5 · Async I/O',
      title: 'How async I/O actually works',
      lede: 'The trillion-dollar question: if JS is single-threaded, how does Node handle 10,000 sockets at once? Two different tricks.',
      html: `
        <p>Node's async magic comes from <strong>two totally different mechanisms</strong>, and confusing them is a common interview stumble.</p>

        <h3>Trick 1: OS-level async (the good stuff) 🌐</h3>
        <p>Network I/O — TCP, HTTP, UDP — is <strong>truly non-blocking at the kernel level</strong>. libuv registers your socket with the OS event-notification system (<code>epoll</code> on Linux, <code>kqueue</code> on macOS, <code>IOCP</code> on Windows). The kernel says "I'll tap you when data arrives." No threads needed — one thread watches thousands of sockets. This is why Node scales connections so cheaply (C10K solved by design).</p>

        <h3>Trick 2: The thread pool (the fallback) 🧵</h3>
        <p>Some operations have <strong>no portable async OS API</strong>, or the OS one is unreliable. For those, libuv uses a <span class='kicker'>thread pool</span> (default 4 threads, <code>UV_THREADPOOL_SIZE</code>, max 1024). Work runs on a background thread; when done, the callback is queued back on the loop's poll phase.</p>

        <table>
          <tr><th>Operation</th><th>Mechanism</th></tr>
          <tr><td>TCP / HTTP / UDP sockets</td><td>OS async (epoll/kqueue/IOCP) — no thread pool</td></tr>
          <tr><td>File system (<code>fs.*</code>)</td><td>Thread pool</td></tr>
          <tr><td><code>dns.lookup</code></td><td>Thread pool (uses blocking <code>getaddrinfo</code>)</td></tr>
          <tr><td><code>crypto.pbkdf2</code>, <code>zlib.*</code>, <code>bcrypt</code></td><td>Thread pool</td></tr>
          <tr><td><code>dns.resolve</code></td><td>OS async (c-ares) — not the pool</td></tr>
        </table>

        <div class='callout warn'>
          <div class='c-title'>Gotcha — the silent 4-thread bottleneck</div>
          Fire 5 concurrent <code>fs</code> or <code>crypto.pbkdf2</code> calls and the 5th <em>waits in line</em>. A CPU-heavy crypto workload can secretly serialize your file reads. Symptoms: file/DNS latency spikes under load with CPU nowhere near saturated. Bump <code>UV_THREADPOOL_SIZE</code> (set it <em>before</em> the first libuv use — it's read once at startup).
        </div>

        <div class='callout danger'>
          <div class='c-title'>War story — the DNS trap</div>
          <code>dns.lookup</code> uses the thread pool. Under a burst of new outbound connections, thousands of lookups queued behind 4 threads and every HTTP client call stalled — while CPU sat at 20%. Switching hot paths to <code>dns.resolve</code> (c-ares, no pool) or caching DNS fixed it.
        </div>

        <div class='callout good'>
          <div class='c-title'>Mnemonic</div>
          "Sockets fly solo; files hire a crew." Network = kernel async, zero threads. Filesystem / DNS-lookup / crypto / zlib = the 4-thread pool.
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "Network I/O is truly non-blocking via the OS event system — one thread, thousands of sockets. Filesystem, dns.lookup, crypto and zlib use libuv's thread pool, which defaults to only 4 threads and can silently serialize under load."
        </div>
      `,
    },
    {
      id: 'blocking',
      group: 'Concurrency',
      nav: '6 · Blocking',
      title: 'Blocking the event loop (and how not to)',
      lede: 'The cardinal sin of Node. One slow synchronous function freezes your entire server for every user at once.',
      html: `
        <p>Because your JS runs on one thread, a long synchronous computation means <strong>nothing else happens</strong> — no new connections handled, no callbacks fired, no timers, nothing. The event loop can't spin until your function returns. 🥶</p>

        <h3>Classic event-loop blockers</h3>
        <ul>
          <li>Big <code>JSON.parse</code> / <code>JSON.stringify</code> on multi-MB payloads.</li>
          <li>Synchronous crypto (<code>crypto.pbkdf2Sync</code>, <code>bcrypt</code> with high rounds).</li>
          <li><code>fs.readFileSync</code> / <code>fs.readdirSync</code> in a request handler.</li>
          <li>Giant loops, regex catastrophic backtracking (ReDoS), heavy templating, <code>zlib.gzipSync</code>.</li>
        </ul>

        <pre><code>// ❌ Blocks everyone for the duration
app.get('/hash', (req, res) =&gt; {
  const out = crypto.pbkdf2Sync(pw, salt, 1_000_000, 64, 'sha512');
  res.end(out.toString('hex'));
});

// ✅ Async version uses the thread pool, loop stays free
app.get('/hash', (req, res) =&gt; {
  crypto.pbkdf2(pw, salt, 1_000_000, 64, 'sha512', (err, out) =&gt; {
    res.end(out.toString('hex'));
  });
});</code></pre>

        <h3>How to detect it</h3>
        <ul>
          <li><code>perf_hooks.monitorEventLoopDelay()</code> — a high-resolution histogram of loop lag. Rising p99 = trouble.</li>
          <li><code>--prof</code> or <strong>clinic doctor</strong> flags "event loop blocked for N ms."</li>
          <li>The dumb-but-effective canary: a <code>setInterval(fn, 100)</code> that logs how late it actually fired (drift = block).</li>
        </ul>

        <div class='two-col'>
          <div>
            <h4>Move the work</h4>
            <ul>
              <li>Offload CPU work to <code>worker_threads</code>.</li>
              <li>Use async/pool-backed APIs, never <code>*Sync</code> in hot paths.</li>
              <li>Push to a separate service or job queue.</li>
            </ul>
          </div>
          <div>
            <h4>Chunk the work</h4>
            <ul>
              <li>Break big loops and yield with <code>setImmediate</code>.</li>
              <li>Stream large payloads instead of buffering.</li>
              <li>Paginate; don't process 1M rows in one tick.</li>
            </ul>
          </div>
        </div>

        <div class='callout danger'>
          <div class='c-title'>War story — one regex, total outage</div>
          A single unvalidated regex (<code>/(a+)+$/</code>) against attacker input pegged one CPU at 100% and hung the whole server — a ReDoS. Every other user got a timeout. One bad line, full outage. Node 21+ ships a safer path, but validate input lengths and prefer linear-time regex engines (e.g. RE2) for user input.
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "There's one thread for my JS, so any synchronous CPU work blocks every request at once. I monitor event-loop delay with perf_hooks, keep *Sync APIs out of request paths, chunk big loops with setImmediate, and offload CPU-bound work to worker_threads."
        </div>
      `,
    },
    {
      id: 'error-handling',
      group: 'Concurrency',
      nav: '7 · Errors & lifecycle',
      title: 'Errors, process lifecycle & graceful shutdown',
      lede: 'An unhandled error in async land can kill your process — or, worse, silently leave it in a zombie state. Know the escape hatches.',
      html: `
        <p>Synchronous errors are easy: <code>try/catch</code>. The hard part is errors that escape into the event loop — a throw inside a callback, a rejected promise nobody awaited, an <code>'error'</code> event with no listener. Node has specific rules and process-level nets for each. 🪤</p>

        <h3>The four ways errors escape</h3>
        <table>
          <tr><th>Source</th><th>What happens if unhandled</th></tr>
          <tr><td>Sync throw</td><td>Bubbles up the call stack; <code>try/catch</code> catches it.</td></tr>
          <tr><td>Throw in a callback / timer</td><td>Emits <code>process.on('uncaughtException')</code>; else crashes.</td></tr>
          <tr><td>Rejected promise, unawaited</td><td>Emits <code>process.on('unhandledRejection')</code>; crashes by default since Node 15.</td></tr>
          <tr><td>EventEmitter <code>'error'</code> with no listener</td><td>Thrown as an uncaught exception → crash.</td></tr>
        </table>

        <div class='callout danger'>
          <div class='c-title'>Gotcha — uncaughtException is not a resume button</div>
          After <code>uncaughtException</code>, your app is in an <strong>undefined state</strong> — half-finished writes, leaked locks, corrupt in-memory data. The official guidance: log, run synchronous cleanup, then <code>process.exit(1)</code> and let a supervisor restart you. Do <em>not</em> swallow it and keep serving traffic.
        </div>

        <pre><code>process.on('uncaughtException', (err, origin) =&gt; {
  logger.fatal({ err, origin });   // sync-ish logging only
  process.exit(1);                 // let PM2 / k8s restart a clean process
});

process.on('unhandledRejection', (reason) =&gt; {
  throw reason;   // convert to uncaughtException, then crash cleanly
});</code></pre>

        <h3>Graceful shutdown (SIGTERM)</h3>
        <p>Kubernetes / Docker send <code>SIGTERM</code> before killing a container. A well-behaved process stops accepting new work, finishes in-flight requests, closes DB pools, then exits — before the ~30s <code>SIGKILL</code> deadline.</p>
        <pre><code>process.on('SIGTERM', async () =&gt; {
  server.close();                 // stop accepting new connections
  await drainInFlight();          // let current requests finish
  await db.close();               // release pools
  process.exit(0);
});</code></pre>

        <div class='callout warn'>
          <div class='c-title'>Gotcha — errors don't cross await gaps by magic</div>
          A callback-style API that throws asynchronously will NOT be caught by a surrounding <code>try/catch</code> around the sync call. Promisify it (or use <code>fs.promises</code>) so the error becomes a rejection you can <code>await</code>. And always attach an <code>'error'</code> listener to streams/sockets — an unhandled <code>'error'</code> event crashes the process.
        </div>

        <div class='callout good'>
          <div class='c-title'>Rule of thumb</div>
          <code>uncaughtException</code>/<code>unhandledRejection</code> are <strong>last-resort loggers, not recovery</strong>. Design for "crash-only software": make restart cheap and idempotent, and let a supervisor (PM2, systemd, k8s) bring you back clean.
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "Async throws surface as uncaughtException; unawaited rejections as unhandledRejection — both crash by default in modern Node. I treat them as log-and-exit signals, never resume, and pair them with SIGTERM graceful shutdown so in-flight requests drain before the process dies."
        </div>
      `,
    },
    {
      id: 'streams',
      group: 'Data',
      nav: '8 · Streams',
      title: 'Streams & backpressure',
      lede: 'Streams let you process gigabytes with megabytes of RAM. Backpressure is the polite "slow down, I am full" signal.',
      html: `
        <p>A stream processes data <strong>in chunks</strong> instead of loading everything into memory. Think of a garden hose 🚿 versus filling a swimming pool and then pouring it. Four flavors:</p>

        <ul>
          <li><span class='kicker'>Readable</span> — source of data (<code>fs.createReadStream</code>, an HTTP request).</li>
          <li><span class='kicker'>Writable</span> — destination (<code>fs.createWriteStream</code>, an HTTP response).</li>
          <li><span class='kicker'>Duplex</span> — both, independent channels (a TCP socket).</li>
          <li><span class='kicker'>Transform</span> — duplex that mutates in transit (<code>zlib.createGzip</code>, a cipher).</li>
        </ul>

        <h3>Flowing vs paused mode</h3>
        <p>A Readable has two read modes. In <strong>paused</strong> mode you pull with <code>.read()</code>. Attaching a <code>'data'</code> listener or calling <code>.pipe()</code> flips it to <strong>flowing</strong> mode, where chunks are pushed at you as fast as they arrive. Async iterators (<code>for await (const chunk of readable)</code>) give you pull-based ergonomics with automatic backpressure — the modern default.</p>

        <h3>Backpressure: the whole point</h3>
        <p>If a fast Readable pumps into a slow Writable (reading a file faster than the network can send), unbuffered data piles up until you OOM. <strong>Backpressure</strong> throttles the source when the destination is full.</p>

        <p>Each stream has a <span class='kicker'>highWaterMark</span> — a buffer threshold (default 16 KB for byte streams, 16 objects in object mode). When <code>write()</code> returns <code>false</code>, the buffer is over the mark: <strong>stop writing</strong> until the <code>'drain'</code> event fires.</p>

        <pre><code>// ❌ Ignores backpressure — can blow up memory
readable.on('data', (chunk) =&gt; writable.write(chunk));

// ✅ pipe() handles backpressure for you
readable.pipe(writable);

// ✅ Best: pipeline() also propagates errors + destroys streams
const { pipeline } = require('node:stream/promises');
await pipeline(readable, gzip, writable);</code></pre>

        <div class='diagram'>
          <svg viewBox='0 0 640 130' width='640'>
            <defs><marker id='arrow4' markerWidth='10' markerHeight='10' refX='8' refY='3' orient='auto'><path d='M0,0 L8,3 L0,6 Z' fill='#8b98a9'/></marker></defs>
            <rect class='node-box' x='20' y='45' width='150' height='48' rx='8'/>
            <text class='node-text' x='95' y='67' text-anchor='middle'>Readable</text>
            <text class='node-sub' x='95' y='85' text-anchor='middle'>fast source</text>
            <line class='edge' x1='170' y1='69' x2='250' y2='69' marker-end='url(#arrow4)'/>
            <rect class='node-box tool' x='250' y='45' width='150' height='48' rx='8'/>
            <text class='node-text' x='325' y='67' text-anchor='middle'>buffer</text>
            <text class='node-sub' x='325' y='85' text-anchor='middle'>highWaterMark 16KB</text>
            <line class='edge' x1='400' y1='69' x2='480' y2='69' marker-end='url(#arrow4)'/>
            <rect class='node-box worker' x='480' y='45' width='150' height='48' rx='8'/>
            <text class='node-text' x='555' y='67' text-anchor='middle'>Writable</text>
            <text class='node-sub' x='555' y='85' text-anchor='middle'>slow sink</text>
            <line class='edge' x1='480' y1='30' x2='180' y2='30' marker-end='url(#arrow4)'/>
            <text class='edge-label' x='330' y='24' text-anchor='middle'>write() -&gt; false: pause until 'drain'</text>
          </svg>
          <div class='diagram-caption'>Backpressure: when the buffer passes highWaterMark, the sink tells the source to wait.</div>
        </div>

        <div class='pattern-card'>
          <h4>pipeline() over pipe()</h4>
          <p><code>pipe()</code> handles backpressure but <em>not</em> error propagation — an error mid-chain can leak the other streams and their file descriptors. <code>pipeline()</code> fixes both and returns a promise.</p>
          <div class='tag-row'><span class='tag use'>use when chaining streams</span><span class='tag avoid'>avoid raw .on(data)+write across a speed gap</span></div>
        </div>

        <div class='callout good'>
          <div class='c-title'>Rule of thumb</div>
          Never manually <code>.on('data')</code> + <code>.write()</code> across a speed mismatch. Use <code>pipeline()</code> — it wires backpressure, forwards errors, and destroys streams on failure so you don't leak descriptors.
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "Streams process data in chunks so I handle huge files with tiny memory. Backpressure — driven by highWaterMark and write() returning false — throttles a fast source for a slow sink. I use pipeline() so errors and cleanup are handled too."
        </div>
      `,
    },
    {
      id: 'buffers',
      group: 'Data',
      nav: '9 · Buffers',
      title: 'Buffers & binary data',
      lede: 'Before Uint8Array was cool, Node had Buffer: fixed-size, raw memory outside the V8 heap. Still everywhere.',
      html: `
        <p>A <span class='kicker'>Buffer</span> is Node's way of holding raw bytes — network packets, file contents, image data. It's a subclass of <code>Uint8Array</code>, but its memory lives <strong>off the V8 heap</strong> (in C++ land), so buffers don't bloat your GC-managed heap and can be shared with native code cheaply.</p>

        <h3>Creating buffers safely</h3>
        <pre><code>Buffer.alloc(10);              // ✅ zero-filled, safe
Buffer.allocUnsafe(10);        // ⚡ faster but may contain OLD memory
Buffer.from('héllo', 'utf8');  // from a string with an encoding
Buffer.from([0x48, 0x69]);     // from bytes -&gt; 'Hi'</code></pre>

        <div class='callout danger'>
          <div class='c-title'>Security gotcha</div>
          <code>allocUnsafe</code> hands you <strong>uninitialized memory</strong> — it may contain leftovers (passwords, keys, other users' bytes). Only use it if you immediately overwrite every byte. This exact pattern caused real data-leak CVEs (the infamous pre-v6 <code>new Buffer(number)</code>). When in doubt, <code>alloc</code>.
        </div>

        <h3>Encodings matter</h3>
        <p>Bytes are meaningless without an encoding. <code>'utf8'</code>, <code>'hex'</code>, <code>'base64'</code>, <code>'base64url'</code>, <code>'latin1'</code> — the same bytes render differently. Classic bug: assuming one character equals one byte. In UTF-8, <code>'é'</code> is two bytes and an emoji can be four, so <code>buf.length</code> ≠ string <code>.length</code>, and slicing a multi-byte char in half corrupts it. For streamed decoding, use <code>string_decoder</code> to handle chunk boundaries.</p>

        <h3>Buffer vs Uint8Array vs ArrayBuffer</h3>
        <table>
          <tr><th>Type</th><th>What it is</th></tr>
          <tr><td><code>ArrayBuffer</code></td><td>Raw fixed-length memory block. Not directly readable.</td></tr>
          <tr><td><code>Uint8Array</code></td><td>A typed <em>view</em> over an ArrayBuffer.</td></tr>
          <tr><td><code>Buffer</code></td><td>Node's Uint8Array subclass with extra methods (<code>readInt32BE</code>, <code>write</code>, encodings).</td></tr>
        </table>

        <table>
          <tr><th>Concept</th><th>Detail</th></tr>
          <tr><td>Location</td><td>Off-heap (C++), not counted in V8 heap size (shows as <code>arrayBuffers</code>/external memory)</td></tr>
          <tr><td>Size</td><td>Fixed at allocation — can't grow</td></tr>
          <tr><td>Base class</td><td><code>Uint8Array</code></td></tr>
          <tr><td>Pooling</td><td>Small buffers (&lt; 4 KB) share a preallocated internal <code>Buffer.poolSize</code> pool</td></tr>
        </table>

        <div class='callout warn'>
          <div class='c-title'>Gotcha — the shared pool aliasing trap</div>
          Because small <code>allocUnsafe</code>/<code>Buffer.from</code> buffers may be slices of a shared pool, <code>buf.buffer</code> (the underlying ArrayBuffer) can be <em>larger</em> than the buffer and shared with siblings. Never assume <code>buf.buffer.byteLength === buf.length</code>; use <code>buf.byteOffset</code> and <code>buf.length</code>.
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "Buffer is a fixed-length Uint8Array of raw bytes living off the V8 heap, so it doesn't pressure GC and shares cheaply with native code. Buffer.alloc gives safe zero-filled memory; allocUnsafe is faster but returns uninitialized memory that can leak old data."
        </div>
      `,
    },
    {
      id: 'networking',
      group: 'Data',
      nav: '10 · HTTP & net',
      title: 'HTTP & networking internals',
      lede: 'Every Express app is a thin coat of paint over Node core http, which is a thin coat over net sockets, which is libuv talking to the kernel.',
      html: `
        <p>Peel back any Node web framework and you reach the same core: <code>net.Server</code> (raw TCP) wrapped by <code>http.Server</code> (which owns the parser and request/response objects). Knowing the layers lets you answer "why is my server slow / leaking sockets?" 🌐</p>

        <h3>The request path</h3>
        <div class='diagram'>
          <svg viewBox='0 0 640 120' width='640'>
            <defs><marker id='arrow5' markerWidth='10' markerHeight='10' refX='8' refY='3' orient='auto'><path d='M0,0 L8,3 L0,6 Z' fill='#8b98a9'/></marker></defs>
            <rect class='node-box' x='10' y='42' width='120' height='48' rx='8'/>
            <text class='node-text' x='70' y='64' text-anchor='middle'>kernel</text>
            <text class='node-sub' x='70' y='82' text-anchor='middle'>accept()</text>
            <line class='edge' x1='130' y1='66' x2='180' y2='66' marker-end='url(#arrow5)'/>
            <rect class='node-box tool' x='180' y='42' width='120' height='48' rx='8'/>
            <text class='node-text' x='240' y='64' text-anchor='middle'>libuv/net</text>
            <text class='node-sub' x='240' y='82' text-anchor='middle'>socket</text>
            <line class='edge' x1='300' y1='66' x2='350' y2='66' marker-end='url(#arrow5)'/>
            <rect class='node-box' x='350' y='42' width='120' height='48' rx='8'/>
            <text class='node-text' x='410' y='64' text-anchor='middle'>llhttp</text>
            <text class='node-sub' x='410' y='82' text-anchor='middle'>parse bytes</text>
            <line class='edge' x1='470' y1='66' x2='520' y2='66' marker-end='url(#arrow5)'/>
            <rect class='node-box worker' x='520' y='42' width='110' height='48' rx='8'/>
            <text class='node-text' x='575' y='64' text-anchor='middle'>handler</text>
            <text class='node-sub' x='575' y='82' text-anchor='middle'>req, res</text>
          </svg>
          <div class='diagram-caption'>Bytes flow kernel → libuv socket → llhttp parser → your (req, res) handler.</div>
        </div>

        <h3>Keep-alive & connection reuse</h3>
        <p>HTTP/1.1 defaults to <span class='kicker'>keep-alive</span>: the TCP connection stays open for multiple requests, avoiding a fresh handshake (and TLS negotiation) every time. On the <em>client</em> side, an <code>http.Agent</code> pools sockets — but the default global agent has limits, and forgetting <code>keepAlive: true</code> means every outbound call pays a full handshake.</p>

        <div class='callout warn'>
          <div class='c-title'>Gotcha — socket exhaustion</div>
          A default client Agent with <code>maxSockets</code> too low serializes outbound requests to the same host; too high and you exhaust ephemeral ports / file descriptors. Under load you'll see <code>ECONNRESET</code> or <code>EMFILE</code>. Tune <code>maxSockets</code>, enable <code>keepAlive</code>, and consider <strong>undici</strong> (Node's modern HTTP client, and the engine behind global <code>fetch</code>) which pools far better than legacy <code>http</code>.
        </div>

        <h3>HTTP/2, HTTP/3 & headers</h3>
        <ul>
          <li><code>http2</code> core module: multiplexed streams over one connection, header compression (HPACK), server push (deprecated in browsers).</li>
          <li>HTTP/3 (QUIC over UDP) is arriving experimentally; TLS is mandatory.</li>
          <li>Header limits (<code>--max-http-header-size</code>, default 16 KB) and timeouts (<code>headersTimeout</code>, <code>requestTimeout</code>, <code>keepAliveTimeout</code>) exist to blunt slowloris-style attacks.</li>
        </ul>

        <div class='callout danger'>
          <div class='c-title'>War story — the keepAliveTimeout mismatch</div>
          Behind an AWS ALB, intermittent <code>502</code>s appeared under load. Cause: Node's <code>server.keepAliveTimeout</code> (5s) was <em>shorter</em> than the load balancer's idle timeout, so Node closed sockets the ALB still thought were alive. Fix: set Node's keep-alive timeout <em>higher</em> than the upstream LB's.
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "Node's http server sits on net sockets and the llhttp parser over libuv. HTTP/1.1 keep-alive reuses TCP connections; on the client I pool with an Agent (keepAlive:true) or undici. I tune keepAliveTimeout above the upstream load balancer's idle timeout to avoid 502s."
        </div>
      `,
    },
    {
      id: 'concurrency',
      group: 'Concurrency',
      nav: '11 · Parallelism',
      title: 'worker_threads vs cluster vs child_process',
      lede: 'Node has three ways to use more than one core. Picking the wrong one is a great way to look junior in an interview.',
      html: `
        <p>The single event loop uses <strong>one core</strong>. To use the other 15 cores on your machine, you need multiple V8 instances or OS processes. Three tools, three jobs.</p>

        <div class='pattern-card'>
          <h4>worker_threads 🧵</h4>
          <p>Multiple threads <em>inside one process</em>, each with its own V8 isolate, heap, and event loop. Share memory via <code>SharedArrayBuffer</code> + <code>Atomics</code>; otherwise message-pass (structured clone, or zero-copy transfer of an <code>ArrayBuffer</code>). Lowest overhead for CPU work.</p>
          <div class='tag-row'><span class='tag use'>use for CPU-bound work (hashing, parsing, image resize)</span><span class='tag avoid'>avoid for scaling I/O-bound servers</span></div>
        </div>

        <div class='pattern-card'>
          <h4>cluster 🍴</h4>
          <p>Forks multiple <em>whole Node processes</em> sharing one listening socket; the OS (or Node's round-robin, the default on non-Windows) load-balances connections. Classic way to use all cores for an HTTP server.</p>
          <div class='tag-row'><span class='tag use'>use to scale a stateless HTTP server across cores</span><span class='tag avoid'>avoid when you need shared in-memory state</span></div>
        </div>

        <div class='pattern-card'>
          <h4>child_process 🚀</h4>
          <p>Spawn <em>any</em> external program (<code>spawn</code>, <code>exec</code>, <code>execFile</code>, <code>fork</code>). <code>fork</code> is a specialized version for spawning Node scripts with a built-in IPC channel.</p>
          <div class='tag-row'><span class='tag use'>use to run external binaries or isolate crashy work</span><span class='tag avoid'>avoid for tight, high-frequency data sharing</span></div>
        </div>

        <table>
          <tr><th></th><th>worker_threads</th><th>cluster</th><th>child_process</th></tr>
          <tr><td>Unit</td><td>Thread</td><td>Process</td><td>Process</td></tr>
          <tr><td>Memory</td><td>Can share (SAB + Atomics)</td><td>Isolated</td><td>Isolated</td></tr>
          <tr><td>Startup cost</td><td>Low (~ms)</td><td>Higher (new V8)</td><td>Higher</td></tr>
          <tr><td>Crash blast radius</td><td>Can take down the process</td><td>One worker only</td><td>One child only</td></tr>
          <tr><td>Best for</td><td>CPU work</td><td>Scaling I/O server</td><td>External programs</td></tr>
        </table>

        <div class='callout good'>
          <div class='c-title'>Rule of thumb</div>
          <strong>CPU-bound?</strong> worker_threads (ideally a pooled worker via <code>piscina</code>). <strong>Scaling an HTTP server across cores?</strong> cluster (or run N processes behind a load balancer / PM2). <strong>Need to run ffmpeg?</strong> child_process.
        </div>

        <div class='callout warn'>
          <div class='c-title'>Gotcha</div>
          worker_threads is <em>not</em> a magic "make my server faster" button. For I/O-bound work the event loop already gives you concurrency — spinning up threads just adds message-passing and serialization overhead. And spawning a fresh worker per task is expensive; pool them.
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "worker_threads for CPU-bound work in-process (pooled, share memory via SharedArrayBuffer), cluster to fork processes sharing a socket and scale I/O across cores, child_process to run external programs. I/O-bound? The loop already gives concurrency — no threads needed."
        </div>
      `,
    },
    {
      id: 'memory-gc',
      group: 'Under the Hood',
      nav: '12 · Memory & GC',
      title: 'Memory management & garbage collection',
      lede: 'V8 splits the heap into generations and bets that most objects die young. Understand it or drown in leaks.',
      html: `
        <p>V8's garbage collector is <span class='kicker'>generational</span>, built on a simple observation: <strong>most objects die young</strong> (the "generational hypothesis"). So it splits the heap and collects the young part often and cheaply.</p>

        <h3>The heap layout</h3>
        <ul>
          <li><span class='kicker'>New space (young generation)</span> — small (1–8 MB), collected frequently by the <strong>Scavenger</strong>, a fast copying (Cheney's) collector split into "from"/"to" semi-spaces. Survivors get promoted.</li>
          <li><span class='kicker'>Old space (old generation)</span> — larger, collected less often by <strong>Mark-Sweep-Compact</strong>. Where the big, occasionally-pausing GC happens.</li>
          <li>Plus specialized spaces: <strong>large-object space</strong> (objects &gt; ~600 KB skip new space), <strong>code space</strong>, <strong>map space</strong>.</li>
        </ul>

        <div class='diagram'>
          <svg viewBox='0 0 640 160' width='640'>
            <defs><marker id='arrow3' markerWidth='10' markerHeight='10' refX='8' refY='3' orient='auto'><path d='M0,0 L8,3 L0,6 Z' fill='#8b98a9'/></marker></defs>
            <rect class='node-box worker' x='40' y='50' width='200' height='60' rx='8'/>
            <text class='node-text' x='140' y='78' text-anchor='middle'>New space</text>
            <text class='node-sub' x='140' y='96' text-anchor='middle'>fast Scavenger, frequent</text>
            <line class='edge' x1='240' y1='80' x2='400' y2='80' marker-end='url(#arrow3)'/>
            <text class='edge-label' x='320' y='70' text-anchor='middle'>survives ~2 GCs → promoted</text>
            <rect class='node-box' x='400' y='50' width='200' height='60' rx='8'/>
            <text class='node-text' x='500' y='78' text-anchor='middle'>Old space</text>
            <text class='node-sub' x='500' y='96' text-anchor='middle'>Mark-Sweep-Compact, rare</text>
          </svg>
          <div class='diagram-caption'>Objects are born in New space; long-lived survivors get promoted to Old space.</div>
        </div>

        <h3>Modern GC is mostly concurrent</h3>
        <p>V8's <strong>Orinoco</strong> project moved most marking onto background threads (concurrent + incremental marking) and parallelized scavenging, keeping pauses tiny. But a full old-space compaction can still cause a <strong>stop-the-world pause</strong> — a latency spike you'll see in p99. GC also runs when the loop is idle (idle-time GC).</p>

        <h3>Finding leaks 🔍</h3>
        <ul>
          <li>Take two <strong>heap snapshots</strong> (Chrome DevTools via <code>--inspect</code>, or <code>--heapsnapshot-signal=SIGUSR2</code>) under load and diff them — growing retained objects are the suspects. Look at "Retained Size" and the retainer path.</li>
          <li>Watch <code>process.memoryUsage()</code> — a steadily-climbing <code>heapUsed</code> that never drops after GC is a leak (<code>rss</code> can be noisy; <code>external</code> tracks Buffers).</li>
          <li>Usual culprits: unbounded caches/Maps (use an LRU or <code>WeakMap</code>), forgotten event listeners (watch for "MaxListenersExceededWarning"), closures holding big objects, module-level arrays that only grow.</li>
        </ul>

        <div class='callout warn'>
          <div class='c-title'>Gotcha — the heap ceiling</div>
          The default old-space limit is around <strong>~2–4 GB on 64-bit</strong> (historically ~1.5 GB). Blow past it and Node crashes with "JavaScript heap out of memory." Raise with <code>--max-old-space-size=4096</code> — but a leak will just take longer to crash. In containers, also set memory limits so V8 sizes the heap sanely (Node reads <code>--max-old-space-size</code>, not always the cgroup automatically).
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "V8's GC is generational: cheap frequent scavenges of new space, rarer mark-sweep-compact of old space, mostly concurrent (Orinoco) to keep pauses small. I hunt leaks by diffing heap snapshots and watching heapUsed climb without recovering — usual culprits are unbounded caches and stray listeners."
        </div>
      `,
    },
    {
      id: 'async-context',
      group: 'Under the Hood',
      nav: '13 · Async context',
      title: 'AsyncLocalStorage & async_hooks',
      lede: 'How do you attach a request ID to every log line across dozens of awaits, without threading it through every function? Node has a purpose-built tool.',
      html: `
        <p>In a threaded language you'd use thread-local storage. Node is single-threaded but interleaves thousands of async operations, so "which request am I in right now?" is genuinely hard. The answer is <span class='kicker'>AsyncLocalStorage</span> — continuation-local storage that survives across <code>await</code>, callbacks, timers, and promises. 🧵</p>

        <h3>The underlying machinery: async_hooks</h3>
        <p><code>async_hooks</code> lets you observe the lifecycle of every async resource (<code>init</code>, <code>before</code>, <code>after</code>, <code>destroy</code>) and tracks the <strong>async execution context</strong> — a parent/child chain of async operations. It's low-level and has real overhead, so you rarely use it directly. <code>AsyncLocalStorage</code> is the ergonomic, optimized wrapper built on top.</p>

        <pre><code>const { AsyncLocalStorage } = require('node:async_hooks');
const als = new AsyncLocalStorage();

app.use((req, res, next) =&gt; {
  als.run({ requestId: crypto.randomUUID() }, () =&gt; next());
});

// Anywhere deep in the call stack, across awaits:
function log(msg) {
  const store = als.getStore();
  console.log(store?.requestId, msg);   // correct request id, no plumbing
}</code></pre>

        <div class='callout good'>
          <div class='c-title'>Where it shines</div>
          Request-scoped logging / tracing (this is how OpenTelemetry, pino, and APM agents propagate context), per-request DB transactions, and feature-flag context — all without polluting every function signature with a <code>ctx</code> argument.
        </div>

        <div class='callout warn'>
          <div class='c-title'>Gotcha — context can be lost</div>
          Context propagates through native async resources, but code that <strong>queues callbacks manually</strong> outside Node's tracking (some connection pools, custom event emitters holding callbacks, older libraries) can break the chain — <code>getStore()</code> returns <code>undefined</code>. Also, historically async_hooks added measurable overhead; modern <code>AsyncLocalStorage</code> is much cheaper but still not free on ultra-hot paths.
        </div>

        <div class='callout danger'>
          <div class='c-title'>War story</div>
          Trace IDs randomly went missing in logs. Cause: a caching library resolved queued callbacks from an internal array that bypassed the async context. Wrapping the emit in <code>als.run</code> (or using <code>AsyncResource.bind</code>) restored propagation.
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "AsyncLocalStorage is continuation-local storage — it carries a per-request store across awaits and callbacks without threading a ctx argument everywhere. It's built on async_hooks' execution-context tracking and powers request-scoped logging and distributed tracing. Watch for libraries that break the context chain."
        </div>
      `,
    },
    {
      id: 'profiling',
      group: 'Under the Hood',
      nav: '14 · Profiling',
      title: 'Performance & profiling',
      lede: 'You cannot optimize what you cannot measure. Meet flame graphs, --prof, and the clinic suite.',
      html: `
        <p>Rule zero of performance: <strong>profile first, guess never</strong>. 🔥 The bottleneck is almost never where you think. Node ships real tooling for this.</p>

        <h3>The toolbox</h3>
        <table>
          <tr><th>Tool</th><th>What it tells you</th></tr>
          <tr><td><code>node --prof</code></td><td>V8 tick sampler → raw log; process with <code>--prof-process</code> to see where CPU time went.</td></tr>
          <tr><td><code>--cpu-prof</code></td><td>Emits a <code>.cpuprofile</code> you can load straight into Chrome DevTools.</td></tr>
          <tr><td><code>--heap-prof</code></td><td>Sampling heap profiler → allocation hot spots.</td></tr>
          <tr><td><strong>clinic doctor</strong></td><td>High-level diagnosis: is it CPU, event-loop delay, GC, or I/O?</td></tr>
          <tr><td><strong>clinic flame</strong> / <strong>0x</strong></td><td>Flame graph of on-CPU time.</td></tr>
          <tr><td><strong>clinic bubbleprof</strong></td><td>Async operation flow — great for I/O-bound puzzles.</td></tr>
          <tr><td><code>--inspect</code></td><td>Attach Chrome DevTools for live profiling, heap snapshots, debugging.</td></tr>
          <tr><td><code>perf_hooks</code></td><td>In-process marks/measures + event-loop delay histogram (<code>monitorEventLoopDelay</code>).</td></tr>
        </table>

        <h3>Reading a flame graph</h3>
        <p>Each box is a function; <strong>width = time spent</strong> (self + children); the y-axis is the call stack. Look for <em>wide plateaus</em> — a function eating a big horizontal slice is your hot path. Height doesn't matter; width does. A tall-but-thin stack is fine; a short-but-wide box is your target.</p>

        <div class='diagram'>
          <svg viewBox='0 0 640 150' width='640'>
            <rect class='node-box' x='20' y='16' width='600' height='28' rx='4'/>
            <text class='node-text' x='320' y='35' text-anchor='middle'>main() — 100%</text>
            <rect class='node-box tool' x='20' y='52' width='360' height='28' rx='4'/>
            <text class='node-text' x='200' y='71' text-anchor='middle'>handleRequest() — 60%</text>
            <rect class='node-box' x='390' y='52' width='230' height='28' rx='4'/>
            <text class='node-text' x='505' y='71' text-anchor='middle'>logging() — 38%</text>
            <rect class='node-box worker' x='20' y='88' width='300' height='28' rx='4'/>
            <text class='node-text' x='170' y='107' text-anchor='middle'>JSON.parse() — 50% ← hot!</text>
          </svg>
          <div class='diagram-caption'>The widest box near the bottom (JSON.parse) is where the CPU actually lives — optimize that.</div>
        </div>

        <h3>Common bottlenecks</h3>
        <ul>
          <li>Synchronous JSON on big payloads → stream, or use a faster serializer (<code>fast-json-stringify</code>, <code>JSON.parse</code> with reviver avoided).</li>
          <li>Chatty logging in the hot path → sample, or make it async (pino's transport).</li>
          <li>Accidental N+1 awaits in a loop → batch with <code>Promise.all</code>.</li>
          <li>Megamorphic call sites / GC thrash from short-lived objects → keep shapes stable, reuse buffers.</li>
        </ul>

        <div class='callout good'>
          <div class='c-title'>Rule of thumb</div>
          Start with <strong>clinic doctor</strong> to classify the problem (CPU vs loop-delay vs GC vs I/O), <em>then</em> reach for the matching deep-dive tool. Don't flame-graph a problem that's actually GC pressure or event-loop delay.
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "I profile before optimizing. clinic doctor classifies the bottleneck, a flame graph (--cpu-prof or 0x) shows the hot path — the widest box wins — heap snapshots catch leaks, and perf_hooks tracks event-loop delay in prod. I never guess."
        </div>
      `,
    },
    {
      id: 'modules-startup',
      group: 'Under the Hood',
      nav: '15 · Modules',
      title: 'Module systems & startup: CJS vs ESM',
      lede: 'Two module systems, one runtime, endless confusion. The core difference is synchronous vs asynchronous resolution.',
      html: `
        <p>Node supports two module systems, and the interview gold is understanding <em>why</em> they behave differently — it comes down to <strong>synchronous vs asynchronous</strong> loading.</p>

        <div class='two-col'>
          <div>
            <h4>CommonJS (CJS)</h4>
            <ul>
              <li><code>require()</code> / <code>module.exports</code>.</li>
              <li><strong>Synchronous</strong> — <code>require</code> blocks, reads, and evaluates on the spot.</li>
              <li>Exports are a <em>value</em> (a snapshot of the object).</li>
              <li><code>require</code> is dynamic — can live inside an <code>if</code>.</li>
              <li>Has <code>__dirname</code>, <code>__filename</code>, wrapped in a function.</li>
            </ul>
          </div>
          <div>
            <h4>ES Modules (ESM)</h4>
            <ul>
              <li><code>import</code> / <code>export</code>.</li>
              <li><strong>Asynchronous</strong> — parsed, resolved into a graph, then evaluated.</li>
              <li>Exports are <em>live bindings</em> (a reference that updates).</li>
              <li>Top-level <code>await</code> is allowed.</li>
              <li>Strict mode always; use <code>import.meta.url</code> instead of <code>__dirname</code>.</li>
            </ul>
          </div>
        </div>

        <h3>How Node picks</h3>
        <p><code>.mjs</code> → ESM. <code>.cjs</code> → CJS. <code>.js</code> → decided by the nearest <code>package.json</code> <code>"type"</code> field (<code>"module"</code> = ESM, absent/<code>"commonjs"</code> = CJS). Packages expose entry points via the <code>"exports"</code> map, which can advertise separate CJS and ESM builds (conditional exports) — the "dual package" pattern.</p>

        <h3>The interop rule</h3>
        <p>ESM can <code>import</code> CJS (Node synthesizes a default export + best-effort named exports). CJS historically <strong>could not</strong> <code>require()</code> a native ESM module — because ESM may be async — so you needed dynamic <code>import()</code>. Node 22+ ships <span class='kicker'>require(esm)</span>: synchronous ESM graphs (no top-level await) can now be <code>require</code>d, easing the pain.</p>

        <h3>The three phases of ESM loading</h3>
        <ol>
          <li><strong>Construction</strong> — resolve every specifier, fetch, parse to module records (finds all imports without running code).</li>
          <li><strong>Instantiation</strong> — link the graph: allocate exports, wire live bindings.</li>
          <li><strong>Evaluation</strong> — run module bodies bottom-up.</li>
        </ol>

        <h3>Startup, briefly</h3>
        <p>Node bootstraps V8 and libuv, loads internal C++/JS core modules (many baked into a <strong>V8 startup snapshot</strong> for speed), runs your entry file, then enters the event loop. Deferring heavy <code>require</code>s (lazy loading) and building a custom user snapshot shave real milliseconds off cold starts — meaningful for serverless. ⚡</p>

        <div class='callout warn'>
          <div class='c-title'>Gotcha — circular dependencies</div>
          CJS gives you a <em>partial, unfinished</em> exports object if you <code>require</code> mid-cycle (whatever was assigned so far). ESM's live bindings resolve more gracefully once evaluation completes, but a value read during the cycle can still be in the "temporal dead zone." Both bite — avoid the cycle.
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "CJS is synchronous require with value exports; ESM is asynchronous import with live bindings and top-level await, loaded in construct → instantiate → evaluate phases. File extension and package.json 'type' decide which. ESM can import CJS; the reverse historically needed dynamic import() but Node 22+ allows require(esm) for sync graphs."
        </div>
      `,
    },
    {
      id: 'cheat-sheet',
      group: 'Recap',
      nav: '16 · Cheat-sheet',
      title: 'Gotchas + rapid-fire interview Q&A',
      lede: 'Everything crammed into a single-screen recap. Read it on the way to the interview, sound like you built Node yourself.',
      html: `
        <p>You made it. 🎉 Here's the whole course compressed into repeatable one-liners and the traps that catch people out.</p>

        <h3>Rapid-fire Q&A</h3>
        <table>
          <tr><th>Question</th><th>Crisp answer</th></tr>
          <tr><td>Is Node single-threaded?</td><td>Your JS is; libuv has a thread pool and the OS does async I/O. The runtime isn't.</td></tr>
          <tr><td>Event loop phases?</td><td>timers → pending → poll → check → close (+ internal idle/prepare).</td></tr>
          <tr><td>Where does the loop sleep?</td><td>The poll phase — epoll_wait until the next timer or an event.</td></tr>
          <tr><td>nextTick vs Promise vs setTimeout?</td><td>nextTick first, then Promise microtasks, then macrotasks (timers/immediate).</td></tr>
          <tr><td>setImmediate vs setTimeout(0)?</td><td>Inside I/O, setImmediate (check) always beats setTimeout (next timers).</td></tr>
          <tr><td>How does network I/O scale?</td><td>Kernel async (epoll/kqueue/IOCP) — one thread watches thousands of sockets.</td></tr>
          <tr><td>What uses the thread pool?</td><td>fs, dns.lookup, crypto, zlib. Default 4 threads (UV_THREADPOOL_SIZE, max 1024).</td></tr>
          <tr><td>CPU-bound work?</td><td>worker_threads (pooled). Never block the loop with *Sync in a request path.</td></tr>
          <tr><td>Scale across cores?</td><td>cluster / multiple processes behind a balancer.</td></tr>
          <tr><td>Backpressure?</td><td>write() returns false past highWaterMark; wait for 'drain'. Use pipeline().</td></tr>
          <tr><td>Buffer.alloc vs allocUnsafe?</td><td>alloc is zero-filled; allocUnsafe is faster but uninitialized (can leak data).</td></tr>
          <tr><td>How is the heap organized?</td><td>Generational: new space (Scavenger) + old space (Mark-Sweep-Compact).</td></tr>
          <tr><td>Why did my hot loop slow down?</td><td>Shape change → megamorphic IC or a TurboFan deopt back to the interpreter.</td></tr>
          <tr><td>Per-request context across awaits?</td><td>AsyncLocalStorage (built on async_hooks).</td></tr>
          <tr><td>uncaughtException — resume?</td><td>No. Log, cleanup, exit; let a supervisor restart clean.</td></tr>
          <tr><td>CJS vs ESM?</td><td>Sync require + value exports vs async import + live bindings + top-level await.</td></tr>
        </table>

        <h3>Top gotchas to name-drop</h3>
        <ul>
          <li><strong>Recursive process.nextTick</strong> starves the event loop → I/O never runs.</li>
          <li><strong>4-thread pool</strong> secretly serializes concurrent fs/crypto/dns.lookup work.</li>
          <li><strong>*Sync APIs</strong> in request handlers block every user at once.</li>
          <li><strong>ReDoS</strong> — a catastrophic regex pegs a CPU and hangs the server.</li>
          <li><strong>allocUnsafe</strong> can hand you other people's leftover memory.</li>
          <li><strong>Ignoring backpressure</strong> (.on('data') + .write()) OOMs on big files.</li>
          <li><strong>Unbounded caches / stray listeners</strong> are the #1 memory-leak source.</li>
          <li><strong>Shape/type churn</strong> triggers deopts and megamorphic call sites.</li>
          <li><strong>keepAliveTimeout below the load balancer's</strong> idle timeout → random 502s.</li>
          <li><strong>uncaughtException as a resume button</strong> → zombie process serving corrupt state.</li>
        </ul>

        <div class='callout good'>
          <div class='c-title'>The one-breath summary</div>
          "Node runs my single-threaded JS on V8, hands async work to libuv — network via the OS event system, files/crypto via a 4-thread pool — and cycles an event loop through timers/poll/check phases, draining nextTick then Promise microtasks between each. I keep the loop unblocked, respect backpressure, offload CPU work to workers, keep object shapes stable for V8, and crash-and-restart on fatal errors."
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "The mental model is: one JS thread, a C++ runtime that isn't. Everything else — phases, queues, the thread pool, GC generations, hidden classes — is just detail hanging off that one idea."
        </div>
      `,
    },
  ],
  quizzes: [
    {
      question: 'Inside an I/O callback, you schedule both setImmediate(cb1) and setTimeout(cb2, 0). Which runs first?',
      options: [
        { text: 'setTimeout(cb2, 0), because a 0ms timer is already due', correct: false },
        { text: 'setImmediate(cb1), because check runs right after the poll phase', correct: true },
        { text: 'Order is undefined and effectively random', correct: false },
      ],
      explain: 'When scheduled from within an I/O callback, the loop is already in poll and heads to the check phase next, so setImmediate reliably fires before the next timers phase.',
    },
    {
      question: 'What is the correct draining order after a macrotask callback completes?',
      options: [
        { text: 'Promise microtasks, then process.nextTick, then the next macrotask', correct: false },
        { text: 'process.nextTick queue (fully), then Promise microtask queue (fully), then the next macrotask', correct: true },
        { text: 'One nextTick and one Promise callback interleaved, then the next macrotask', correct: false },
      ],
      explain: 'Node fully drains the nextTick queue first, then fully drains the Promise microtask queue, before moving on to the next macrotask.',
    },
    {
      question: 'A server holding 10,000 idle TCP connections uses how many libuv thread-pool threads to watch those sockets?',
      options: [
        { text: 'One pool thread per connection (10,000 threads)', correct: false },
        { text: 'Zero — network I/O uses the OS event system (epoll/kqueue/IOCP), not the pool', correct: true },
        { text: 'Exactly 4, the default pool size', correct: false },
      ],
      explain: 'Network sockets are watched by the kernel event-notification system, so one thread monitors thousands of sockets. The thread pool serves fs, dns.lookup, crypto and zlib.',
    },
    {
      question: 'Why can a recursive process.nextTick() hang a server that still accepts connections?',
      options: [
        { text: 'It throws a stack-overflow that crashes the process silently', correct: false },
        { text: 'Node fully drains the nextTick queue before any I/O, so an ever-refilling queue starves the loop', correct: true },
        { text: 'It blocks the libuv thread pool until all 4 threads are exhausted', correct: false },
      ],
      explain: 'The entire nextTick queue is drained before the loop proceeds to I/O, so a queue that keeps refilling means I/O callbacks never get a chance to run.',
    },
    {
      question: 'Your hot request-handling loop was fast, then slowed after you added an optional field only in the error path. What most likely happened in V8?',
      options: [
        { text: 'The garbage collector switched from Scavenger to Mark-Sweep', correct: false },
        { text: 'The extra object shape made the call site polymorphic/megamorphic (or triggered a deopt), losing the optimized path', correct: true },
        { text: 'The thread pool ran out of threads', correct: false },
      ],
      explain: 'Objects built with a different shape get a different hidden class. A call site seeing multiple shapes degrades its inline cache and can trigger a TurboFan deoptimization back to the interpreter.',
    },
    {
      question: 'What does write() returning false on a Writable stream signal?',
      options: [
        { text: 'The write failed and the data was dropped', correct: false },
        { text: 'The internal buffer passed highWaterMark — stop writing until the drain event', correct: true },
        { text: 'The stream has ended and can no longer accept data', correct: false },
      ],
      explain: 'A false return means the buffer is over its highWaterMark (backpressure). Pause writing until drain fires — or use pipeline(), which handles it for you.',
    },
    {
      question: 'How should you treat a process.on("uncaughtException") handler?',
      options: [
        { text: 'As a recovery point — log the error and keep serving requests', correct: false },
        { text: 'As a last-resort log-and-exit: the process is in an undefined state, so cleanup then exit and let a supervisor restart', correct: true },
        { text: 'As a way to retry the failed operation automatically', correct: false },
      ],
      explain: 'After an uncaught exception the app state is undefined (leaked locks, partial writes). Best practice is to log, run synchronous cleanup, exit non-zero, and let PM2/systemd/k8s restart a clean process.',
    },
    {
      question: 'Which tool should you reach for FIRST to classify whether a slow Node app is CPU-bound, GC-bound, or event-loop-delayed?',
      options: [
        { text: 'A flame graph, because it always shows the root cause', correct: false },
        { text: 'clinic doctor, which diagnoses the category before you deep-dive', correct: true },
        { text: 'Reading the source and guessing the hot path', correct: false },
      ],
      explain: 'clinic doctor classifies the type of problem (CPU, event-loop delay, GC, or I/O) first; then you pick the matching deep-dive tool like a flame graph or heap snapshot.',
    },
    {
      question: 'You need a per-request trace ID available in log calls deep inside many awaited functions, without passing a ctx argument. What is the idiomatic Node tool?',
      options: [
        { text: 'A module-level global variable set at the start of each request', correct: false },
        { text: 'AsyncLocalStorage, which carries a store across awaits and callbacks via async-context tracking', correct: true },
        { text: 'A WeakMap keyed by the current stack frame', correct: false },
      ],
      explain: 'AsyncLocalStorage provides continuation-local storage on top of async_hooks, preserving a per-request store across awaits, timers, and callbacks — the basis of request-scoped logging and distributed tracing.',
    },
    {
      question: 'What is the key semantic difference between CommonJS and ES Module exports?',
      options: [
        { text: 'CJS exports live bindings; ESM exports static value snapshots', correct: false },
        { text: 'CJS exports a value snapshot synchronously; ESM exports live bindings resolved asynchronously', correct: true },
        { text: 'They are identical; only the file extension differs', correct: false },
      ],
      explain: 'require() is synchronous and returns a value snapshot of module.exports, while ESM resolves a module graph asynchronously and exposes live bindings that reflect later updates.',
    },
  ],
};
