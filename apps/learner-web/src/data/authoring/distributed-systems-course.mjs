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

        <div class='callout warn'><div class='c-title'>War story</div>A 'quick' health check timed out at 30s. A GC pause froze a node for 12s; the load balancer marked it dead, shifted traffic, overloaded its neighbor, which then GC-paused too. A cascading failure from <em>one slow node lying about being alive</em>. Slow is the new down.</div>

        <div class='callout good'><div class='c-title'>Rule of thumb</div>Design for <strong>partial failure first</strong>. Ask of every remote call: 'What if this hangs forever? What if it succeeds but the response is lost?'</div>

        <div class='callout'><div class='c-title'>Interview soundbite</div>'A distributed system is one where a machine you have never heard of can make your machine unusable. The hard part is not concurrency — it is <em>partial failure</em>: components fail independently and you cannot tell failure from slowness.'</div>
      `,
    },
    {
      id: 'consistency-models',
      group: 'Foundations',
      nav: '1 · Consistency',
      title: 'Consistency models',
      lede: 'When you have copies of data, "read the latest value" stops being obvious. Consistency models are the contracts that define what "latest" even means.',
      html: `
        <p>Once data lives in more than one place, you face the central bargain of distributed systems: <strong>how fresh must a read be, and how much latency will you pay for it?</strong> A consistency model is the promise the system makes to the programmer about what values reads can return.</p>

        <h3>The spectrum, strongest to weakest</h3>
        <table>
          <tr><th>Model</th><th>Promise</th><th>Mental image</th></tr>
          <tr><td><strong>Linearizable</strong> (strong)</td><td>Reads see the most recent write; the system behaves like a single copy</td><td>One golden ledger everyone shares in real time</td></tr>
          <tr><td><strong>Sequential</strong></td><td>All nodes agree on one order of ops, but not necessarily real-time order</td><td>Everyone watches the same movie, maybe on a delay</td></tr>
          <tr><td><strong>Causal</strong></td><td>Operations that are cause-and-effect are seen in order; unrelated ones can differ</td><td>You always see the question before its answer</td></tr>
          <tr><td><strong>Read-your-writes</strong></td><td>You always see your own updates</td><td>You post a tweet and it is there when you refresh</td></tr>
          <tr><td><strong>Eventual</strong></td><td>If writes stop, replicas eventually converge — someday</td><td>Rumor spreading through an office</td></tr>
        </table>

        <h3>Analogy: the group chat 💬</h3>
        <p><strong>Linearizable:</strong> everyone sees every message in the exact same order, the instant it is sent. <strong>Causal:</strong> you might see messages in different orders, but a <em>reply</em> never shows up before the message it replies to. <strong>Eventual:</strong> messages arrive out of order and duplicated, but if everyone stops typing, all screens eventually match. Most 'weird' bugs in weakly-consistent systems are a reply appearing before its cause — which is exactly what causal consistency forbids.</p>

        <div class='callout warn'><div class='c-title'>Gotcha: read-your-writes</div>User uploads a profile photo (write hits the leader), then the page reload reads from a stale follower and shows the old photo. User is convinced the upload failed and does it three more times. Fix: route a user's reads to the leader for a few seconds, or pin them to the replica that has their write (session/monotonic consistency).</div>

        <h3>Why weaker is often the right call</h3>
        <p>Strong consistency requires coordination on <em>every</em> write, which means latency and reduced availability under partitions. A 'like' counter, a viewed-badge, a shopping-cart merge — these tolerate eventual consistency happily. Reach for strong consistency where correctness is non-negotiable: <strong>account balances, inventory decrements, unique-username claims, and locks.</strong></p>

        <div class='callout good'><div class='c-title'>Rule of thumb</div>Default to the <em>weakest</em> model that keeps the business correct. Coordination is a tax; only pay it where a stale read causes real damage.</div>

        <div class='callout'><div class='c-title'>Interview soundbite</div>'Linearizable = there is a single, real-time order of operations, as if one machine served them all. Eventual = replicas converge if you stop writing. Everything interesting lives in between, and causal consistency is the sweet spot for most user-facing apps.'</div>
      `,
    },
    {
      id: 'cap-pacelc',
      group: 'Foundations',
      nav: '2 · CAP & PACELC',
      title: 'CAP theorem, honestly',
      lede: 'CAP is the most quoted and least understood theorem in our field. Let us defuse it, then upgrade to PACELC which is what actually guides design.',
      html: `
        <p>The CAP theorem (Brewer, proven by Gilbert &amp; Lynch) says a distributed data store cannot simultaneously guarantee all three of <span class='kicker'>Consistency</span>, <span class='kicker'>Availability</span>, and <span class='kicker'>Partition tolerance</span>. The popular reading — 'pick two' — is <strong>wrong and harmful</strong>.</p>

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
        <p>CAP is silent about the 99.99% of the time when there is no partition. Abadi's <strong>PACELC</strong> fills the gap:</p>
        <p style='text-align:center'><strong>if (P)artition → trade (A)vailability vs (C)onsistency; (E)lse → trade (L)atency vs (C)onsistency.</strong></p>
        <p>This is the real daily trade-off: even with a perfect network, keeping replicas linearizable costs latency (you must wait for a quorum to ack). So:</p>
        <table>
          <tr><th>System</th><th>PACELC class</th><th>Reading</th></tr>
          <tr><td>Cassandra / Dynamo</td><td>PA/EL</td><td>Favors availability under partition, latency otherwise</td></tr>
          <tr><td>Spanner</td><td>PC/EC</td><td>Favors consistency always (and pays latency for it)</td></tr>
          <tr><td>MongoDB (default)</td><td>PA/EC</td><td>Available under partition, consistent when healthy</td></tr>
        </table>

        <div class='callout'><div class='c-title'>Interview soundbite</div>'CAP is not pick-two; partition tolerance is mandatory, so CAP is really C-vs-A <em>during a partition</em>. The theorem that guides real design is PACELC: even with no partition, you trade latency against consistency on every request.'</div>
      `,
    },
    {
      id: 'replication',
      group: 'Building blocks',
      nav: '3 · Replication',
      title: 'Replication & quorums',
      lede: 'Copies give you durability, availability, and read scale. They also give you the delightful problem of keeping the copies from disagreeing.',
      html: `
        <p>Replication means keeping the same data on multiple nodes. You do it for three reasons: survive machine death (<strong>durability</strong>), keep serving during failures (<strong>availability</strong>), and spread read load (<strong>throughput</strong>). The tax is keeping replicas in agreement.</p>

        <h3>Leader / follower (a.k.a. primary/replica) 👑</h3>
        <p>One node is the leader; all writes go there. It streams a replication log to followers, which apply it in order and serve reads. Simple, battle-tested (Postgres, MySQL, Kafka partitions, Redis).</p>

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
          <tr><th></th><th>Synchronous</th><th>Asynchronous</th></tr>
          <tr><td>Leader acks after…</td><td>follower(s) confirm</td><td>local write only</td></tr>
          <tr><td>Write latency</td><td>higher (network RTT)</td><td>lower</td></tr>
          <tr><td>If leader dies</td><td>no data loss</td><td><strong>lose un-replicated writes</strong></td></tr>
        </table>

        <div class='callout warn'><div class='c-title'>Gotcha: async failover data loss</div>Async replication + automatic failover = a promoted follower that never received the last few committed writes. Those acknowledged writes vanish. GitHub's 2018 outage was rooted here. Mitigation: <strong>semi-sync</strong> (wait for at least one follower) and consensus-backed failover.</div>

        <h3>Leaderless &amp; quorums 🗳️</h3>
        <p>Dynamo-style systems skip the leader. A client writes to <strong>W</strong> replicas and reads from <strong>R</strong> of <strong>N</strong> total. The magic inequality:</p>
        <p style='text-align:center'><strong>if W + R &gt; N, every read set overlaps every write set → you always see at least one fresh copy.</strong></p>
        <p>With <code>N=3</code>: <code>W=2, R=2</code> is the classic balanced quorum (survives one node down, strongish reads). Want fast writes? <code>W=1</code>. Fast reads? <code>R=1</code>. But dropping below the overlap threshold buys speed with stale reads.</p>

        <div class='callout good'><div class='c-title'>Rule of thumb</div><code>W+R&gt;N</code> gives strong-ish reads; conflicts still need resolution (last-write-wins by timestamp is lossy; version vectors are safer). Quorums are <em>not</em> free linearizability.</div>

        <div class='callout'><div class='c-title'>Interview soundbite</div>'Single-leader is simple and gives you a natural serialization point; the risk is failover data loss with async replication. Leaderless uses quorums — W+R&gt;N guarantees read/write overlap — trading conflict-resolution complexity for availability.'</div>
      `,
    },
    {
      id: 'consensus',
      group: 'Building blocks',
      nav: '4 · Consensus',
      title: 'Consensus: Raft & Paxos intuition',
      lede: 'How do a bunch of unreliable machines agree on a single value — like "who is the leader" — even as some of them crash? That is consensus, the beating heart of the cluster.',
      html: `
        <p>Consensus is the problem of getting a group of nodes to <strong>agree on one value</strong> despite crashes and message loss. It underpins leader election, distributed locks, config management, and the commit order of a replicated log. If you have used etcd, ZooKeeper, Consul, or Kafka's controller, you have leaned on consensus.</p>

        <h3>The properties it must give you</h3>
        <ul>
          <li><strong>Agreement:</strong> no two nodes decide different values.</li>
          <li><strong>Validity:</strong> the decided value was actually proposed by someone.</li>
          <li><strong>Termination:</strong> non-faulty nodes eventually decide.</li>
        </ul>
        <p>FLP impossibility (1985) proves you cannot guarantee all three in a fully async system with even one crash — so real systems use <strong>timeouts</strong> to make progress, sacrificing guaranteed termination for practical liveness.</p>

        <h3>Raft: consensus you can actually explain 🎓</h3>
        <p>Raft was designed to be <em>understandable</em> (unlike Paxos, which is notoriously brain-bending). It has three ideas:</p>
        <ol>
          <li><strong>Leader election.</strong> Time is divided into <em>terms</em>. Each node has a randomized election timeout; if it hears no heartbeat, it becomes a candidate, bumps the term, and asks for votes. A node grants one vote per term. Win a <strong>majority</strong> → you are leader. Randomized timeouts make split votes rare.</li>
          <li><strong>Log replication.</strong> Clients send commands to the leader, which appends to its log and replicates to followers. Once a majority persist an entry, it is <strong>committed</strong> and applied to the state machine.</li>
          <li><strong>Safety.</strong> A candidate can only win if its log is at least as up-to-date as the majority, so a committed entry is never lost.</li>
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
        <p>A majority of any two overlapping majorities share at least one node — so two different leaders cannot both be elected in the same term, and a committed entry (on a majority) is seen by any future leader (also a majority). This is why consensus clusters are <strong>odd-sized</strong>: 3 tolerates 1 failure, 5 tolerates 2. Adding a node from 3→4 does <em>not</em> improve fault tolerance (still tolerates 1) but does slow you down.</p>

        <div class='callout warn'><div class='c-title'>Gotcha: split brain</div>Two leaders accepting writes = split brain = corruption. Majority quorums prevent it: the minority side of a partition cannot form a majority, so it cannot elect a leader or commit. This is precisely why even-node clusters are a trap.</div>

        <div class='callout good'><div class='c-title'>Paxos vs Raft in one breath</div>They solve the same problem. Paxos is a family of protocols (Multi-Paxos for logs); Raft packages the same guarantees with an explicit strong leader and clean terms, so it is far easier to implement correctly.</div>

        <div class='callout'><div class='c-title'>Interview soundbite</div>'Consensus = a cluster agreeing on one value despite crashes. Raft does it with a leader elected by majority vote and a log that commits an entry once a quorum persists it. Odd cluster sizes, because safety rides on overlapping majorities.'</div>
      `,
    },
    {
      id: 'partitioning',
      group: 'Building blocks',
      nav: '5 · Partitioning',
      title: 'Partitioning & sharding',
      lede: 'When data outgrows one machine, you split it. How you split it decides whether your database scales gracefully or collapses onto one poor overloaded shard.',
      html: `
        <p>Partitioning (a.k.a. sharding) splits a big dataset across nodes so each holds a slice. Done well, capacity and throughput scale linearly. Done badly, you get <span class='kicker'>hotspots</span> — one shard melting while the rest nap.</p>

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
          <li><strong>Consistent hashing.</strong> Map nodes and keys onto a ring; a key belongs to the next node clockwise. Adding a node only moves the keys in its arc — roughly <code>1/N</code> of the data. Add virtual nodes to smooth the distribution.</li>
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

        <div class='callout warn'><div class='c-title'>Gotcha: cross-shard queries</div>Joins and transactions spanning shards are slow and painful. Choose a <strong>shard key that co-locates data you query together</strong> (e.g., tenant_id for a multi-tenant SaaS) so most queries hit a single shard.</div>

        <div class='callout'><div class='c-title'>Interview soundbite</div>'Hash spreads load but kills range scans; range enables scans but invites hotspots on sequential keys. To rebalance without reshuffling everything, use consistent hashing or a fixed large partition count — and pick a shard key that co-locates your common queries.'</div>
      `,
    },
    {
      id: 'time-and-ordering',
      group: 'Building blocks',
      nav: '6 · Time & clocks',
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

        <div class='callout good'><div class='c-title'>The Google Spanner trick: TrueTime ⏱️</div>Spanner faces this head-on with GPS + atomic clocks that expose time as an <em>interval</em> <code>[earliest, latest]</code> with a bounded uncertainty (a few ms). To guarantee order, it simply <strong>waits out the uncertainty</strong> before committing. Buying physics to get global consistency — the ultimate flex.</div>

        <div class='callout'><div class='c-title'>Interview soundbite</div>'Never order distributed events by wall-clock time — clocks drift and last-write-wins silently drops data. Use logical clocks: Lamport gives a total order consistent with causality; vector clocks go further and detect true concurrency, which is exactly the conflict you must resolve.'</div>
      `,
    },
    {
      id: 'idempotency',
      group: 'Reliability',
      nav: '7 · Idempotency',
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
      nav: '8 · Failure handling',
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
            <defs><marker id='arrow' markerWidth='10' markerHeight='10' refX='8' refY='3' orient='auto'><path d='M0,0 L8,3 L0,6 Z' fill='#8b98a9'/></marker></defs>
            <rect class='node-box worker' x='30' y='50' width='150' height='54' rx='8'/>
            <text class='node-text' x='105' y='75' text-anchor='middle'>CLOSED</text>
            <text class='node-sub' x='105' y='92' text-anchor='middle'>calls flow</text>
            <line class='edge' x1='180' y1='77' x2='250' y2='77' marker-end='url(#arrow)'/>
            <text class='edge-label' x='215' y='68' text-anchor='middle'>fails ≥ threshold</text>
            <rect class='node-box tool' x='250' y='50' width='150' height='54' rx='8'/>
            <text class='node-text' x='325' y='75' text-anchor='middle'>OPEN</text>
            <text class='node-sub' x='325' y='92' text-anchor='middle'>fail fast</text>
            <line class='edge' x1='400' y1='77' x2='470' y2='77' marker-end='url(#arrow)'/>
            <text class='edge-label' x='435' y='68' text-anchor='middle'>after cooldown</text>
            <rect class='node-box' x='470' y='50' width='150' height='54' rx='8'/>
            <text class='node-text' x='545' y='75' text-anchor='middle'>HALF-OPEN</text>
            <text class='node-sub' x='545' y='92' text-anchor='middle'>test 1 call</text>
          </svg>
          <div class='diagram-caption'>Closed → Open (fail fast) → Half-open (probe) → back to Closed on success.</div>
        </div>
        <p>When failures cross a threshold, the breaker <strong>opens</strong> and calls fail instantly (no waiting, no threads held) — giving the dependency room to recover and your service room to breathe. After a cooldown it goes <strong>half-open</strong> and lets one probe through; success closes it, failure re-opens.</p>

        <h3>4. Bulkheads &amp; graceful degradation 🚢</h3>
        <p>Isolate resources (separate thread pools/connection pools per dependency) so one drowning dependency cannot sink the whole ship. And design fallbacks: serve stale cache, a default, or a partial page rather than a hard error. Netflix's Hystrix popularized breaker + bulkhead + fallback together.</p>

        <div class='callout'><div class='c-title'>Interview soundbite</div>'Timeouts on every call, retries only for idempotent ops with exponential backoff <em>and jitter</em> to avoid thundering herds, circuit breakers to fail fast and let a sick dependency recover, and bulkheads to contain the blast radius. Resilience is about failing politely, not never failing.'</div>
      `,
    },
    {
      id: 'distributed-transactions',
      group: 'Reliability',
      nav: '9 · Transactions',
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
        <div class='callout danger'><div class='c-title'>Why 2PC is feared: the blocking problem</div>If the coordinator crashes <em>after</em> participants voted YES but <em>before</em> sending the decision, participants are stuck holding locks, unable to commit or abort — they must wait for the coordinator to return. Locks held across services + a single point of failure = throughput poison. 2PC is correct but does not scale and does not tolerate coordinator failure gracefully.</div>

        <h3>Sagas — commit locally, compensate on failure 🎭</h3>
        <p>A saga breaks the distributed transaction into a sequence of <strong>local</strong> transactions, each with a <strong>compensating action</strong> that semantically undoes it. No global locks, no blocking. If step 4 fails, you run the compensations for steps 3, 2, 1 in reverse.</p>
        <div class='diagram'>
          <svg viewBox='0 0 640 160' width='640'>
            <defs><marker id='arrow' markerWidth='10' markerHeight='10' refX='8' refY='3' orient='auto'><path d='M0,0 L8,3 L0,6 Z' fill='#8b98a9'/></marker></defs>
            <rect class='node-box' x='20' y='30' width='120' height='46' rx='8'/><text class='node-text' x='80' y='58' text-anchor='middle'>Order</text>
            <line class='edge' x1='140' y1='53' x2='190' y2='53' marker-end='url(#arrow)'/>
            <rect class='node-box' x='190' y='30' width='120' height='46' rx='8'/><text class='node-text' x='250' y='58' text-anchor='middle'>Payment</text>
            <line class='edge' x1='310' y1='53' x2='360' y2='53' marker-end='url(#arrow)'/>
            <rect class='node-box tool' x='360' y='30' width='120' height='46' rx='8'/><text class='node-text' x='420' y='52' text-anchor='middle'>Inventory</text>
            <text class='node-sub' x='420' y='68' text-anchor='middle'>FAILS ✗</text>
            <line class='edge' x1='420' y1='100' x2='250' y2='100' marker-end='url(#arrow)'/>
            <line class='edge' x1='250' y1='118' x2='80' y2='118' marker-end='url(#arrow)'/>
            <text class='edge-label' x='250' y='140' text-anchor='middle'>compensate: refund, cancel order</text>
          </svg>
          <div class='diagram-caption'>Saga: forward steps commit locally; on failure, run compensations in reverse.</div>
        </div>
        <div class='two-col'>
          <div><div class='pattern-card'><h4>Choreography</h4><p>Each service emits events; the next reacts. No central brain.</p><div class='tag-row'><span class='tag use'>use for few steps</span><span class='tag avoid'>avoid when flow is complex</span></div></div></div>
          <div><div class='pattern-card'><h4>Orchestration</h4><p>A central orchestrator commands each step and tracks state.</p><div class='tag-row'><span class='tag use'>use for complex flows</span><span class='tag avoid'>avoid tight coupling to orchestrator</span></div></div></div>
        </div>
        <div class='callout warn'><div class='c-title'>Saga gotcha: no isolation</div>Sagas give you atomicity (eventually) but NOT isolation. Between steps, other transactions can see intermediate state (an order exists before payment confirms). You must design for it — semantic locks, status flags like <code>PENDING</code>, or re-reads.</div>

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
      nav: '10 · Caching',
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
      nav: '11 · Cheat-sheet',
      title: 'Rapid-fire interview cheat-sheet',
      lede: 'Everything above, compressed into fridge-magnet answers you can fire back in an interview without blinking. Read this on the train to the on-site.',
      html: `
        <p>You made it. 🎉 Here is the whole course as a rapid-fire Q&amp;A — the soundbites, mnemonics, and numbers that make you sound like you have run these systems in production. Skim it, then close the tab and try to answer from memory.</p>

        <h3>⚡ The one-liners</h3>
        <table>
          <tr><th>Question</th><th>Fire back</th></tr>
          <tr><td>What makes distributed systems hard?</td><td>Partial failure — you cannot distinguish a dead node from a slow one.</td></tr>
          <tr><td>State CAP correctly.</td><td>Partitions are inevitable, so it is C-vs-A <em>during a partition</em>; use PACELC for the no-partition case (latency vs consistency).</td></tr>
          <tr><td>Strong vs eventual consistency?</td><td>Strong = behaves like one copy in real time (costs latency/availability); eventual = replicas converge if writes stop.</td></tr>
          <tr><td>Quorum formula?</td><td><code>W + R &gt; N</code> guarantees read/write set overlap.</td></tr>
          <tr><td>Why odd-sized consensus clusters?</td><td>Safety needs overlapping majorities; 3 tolerates 1, 5 tolerates 2; even sizes add cost without more fault tolerance.</td></tr>
          <tr><td>Raft in one sentence?</td><td>Majority-elected leader replicates a log; an entry commits once a quorum persists it.</td></tr>
          <tr><td>Hash vs range sharding?</td><td>Hash spreads load, kills range scans; range enables scans, invites sequential-key hotspots.</td></tr>
          <tr><td>Rebalance without reshuffling?</td><td>Consistent hashing or fixed large partition count.</td></tr>
          <tr><td>Why not order events by wall clock?</td><td>Clocks drift; last-write-wins silently drops data. Use logical/vector clocks.</td></tr>
          <tr><td>Vector clock superpower?</td><td>Detects true <em>concurrency</em> (neither event dominates) — the real conflict.</td></tr>
          <tr><td>Is exactly-once real?</td><td>Not at delivery. Exactly-once <em>effect</em> = at-least-once + idempotency.</td></tr>
          <tr><td>Idempotency in practice?</td><td>Idempotency key + unique constraint; retries replay the stored result.</td></tr>
          <tr><td>Retry safely?</td><td>Only idempotent ops, exponential backoff + <strong>jitter</strong>, retry budget.</td></tr>
          <tr><td>Circuit breaker states?</td><td>Closed → Open (fail fast) → Half-open (probe) → Closed.</td></tr>
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
        </ul>

        <div class='callout good'><div class='c-title'>How to structure a system-design answer</div>Clarify requirements &amp; scale → estimate numbers → sketch the happy path → then attack it: 'What happens when this node dies? When the network partitions? When traffic 10×? When two requests race?' Showing you think about <em>failure modes</em> is what separates senior from mid.</div>

        <div class='callout danger'><div class='c-title'>Red flags to never say</div>'Just use exactly-once delivery.' · 'Pick two from CAP.' · 'We will sync the clocks.' · 'Retries will fix it' (with no backoff/idempotency). Each one signals you have not felt the pain.</div>

        <div class='callout'><div class='c-title'>Final soundbite</div>'Distributed systems is the art of building reliable behavior from unreliable parts. You cannot beat partial failure, the two-generals problem, or clock drift — so you engineer around them with idempotency, quorums, consensus, backoff, and bounded staleness. Correctness first, then contain the blast radius.'</div>
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
      question: 'What is the fundamental problem with resolving concurrent writes using wall-clock "last-write-wins"?',
      options: [
        { text: 'Timestamps take too much storage space', correct: false },
        { text: 'Clock drift means an older, wrong write can have a higher timestamp and silently overwrite the correct one', correct: true },
        { text: 'Wall clocks cannot represent sub-second precision', correct: false },
      ],
      explain: 'Physical clocks drift and are unsynchronized across nodes. A node whose clock runs fast can stamp a stale write with a higher value, causing the newer correct write to be silently discarded — a data-loss bug.',
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
