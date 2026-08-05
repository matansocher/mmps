export default {
  id: 'distributed-systems-course',
  title: 'Distributed Systems',
  icon: '🌐',
  color: '#39c5cf',
  lessons: [
    {
      id: 'why-hard',
      group: 'Foundations',
      nav: '0 · Why it hurts',
      title: 'Why distributed systems are hard',
      lede: 'A single machine either works or it does not. A cluster invents a third state: half-broken, and lying about it.',
      html: `
        <p>Welcome to the discipline where <strong>the network is out to get you</strong>. On one machine, a function call either returns or throws. Across machines, there is a haunted third option: the request left, and you have <em>no idea</em> if it arrived, ran, ran twice, or is still crawling through a switch somewhere. This is <span class='kicker'>partial failure</span>, and it is the original sin of distributed systems.</p>

        <h3>The 8 Fallacies of Distributed Computing 🪤</h3>
        <p>Peter Deutsch &amp; friends (Sun, 1990s) cataloged the lies engineers tell themselves. Every outage you will ever debug is one of these coming to collect:</p>
        <table>
          <tr><th>#</th><th>The comforting lie</th><th>The brutal reality</th></tr>
          <tr><td>1</td><td>The network is reliable</td><td>Packets drop, links flap, NICs die</td></tr>
          <tr><td>2</td><td>Latency is zero</td><td>Cross-region RTT is 100ms+, and it varies</td></tr>
          <tr><td>3</td><td>Bandwidth is infinite</td><td>Fan-out saturates links; big payloads queue</td></tr>
          <tr><td>4</td><td>The network is secure</td><td>Assume hostile; encrypt and authenticate</td></tr>
          <tr><td>5</td><td>Topology never changes</td><td>Nodes come and go; IPs churn; DNS shifts</td></tr>
          <tr><td>6</td><td>There is one admin</td><td>Many teams, many clouds, many clocks</td></tr>
          <tr><td>7</td><td>Transport cost is zero</td><td>Serialization &amp; egress cost real money</td></tr>
          <tr><td>8</td><td>The network is homogeneous</td><td>Mixed hardware, protocols, and MTUs</td></tr>
        </table>

        <h3>The two generals problem 🪖</h3>
        <p>Two armies on opposite hills must attack at dawn together. Their only messenger runs through the enemy valley and may be captured. General A sends 'attack at dawn'. Did it arrive? A needs an ACK. But did the ACK arrive? B needs an ACK-of-the-ACK. This regress never ends. The punchline: <strong>over an unreliable channel, you can never achieve certain agreement with a finite number of messages.</strong> Every retry, timeout, and idempotency key you will ever write is a pragmatic dodge around this fundamental impossibility.</p>

        <div class='diagram'>
          <svg viewBox='0 0 640 180' width='640'>
            <defs><marker id='arrow' markerWidth='10' markerHeight='10' refX='8' refY='3' orient='auto'><path d='M0,0 L8,3 L0,6 Z' fill='#8b98a9'/></marker></defs>
            <rect class='node-box' x='20' y='60' width='140' height='60' rx='8'/>
            <text class='node-text' x='90' y='86' text-anchor='middle'>General A</text>
            <text class='node-sub' x='90' y='104' text-anchor='middle'>attack at dawn?</text>
            <line class='edge' x1='160' y1='78' x2='470' y2='78' marker-end='url(#arrow)'/>
            <text class='edge-label' x='315' y='70' text-anchor='middle'>message (maybe captured)</text>
            <line class='edge' x1='470' y1='104' x2='160' y2='104' marker-end='url(#arrow)'/>
            <text class='edge-label' x='315' y='126' text-anchor='middle'>ACK (maybe captured)</text>
            <rect class='node-box worker' x='470' y='60' width='150' height='60' rx='8'/>
            <text class='node-text' x='545' y='94' text-anchor='middle'>General B</text>
          </svg>
          <div class='diagram-caption'>The infinite ACK regress: no finite message count guarantees mutual certainty.</div>
        </div>

        <h3>Two failure models you must name</h3>
        <p>Interviewers love this vocabulary. A <span class='kicker'>fail-stop</span> (a.k.a. crash) fault means a node simply dies and stops responding — the easy case. A <span class='kicker'>Byzantine</span> fault means a node lies, corrupts data, or sends conflicting messages to different peers. Most datacenter systems (Raft, Kafka, Postgres) assume the fail-stop model; only trust-minimized systems (blockchains, aerospace) pay the ~3f+1 replica cost to tolerate Byzantine faults.</p>

        <div class='callout warn'><div class='c-title'>War story: slow is the new down</div>A 'quick' health check timed out at 30s. A GC pause froze a node for 12s; the load balancer marked it dead, shifted traffic, overloaded its neighbor, which then GC-paused too. A cascading failure from <em>one slow node lying about being alive</em>. You cannot distinguish a dead node from a slow one — that ambiguity is the whole game.</div>

        <div class='callout good'><div class='c-title'>Rule of thumb</div>Design for <strong>partial failure first</strong>. Ask of every remote call: 'What if this hangs forever? What if it succeeds but the response is lost? What if it runs twice?'</div>

        <div class='callout'><div class='c-title'>Interview soundbite</div>'A distributed system is one where a machine you have never heard of can make your machine unusable. The hard part is not concurrency — it is <em>partial failure</em>: components fail independently and you cannot tell failure from slowness.'</div>
      `,
    },
    {
      id: 'napkin-math',
      group: 'Foundations',
      nav: '1 · Napkin math',
      title: 'Latency numbers & back-of-envelope math',
      lede: 'Before you design anything, you must feel the numbers in your bones. A memory read is a heartbeat; a cross-continent round trip is a coffee break.',
      html: `
        <p>Every good system-design answer is anchored in <strong>orders of magnitude</strong>. If you know that RAM is ~100&times; faster than SSD and ~1,000,000&times; faster than a cross-region round trip, you will instinctively cache the right thing and never accidentally put a 150ms network hop inside a tight loop. Jeff Dean's famous 'latency numbers every programmer should know' is the canon here.</p>

        <h3>The latency ladder (rounded, order-of-magnitude)</h3>
        <table>
          <tr><th>Operation</th><th>Latency</th><th>Human-scale (×1B)</th></tr>
          <tr><td>L1 cache reference</td><td>~1 ns</td><td>1 second</td></tr>
          <tr><td>Branch mispredict</td><td>~3 ns</td><td>3 seconds</td></tr>
          <tr><td>L2 cache reference</td><td>~4 ns</td><td>4 seconds</td></tr>
          <tr><td>Mutex lock/unlock</td><td>~17 ns</td><td>17 seconds</td></tr>
          <tr><td>Main memory (RAM) reference</td><td>~100 ns</td><td>~1.5 minutes</td></tr>
          <tr><td>Read 1 MB sequentially from RAM</td><td>~3 μs</td><td>~1 hour</td></tr>
          <tr><td>SSD random read</td><td>~16 μs</td><td>~4 hours</td></tr>
          <tr><td>Round trip within same datacenter</td><td>~0.5 ms</td><td>~6 days</td></tr>
          <tr><td>Read 1 MB sequentially from SSD</td><td>~1 ms</td><td>~11 days</td></tr>
          <tr><td>Disk (HDD) seek</td><td>~10 ms</td><td>~4 months</td></tr>
          <tr><td>Round trip California ↔ Netherlands</td><td>~150 ms</td><td>~5 years</td></tr>
        </table>
        <p>The two takeaways interviewers want to hear: <strong>(1) memory is dramatically faster than network, and network dwarfs everything cross-region;</strong> <strong>(2) sequential access crushes random access</strong> — this is why log-structured storage (Kafka, LSM-trees) and batching win.</p>

        <h3>Availability: what the nines cost you</h3>
        <table>
          <tr><th>Availability</th><th>Downtime / year</th><th>Downtime / day</th></tr>
          <tr><td>99% (two nines)</td><td>3.65 days</td><td>~14 min</td></tr>
          <tr><td>99.9% (three nines)</td><td>8.76 hours</td><td>~1.4 min</td></tr>
          <tr><td>99.99% (four nines)</td><td>52.6 min</td><td>~8.6 s</td></tr>
          <tr><td>99.999% (five nines)</td><td>5.26 min</td><td>~0.86 s</td></tr>
        </table>
        <div class='callout warn'><div class='c-title'>Gotcha: availability multiplies</div>If a request touches 5 independent services each at 99.9%, the end-to-end availability is 0.999^5 ≈ <strong>99.5%</strong> — you lost two-and-a-half nines just by adding hops. Serial dependencies multiply; this is why deep microservice call chains are fragile and why redundancy (parallel replicas) is how you claw nines back.</div>

        <h3>Estimation drill: sizing a URL shortener</h3>
        <p>Interviewers want structured guesses, not exact answers. Assume 100M new URLs/day.</p>
        <ul>
          <li><strong>Write QPS:</strong> 100M / 86,400s ≈ <strong>~1,160 writes/s</strong> average; peak ~2–3× ≈ ~3,000/s.</li>
          <li><strong>Read:write ratio</strong> ~100:1 → ~116,000 reads/s. Now you <em>know</em> you need a read cache and read replicas.</li>
          <li><strong>Storage:</strong> ~500 bytes/record × 100M/day × 365 × 5yr ≈ <strong>~90 TB</strong> — too big for one node, so you shard.</li>
        </ul>
        <p>Notice how the numbers <em>drove the architecture</em>: high read ratio → cache; 90 TB → sharding. That is the whole point of napkin math.</p>

        <div class='callout good'><div class='c-title'>Rules of thumb to memorize</div>1 day ≈ 86,400s (≈ 10^5). 1 million seconds ≈ 11.5 days. A commodity server handles ~10k QPS of light work and holds a few TB of disk. Memory bandwidth ~10 GB/s. These five anchors let you size almost anything on the spot.</div>

        <div class='callout'><div class='c-title'>Interview soundbite</div>'RAM is ~100 ns, same-DC round trip ~0.5 ms, cross-region ~150 ms — memory is a million times closer than another continent. And availability multiplies across serial dependencies, so five 99.9% hops give you only ~99.5%. I let those numbers pick my architecture.'</div>
      `,
    },
    {
      id: 'consistency-models',
      group: 'Foundations',
      nav: '2 · Consistency',
      title: 'Consistency models',
      lede: 'When you have copies of data, "read the latest value" stops being obvious. Consistency models are the contracts that define what "latest" even means.',
      html: `
        <p>Once data lives in more than one place, you face the central bargain of distributed systems: <strong>how fresh must a read be, and how much latency will you pay for it?</strong> A consistency model is the promise the system makes to the programmer about what values reads can return. Two families exist: <span class='kicker'>data-centric</span> models (linearizable, sequential, causal) about the whole system's ordering, and <span class='kicker'>client-centric</span> session guarantees (read-your-writes, monotonic reads) about one user's experience.</p>

        <h3>The spectrum, strongest to weakest</h3>
        <table>
          <tr><th>Model</th><th>Promise</th><th>Mental image</th></tr>
          <tr><td><strong>Linearizable</strong> (strong)</td><td>Reads see the most recent write; the system behaves like a single copy in real time</td><td>One golden ledger everyone shares in real time</td></tr>
          <tr><td><strong>Sequential</strong></td><td>All nodes agree on one order of ops, but not necessarily real-time order</td><td>Everyone watches the same movie, maybe on a delay</td></tr>
          <tr><td><strong>Causal</strong></td><td>Cause-and-effect ops are seen in order; unrelated ones can differ</td><td>You always see the question before its answer</td></tr>
          <tr><td><strong>Read-your-writes</strong></td><td>You always see your own updates</td><td>You post a tweet and it is there when you refresh</td></tr>
          <tr><td><strong>Monotonic reads</strong></td><td>Once you have seen a value, you never see an older one</td><td>Time never runs backwards for you</td></tr>
          <tr><td><strong>Eventual</strong></td><td>If writes stop, replicas eventually converge — someday</td><td>Rumor spreading through an office</td></tr>
        </table>

        <div class='callout warn'><div class='c-title'>Don't confuse consistency-C with ACID-C</div>The 'C' in CAP/consistency-models is <strong>linearizability</strong> (a freshness/ordering guarantee about replicas). The 'C' in ACID is <strong>preserving invariants</strong> (constraints, foreign keys). They are unrelated words that collide. Interviewers throw this trap constantly — name the difference and you look sharp.</div>

        <h3>Analogy: the group chat 💬</h3>
        <p><strong>Linearizable:</strong> everyone sees every message in the exact same order, the instant it is sent. <strong>Causal:</strong> you might see messages in different orders, but a <em>reply</em> never shows up before the message it replies to. <strong>Eventual:</strong> messages arrive out of order and duplicated, but if everyone stops typing, all screens eventually match. Most 'weird' bugs in weakly-consistent systems are a reply appearing before its cause — which is exactly what causal consistency forbids.</p>

        <div class='callout warn'><div class='c-title'>Gotcha: read-your-writes</div>User uploads a profile photo (write hits the leader), then the page reload reads from a stale follower and shows the old photo. User is convinced the upload failed and does it three more times. Fix: route a user's reads to the leader for a few seconds, or pin them to the replica that has their write (session/sticky consistency).</div>

        <h3>Why weaker is often the right call</h3>
        <p>Strong consistency requires coordination on <em>every</em> write, which means latency and reduced availability under partitions. A 'like' counter, a viewed-badge, a shopping-cart merge — these tolerate eventual consistency happily. Reach for strong consistency where correctness is non-negotiable: <strong>account balances, inventory decrements, unique-username claims, and locks.</strong></p>

        <div class='callout good'><div class='c-title'>Rule of thumb</div>Default to the <em>weakest</em> model that keeps the business correct. Coordination is a tax; only pay it where a stale read causes real damage. Causal + read-your-writes covers most user-facing apps.</div>

        <div class='callout'><div class='c-title'>Interview soundbite</div>'Linearizable = there is a single, real-time order of operations, as if one machine served them all. Eventual = replicas converge if you stop writing. Everything interesting lives in between, and causal consistency is the sweet spot for most user-facing apps.'</div>
      `,
    },
    {
      id: 'cap-pacelc',
      group: 'Foundations',
      nav: '3 · CAP & PACELC',
      title: 'CAP theorem, honestly',
      lede: 'CAP is the most quoted and least understood theorem in our field. Let us defuse it, then upgrade to PACELC which is what actually guides design.',
      html: `
        <p>The CAP theorem (Brewer's 2000 conjecture, proven by Gilbert &amp; Lynch 2002) says a distributed data store cannot simultaneously guarantee all three of <span class='kicker'>Consistency</span>, <span class='kicker'>Availability</span>, and <span class='kicker'>Partition tolerance</span>. The popular reading — 'pick two' — is <strong>wrong and harmful</strong>.</p>

        <h3>The correct reading</h3>
        <p>Partitions are not a choice; the network <em>will</em> partition. So P is mandatory. CAP really says: <strong>when a partition happens, you must choose between C and A.</strong> When the network is healthy, this trade-off does not even apply.</p>

        <div class='two-col'>
          <div>
            <div class='pattern-card'>
              <h4>CP — choose Consistency</h4>
              <p>During a partition, refuse operations you cannot make safe. The minority side returns errors rather than stale/conflicting data.</p>
              <div class='tag-row'><span class='tag use'>use when correctness &gt; uptime</span><span class='tag avoid'>avoid for a 'like' button</span></div>
              <p><em>Examples: ZooKeeper, etcd, Spanner, HBase.</em></p>
            </div>
          </div>
          <div>
            <div class='pattern-card'>
              <h4>AP — choose Availability</h4>
              <p>During a partition, every node keeps answering, accepting possibly-stale reads and conflicting writes, then reconciles later.</p>
              <div class='tag-row'><span class='tag use'>use when uptime &gt; freshness</span><span class='tag avoid'>avoid for bank ledgers</span></div>
              <p><em>Examples: Dynamo, Cassandra, Riak.</em></p>
            </div>
          </div>
        </div>

        <div class='callout danger'><div class='c-title'>The big misconception</div>People say 'MongoDB is CP, Cassandra is AP' as if it is a fixed personality. Reality: the trade-off is <strong>per-operation and tunable</strong>. Cassandra with <code>QUORUM</code> reads/writes leans CP-ish; with <code>ONE</code> it leans AP. CAP is a knob, not a religion.</div>

        <h3>PACELC — the theorem that actually helps 🧭</h3>
        <p>CAP is silent about the 99.99% of the time when there is no partition. Daniel Abadi's <strong>PACELC</strong> (2012) fills the gap:</p>
        <p style='text-align:center'><strong>if (P)artition → trade (A)vailability vs (C)onsistency; (E)lse → trade (L)atency vs (C)onsistency.</strong></p>
        <p>This is the real daily trade-off: even with a perfect network, keeping replicas linearizable costs latency (you must wait for a quorum to ack). So:</p>
        <table>
          <tr><th>System</th><th>PACELC class</th><th>Reading</th></tr>
          <tr><td>Cassandra / Dynamo</td><td>PA/EL</td><td>Favors availability under partition, latency otherwise</td></tr>
          <tr><td>Spanner</td><td>PC/EC</td><td>Favors consistency always (and pays latency for it)</td></tr>
          <tr><td>MongoDB (default)</td><td>PA/EC</td><td>Available under partition, consistent when healthy</td></tr>
          <tr><td>DynamoDB</td><td>PA/EL</td><td>Tunable; eventually-consistent reads by default, strong reads opt-in</td></tr>
        </table>

        <div class='callout warn'><div class='c-title'>Gotcha: 'CA' systems do not exist</div>Some diagrams show a 'CA' corner (a single-node DB). In a truly distributed system you cannot drop P — the network will partition whether you like it or not — so CA is a fantasy. If someone claims a CA distributed store, they mean 'we ignore partitions and corrupt data when they happen'.</div>

        <div class='callout'><div class='c-title'>Interview soundbite</div>'CAP is not pick-two; partition tolerance is mandatory, so CAP is really C-vs-A <em>during a partition</em>. The theorem that guides real design is PACELC: even with no partition, you trade latency against consistency on every request.'</div>
      `,
    },
    {
      id: 'replication',
      group: 'Building blocks',
      nav: '4 · Replication',
      title: 'Replication & quorums',
      lede: 'Copies give you durability, availability, and read scale. They also give you the delightful problem of keeping the copies from disagreeing.',
      html: `
        <p>Replication means keeping the same data on multiple nodes. You do it for three reasons: survive machine death (<strong>durability</strong>), keep serving during failures (<strong>availability</strong>), and spread read load (<strong>throughput</strong>). The tax is keeping replicas in agreement.</p>

        <h3>Three topologies</h3>
        <table>
          <tr><th>Topology</th><th>Writes</th><th>Strength</th><th>Weakness</th></tr>
          <tr><td>Single-leader</td><td>one node</td><td>simple, natural ordering</td><td>write bottleneck; failover risk</td></tr>
          <tr><td>Multi-leader</td><td>several nodes</td><td>write locally per region</td><td>write conflicts to resolve</td></tr>
          <tr><td>Leaderless</td><td>any node</td><td>high availability, no failover</td><td>quorum tuning + conflict resolution</td></tr>
        </table>

        <h3>Leader / follower (a.k.a. primary/replica) 👑</h3>
        <p>One node is the leader; all writes go there. It streams a replication log to followers, which apply it in order and serve reads. Simple, battle-tested (Postgres, MySQL, Kafka partitions, Redis). Replication can ship the <strong>statement</strong>, the <strong>write-ahead log (WAL)</strong>, or a <strong>logical row-change (CDC)</strong> stream — WAL/logical shipping is the modern default because statement replication breaks on non-determinism like <code>NOW()</code> or <code>RANDOM()</code>.</p>

        <div class='diagram'>
          <svg viewBox='0 0 640 210' width='640'>
            <defs><marker id='arrow' markerWidth='10' markerHeight='10' refX='8' refY='3' orient='auto'><path d='M0,0 L8,3 L0,6 Z' fill='#8b98a9'/></marker></defs>
            <rect class='node-box' x='250' y='20' width='140' height='54' rx='8'/>
            <text class='node-text' x='320' y='42' text-anchor='middle'>Leader</text>
            <text class='node-sub' x='320' y='60' text-anchor='middle'>accepts writes</text>
            <line class='edge' x1='300' y1='74' x2='120' y2='140' marker-end='url(#arrow)'/>
            <line class='edge' x1='320' y1='74' x2='320' y2='140' marker-end='url(#arrow)'/>
            <line class='edge' x1='340' y1='74' x2='520' y2='140' marker-end='url(#arrow)'/>
            <text class='edge-label' x='300' y='112' text-anchor='middle'>replication log</text>
            <rect class='node-box worker' x='50' y='140' width='140' height='54' rx='8'/>
            <text class='node-text' x='120' y='170' text-anchor='middle'>Follower</text>
            <rect class='node-box worker' x='250' y='140' width='140' height='54' rx='8'/>
            <text class='node-text' x='320' y='170' text-anchor='middle'>Follower</text>
            <rect class='node-box worker' x='450' y='140' width='140' height='54' rx='8'/>
            <text class='node-text' x='520' y='170' text-anchor='middle'>Follower</text>
          </svg>
          <div class='diagram-caption'>Single-leader replication: writes funnel through the leader; reads fan out to followers.</div>
        </div>

        <h3>Sync vs async — the durability/latency dial</h3>
        <table>
          <tr><th></th><th>Synchronous</th><th>Asynchronous</th><th>Semi-sync</th></tr>
          <tr><td>Leader acks after…</td><td>all followers confirm</td><td>local write only</td><td>≥1 follower confirms</td></tr>
          <tr><td>Write latency</td><td>highest</td><td>lowest</td><td>middle</td></tr>
          <tr><td>If leader dies</td><td>no data loss</td><td><strong>lose un-replicated writes</strong></td><td>bounded loss</td></tr>
        </table>

        <div class='callout warn'><div class='c-title'>Gotcha: replication lag &amp; async failover data loss</div>Async replication + automatic failover = a promoted follower that never received the last few committed writes. Those acknowledged writes vanish. GitHub's 2018 24-hour outage was rooted here. Mitigation: <strong>semi-sync</strong> (wait for at least one follower) and consensus-backed failover (Raft picks the most up-to-date replica).</div>

        <h3>Leaderless &amp; quorums 🗳️</h3>
        <p>Dynamo-style systems skip the leader. A client writes to <strong>W</strong> replicas and reads from <strong>R</strong> of <strong>N</strong> total. The magic inequality:</p>
        <p style='text-align:center'><strong>if W + R &gt; N, every read set overlaps every write set → you always see at least one fresh copy.</strong></p>
        <p>With <code>N=3</code>: <code>W=2, R=2</code> is the classic balanced quorum (survives one node down, strongish reads). Want fast writes? <code>W=1</code>. Fast reads? <code>R=1</code>. But dropping below the overlap threshold buys speed with stale reads. Leaderless systems patch gaps with <strong>read repair</strong> (fix stale replicas on read) and <strong>hinted handoff</strong> (a live node temporarily stores writes for a down peer).</p>

        <div class='callout danger'><div class='c-title'>Gotcha: quorums are not linearizability</div><code>W+R&gt;N</code> guarantees overlap but NOT strict ordering — sloppy quorums, concurrent writes, and last-write-wins can still lose data. If you truly need linearizable reads, you need consensus (next lesson) or read-repair with strict quorums, not just the inequality.</div>

        <div class='callout'><div class='c-title'>Interview soundbite</div>'Single-leader is simple and gives you a natural serialization point; the risk is failover data loss with async replication. Leaderless uses quorums — W+R&gt;N guarantees read/write overlap — trading conflict-resolution complexity for availability. But a quorum is not linearizability.'</div>
      `,
    },
    {
      id: 'consensus',
      group: 'Building blocks',
      nav: '5 · Consensus',
      title: 'Consensus: Raft & Paxos intuition',
      lede: 'How do a bunch of unreliable machines agree on a single value — like "who is the leader" — even as some of them crash? That is consensus, the beating heart of the cluster.',
      html: `
        <p>Consensus is the problem of getting a group of nodes to <strong>agree on one value</strong> despite crashes and message loss. It underpins leader election, distributed locks, config management, and the commit order of a replicated log. If you have used etcd, ZooKeeper, Consul, or Kafka's controller (KRaft), you have leaned on consensus.</p>

        <h3>The properties it must give you</h3>
        <ul>
          <li><strong>Agreement:</strong> no two nodes decide different values.</li>
          <li><strong>Validity:</strong> the decided value was actually proposed by someone.</li>
          <li><strong>Termination:</strong> non-faulty nodes eventually decide.</li>
        </ul>
        <p>FLP impossibility (Fischer, Lynch, Paterson 1985) proves you cannot guarantee all three in a fully async system with even one crash — so real systems use <strong>timeouts</strong> (a partial-synchrony assumption) to make progress, sacrificing guaranteed termination for practical liveness. Safety is never sacrificed; only liveness.</p>

        <h3>Raft: consensus you can actually explain 🎓</h3>
        <p>Raft (Ongaro &amp; Ousterhout, 2014) was designed to be <em>understandable</em> (unlike Paxos, which is notoriously brain-bending). It has three ideas:</p>
        <ol>
          <li><strong>Leader election.</strong> Time is divided into <em>terms</em>. Each node has a randomized election timeout (e.g., 150–300ms); if it hears no heartbeat, it becomes a candidate, bumps the term, and asks for votes. A node grants one vote per term. Win a <strong>majority</strong> → you are leader. Randomized timeouts make split votes rare.</li>
          <li><strong>Log replication.</strong> Clients send commands to the leader, which appends to its log and replicates to followers. Once a majority persist an entry, it is <strong>committed</strong> and applied to the state machine.</li>
          <li><strong>Safety.</strong> A candidate can only win if its log is at least as up-to-date as the voter's, so a committed entry is never lost.</li>
        </ol>

        <div class='diagram'>
          <svg viewBox='0 0 640 170' width='640'>
            <defs><marker id='arrow' markerWidth='10' markerHeight='10' refX='8' refY='3' orient='auto'><path d='M0,0 L8,3 L0,6 Z' fill='#8b98a9'/></marker></defs>
            <rect class='node-box' x='250' y='20' width='150' height='54' rx='8'/>
            <text class='node-text' x='325' y='42' text-anchor='middle'>Leader (term 5)</text>
            <text class='node-sub' x='325' y='60' text-anchor='middle'>append entry</text>
            <line class='edge' x1='300' y1='74' x2='140' y2='120' marker-end='url(#arrow)'/>
            <line class='edge' x1='350' y1='74' x2='500' y2='120' marker-end='url(#arrow)'/>
            <text class='edge-label' x='325' y='104' text-anchor='middle'>replicate → wait for majority ack</text>
            <rect class='node-box worker' x='60' y='120' width='150' height='40' rx='8'/>
            <text class='node-text' x='135' y='145' text-anchor='middle'>Follower ✓</text>
            <rect class='node-box worker' x='430' y='120' width='150' height='40' rx='8'/>
            <text class='node-text' x='505' y='145' text-anchor='middle'>Follower ✓</text>
          </svg>
          <div class='diagram-caption'>Raft: an entry commits once a majority (quorum) has persisted it.</div>
        </div>

        <h3>Why majorities (quorums)?</h3>
        <p>Any two majorities of a set share at least one node — so two different leaders cannot both be elected in the same term, and a committed entry (on a majority) is seen by any future leader (also a majority). This is why consensus clusters are <strong>odd-sized</strong>: 3 tolerates 1 failure, 5 tolerates 2. Adding a node from 3→4 does <em>not</em> improve fault tolerance (still tolerates 1) but does slow you down and widen the split-vote window.</p>

        <div class='callout warn'><div class='c-title'>Gotcha: split brain</div>Two leaders accepting writes = split brain = corruption. Majority quorums prevent it: the minority side of a partition cannot form a majority, so it cannot elect a leader or commit. This is precisely why even-node clusters are a trap.</div>

        <div class='callout good'><div class='c-title'>Paxos vs Raft vs the family</div>They solve the same problem. Paxos is a family (Basic Paxos for one value, Multi-Paxos for logs); Raft packages the same guarantees with an explicit strong leader and clean terms, so it is far easier to implement correctly. <strong>ZAB</strong> (ZooKeeper) is another leader-based cousin. <strong>Viewstamped Replication</strong> predates them all. Modern high-throughput variants: <strong>EPaxos</strong> (leaderless) and <strong>Flexible Paxos</strong>.</div>

        <div class='callout danger'><div class='c-title'>Gotcha: consensus is not a database</div>Never put high-volume application data through Raft — it is a coordination tool. etcd/ZooKeeper are for <em>metadata</em>: leader locks, config, membership, service discovery. Every write is a full quorum round trip; run millions of them and you will melt the cluster. Store the small, critical truths there and the bulk data elsewhere.</div>

        <div class='callout'><div class='c-title'>Interview soundbite</div>'Consensus = a cluster agreeing on one value despite crashes. Raft does it with a leader elected by majority vote and a log that commits an entry once a quorum persists it. Odd cluster sizes, because safety rides on overlapping majorities. FLP says you cannot guarantee termination async, so we add timeouts.'</div>
      `,
    },
    {
      id: 'partitioning',
      group: 'Building blocks',
      nav: '6 · Partitioning',
      title: 'Partitioning & sharding',
      lede: 'When data outgrows one machine, you split it. How you split it decides whether your database scales gracefully or collapses onto one poor overloaded shard.',
      html: `
        <p>Partitioning (a.k.a. sharding) splits a big dataset across nodes so each holds a slice. Done well, capacity and throughput scale linearly. Done badly, you get <span class='kicker'>hotspots</span> — one shard melting while the rest nap. (Replication and partitioning are orthogonal and usually combined: each partition is itself replicated.)</p>

        <h3>Two strategies</h3>
        <div class='two-col'>
          <div>
            <div class='pattern-card'>
              <h4>Range partitioning</h4>
              <p>Keys are split by contiguous ranges (A–F, G–M…). Great for range scans and ordered queries.</p>
              <div class='tag-row'><span class='tag use'>use for time-series, ordered scans</span><span class='tag avoid'>avoid for monotonic keys</span></div>
              <p><em>The trap: sequential keys (timestamps, auto-increment IDs) all land on the newest shard → a write hotspot.</em></p>
            </div>
          </div>
          <div>
            <div class='pattern-card'>
              <h4>Hash partitioning</h4>
              <p>Shard = <code>hash(key) mod N</code>. Spreads load evenly and kills sequential-key hotspots.</p>
              <div class='tag-row'><span class='tag use'>use for even write spread</span><span class='tag avoid'>avoid when you need range scans</span></div>
              <p><em>The trap: you lose ordering, so 'all events between 9 and 10am' becomes a scatter-gather across every shard.</em></p>
            </div>
          </div>
        </div>

        <h3>The rebalancing trap ⚖️</h3>
        <p>Naïve <code>hash(key) mod N</code> has a fatal flaw: change <code>N</code> (add/remove a node) and <em>almost every key</em> remaps. That is a full data reshuffle — catastrophic. Two fixes:</p>
        <ul>
          <li><strong>Consistent hashing.</strong> Map nodes and keys onto a ring; a key belongs to the next node clockwise. Adding a node only moves the keys in its arc — roughly <code>1/N</code> of the data. Add <strong>virtual nodes</strong> (each physical node owns many ring points) to smooth the distribution. Used by Cassandra, DynamoDB, and Discord's message store.</li>
          <li><strong>Fixed partition count.</strong> Pre-create many more partitions than nodes (e.g., 1024). Rebalancing just reassigns whole partitions to nodes — no key ever re-hashes. This is how Kafka and Elasticsearch think.</li>
        </ul>

        <div class='diagram'>
          <svg viewBox='0 0 640 190' width='640'>
            <circle cx='320' cy='95' r='70' fill='none' stroke='#39485a' stroke-width='2'/>
            <circle cx='320' cy='25' r='7' fill='#4a90d9'/><text class='node-sub' x='320' y='14' text-anchor='middle'>Node A</text>
            <circle cx='390' cy='95' r='7' fill='#4a90d9'/><text class='node-sub' x='430' y='99' text-anchor='middle'>Node B</text>
            <circle cx='320' cy='165' r='7' fill='#4a90d9'/><text class='node-sub' x='320' y='185' text-anchor='middle'>Node C</text>
            <circle cx='250' cy='95' r='7' fill='#4a90d9'/><text class='node-sub' x='210' y='99' text-anchor='middle'>Node D</text>
            <circle cx='368' cy='45' r='5' fill='#3fb950'/><text class='node-sub' x='388' y='40' text-anchor='middle'>key</text>
            <text class='node-sub' x='320' y='99' text-anchor='middle'>hash ring</text>
          </svg>
          <div class='diagram-caption'>Consistent hashing: a key hops clockwise to the next node; adding a node only steals its arc.</div>
        </div>

        <div class='callout danger'><div class='c-title'>War story: the celebrity hotspot</div>You shard by <code>user_id</code>. Then a celebrity with 40M followers joins, and every read/write for their timeline slams one shard. No hash function saves you — the load is intrinsically skewed. Fixes: split hot keys with a suffix (<code>celebrity_id:bucket</code>), add a dedicated cache tier, or special-case the whale.</div>

        <h3>Secondary indexes: local vs global</h3>
        <p>Two ways to index by a non-partition field. A <strong>local (document-partitioned) index</strong> lives with its shard: writes are cheap, but a query must scatter-gather across all shards. A <strong>global (term-partitioned) index</strong> is itself partitioned by the index term: reads hit one shard, but writes must update a remote index partition (and get harder to keep consistent). Elasticsearch uses local; DynamoDB global secondary indexes are global.</p>

        <div class='callout warn'><div class='c-title'>Gotcha: cross-shard queries &amp; transactions</div>Joins and transactions spanning shards are slow and painful (they need scatter-gather or 2PC). Choose a <strong>shard key that co-locates data you query together</strong> (e.g., tenant_id for a multi-tenant SaaS) so most queries hit a single shard.</div>

        <div class='callout'><div class='c-title'>Interview soundbite</div>'Hash spreads load but kills range scans; range enables scans but invites hotspots on sequential keys. To rebalance without reshuffling everything, use consistent hashing with virtual nodes or a fixed large partition count — and pick a shard key that co-locates your common queries.'</div>
      `,
    },
    {
      id: 'messaging-streaming',
      group: 'Building blocks',
      nav: '7 · Messaging & logs',
      title: 'Messaging, queues & the log',
      lede: 'Synchronous RPC couples services at the hip. Asynchronous messaging decouples them in time — but introduces its own zoo of delivery semantics, ordering rules, and backpressure problems.',
      html: `
        <p>Instead of calling a service directly, you drop a message on a broker and move on. This buys you <strong>temporal decoupling</strong> (consumer can be down), <strong>load leveling</strong> (buffer spikes), and <strong>fan-out</strong> (many consumers, one event). The cost: eventual consistency, harder debugging, and delivery-semantics headaches.</p>

        <h3>Two shapes: queue vs log</h3>
        <div class='two-col'>
          <div>
            <div class='pattern-card'>
              <h4>Message queue (RabbitMQ, SQS)</h4>
              <p>A message is delivered to <em>one</em> consumer, then deleted/acked. Great for distributing tasks across workers.</p>
              <div class='tag-row'><span class='tag use'>use for job/task distribution</span><span class='tag avoid'>avoid when you need replay</span></div>
              <p><em>Once consumed, it is gone. No rewinding history.</em></p>
            </div>
          </div>
          <div>
            <div class='pattern-card'>
              <h4>Log-based broker (Kafka, Pulsar, Kinesis)</h4>
              <p>An append-only, ordered, <em>retained</em> log. Consumers track their own <strong>offset</strong> and can replay from any point.</p>
              <div class='tag-row'><span class='tag use'>use for event streams, replay, multi-consumer</span><span class='tag avoid'>avoid for per-message priority/TTL routing</span></div>
              <p><em>Messages stay for a retention window (hours→forever), so new consumers can reprocess all of history.</em></p>
            </div>
          </div>
        </div>

        <h3>Kafka mental model 🧠</h3>
        <ul>
          <li>A <strong>topic</strong> is split into <strong>partitions</strong>; each partition is an ordered, immutable log. <strong>Ordering is guaranteed only within a partition</strong>, never across the topic.</li>
          <li>The partition for a message is chosen by its <strong>key</strong> (<code>hash(key) mod partitions</code>) — so all events for one <code>user_id</code> land in-order on the same partition. No key → round-robin, no ordering.</li>
          <li>A <strong>consumer group</strong> splits partitions among its members: each partition is read by exactly one consumer in the group. So <strong>max parallelism = partition count</strong>. 10 partitions caps you at 10 active consumers.</li>
          <li>Consumers commit their <strong>offset</strong> (position). Commit after processing = at-least-once; commit before = at-most-once. Crash between = redelivery.</li>
        </ul>

        <div class='diagram'>
          <svg viewBox='0 0 640 180' width='640'>
            <defs><marker id='arrow2' markerWidth='10' markerHeight='10' refX='8' refY='3' orient='auto'><path d='M0,0 L8,3 L0,6 Z' fill='#8b98a9'/></marker></defs>
            <rect class='node-box' x='30' y='70' width='120' height='44' rx='8'/>
            <text class='node-text' x='90' y='96' text-anchor='middle'>Producer</text>
            <line class='edge' x1='150' y1='92' x2='215' y2='92' marker-end='url(#arrow2)'/>
            <rect class='node-box tool' x='220' y='30' width='200' height='34' rx='6'/>
            <text class='node-text' x='320' y='52' text-anchor='middle'>Partition 0: ▪▪▪▪▪</text>
            <rect class='node-box tool' x='220' y='78' width='200' height='34' rx='6'/>
            <text class='node-text' x='320' y='100' text-anchor='middle'>Partition 1: ▪▪▪▪</text>
            <rect class='node-box tool' x='220' y='126' width='200' height='34' rx='6'/>
            <text class='node-text' x='320' y='148' text-anchor='middle'>Partition 2: ▪▪▪</text>
            <line class='edge' x1='420' y1='47' x2='490' y2='60' marker-end='url(#arrow2)'/>
            <line class='edge' x1='420' y1='143' x2='490' y2='120' marker-end='url(#arrow2)'/>
            <rect class='node-box worker' x='495' y='55' width='120' height='34' rx='6'/>
            <text class='node-text' x='555' y='77' text-anchor='middle'>Consumer A</text>
            <rect class='node-box worker' x='495' y='103' width='120' height='34' rx='6'/>
            <text class='node-text' x='555' y='125' text-anchor='middle'>Consumer B</text>
          </svg>
          <div class='diagram-caption'>One consumer group: partitions divided among consumers; ordering holds inside each partition.</div>
        </div>

        <h3>Backpressure &amp; the poison message</h3>
        <p>If producers outrun consumers, something must give. Options: <strong>buffer</strong> (bounded — unbounded queues just move the crash), <strong>drop</strong> (shed load), or <strong>block/throttle</strong> the producer (backpressure). Reactive Streams and gRPC flow control formalize this. And always plan for the <strong>poison message</strong> — one that always fails processing: after N retries, route it to a <strong>dead-letter queue (DLQ)</strong> so it stops blocking the partition.</p>

        <div class='callout warn'><div class='c-title'>Gotcha: ordering vs parallelism tension</div>You want ordering (one partition) AND throughput (many partitions). You cannot fully have both. The escape hatch: partition by a key whose <em>per-key</em> order is all you need (e.g., per-account). Global total order across a high-volume topic is usually a design smell.</div>

        <div class='callout good'><div class='c-title'>Pattern: the log as source of truth</div>Event sourcing + CDC (Debezium streaming your DB's WAL into Kafka) turn the log into the system's backbone: every consumer (search index, cache, analytics) is just a materialized view of the same ordered event stream. Replay the log → rebuild any view from scratch.</div>

        <div class='callout'><div class='c-title'>Interview soundbite</div>'A queue delivers each message once to one worker then forgets it; a log (Kafka) is a retained, ordered, replayable stream. Kafka orders only within a partition, keyed by the message key; a consumer group caps parallelism at the partition count. Handle overload with bounded backpressure and poison messages with a dead-letter queue.'</div>
      `,
    },
    {
      id: 'time-and-ordering',
      group: 'Building blocks',
      nav: '8 · Time & clocks',
      title: 'Time, clocks & ordering',
      lede: 'The scariest sentence in distributed systems: "according to whose clock?" Wall clocks lie, drift, and jump backwards. Logical clocks save us.',
      html: `
        <p>You cannot trust wall-clock time across machines. NTP drifts, clocks jump (leap seconds, VM pauses, someone runs <code>ntpdate</code>), and two servers <em>never</em> agree to the millisecond. So 'the write with the newer timestamp wins' can silently corrupt data. We need a notion of order that does not depend on synchronized wall clocks.</p>

        <div class='callout danger'><div class='c-title'>War story: last-write-wins ate my data</div>Two nodes accept concurrent writes; conflict resolution is 'higher timestamp wins'. Node B's clock is 3 seconds ahead. B's <em>older, wrong</em> write beats A's <em>newer, correct</em> write — and the correct update is silently discarded. Wall-clock LWW is a data-loss bug wearing a clever disguise.</div>

        <h3>Physical vs logical clocks</h3>
        <ul>
          <li><strong>Physical clocks</strong> measure real time but drift and are unsynchronized. Great for 'roughly when'; useless for 'exactly what order'.</li>
          <li><strong>Logical clocks</strong> ignore real time and only capture <em>causality</em> — the happened-before relation. This is what we actually need for ordering events.</li>
        </ul>

        <h3>Lamport clocks 🔢</h3>
        <p>A single counter per node. Rules: (1) increment on every local event; (2) attach the counter to every message you send; (3) on receive, set <code>local = max(local, received) + 1</code>. Guarantee: <strong>if A happened-before B, then timestamp(A) &lt; timestamp(B).</strong> The catch — the converse is false: a smaller number does NOT prove causality. Lamport clocks give a total order but cannot tell you whether two events were causal or merely concurrent.</p>

        <h3>Vector clocks 📊</h3>
        <p>Each node keeps a vector: one counter per node. On a local event, bump your own slot; on receive, take the element-wise max, then bump your slot. Now you can <em>compare</em> two events:</p>
        <table>
          <tr><th>Comparison</th><th>Meaning</th></tr>
          <tr><td>V(A) &lt; V(B) elementwise</td><td>A happened-before B (causal)</td></tr>
          <tr><td>V(B) &lt; V(A) elementwise</td><td>B happened-before A</td></tr>
          <tr><td>neither dominates</td><td><strong>concurrent</strong> → a real conflict to resolve</td></tr>
        </table>
        <pre><code>Start:   A=[0,0,0]  B=[0,0,0]
A writes:      A=[1,0,0]  --msg-->  B merges: B=[1,1,0]
B writes:      B=[1,2,0]
C writes:      C=[0,0,1]   (concurrent with A and B — neither dominates)</code></pre>
        <p>Vector clocks are how Dynamo/Riak detect that two updates were truly concurrent (so they surface both 'siblings' for the app to merge) rather than blindly picking a winner.</p>

        <div class='callout good'><div class='c-title'>Hybrid Logical Clocks (HLC) — the practical middle</div>Vector clocks grow with cluster size; wall clocks lie. <strong>HLCs</strong> (used by CockroachDB, YugabyteDB, MongoDB) fuse a physical timestamp with a logical counter into one compact 64-bit-ish value that stays close to real time <em>and</em> respects causality. You get sortable, human-meaningful timestamps that never go backwards for causally related events.</div>

        <div class='callout good'><div class='c-title'>The Google Spanner trick: TrueTime ⏱️</div>Spanner faces this head-on with GPS + atomic clocks that expose time as an <em>interval</em> <code>[earliest, latest]</code> with a bounded uncertainty (a few ms). To guarantee order, it simply <strong>waits out the uncertainty</strong> (commit-wait) before committing. Buying physics to get global external consistency — the ultimate flex.</div>

        <div class='callout'><div class='c-title'>Interview soundbite</div>'Never order distributed events by wall-clock time — clocks drift and last-write-wins silently drops data. Use logical clocks: Lamport gives a total order consistent with causality; vector clocks detect true concurrency; HLCs give you both causality and near-real timestamps; Spanner buys atomic clocks and waits out the uncertainty.'</div>
      `,
    },
    {
      id: 'crdts-anti-entropy',
      group: 'Building blocks',
      nav: '9 · CRDTs & gossip',
      title: 'CRDTs, gossip & anti-entropy',
      lede: 'How do leaderless, always-writable systems let replicas diverge and then merge back together — automatically, with no coordination and no lost writes?',
      html: `
        <p>AP systems (Cassandra, DynamoDB, Riak) accept writes on any replica, so replicas <em>will</em> diverge. The magic is reconciling them without a coordinator. Two ingredients: a way to <strong>merge concurrent states</strong> (CRDTs) and a way to <strong>spread and repair</strong> data (gossip + anti-entropy).</p>

        <h3>CRDTs: math that guarantees convergence 🧮</h3>
        <p>A <strong>Conflict-free Replicated Data Type</strong> is a data structure whose merge operation is <strong>commutative, associative, and idempotent</strong>. Because of those properties, replicas that receive the same set of updates in <em>any order, any number of times</em> always converge to the same state — no locks, no consensus. This is <strong>Strong Eventual Consistency</strong>.</p>
        <ul>
          <li><strong>G-Counter</strong> (grow-only): a vector of per-node counts; merge = element-wise max; value = sum. A <strong>PN-Counter</strong> uses two G-Counters (increments + decrements) to allow subtraction.</li>
          <li><strong>OR-Set</strong> (observed-remove set): tags each add with a unique id so concurrent add/remove resolves sensibly (add wins over a remove it didn't see). Beats a naïve LWW set.</li>
          <li><strong>LWW-Register</strong>: last-write-wins by timestamp — simplest, but can drop concurrent writes (the same trap as before).</li>
        </ul>
        <p>Real uses: <strong>Redis</strong> Enterprise active-active, <strong>Riak</strong> data types, collaborative editors (<strong>Automerge</strong>, <strong>Yjs</strong> powering Figma-style multiplayer). The tradeoff: metadata overhead (tombstones, tags) and merges that are semantically 'correct' but maybe not what a human wanted.</p>

        <div class='diagram'>
          <svg viewBox='0 0 640 150' width='640'>
            <rect class='node-box worker' x='30' y='40' width='150' height='44' rx='8'/>
            <text class='node-text' x='105' y='60' text-anchor='middle'>Replica A</text>
            <text class='node-sub' x='105' y='76' text-anchor='middle'>{x:3, y:1}</text>
            <rect class='node-box worker' x='460' y='40' width='150' height='44' rx='8'/>
            <text class='node-text' x='535' y='60' text-anchor='middle'>Replica B</text>
            <text class='node-sub' x='535' y='76' text-anchor='middle'>{x:1, y:5}</text>
            <line class='edge' x1='180' y1='62' x2='460' y2='62'/>
            <text class='edge-label' x='320' y='52' text-anchor='middle'>gossip + element-wise max merge</text>
            <rect class='node-box tool' x='245' y='104' width='150' height='40' rx='8'/>
            <text class='node-text' x='320' y='129' text-anchor='middle'>both → {x:3, y:5}</text>
          </svg>
          <div class='diagram-caption'>A G-Counter merges by max per node — order-independent, so replicas always converge.</div>
        </div>

        <h3>Gossip &amp; anti-entropy</h3>
        <p><strong>Gossip protocols</strong> spread information like a rumor: each node periodically picks a few random peers and exchanges state. Information reaches all N nodes in <code>O(log N)</code> rounds, with no central coordinator and graceful failure tolerance. Used for membership/failure detection (Cassandra, Consul's SWIM, Serf).</p>
        <p><strong>Anti-entropy</strong> is the background process that repairs divergence. To compare two big datasets efficiently, replicas exchange <strong>Merkle trees</strong>: a hash tree where a single differing leaf shows up as a mismatched root, letting you binary-search to the exact diverged keys instead of shipping everything. Dynamo and Cassandra use this for repair; <strong>read repair</strong> and <strong>hinted handoff</strong> handle the online cases.</p>

        <div class='callout warn'><div class='c-title'>Gotcha: tombstones and the deleted-data resurrection</div>In an eventually-consistent store, a delete must leave a <strong>tombstone</strong> — otherwise a replica that never saw the delete will 'resurrect' the value during anti-entropy. Tombstones must outlive the slowest possible repair, then be garbage-collected. Set GC too aggressive and zombies rise from the dead.</div>

        <div class='callout'><div class='c-title'>Interview soundbite</div>'CRDTs are data types whose merge is commutative, associative, and idempotent, so replicas converge with zero coordination — strong eventual consistency. Gossip spreads state in O(log N) rounds; anti-entropy uses Merkle trees to find and repair exactly the diverged keys. And never forget tombstones, or deletes come back to life.'</div>
      `,
    },
    {
      id: 'idempotency',
      group: 'Reliability',
      nav: '10 · Idempotency',
      title: 'Idempotency & the exactly-once myth',
      lede: '"Exactly-once delivery" is the unicorn of distributed systems. What you can actually build is at-least-once delivery plus idempotent processing. That combo IS the myth, delivered.',
      html: `
        <p>Here is the two-generals problem coming back to bite: when a request times out, you cannot tell if it failed or if only the <em>response</em> was lost. So you retry. And now the operation might run twice. Charging a card twice, shipping two orders, sending duplicate emails — welcome to the duplicate-delivery hall of shame.</p>

        <h3>The three delivery guarantees</h3>
        <table>
          <tr><th>Guarantee</th><th>Reality</th></tr>
          <tr><td><strong>At-most-once</strong></td><td>Fire and forget. Simple, but you may lose messages.</td></tr>
          <tr><td><strong>At-least-once</strong></td><td>Retry until acked. Never lose, but may duplicate. <em>The practical default.</em></td></tr>
          <tr><td><strong>Exactly-once</strong> (delivery)</td><td>A comforting fiction over an unreliable network. Cannot be guaranteed at the delivery layer.</td></tr>
        </table>

        <div class='callout danger'><div class='c-title'>The myth, dispelled</div>You cannot achieve exactly-once <em>delivery</em> (two-generals says so). What you CAN achieve is <strong>exactly-once effect</strong> = at-least-once delivery + idempotent processing. When someone says 'Kafka does exactly-once', they mean idempotent producers + transactional offsets — effect-level, within Kafka's boundary, not magic network delivery.</div>

        <h3>What is idempotency?</h3>
        <p>An operation is <span class='kicker'>idempotent</span> if doing it twice equals doing it once. <code>SET balance = 100</code> is idempotent; <code>balance = balance + 50</code> is not. The whole game is turning non-idempotent actions into idempotent ones.</p>

        <h3>The idempotency key pattern 🔑</h3>
        <p>The client generates a unique key (a UUID) per logical operation and sends it with the request. The server records processed keys and their results. Stripe made this the industry standard.</p>
        <pre><code>POST /charges
Idempotency-Key: 3f7a-9c21-...   // same key on every retry

// server logic (atomic):
seen = store.get(key)
if seen: return seen.response          // replay the stored result
result = doCharge(...)                  // do the work exactly once
store.put(key, result, ttl=24h)        // remember it
return result</code></pre>
        <p>Retries reuse the same key, so the second, third, and fourth attempts return the cached result instead of charging again. Store keys with a TTL (24h is common) and make the check-and-set atomic (a unique DB constraint or <code>INSERT ... ON CONFLICT</code>).</p>

        <div class='callout warn'><div class='c-title'>Gotcha: the race condition</div>Two retries arrive simultaneously; both check 'seen?', both see no, both charge. Fix: make the key a <strong>unique constraint</strong> so the second insert fails, or grab a row lock. 'Check then act' without atomicity is a bug.</div>

        <div class='callout good'><div class='c-title'>Consumer-side dedup</div>On the receiving end, keep a dedup table/bloom filter of processed message IDs. A natural business key (order_id) is even better than a random one because it dedups across the whole pipeline.</div>

        <div class='callout'><div class='c-title'>Interview soundbite</div>'Exactly-once delivery is impossible; exactly-once <em>effect</em> is not. Build it with at-least-once delivery plus idempotent handlers — typically an idempotency key backed by a unique constraint so retries replay the stored result instead of re-doing the work.'</div>
      `,
    },
    {
      id: 'failure-handling',
      group: 'Reliability',
      nav: '11 · Failure handling',
      title: 'Timeouts, retries & circuit breakers',
      lede: 'A resilient system is not one that never fails — it is one that fails politely, contains the blast radius, and does not turn a hiccup into a stampede.',
      html: `
        <p>Every remote call is a tiny gamble. The art of reliability is a small toolkit of patterns that keep one slow dependency from taking down your whole service. Master these four and you can talk resilience with anyone.</p>

        <h3>1. Timeouts — never wait forever ⏳</h3>
        <p>A call with no timeout can hang a thread indefinitely; enough of them and your thread pool is exhausted and you are down. <strong>Every</strong> network call needs a timeout. Set it from real latency data: a common rule is timeout ≈ p99 latency + margin. Also set a total deadline that propagates across the call chain (deadline propagation) so a request cannot outlive its budget.</p>

        <h3>2. Retries — but carefully 🔁</h3>
        <p>Retries fix transient blips. Naïve retries create disasters. Two non-negotiable rules:</p>
        <ul>
          <li><strong>Only retry idempotent operations</strong> (see previous lesson) or you double-charge.</li>
          <li><strong>Exponential backoff + jitter.</strong> Retrying immediately, in lockstep, creates a <em>thundering herd</em> that hammers a struggling service in synchronized waves.</li>
        </ul>
        <pre><code>base = 100ms; cap = 10s
// full jitter — the AWS-recommended flavor
delay = random_between(0, min(cap, base * 2 ** attempt))
// attempt 0: 0–100ms, attempt 1: 0–200ms, attempt 2: 0–400ms ...</code></pre>
        <p>Jitter <strong>desynchronizes</strong> retries so clients spread out instead of stampeding together. Also cap total attempts and use a retry budget (retry at most X% of traffic) so retries cannot amplify an outage.</p>

        <div class='callout danger'><div class='c-title'>War story: retry storm</div>A downstream service slows down. Every client retries 3× with no backoff. Effective load triples exactly when the service is weakest, guaranteeing it stays down. The retries — meant to help — became the outage. Backoff + jitter + budgets exist to prevent precisely this.</div>

        <h3>3. Circuit breakers — stop kicking the corpse 🔌</h3>
        <p>Borrowed from electrical engineering. Wrap a flaky dependency in a breaker with three states:</p>
        <div class='diagram'>
          <svg viewBox='0 0 640 150' width='640'>
            <defs><marker id='arrow3' markerWidth='10' markerHeight='10' refX='8' refY='3' orient='auto'><path d='M0,0 L8,3 L0,6 Z' fill='#8b98a9'/></marker></defs>
            <rect class='node-box worker' x='30' y='50' width='150' height='54' rx='8'/>
            <text class='node-text' x='105' y='75' text-anchor='middle'>CLOSED</text>
            <text class='node-sub' x='105' y='92' text-anchor='middle'>calls flow</text>
            <line class='edge' x1='180' y1='77' x2='250' y2='77' marker-end='url(#arrow3)'/>
            <text class='edge-label' x='215' y='68' text-anchor='middle'>fails ≥ threshold</text>
            <rect class='node-box tool' x='250' y='50' width='150' height='54' rx='8'/>
            <text class='node-text' x='325' y='75' text-anchor='middle'>OPEN</text>
            <text class='node-sub' x='325' y='92' text-anchor='middle'>fail fast</text>
            <line class='edge' x1='400' y1='77' x2='470' y2='77' marker-end='url(#arrow3)'/>
            <text class='edge-label' x='435' y='68' text-anchor='middle'>after cooldown</text>
            <rect class='node-box' x='470' y='50' width='150' height='54' rx='8'/>
            <text class='node-text' x='545' y='75' text-anchor='middle'>HALF-OPEN</text>
            <text class='node-sub' x='545' y='92' text-anchor='middle'>test 1 call</text>
          </svg>
          <div class='diagram-caption'>Closed → Open (fail fast) → Half-open (probe) → back to Closed on success.</div>
        </div>
        <p>When failures cross a threshold, the breaker <strong>opens</strong> and calls fail instantly (no waiting, no threads held) — giving the dependency room to recover and your service room to breathe. After a cooldown it goes <strong>half-open</strong> and lets one probe through; success closes it, failure re-opens.</p>

        <h3>4. Bulkheads &amp; graceful degradation 🚢</h3>
        <p>Isolate resources (separate thread pools/connection pools per dependency) so one drowning dependency cannot sink the whole ship. And design fallbacks: serve stale cache, a default, or a partial page rather than a hard error. Netflix's Hystrix popularized breaker + bulkhead + fallback together; modern stacks use resilience4j, Envoy/Istio outlier detection, or service-mesh retries.</p>

        <div class='callout'><div class='c-title'>Interview soundbite</div>'Timeouts on every call, retries only for idempotent ops with exponential backoff <em>and jitter</em> to avoid thundering herds, circuit breakers to fail fast and let a sick dependency recover, and bulkheads to contain the blast radius. Resilience is about failing politely, not never failing.'</div>
      `,
    },
    {
      id: 'distributed-locks',
      group: 'Reliability',
      nav: '12 · Distributed locks',
      title: 'Distributed locks & leases',
      lede: 'A mutex on one machine is trivial. A lock shared across a network — where the lock holder can pause, die, or get partitioned away — is a minefield that has burned very smart people.',
      html: `
        <p>Sometimes only one node may do a thing at a time: run a cron job once, be the leader, mutate a shared resource. A <strong>distributed lock</strong> enforces that. The problem: the holder can crash while holding it, so a lock with no expiry deadlocks the system forever.</p>

        <h3>Leases: locks with a timeout ⏲️</h3>
        <p>The fix is a <strong>lease</strong> — a lock that auto-expires after a TTL. If the holder dies, the lease lapses and someone else can grab it. But TTLs create the central hazard: what if the holder is just <em>slow</em>, not dead?</p>

        <div class='callout danger'><div class='c-title'>The killer scenario: the GC pause</div>Client A acquires a 10s lease and starts writing. Then A hits a 15s stop-the-world GC pause (or a VM migration, or a slow disk). The lease expires; client B legitimately acquires it and starts writing. A wakes up, still believing it holds the lock, and writes too. <strong>Two writers, corrupted data.</strong> A timeout alone cannot prevent this.</div>

        <h3>Fencing tokens: the actual fix 🛡️</h3>
        <p>Every time the lock is granted, the lock service hands out a <strong>monotonically increasing number</strong> — a fencing token. The client includes the token with every write to the protected resource. The resource <strong>remembers the highest token it has seen and rejects any lower one</strong>. So when zombie A (token 33) wakes up and writes after B (token 34) already wrote, the storage rejects 33. The stale writer is fenced off.</p>
        <div class='diagram'>
          <svg viewBox='0 0 640 170' width='640'>
            <defs><marker id='arrow4' markerWidth='10' markerHeight='10' refX='8' refY='3' orient='auto'><path d='M0,0 L8,3 L0,6 Z' fill='#8b98a9'/></marker></defs>
            <rect class='node-box worker' x='20' y='20' width='150' height='40' rx='8'/>
            <text class='node-text' x='95' y='45' text-anchor='middle'>Client A (tok 33)</text>
            <rect class='node-box worker' x='20' y='110' width='150' height='40' rx='8'/>
            <text class='node-text' x='95' y='135' text-anchor='middle'>Client B (tok 34)</text>
            <line class='edge' x1='170' y1='40' x2='430' y2='75' marker-end='url(#arrow4)'/>
            <text class='edge-label' x='300' y='45' text-anchor='middle'>write tok 33 → REJECTED</text>
            <line class='edge' x1='170' y1='130' x2='430' y2='95' marker-end='url(#arrow4)'/>
            <text class='edge-label' x='300' y='140' text-anchor='middle'>write tok 34 → OK</text>
            <rect class='node-box tool' x='430' y='65' width='180' height='44' rx='8'/>
            <text class='node-text' x='520' y='87' text-anchor='middle'>Storage</text>
            <text class='node-sub' x='520' y='103' text-anchor='middle'>max seen = 34</text>
          </svg>
          <div class='diagram-caption'>Fencing: storage rejects any token lower than the highest it has accepted.</div>
        </div>

        <h3>Where do locks come from?</h3>
        <p>Use a system that gives real linearizable guarantees and a monotonic token: <strong>ZooKeeper</strong> (ephemeral sequential znodes — the sequence number is your fencing token), <strong>etcd</strong> (leases + revision numbers), or Consul. These are consensus-backed, so the lock survives node failure correctly.</p>

        <div class='callout warn'><div class='c-title'>The Redlock debate 🥊</div>Redis's <strong>Redlock</strong> algorithm (acquire a lease on a majority of independent Redis nodes) is famous partly for the fight it started. Martin Kleppmann argued it is unsafe for correctness: it relies on bounded clocks and network delay, and provides no fencing token, so GC pauses can still cause double-writes. Redis's antirez rebutted. The takeaway: for <em>efficiency</em> locks (avoid duplicate work, occasional overlap is fine) Redlock is okay; for <em>correctness</em> locks (must never double-write) use a consensus system and fencing tokens.</div>

        <div class='callout'><div class='c-title'>Interview soundbite</div>'A distributed lock must be a lease (auto-expiring) or a dead holder deadlocks everyone — but a TTL alone is unsafe because a GC pause makes a slow holder look dead, so two clients write at once. The real fix is fencing tokens: a monotonic number the storage checks, rejecting any stale writer. That is why Redlock is debated and etcd/ZooKeeper are preferred for correctness locks.'</div>
      `,
    },
    {
      id: 'distributed-transactions',
      group: 'Reliability',
      nav: '13 · Transactions',
      title: 'Distributed transactions',
      lede: 'One database transaction is easy. Coordinating a commit across three services and two databases — while any of them might crash mid-flight — is where careers are made.',
      html: `
        <p>You want 'all of these happen or none of them' across multiple services. Local ACID transactions do not span network boundaries, so you need distributed coordination. There are two schools of thought, and knowing when to use each is prime interview material.</p>

        <h3>Two-phase commit (2PC) 🤝</h3>
        <p>A coordinator drives a synchronous, atomic commit across participants:</p>
        <ol>
          <li><strong>Prepare:</strong> coordinator asks everyone 'can you commit?' Each participant does the work, locks resources, writes to its log, and votes YES/NO.</li>
          <li><strong>Commit:</strong> if all voted YES, coordinator tells everyone 'commit'. Any NO → 'abort'.</li>
        </ol>
        <div class='callout danger'><div class='c-title'>Why 2PC is feared: the blocking problem</div>If the coordinator crashes <em>after</em> participants voted YES but <em>before</em> sending the decision, participants are stuck holding locks, unable to commit or abort — they must wait for the coordinator to return. Locks held across services + a single point of failure = throughput poison. 2PC is correct but does not scale and does not tolerate coordinator failure gracefully. (3PC adds a phase to reduce blocking but breaks under network partitions — rarely used.)</div>

        <h3>Sagas — commit locally, compensate on failure 🎭</h3>
        <p>A saga breaks the distributed transaction into a sequence of <strong>local</strong> transactions, each with a <strong>compensating action</strong> that semantically undoes it. No global locks, no blocking. If step 4 fails, you run the compensations for steps 3, 2, 1 in reverse.</p>
        <div class='diagram'>
          <svg viewBox='0 0 640 160' width='640'>
            <defs><marker id='arrow5' markerWidth='10' markerHeight='10' refX='8' refY='3' orient='auto'><path d='M0,0 L8,3 L0,6 Z' fill='#8b98a9'/></marker></defs>
            <rect class='node-box' x='20' y='30' width='120' height='46' rx='8'/><text class='node-text' x='80' y='58' text-anchor='middle'>Order</text>
            <line class='edge' x1='140' y1='53' x2='190' y2='53' marker-end='url(#arrow5)'/>
            <rect class='node-box' x='190' y='30' width='120' height='46' rx='8'/><text class='node-text' x='250' y='58' text-anchor='middle'>Payment</text>
            <line class='edge' x1='310' y1='53' x2='360' y2='53' marker-end='url(#arrow5)'/>
            <rect class='node-box tool' x='360' y='30' width='120' height='46' rx='8'/><text class='node-text' x='420' y='52' text-anchor='middle'>Inventory</text>
            <text class='node-sub' x='420' y='68' text-anchor='middle'>FAILS ✗</text>
            <line class='edge' x1='420' y1='100' x2='250' y2='100' marker-end='url(#arrow5)'/>
            <line class='edge' x1='250' y1='118' x2='80' y2='118' marker-end='url(#arrow5)'/>
            <text class='edge-label' x='250' y='140' text-anchor='middle'>compensate: refund, cancel order</text>
          </svg>
          <div class='diagram-caption'>Saga: forward steps commit locally; on failure, run compensations in reverse.</div>
        </div>
        <div class='two-col'>
          <div><div class='pattern-card'><h4>Choreography</h4><p>Each service emits events; the next reacts. No central brain.</p><div class='tag-row'><span class='tag use'>use for few steps</span><span class='tag avoid'>avoid when flow is complex</span></div></div></div>
          <div><div class='pattern-card'><h4>Orchestration</h4><p>A central orchestrator commands each step and tracks state.</p><div class='tag-row'><span class='tag use'>use for complex flows</span><span class='tag avoid'>avoid tight coupling to orchestrator</span></div></div></div>
        </div>
        <div class='callout warn'><div class='c-title'>Saga gotcha: no isolation</div>Sagas give you atomicity (eventually) but NOT isolation. Between steps, other transactions can see intermediate state (an order exists before payment confirms). You must design for it — semantic locks, status flags like <code>PENDING</code>, or re-reads. Orchestrators like Temporal, AWS Step Functions, and Camunda manage this state durably.</div>

        <h3>The outbox pattern — the dual-write killer 📤</h3>
        <p>The classic bug: you update the DB <em>and</em> publish an event to a broker as two separate operations. Crash in between → they disagree (the <strong>dual-write problem</strong>). The outbox fixes it: within the <em>same local transaction</em>, write your business row AND an 'outbox' row. A separate relay reads the outbox and publishes to the broker (at-least-once, hence idempotent consumers). One atomic local commit, no lost or phantom events.</p>
        <pre><code>BEGIN;
  INSERT INTO orders (...) VALUES (...);
  INSERT INTO outbox (topic, payload) VALUES ('order.created', '...');
COMMIT;
-- relay (CDC / poller) ships outbox rows to Kafka, marks them sent</code></pre>

        <div class='callout'><div class='c-title'>Interview soundbite</div>'Avoid 2PC in high-throughput microservices — it holds locks across services and blocks on coordinator failure. Prefer sagas: local transactions plus compensating actions, accepting eventual consistency and no isolation. And use the outbox pattern to publish events atomically with your DB write, killing the dual-write problem.'</div>
      `,
    },
    {
      id: 'caching',
      group: 'Reliability',
      nav: '14 · Caching',
      title: 'Caching & consistency',
      lede: 'There are only two hard problems in computer science: cache invalidation, naming things, and off-by-one errors. This lesson is about the first one.',
      html: `
        <p>Caching is the highest-leverage performance move you have — and a rich source of stale-data bugs and self-inflicted outages. Let us cover the strategies, the consistency pitfalls, and the two stampede patterns everyone gets asked about.</p>

        <h3>Caching strategies</h3>
        <table>
          <tr><th>Strategy</th><th>How it works</th><th>Trade-off</th></tr>
          <tr><td><strong>Cache-aside</strong> (lazy)</td><td>App checks cache; on miss, loads from DB and populates cache</td><td>Most common; first request is slow; risk of stale after writes</td></tr>
          <tr><td><strong>Write-through</strong></td><td>Writes go to cache AND DB synchronously</td><td>Cache always fresh; slower writes</td></tr>
          <tr><td><strong>Write-behind</strong></td><td>Write to cache, flush to DB async</td><td>Fast writes; risk data loss if cache dies</td></tr>
          <tr><td><strong>Read-through</strong></td><td>Cache library loads from DB on miss for you</td><td>Cleaner app code; ties you to cache layer</td></tr>
        </table>

        <h3>Invalidation: the real trap</h3>
        <p>The safest default is not 'update the cache on write' — it is <strong>invalidate (delete) the entry and let the next read repopulate</strong>. Why? Trying to update the cache in place invites a nasty race:</p>
        <div class='callout warn'><div class='c-title'>Gotcha: the stale-set race</div>Reader A misses cache, reads DB (value=1). Meanwhile Writer B updates DB to 2 and deletes the cache. Then A — still holding its stale 1 — writes 1 into the cache. Now cache=1 forever while DB=2. Mitigations: delete-on-write (not update), short TTLs as a safety net, or set-with-version. TTL is your seatbelt: even if invalidation logic has a bug, staleness is bounded.</div>

        <h3>Thundering herd / cache stampede 🐂</h3>
        <p>A hot key expires. In the same millisecond, 10,000 requests all miss and all slam the database with the identical query. The DB buckles — an outage caused by a <em>cache expiry</em>. Three defenses:</p>
        <ul>
          <li><strong>Request coalescing / single-flight.</strong> Let one request recompute while the others wait for its result (Go's <code>singleflight</code>, or a per-key lock).</li>
          <li><strong>Early / probabilistic recompute.</strong> Refresh the value <em>before</em> it expires (jittered), so it is never simultaneously cold for everyone.</li>
          <li><strong>Stale-while-revalidate.</strong> Serve the slightly-stale value and refresh in the background.</li>
        </ul>

        <div class='callout danger'><div class='c-title'>War story: cache penetration &amp; the 3am avalanche</div>Two cousins of the herd: <strong>penetration</strong> — repeated requests for a key that does not exist bypass the cache and pound the DB (fix: cache the negative result / bloom filter). <strong>Avalanche</strong> — thousands of keys share the same TTL and all expire at once (fix: add random jitter to every TTL so expirations spread out).</div>

        <div class='callout good'><div class='c-title'>Rule of thumb</div>Cache-aside + delete-on-write + jittered TTL covers 90% of cases. Add single-flight for hot keys and negative caching for missing keys. Always jitter your TTLs.</div>

        <div class='callout'><div class='c-title'>Interview soundbite</div>'I default to cache-aside and invalidate by deleting, not updating, to dodge stale-set races — with a TTL as a bounded-staleness seatbelt. For hot keys I add single-flight to prevent stampedes, negative caching to stop penetration, and jittered TTLs to avoid a synchronized avalanche.'</div>
      `,
    },
    {
      id: 'recap-cheatsheet',
      group: 'Wrap-up',
      nav: '15 · Cheat-sheet',
      title: 'Rapid-fire interview cheat-sheet',
      lede: 'Everything above, compressed into fridge-magnet answers you can fire back in an interview without blinking. Read this on the train to the on-site.',
      html: `
        <p>You made it. 🎉 Here is the whole course as a rapid-fire Q&amp;A — the soundbites, mnemonics, and numbers that make you sound like you have run these systems in production. Skim it, then close the tab and try to answer from memory.</p>

        <h3>⚡ The one-liners</h3>
        <table>
          <tr><th>Question</th><th>Fire back</th></tr>
          <tr><td>What makes distributed systems hard?</td><td>Partial failure — you cannot distinguish a dead node from a slow one.</td></tr>
          <tr><td>Latency numbers to know?</td><td>Memory ~100ns, SSD ~100µs, same-DC RTT ~0.5ms, cross-continent ~150ms. Ratios &gt; absolutes.</td></tr>
          <tr><td>How many nines is 99.99%?</td><td>~52 min/year down. Each extra nine = 10× less downtime; multiply dependencies in series.</td></tr>
          <tr><td>State CAP correctly.</td><td>Partitions are inevitable, so it is C-vs-A <em>during a partition</em>; use PACELC for the no-partition case (latency vs consistency).</td></tr>
          <tr><td>Strong vs eventual consistency?</td><td>Strong = behaves like one copy in real time (costs latency/availability); eventual = replicas converge if writes stop.</td></tr>
          <tr><td>Quorum formula?</td><td><code>W + R &gt; N</code> guarantees read/write set overlap.</td></tr>
          <tr><td>Why odd-sized consensus clusters?</td><td>Safety needs overlapping majorities; 3 tolerates 1, 5 tolerates 2; even sizes add cost without more fault tolerance.</td></tr>
          <tr><td>Raft in one sentence?</td><td>Majority-elected leader replicates a log; an entry commits once a quorum persists it.</td></tr>
          <tr><td>Hash vs range sharding?</td><td>Hash spreads load, kills range scans; range enables scans, invites sequential-key hotspots.</td></tr>
          <tr><td>Rebalance without reshuffling?</td><td>Consistent hashing (virtual nodes) or a fixed large partition count.</td></tr>
          <tr><td>Queue vs log?</td><td>Queue delivers once to one worker then forgets; log (Kafka) is retained, ordered, replayable.</td></tr>
          <tr><td>Kafka ordering &amp; parallelism?</td><td>Order only within a partition (by key); consumer-group parallelism caps at partition count.</td></tr>
          <tr><td>Why not order events by wall clock?</td><td>Clocks drift; last-write-wins silently drops data. Use logical/vector clocks or HLCs.</td></tr>
          <tr><td>Vector clock superpower?</td><td>Detects true <em>concurrency</em> (neither event dominates) — the real conflict.</td></tr>
          <tr><td>What is a CRDT?</td><td>A type whose merge is commutative/associative/idempotent → replicas converge with zero coordination.</td></tr>
          <tr><td>How do AP stores repair drift?</td><td>Gossip (O(log N)) + anti-entropy via Merkle trees; watch out for tombstones.</td></tr>
          <tr><td>Is exactly-once real?</td><td>Not at delivery. Exactly-once <em>effect</em> = at-least-once + idempotency.</td></tr>
          <tr><td>Idempotency in practice?</td><td>Idempotency key + unique constraint; retries replay the stored result.</td></tr>
          <tr><td>Retry safely?</td><td>Only idempotent ops, exponential backoff + <strong>jitter</strong>, retry budget.</td></tr>
          <tr><td>Circuit breaker states?</td><td>Closed → Open (fail fast) → Half-open (probe) → Closed.</td></tr>
          <tr><td>Distributed lock done right?</td><td>Lease (auto-expire) + fencing token (monotonic, storage rejects stale) — not a bare TTL.</td></tr>
          <tr><td>2PC vs saga?</td><td>2PC = atomic but blocks on coordinator failure; saga = local txns + compensations, eventual, no isolation.</td></tr>
          <tr><td>Dual-write problem fix?</td><td>Outbox pattern: write business row + event in one local txn, relay publishes.</td></tr>
          <tr><td>Cache invalidation default?</td><td>Delete on write (not update), jittered TTL as a seatbelt.</td></tr>
          <tr><td>Thundering herd fix?</td><td>Single-flight/coalescing, early refresh, stale-while-revalidate; jitter TTLs.</td></tr>
        </table>

        <h3>🧠 Mnemonics to keep</h3>
        <ul>
          <li><strong>PACELC</strong> — the trade-off never sleeps: Partition→A/C, Else→L/C.</li>
          <li><strong>W + R &gt; N</strong> — 'the sets must kiss' (overlap).</li>
          <li><strong>Retry = backoff + jitter</strong> — no jitter means a stampede.</li>
          <li><strong>Exactly-once = at-least-once + idempotent</strong>.</li>
          <li><strong>Invalidate, do not update</strong> — deleting dodges the stale-set race.</li>
          <li><strong>Lease + fence</strong> — a TTL alone is a GC-pause data-corruption bug.</li>
          <li><strong>CRDT = C.A.I. merge</strong> — Commutative, Associative, Idempotent → convergence.</li>
        </ul>

        <div class='callout good'><div class='c-title'>How to structure a system-design answer</div>Clarify requirements &amp; scale → estimate numbers → sketch the happy path → then attack it: 'What happens when this node dies? When the network partitions? When traffic 10×? When two requests race?' Showing you think about <em>failure modes</em> is what separates senior from mid.</div>

        <div class='callout danger'><div class='c-title'>Red flags to never say</div>'Just use exactly-once delivery.' · 'Pick two from CAP.' · 'We will sync the clocks.' · 'Retries will fix it' (with no backoff/idempotency). · 'A Redis lock with a TTL is enough' (no fencing). Each one signals you have not felt the pain.</div>

        <div class='callout'><div class='c-title'>Interview soundbite</div>'Distributed systems is the art of building reliable behavior from unreliable parts. You cannot beat partial failure, the two-generals problem, or clock drift — so you engineer around them with idempotency, quorums, consensus, backoff, fencing tokens, and bounded staleness. Correctness first, then contain the blast radius.'</div>
      `,
    },
  ],
  quizzes: [
    {
      question: 'During a network partition, the CAP theorem forces a distributed data store to sacrifice which guarantee if it wants to keep serving all requests?',
      options: [
        { text: 'Partition tolerance', correct: false },
        { text: 'Consistency', correct: true },
        { text: 'Durability', correct: false },
      ],
      explain: 'Partition tolerance is not optional (the network will partition), so the real choice is C vs A during a partition. Choosing availability means accepting possibly-inconsistent reads/writes.',
    },
    {
      question: 'You estimate a service that fans out to 4 independent dependencies in series, each with 99.9% availability. Roughly what is the combined availability?',
      options: [
        { text: 'About 99.9% — the weakest link sets the ceiling', correct: false },
        { text: 'About 99.6% — availabilities multiply in series (0.999^4)', correct: true },
        { text: 'About 100% — redundancy cancels the failures out', correct: false },
      ],
      explain: 'Dependencies in series multiply: 0.999^4 ≈ 0.996, i.e. ~99.6%. Every synchronous dependency you add drags availability down, which is why you reduce the critical path, add fallbacks, or make calls async.',
    },
    {
      question: 'A leaderless store has N=3 replicas. Which W/R setting guarantees that every read overlaps every write (so a read always sees at least one up-to-date copy)?',
      options: [
        { text: 'W=1, R=1', correct: false },
        { text: 'W=2, R=2', correct: true },
        { text: 'W=1, R=2', correct: false },
      ],
      explain: 'The quorum rule is W + R > N. With N=3, W=2 and R=2 gives 4 > 3, guaranteeing the read and write sets overlap. W=1,R=2 gives exactly 3, which does not overlap.',
    },
    {
      question: 'Why are consensus clusters (Raft/Paxos) almost always deployed with an odd number of nodes?',
      options: [
        { text: 'Odd numbers hash more evenly across the ring', correct: false },
        { text: 'Safety relies on overlapping majorities; going 3→4 tolerates the same failures (1) but costs more', correct: true },
        { text: 'An even number can never elect a leader at all', correct: false },
      ],
      explain: 'A 3-node cluster tolerates 1 failure; a 4-node cluster still tolerates only 1 (a majority is 3). Odd sizes maximize fault tolerance per node, and overlapping majorities prevent split brain.',
    },
    {
      question: 'A Kafka topic has 6 partitions. You add a 10th consumer to a single consumer group to increase throughput. What happens?',
      options: [
        { text: 'All 10 consumers share the load evenly, each reading ~60% of a partition', correct: false },
        { text: '4 consumers sit idle — a partition is read by at most one consumer in the group, so parallelism caps at the partition count', correct: true },
        { text: 'Kafka automatically splits partitions to match the 10 consumers', correct: false },
      ],
      explain: 'Within a consumer group each partition is assigned to exactly one consumer, so the maximum useful parallelism equals the number of partitions. With 6 partitions and 10 consumers, 4 are idle. To scale further you must increase partitions.',
    },
    {
      question: 'What is the fundamental problem with resolving concurrent writes using wall-clock "last-write-wins"?',
      options: [
        { text: 'Timestamps take too much storage space', correct: false },
        { text: 'Clock drift means an older, wrong write can have a higher timestamp and silently overwrite the correct one', correct: true },
        { text: 'Wall clocks cannot represent sub-second precision', correct: false },
      ],
      explain: 'Physical clocks drift and are unsynchronized across nodes. A node whose clock runs fast can stamp a stale write with a higher value, causing the newer correct write to be silently discarded — a data-loss bug.',
    },
    {
      question: 'A client acquires a lock with a 10s lease, then suffers a 15s stop-the-world GC pause. Meanwhile another client acquires the now-expired lease. What actually prevents the paused client from corrupting the resource when it wakes up?',
      options: [
        { text: 'A longer lease TTL — just set it to 60s', correct: false },
        { text: 'A fencing token: the storage remembers the highest token granted and rejects any write carrying a lower one', correct: true },
        { text: 'Synchronizing all clocks with NTP so the pause cannot happen', correct: false },
      ],
      explain: 'No TTL can distinguish a slow holder from a dead one, so both clients may think they own the lock. A monotonic fencing token checked by the storage rejects the stale (lower-token) writer, which is why bare-TTL locks like Redlock are debated for correctness use cases.',
    },
    {
      question: 'A senior engineer claims their message queue provides "exactly-once delivery." What is the most accurate correction?',
      options: [
        { text: 'Exactly-once delivery is impossible over an unreliable network; you get exactly-once effect via at-least-once delivery plus idempotent processing', correct: true },
        { text: 'Exactly-once requires at-most-once delivery plus retries', correct: false },
        { text: 'It is fine as stated; modern brokers guarantee exactly-once delivery', correct: false },
      ],
      explain: 'The two-generals problem makes exactly-once delivery unachievable. Systems deliver at-least-once and rely on idempotent handlers (e.g., idempotency keys) to make the observable effect exactly-once.',
    },
    {
      question: 'Why is exponential backoff with JITTER preferred over plain exponential backoff when retrying failed requests?',
      options: [
        { text: 'Jitter reduces the total number of retries needed', correct: false },
        { text: 'Jitter desynchronizes clients so they do not retry in synchronized waves and cause a thundering herd', correct: true },
        { text: 'Jitter makes retries idempotent', correct: false },
      ],
      explain: 'Without jitter, many clients back off by the same intervals and retry simultaneously, hammering a recovering service in waves. Random jitter spreads retries out over time, smoothing the load.',
    },
    {
      question: 'You must update a database row and publish a corresponding event to Kafka atomically. Which pattern prevents the dual-write problem (DB and broker disagreeing after a crash)?',
      options: [
        { text: 'Two-phase commit between the DB and Kafka', correct: false },
        { text: 'The outbox pattern: write the business row and an outbox row in one local transaction, then relay the outbox to the broker', correct: true },
        { text: 'Publish to Kafka first, then write the DB row', correct: false },
      ],
      explain: 'The outbox pattern turns two writes into one atomic local transaction (business row + outbox row). A separate relay reliably ships outbox rows to the broker, so a crash can never leave the DB and event stream inconsistent.',
    },
  ],
};
