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
        <p>Picture Node.js as a small factory. 🏭 You wrote the instructions (JavaScript), but the actual heavy machinery is C++. When your code says <code>fs.readFile</code>, JavaScript doesn't read the file — it hands a note to the C++ workers, who do the dirty work and come back later.</p>

        <h3>The three main characters</h3>
        <ul>
          <li><span class='kicker'>V8</span> — Google's JavaScript engine (also in Chrome). It parses, optimizes (JIT via TurboFan), and executes your JS. It also owns the <strong>heap</strong> where your objects live.</li>
          <li><span class='kicker'>libuv</span> — a C library that provides the <strong>event loop</strong>, the <strong>thread pool</strong>, and cross-platform async I/O (epoll on Linux, kqueue on macOS, IOCP on Windows).</li>
          <li><span class='kicker'>C++ bindings</span> — the glue. Node core modules (<code>fs</code>, <code>net</code>, <code>crypto</code>) are thin JS wrappers over C++ that call into libuv or OS APIs.</li>
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
        <p>Every time you cross from JS into C++ (and back), there's a marshalling cost — arguments get converted between V8 values and C++ types. Usually tiny, but in hot loops calling native code millions of times, it adds up. This boundary is also <em>where the magic happens</em>: it's how a single-threaded language pulls off thousands of concurrent connections.</p>

        <div class='callout warn'>
          <div class='c-title'>Gotcha</div>
          "Node is single-threaded" is a half-truth. <strong>Your JavaScript</strong> runs on one thread. But libuv keeps a pool of background threads (default 4) plus the OS handles a lot of I/O asynchronously. So Node is "single-threaded JS on top of a very multi-threaded C++ runtime."
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "Node.js = V8 to run my JavaScript, libuv for the event loop and async I/O, and a C++ bindings layer stitching them together. My JS is single-threaded; the runtime underneath is not."
        </div>
      `,
    },
    {
      id: 'event-loop',
      group: 'The Machine',
      nav: '2 · Event loop',
      title: 'The event loop and its six phases',
      lede: 'The heartbeat of Node. It is a while-loop in C, cycling through phases, each with its own queue of callbacks to drain.',
      html: `
        <p>The event loop is libuv's beating heart. ❤️ It's literally a loop that says: "Any timers due? Any I/O finished? Any <code>setImmediate</code> callbacks? Repeat." Each spin is a <span class='kicker'>tick</span>, and each tick walks through ordered <strong>phases</strong>.</p>

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
          <div class='diagram-caption'>One tick flows timers → pending → poll → check → close, then loops back. (Internal idle/prepare phase omitted.)</div>
        </div>

        <table>
          <tr><th>Phase</th><th>What runs here</th></tr>
          <tr><td><strong>timers</strong></td><td>Callbacks from <code>setTimeout</code> / <code>setInterval</code> whose threshold elapsed.</td></tr>
          <tr><td><strong>pending callbacks</strong></td><td>Some deferred system callbacks (e.g. certain TCP errors).</td></tr>
          <tr><td><strong>idle, prepare</strong></td><td>Internal libuv bookkeeping. You never see it.</td></tr>
          <tr><td><strong>poll</strong></td><td>The big one. Retrieves new I/O events; executes I/O callbacks; may <em>block here</em> waiting for events.</td></tr>
          <tr><td><strong>check</strong></td><td><code>setImmediate</code> callbacks fire here.</td></tr>
          <tr><td><strong>close</strong></td><td>Close callbacks like <code>socket.on('close', ...)</code>.</td></tr>
        </table>

        <h4>The poll phase is the interesting one</h4>
        <p>When Node reaches <strong>poll</strong> and there's nothing scheduled, it will <em>block and wait</em> for I/O — this is where "idle" Node servers sleep efficiently instead of busy-looping. If a <code>setImmediate</code> is queued, it won't wait; it moves to <strong>check</strong>.</p>

        <div class='callout good'>
          <div class='c-title'>Rule of thumb</div>
          <code>setImmediate</code> = "run after the current poll phase" (check phase). <code>setTimeout(fn, 0)</code> = "run in the next timers phase." Inside an I/O callback, <code>setImmediate</code> <strong>always</strong> fires before a <code>setTimeout(0)</code>.
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "The event loop cycles through ordered phases — timers, pending, poll, check, close. Poll is where I/O callbacks run and where the loop parks itself waiting for events. setImmediate fires in check, right after poll."
        </div>
      `,
    },
    {
      id: 'micro-macro',
      group: 'The Machine',
      nav: '3 · Micro vs macro',
      title: 'Microtasks vs macrotasks: nextTick & Promises',
      lede: 'Between every phase, Node drains two special queues. Getting their order right is the classic senior interview trap.',
      html: `
        <p>Here's the twist most people miss: <strong>microtasks are not a phase</strong>. Node drains them <em>between</em> operations — after each macrotask callback and between event-loop phases. There are two microtask queues, and one jumps the line.</p>

        <h3>The pecking order</h3>
        <ol>
          <li><span class='kicker'>process.nextTick queue</span> — highest priority. Drained completely before anything else.</li>
          <li><span class='kicker'>Promise microtask queue</span> — <code>.then</code>, <code>await</code> continuations, <code>queueMicrotask</code>. Drained after nextTick.</li>
          <li><span class='kicker'>Macrotasks</span> — timers, I/O, <code>setImmediate</code>. One per phase-visit, then microtasks drain again.</li>
        </ol>

        <p>The mental model: after every single macrotask callback, Node empties <strong>all</strong> of nextTick, then <strong>all</strong> of the Promise queue, before touching the next macrotask.</p>

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

        <div class='two-col'>
          <div>
            <h4>Use process.nextTick when</h4>
            <ul>
              <li>You must run <em>before</em> any I/O or timer.</li>
              <li>Emitting an event on the same tick after construction.</li>
              <li>Cleaning up before continuing.</li>
            </ul>
          </div>
          <div>
            <h4>Use queueMicrotask/Promise when</h4>
            <ul>
              <li>Normal async continuation work.</li>
              <li>You want to defer but not starve I/O.</li>
              <li>Standard, cross-platform microtask behavior.</li>
            </ul>
          </div>
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "nextTick beats Promises, Promises beat timers. After every macrotask, Node fully drains nextTick then the Promise microtask queue before the next macrotask. Recursive nextTick can starve the loop."
        </div>
      `,
    },
    {
      id: 'async-io',
      group: 'Concurrency',
      nav: '4 · Async I/O',
      title: 'How async I/O actually works',
      lede: 'The trillion-dollar question: if JS is single-threaded, how does Node handle 10,000 sockets at once? Two different tricks.',
      html: `
        <p>Node's async magic comes from <strong>two totally different mechanisms</strong>, and confusing them is a common interview stumble.</p>

        <h3>Trick 1: OS-level async (the good stuff) 🌐</h3>
        <p>Network I/O — TCP, HTTP, UDP — is <strong>truly non-blocking at the kernel level</strong>. libuv registers your socket with the OS event-notification system (<code>epoll</code> on Linux, <code>kqueue</code> on macOS, <code>IOCP</code> on Windows). The OS says "I'll tap you when data arrives." No threads needed — one thread watches thousands of sockets. This is how Node scales connections so cheaply.</p>

        <h3>Trick 2: The thread pool (the fallback) 🧵</h3>
        <p>Some operations have <strong>no async OS API</strong>, or the OS one is unreliable. For those, libuv uses a <span class='kicker'>thread pool</span> (default 4 threads, <code>UV_THREADPOOL_SIZE</code>, max 1024). The work runs on a background thread; when done, the callback is queued back on the event loop.</p>

        <table>
          <tr><th>Operation</th><th>Mechanism</th></tr>
          <tr><td>TCP/HTTP/UDP sockets</td><td>OS async (epoll/kqueue/IOCP) — no thread pool</td></tr>
          <tr><td>File system (<code>fs</code>)</td><td>Thread pool</td></tr>
          <tr><td><code>dns.lookup</code></td><td>Thread pool (uses getaddrinfo)</td></tr>
          <tr><td><code>crypto.pbkdf2</code>, <code>zlib</code></td><td>Thread pool</td></tr>
          <tr><td><code>dns.resolve</code></td><td>OS async (c-ares)</td></tr>
        </table>

        <div class='callout warn'>
          <div class='c-title'>Gotcha</div>
          The thread pool has only <strong>4 threads by default</strong>. Fire 5 concurrent <code>fs</code> or <code>crypto.pbkdf2</code> calls and the 5th <em>waits in line</em>. A CPU-heavy crypto workload can secretly serialize your file reads. Bump <code>UV_THREADPOOL_SIZE</code> if you're pool-bound.
        </div>

        <div class='callout good'>
          <div class='c-title'>Mnemonic</div>
          "Sockets fly solo; files hire a crew." Network = kernel async, no threads. Filesystem/crypto/zlib = the 4-thread pool.
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "Network I/O is truly non-blocking via the OS event system — one thread, thousands of sockets. Filesystem, DNS lookup, crypto and zlib use libuv's thread pool, which defaults to only 4 threads."
        </div>
      `,
    },
    {
      id: 'blocking',
      group: 'Concurrency',
      nav: '5 · Blocking',
      title: 'Blocking the event loop (and how to not)',
      lede: 'The cardinal sin of Node. One slow synchronous function freezes your entire server for every user at once.',
      html: `
        <p>Because your JS runs on one thread, a long synchronous computation means <strong>nothing else happens</strong> — no new connections handled, no callbacks fired, no timers, nothing. The event loop can't spin until your function returns. 🥶</p>

        <h3>Classic event-loop blockers</h3>
        <ul>
          <li>Big <code>JSON.parse</code> / <code>JSON.stringify</code> on multi-MB payloads.</li>
          <li>Synchronous crypto (<code>crypto.pbkdf2Sync</code>, bcrypt with high rounds).</li>
          <li><code>fs.readFileSync</code> in a request handler.</li>
          <li>Giant loops, regex catastrophic backtracking (ReDoS), heavy templating.</li>
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
          <li><code>perf_hooks.monitorEventLoopDelay()</code> — a histogram of loop lag. Rising p99 = trouble.</li>
          <li><code>--prof</code> or <strong>clinic doctor</strong> flags "event loop blocked for Nms."</li>
          <li>The dumb-but-effective canary: a <code>setInterval</code> that logs drift.</li>
        </ul>

        <h3>How to avoid it</h3>
        <div class='two-col'>
          <div>
            <h4>Move the work</h4>
            <ul>
              <li>Offload CPU work to <code>worker_threads</code>.</li>
              <li>Use async/pool-backed APIs, never the <code>*Sync</code> variants in hot paths.</li>
              <li>Push to a separate service or queue.</li>
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
          <div class='c-title'>War story</div>
          A single unvalidated regex (<code>/(a+)+$/</code>) against attacker input pegged one CPU at 100% and hung the whole server — a ReDoS. Every other user got a timeout. One bad line, total outage.
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "There's one thread for my JS, so any synchronous CPU work blocks every request. I monitor event-loop delay with perf_hooks, avoid *Sync APIs in request paths, and offload CPU-bound work to worker_threads."
        </div>
      `,
    },
    {
      id: 'streams',
      group: 'Data',
      nav: '6 · Streams',
      title: 'Streams & backpressure',
      lede: 'Streams let you process gigabytes with megabytes of RAM. Backpressure is the polite "slow down, I am full" signal.',
      html: `
        <p>A stream processes data <strong>in chunks</strong> instead of loading everything into memory. Think of a garden hose 🚿 versus filling a swimming pool and then pouring it. Four flavors:</p>

        <ul>
          <li><span class='kicker'>Readable</span> — source of data (<code>fs.createReadStream</code>, HTTP request).</li>
          <li><span class='kicker'>Writable</span> — destination (<code>fs.createWriteStream</code>, HTTP response).</li>
          <li><span class='kicker'>Duplex</span> — both (a TCP socket).</li>
          <li><span class='kicker'>Transform</span> — duplex that mutates in transit (<code>zlib.createGzip</code>, a cipher).</li>
        </ul>

        <h3>Backpressure: the whole point</h3>
        <p>If a fast Readable pumps data into a slow Writable (say, reading a file faster than the network can send it), unbuffered data piles up in memory until you OOM. <strong>Backpressure</strong> is the mechanism that throttles the source when the destination is full.</p>

        <p>Each stream has a <span class='kicker'>highWaterMark</span> — a buffer threshold (default 16KB for byte streams, 16 objects for object mode). When <code>write()</code> returns <code>false</code>, the buffer is over the mark: <strong>stop writing</strong> until the <code>'drain'</code> event fires.</p>

        <pre><code>// ❌ Ignores backpressure — can blow up memory
readable.on('data', (chunk) =&gt; writable.write(chunk));

// ✅ pipe() (or pipeline) handles backpressure for you
readable.pipe(writable);

// ✅ Even better: pipeline() also propagates errors + cleans up
const { pipeline } = require('node:stream/promises');
await pipeline(readable, gzip, writable);</code></pre>

        <div class='callout good'>
          <div class='c-title'>Rule of thumb</div>
          Never manually <code>.on('data')</code> + <code>.write()</code> across a speed mismatch. Use <code>pipeline()</code> — it wires up backpressure, forwards errors, and destroys streams on failure so you don't leak file descriptors.
        </div>

        <div class='pattern-card'>
          <h4>pipeline() over pipe()</h4>
          <p><code>pipe()</code> handles backpressure but <em>not</em> error propagation — an error in the middle can leak the other streams. <code>pipeline()</code> fixes both.</p>
          <div class='tag-row'><span class='tag use'>use when chaining streams</span><span class='tag avoid'>avoid raw .on(data)+write across a speed gap</span></div>
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "Streams process data in chunks so I can handle huge files with tiny memory. Backpressure — driven by highWaterMark and write() returning false — throttles a fast source for a slow sink. I use pipeline() so errors and cleanup are handled too."
        </div>
      `,
    },
    {
      id: 'buffers',
      group: 'Data',
      nav: '7 · Buffers',
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
          <code>allocUnsafe</code> hands you a chunk of <strong>uninitialized memory</strong> — it may contain leftovers from previous data (passwords, keys, other users' bytes). Only use it if you immediately overwrite every byte. Historically this caused real data-leak CVEs. When in doubt, <code>alloc</code>.
        </div>

        <h3>Encodings matter</h3>
        <p>Bytes are meaningless without an encoding. <code>'utf8'</code>, <code>'hex'</code>, <code>'base64'</code>, <code>'latin1'</code> — the same bytes render differently. A classic bug: assuming one character equals one byte. In UTF-8, <code>'é'</code> is two bytes, so <code>buf.length</code> ≠ string <code>.length</code>, and slicing a multi-byte char in half corrupts it.</p>

        <table>
          <tr><th>Concept</th><th>Detail</th></tr>
          <tr><td>Location</td><td>Off-heap (C++), not counted in V8 heap size</td></tr>
          <tr><td>Size</td><td>Fixed at allocation — can't grow</td></tr>
          <tr><td>Base class</td><td><code>Uint8Array</code></td></tr>
          <tr><td>Pooling</td><td>Small buffers (&lt; 4KB) share a preallocated internal pool</td></tr>
        </table>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "Buffer is a fixed-length Uint8Array of raw bytes living off the V8 heap. Use Buffer.alloc for safe zero-filled memory; allocUnsafe is faster but returns uninitialized memory that can leak old data."
        </div>
      `,
    },
    {
      id: 'concurrency',
      group: 'Concurrency',
      nav: '8 · Parallelism',
      title: 'worker_threads vs cluster vs child_process',
      lede: 'Node has three ways to use more than one core. Picking the wrong one is a great way to look junior in an interview.',
      html: `
        <p>The single event loop uses <strong>one core</strong>. To use the other 15 cores on your machine, you need multiple V8 instances or OS processes. Three tools, three jobs.</p>

        <div class='pattern-card'>
          <h4>worker_threads 🧵</h4>
          <p>Multiple threads <em>inside one process</em>, each with its own V8 isolate and event loop. Share memory via <code>SharedArrayBuffer</code>; message-pass otherwise. Lowest overhead for CPU work.</p>
          <div class='tag-row'><span class='tag use'>use for CPU-bound work (hashing, parsing, image resize)</span><span class='tag avoid'>avoid for scaling I/O-bound servers</span></div>
        </div>

        <div class='pattern-card'>
          <h4>cluster 🍴</h4>
          <p>Forks multiple <em>whole Node processes</em> that share a listening socket, so the OS load-balances connections. Classic way to use all cores for an HTTP server.</p>
          <div class='tag-row'><span class='tag use'>use to scale a stateless HTTP server across cores</span><span class='tag avoid'>avoid when you need shared in-memory state</span></div>
        </div>

        <div class='pattern-card'>
          <h4>child_process 🚀</h4>
          <p>Spawn <em>any</em> external program (<code>spawn</code>, <code>exec</code>, <code>fork</code>). <code>fork</code> is a specialized version for spawning Node scripts with an IPC channel.</p>
          <div class='tag-row'><span class='tag use'>use to run external binaries or isolate crashy work</span><span class='tag avoid'>avoid for tight, high-frequency data sharing</span></div>
        </div>

        <table>
          <tr><th></th><th>worker_threads</th><th>cluster</th><th>child_process</th></tr>
          <tr><td>Unit</td><td>Thread</td><td>Process</td><td>Process</td></tr>
          <tr><td>Memory</td><td>Can share (SAB)</td><td>Isolated</td><td>Isolated</td></tr>
          <tr><td>Startup cost</td><td>Low</td><td>Higher</td><td>Higher</td></tr>
          <tr><td>Best for</td><td>CPU work</td><td>Scaling I/O server</td><td>External programs</td></tr>
        </table>

        <div class='callout good'>
          <div class='c-title'>Rule of thumb</div>
          <strong>CPU-bound?</strong> worker_threads. <strong>Scaling an HTTP server across cores?</strong> cluster (or just run N processes behind a load balancer / PM2). <strong>Need to run ffmpeg?</strong> child_process.
        </div>

        <div class='callout warn'>
          <div class='c-title'>Gotcha</div>
          worker_threads is <em>not</em> a magic "make my server faster" button. For I/O-bound work the event loop already handles concurrency beautifully — spinning up threads just adds message-passing overhead. Reach for it only when you're CPU-bound.
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "worker_threads for CPU-bound work in-process, cluster to fork processes sharing a socket and scale I/O across cores, child_process to run external programs. I/O-bound? The event loop already gives me concurrency — no threads needed."
        </div>
      `,
    },
    {
      id: 'memory-gc',
      group: 'Under the Hood',
      nav: '9 · Memory & GC',
      title: 'Memory management & garbage collection',
      lede: 'V8 splits the heap into generations and bets that most objects die young. Understand it or drown in leaks.',
      html: `
        <p>V8's garbage collector is <span class='kicker'>generational</span>, built on a simple observation: <strong>most objects die young</strong> (the "generational hypothesis"). So it splits the heap and collects the young part often and cheaply.</p>

        <h3>The heap layout</h3>
        <ul>
          <li><span class='kicker'>New space (young generation)</span> — small (a few MB), collected frequently by the <strong>Scavenger</strong> (a fast copying collector). Survivors get promoted.</li>
          <li><span class='kicker'>Old space (old generation)</span> — larger, collected less often by <strong>Mark-Sweep-Compact</strong>. This is where the big, occasionally-pausing GC happens.</li>
        </ul>

        <div class='diagram'>
          <svg viewBox='0 0 640 160' width='640'>
            <defs><marker id='arrow3' markerWidth='10' markerHeight='10' refX='8' refY='3' orient='auto'><path d='M0,0 L8,3 L0,6 Z' fill='#8b98a9'/></marker></defs>
            <rect class='node-box worker' x='40' y='50' width='200' height='60' rx='8'/>
            <text class='node-text' x='140' y='78' text-anchor='middle'>New space</text>
            <text class='node-sub' x='140' y='96' text-anchor='middle'>fast Scavenger, frequent</text>
            <line class='edge' x1='240' y1='80' x2='400' y2='80' marker-end='url(#arrow3)'/>
            <text class='edge-label' x='320' y='70' text-anchor='middle'>survives a few GCs → promoted</text>
            <rect class='node-box' x='400' y='50' width='200' height='60' rx='8'/>
            <text class='node-text' x='500' y='78' text-anchor='middle'>Old space</text>
            <text class='node-sub' x='500' y='96' text-anchor='middle'>Mark-Sweep-Compact, rare</text>
          </svg>
          <div class='diagram-caption'>Objects are born in New space; long-lived survivors get promoted to Old space.</div>
        </div>

        <h3>Modern GC is mostly concurrent</h3>
        <p>V8 does much of the marking on background threads (Orinoco/concurrent marking) to keep pauses tiny. But a full old-space GC can still cause a <strong>stop-the-world pause</strong> — a latency spike you'll see in p99.</p>

        <h3>Finding leaks 🔍</h3>
        <ul>
          <li>Take two <strong>heap snapshots</strong> (Chrome DevTools / <code>--heapsnapshot-signal</code>) under load and diff them — growing retained objects = suspects.</li>
          <li>Watch <code>process.memoryUsage()</code> — a steadily-climbing <code>heapUsed</code> that never comes down after GC is a leak.</li>
          <li>Usual culprits: unbounded caches/Maps, forgotten event listeners, closures holding big objects, module-level arrays that only grow.</li>
        </ul>

        <div class='callout warn'>
          <div class='c-title'>Gotcha</div>
          The default old-space limit is around <strong>~2GB on 64-bit</strong> (historically ~1.5GB). Blow past it and Node crashes with "JavaScript heap out of memory." Raise it with <code>--max-old-space-size=4096</code> — but a leak will just take longer to crash.
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "V8's GC is generational: cheap frequent scavenges of new space, rarer mark-sweep-compact of old space, mostly concurrent to keep pauses small. I hunt leaks by diffing heap snapshots and watching heapUsed climb without recovering."
        </div>
      `,
    },
    {
      id: 'profiling',
      group: 'Under the Hood',
      nav: '10 · Profiling',
      title: 'Performance & profiling',
      lede: 'You cannot optimize what you cannot measure. Meet flame graphs, --prof, and the clinic suite.',
      html: `
        <p>Rule zero of performance: <strong>profile first, guess never</strong>. 🔥 The bottleneck is almost never where you think. Node ships real tooling for this.</p>

        <h3>The toolbox</h3>
        <table>
          <tr><th>Tool</th><th>What it tells you</th></tr>
          <tr><td><code>node --prof</code></td><td>V8 tick sampler → raw log; process with <code>--prof-process</code> to see where CPU time went.</td></tr>
          <tr><td><code>--cpu-prof</code></td><td>Emits a <code>.cpuprofile</code> you can load straight into Chrome DevTools.</td></tr>
          <tr><td><strong>clinic doctor</strong></td><td>High-level diagnosis: is it CPU, event-loop delay, GC, or I/O?</td></tr>
          <tr><td><strong>clinic flame</strong></td><td>Flame graph of on-CPU time.</td></tr>
          <tr><td><strong>0x</strong></td><td>One-command flame graphs.</td></tr>
          <tr><td><code>--inspect</code></td><td>Attach Chrome DevTools for live profiling, heap snapshots, debugging.</td></tr>
        </table>

        <h3>Reading a flame graph</h3>
        <p>Each box is a function; <strong>width = time spent</strong> (self + children); the y-axis is the call stack. Look for <em>wide plateaus</em> — a function eating a big horizontal slice is your hot path. Height doesn't matter; width does.</p>

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
          <li>Synchronous JSON on big payloads → stream or use a faster parser.</li>
          <li>Chatty logging in the hot path → sample or make it async.</li>
          <li>Accidental N+1 awaits in a loop → batch with <code>Promise.all</code>.</li>
          <li>Creating huge objects that thrash GC → reuse buffers, avoid megamorphic shapes.</li>
        </ul>

        <div class='callout good'>
          <div class='c-title'>Rule of thumb</div>
          Start with <strong>clinic doctor</strong> to classify the problem (CPU vs loop-delay vs GC vs I/O), <em>then</em> reach for the matching deep-dive tool. Don't flame-graph a problem that's actually GC pressure.
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "I profile before optimizing. clinic doctor classifies the bottleneck, a flame graph (--cpu-prof or 0x) shows the hot path — the widest box wins — and heap snapshots catch leaks. I never guess."
        </div>
      `,
    },
    {
      id: 'modules-startup',
      group: 'Under the Hood',
      nav: '11 · Modules',
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
            </ul>
          </div>
          <div>
            <h4>ES Modules (ESM)</h4>
            <ul>
              <li><code>import</code> / <code>export</code>.</li>
              <li><strong>Asynchronous</strong> — parsed, then resolved in a graph, then evaluated.</li>
              <li>Exports are <em>live bindings</em> (a reference that updates).</li>
              <li>Top-level <code>await</code> is allowed.</li>
            </ul>
          </div>
        </div>

        <h3>How Node picks</h3>
        <p><code>.mjs</code> → ESM. <code>.cjs</code> → CJS. <code>.js</code> → decided by the nearest <code>package.json</code> <code>"type"</code> field (<code>"module"</code> = ESM, default/absent = CJS).</p>

        <h3>The interop rule</h3>
        <p>ESM can <code>import</code> CJS (Node synthesizes default + named exports). CJS <strong>cannot</strong> <code>require()</code> a native ESM module the old way — because ESM may be async — historically you needed dynamic <code>import()</code>. (Newer Node versions relax this with <code>require(esm)</code> for synchronous ESM graphs.)</p>

        <h3>Startup, briefly</h3>
        <p>Node bootstraps V8 and libuv, loads internal C++/JS core modules (many baked into the snapshot for speed), runs your entry file, then enters the event loop. Deferring heavy <code>require</code>s and using startup snapshots shaves real milliseconds off cold starts. ⚡</p>

        <div class='callout warn'>
          <div class='c-title'>Gotcha</div>
          Circular dependencies behave differently: CJS gives you a <em>partial, unfinished</em> exports object if you <code>require</code> mid-cycle, while ESM's live bindings often resolve more gracefully once evaluation completes. Both can still bite you — avoid the cycle.
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "CJS is synchronous require with value exports; ESM is asynchronous import with live bindings and top-level await. File extension and package.json 'type' decide which. ESM can import CJS; the reverse historically needed dynamic import()."
        </div>
      `,
    },
    {
      id: 'cheat-sheet',
      group: 'Recap',
      nav: '12 · Cheat-sheet',
      title: 'Gotchas + rapid-fire interview Q&A',
      lede: 'Everything crammed into a single-screen recap. Read it on the way to the interview, sound like you built Node yourself.',
      html: `
        <p>You made it. 🎉 Here's the whole course compressed into repeatable one-liners and the traps that catch people out.</p>

        <h3>Rapid-fire Q&A</h3>
        <table>
          <tr><th>Question</th><th>Crisp answer</th></tr>
          <tr><td>Is Node single-threaded?</td><td>Your JS is; libuv has a thread pool and the OS does async I/O. So no, the runtime isn't.</td></tr>
          <tr><td>Event loop phases?</td><td>timers → pending → poll → check → close (+ internal idle/prepare).</td></tr>
          <tr><td>nextTick vs Promise vs setTimeout?</td><td>nextTick first, then Promise microtasks, then macrotasks (timers/immediate).</td></tr>
          <tr><td>setImmediate vs setTimeout(0)?</td><td>Inside I/O, setImmediate (check) always beats setTimeout (next timers).</td></tr>
          <tr><td>How does network I/O scale?</td><td>Kernel async (epoll/kqueue/IOCP) — one thread watches thousands of sockets.</td></tr>
          <tr><td>What uses the thread pool?</td><td>fs, dns.lookup, crypto, zlib. Default 4 threads (UV_THREADPOOL_SIZE).</td></tr>
          <tr><td>CPU-bound work?</td><td>worker_threads. Never block the loop with *Sync in a request path.</td></tr>
          <tr><td>Scale across cores?</td><td>cluster / multiple processes behind a balancer.</td></tr>
          <tr><td>Backpressure?</td><td>write() returns false past highWaterMark; wait for 'drain'. Use pipeline().</td></tr>
          <tr><td>Buffer.alloc vs allocUnsafe?</td><td>alloc is zero-filled; allocUnsafe is faster but uninitialized (can leak data).</td></tr>
          <tr><td>How is the heap organized?</td><td>Generational: new space (Scavenger) + old space (Mark-Sweep-Compact).</td></tr>
          <tr><td>CJS vs ESM?</td><td>Sync require + value exports vs async import + live bindings + top-level await.</td></tr>
        </table>

        <h3>Top gotchas to name-drop</h3>
        <ul>
          <li><strong>Recursive process.nextTick</strong> starves the event loop → I/O never runs.</li>
          <li><strong>4-thread pool</strong> secretly serializes concurrent fs/crypto work.</li>
          <li><strong>*Sync APIs</strong> in request handlers block every user at once.</li>
          <li><strong>ReDoS</strong> — a catastrophic regex pegs a CPU and hangs the server.</li>
          <li><strong>allocUnsafe</strong> can hand you other people's leftover memory.</li>
          <li><strong>Ignoring backpressure</strong> (.on('data') + .write()) OOMs on big files.</li>
          <li><strong>Unbounded caches / stray listeners</strong> are the #1 memory-leak source.</li>
        </ul>

        <div class='callout good'>
          <div class='c-title'>The one-breath summary</div>
          "Node runs my single-threaded JS on V8, hands async work to libuv — network via the OS event system, files/crypto via a 4-thread pool — and cycles an event loop through timers/poll/check phases, draining nextTick then Promise microtasks between each. I keep the loop unblocked, respect backpressure, and offload CPU work to workers."
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          "The mental model is: one JS thread, a C++ runtime that isn't. Everything else — phases, queues, the thread pool, GC generations — is just detail hanging off that one idea."
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
      explain: 'When scheduled from within an I/O callback, the loop is already past timers and heads to the check phase next, so setImmediate reliably fires before the next timers phase.',
    },
    {
      question: 'What is the correct draining order after a macrotask completes?',
      options: [
        { text: 'Promise microtasks, then process.nextTick, then next macrotask', correct: false },
        { text: 'process.nextTick queue (fully), then Promise microtask queue (fully), then next macrotask', correct: true },
        { text: 'One nextTick and one Promise callback interleaved, then the next macrotask', correct: false },
      ],
      explain: 'Node fully drains the nextTick queue first, then fully drains the Promise microtask queue, before moving on to the next macrotask.',
    },
    {
      question: 'A server handling 10,000 idle TCP connections uses how many libuv thread-pool threads for that socket watching?',
      options: [
        { text: 'One pool thread per connection (10,000 threads)', correct: false },
        { text: 'Zero — network I/O uses the OS event system (epoll/kqueue/IOCP), not the pool', correct: true },
        { text: 'Exactly 4, the default pool size', correct: false },
      ],
      explain: 'Network sockets are watched by the kernel event-notification system, so one thread can monitor thousands of sockets. The thread pool is used for fs, dns.lookup, crypto and zlib.',
    },
    {
      question: 'Why can a recursive process.nextTick() hang a server that still accepts connections?',
      options: [
        { text: 'It throws a stack-overflow that crashes the process silently', correct: false },
        { text: 'Node fully drains the nextTick queue before any I/O, so an ever-refilling queue starves the loop', correct: true },
        { text: 'It blocks the libuv thread pool until all 4 threads are exhausted', correct: false },
      ],
      explain: 'Because the entire nextTick queue is drained before the loop proceeds to I/O, a queue that keeps refilling means I/O callbacks never get a chance to run.',
    },
    {
      question: 'What does write() returning false on a Writable stream signal?',
      options: [
        { text: 'The write failed and the data was dropped', correct: false },
        { text: 'The internal buffer passed highWaterMark — stop writing until the drain event', correct: true },
        { text: 'The stream has ended and can no longer accept data', correct: false },
      ],
      explain: 'A false return means the buffer is over its highWaterMark (backpressure). You should pause writing until the drain event fires — or just use pipeline() which handles it for you.',
    },
    {
      question: 'Which tool should you reach for first to classify whether a slow Node app is CPU-bound, GC-bound, or event-loop-delayed?',
      options: [
        { text: 'A flame graph, because it always shows the root cause', correct: false },
        { text: 'clinic doctor, which diagnoses the category before you deep-dive', correct: true },
        { text: 'Reading the source code and guessing the hot path', correct: false },
      ],
      explain: 'clinic doctor classifies the type of problem (CPU, event-loop delay, GC, or I/O) first; then you pick the matching deep-dive tool like a flame graph or heap snapshot.',
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
