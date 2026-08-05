export default {
  id: 'event-driven-architecture-course',
  title: 'Event-Driven Architecture',
  icon: '📨',
  color: '#a5d6ff',
  lessons: [
    {
      id: 'mental-model',
      group: 'Foundations',
      nav: '0 · Mental model',
      title: 'The EDA mental model',
      lede: 'Stop making services phone each other. Let them shout facts into the room and let whoever cares listen.',
      html: `
        <p>Imagine a busy kitchen. In a <span class='kicker'>request/response</span> world, the head chef walks to each station and asks, <em>'Are the fries done? Are they done <strong>now</strong>?'</em> — blocking, waiting, tapping their foot. In an <span class='kicker'>event-driven</span> world, the fryer just yells <strong>'FRIES UP! 🍟'</strong> and moves on. Whoever needs fries grabs them. Nobody blocks. That yell is an <strong>event</strong>.</p>

        <h3>The three words interviewers conflate</h3>
        <table>
          <tr><th>Term</th><th>Intent</th><th>Tense</th><th>Coupling</th></tr>
          <tr><td><strong>Command</strong></td><td>'Do this' — <code>ChargeCard</code></td><td>imperative</td><td>1 known handler; sender expects it done</td></tr>
          <tr><td><strong>Event</strong></td><td>'This happened' — <code>CardCharged</code></td><td>past tense</td><td>0..N unknown listeners; fire-and-forget</td></tr>
          <tr><td><strong>Message</strong></td><td>the envelope carrying either one over a broker</td><td>—</td><td>the transport, not the semantics</td></tr>
        </table>

        <div class='callout'>
          <div class='c-title'>Name your events in the past tense</div>
          <code>OrderPlaced</code>, <code>PaymentCaptured</code>, <code>UserDeactivated</code>. If it reads like an order ('Deactivate this user') it's a command in disguise, and you've smuggled coupling back in.
        </div>

        <div class='diagram'>
          <svg viewBox='0 0 640 220' width='640'>
            <defs><marker id='arrow' markerWidth='10' markerHeight='10' refX='8' refY='3' orient='auto'><path d='M0,0 L8,3 L0,6 Z' fill='#8b98a9'/></marker></defs>
            <rect class='node-box' x='20' y='90' width='150' height='56' rx='8'/>
            <text class='node-text' x='95' y='115' text-anchor='middle'>Order Service</text>
            <text class='node-sub' x='95' y='132' text-anchor='middle'>publishes fact</text>
            <line class='edge' x1='170' y1='118' x2='270' y2='118' marker-end='url(#arrow)'/>
            <text class='edge-label' x='220' y='108' text-anchor='middle'>OrderPlaced</text>
            <rect class='node-box tool' x='270' y='90' width='110' height='56' rx='8'/>
            <text class='node-text' x='325' y='122' text-anchor='middle'>Broker</text>
            <line class='edge' x1='380' y1='108' x2='470' y2='50' marker-end='url(#arrow)'/>
            <line class='edge' x1='380' y1='118' x2='470' y2='118' marker-end='url(#arrow)'/>
            <line class='edge' x1='380' y1='128' x2='470' y2='186' marker-end='url(#arrow)'/>
            <rect class='node-box worker' x='470' y='24' width='150' height='48' rx='8'/>
            <text class='node-text' x='545' y='53' text-anchor='middle'>Email</text>
            <rect class='node-box worker' x='470' y='94' width='150' height='48' rx='8'/>
            <text class='node-text' x='545' y='123' text-anchor='middle'>Inventory</text>
            <rect class='node-box worker' x='470' y='164' width='150' height='48' rx='8'/>
            <text class='node-text' x='545' y='193' text-anchor='middle'>Analytics</text>
          </svg>
          <div class='diagram-caption'>One fact, three reactions. The publisher has never heard of any of them.</div>
        </div>

        <h3>Why go event-driven at all?</h3>
        <ul>
          <li><strong>Decoupling</strong> — add a fraud-check consumer without touching the order service. New features become new subscribers, not new deploys of old code.</li>
          <li><strong>Elasticity</strong> — the queue absorbs spikes; consumers drain at their own pace instead of falling over.</li>
          <li><strong>Resilience</strong> — if Email is down, the event waits in the broker. Nothing is lost, nobody is blocked.</li>
          <li><strong>Auditability</strong> — the stream of events <em>is</em> a history of everything that ever happened.</li>
        </ul>

        <div class='callout warn'>
          <div class='c-title'>The tax you pay</div>
          Async means eventual consistency, harder debugging (no single stack trace), duplicate/out-of-order messages, and 'where did my event go?' mysteries. EDA trades <strong>simplicity now</strong> for <strong>flexibility later</strong>. Don't reach for it to connect two services that could just call each other.
        </div>

        <div class='callout good'>
          <div class='c-title'>Interview soundbite</div>
          'A command is a request to change state — one handler, sender cares about the result. An event is a notification that state already changed — past tense, zero-to-many listeners, fire-and-forget. EDA inverts the dependency: publishers don't know their consumers.'
        </div>
      `,
    },
    {
      id: 'queues-vs-streams',
      group: 'Transports',
      nav: '1 · Queues vs streams',
      title: 'Message queues vs event streams',
      lede: 'A queue is a to-do list you tear items off. A stream is a diary you replay. Confusing them is the classic architecture-interview trap.',
      html: `
        <p>The single biggest 'senior' signal here is knowing that <strong>SQS/RabbitMQ and Kafka are not competitors — they are different data structures</strong>. One is a <span class='kicker'>work queue</span>, the other is a <span class='kicker'>distributed log</span>.</p>

        <div class='two-col'>
          <div>
            <h4>📋 Message queue (SQS, RabbitMQ)</h4>
            <ul>
              <li>Message is <strong>consumed and deleted</strong> once acked.</li>
              <li>Competing consumers share the load — each message goes to <em>one</em> worker.</li>
              <li>Think: <strong>task distribution</strong>. 'Process these 10k thumbnails.'</li>
              <li>No replay — once it's gone, it's gone (until it lands in a DLQ).</li>
            </ul>
          </div>
          <div>
            <h4>🗄️ Event stream / log (Kafka, Kinesis)</h4>
            <ul>
              <li>Message is <strong>appended to an immutable log</strong> and retained (hours to forever).</li>
              <li>Each consumer group has its own <strong>offset</strong> — many independent readers.</li>
              <li>Think: <strong>source of truth</strong> you can replay from any point.</li>
              <li>Rewind a new consumer to offset 0 and rebuild state from history.</li>
            </ul>
          </div>
        </div>

        <div class='diagram'>
          <svg viewBox='0 0 640 210' width='640'>
            <defs><marker id='arrow2' markerWidth='10' markerHeight='10' refX='8' refY='3' orient='auto'><path d='M0,0 L8,3 L0,6 Z' fill='#8b98a9'/></marker></defs>
            <text class='node-sub' x='20' y='30'>QUEUE (consume + delete)</text>
            <rect class='node-box' x='20' y='40' width='40' height='40' rx='6'/>
            <rect class='node-box' x='64' y='40' width='40' height='40' rx='6'/>
            <rect class='node-box' x='108' y='40' width='40' height='40' rx='6'/>
            <line class='edge' x1='160' y1='60' x2='230' y2='60' marker-end='url(#arrow2)'/>
            <rect class='node-box worker' x='230' y='40' width='120' height='40' rx='6'/>
            <text class='node-text' x='290' y='65' text-anchor='middle'>Worker</text>
            <text class='node-sub' x='430' y='63'>msg gone after ack</text>
            <text class='node-sub' x='20' y='130'>LOG (append + retain, per-reader offset)</text>
            <rect class='node-box tool' x='20' y='140' width='40' height='40' rx='6'/>
            <rect class='node-box tool' x='64' y='140' width='40' height='40' rx='6'/>
            <rect class='node-box tool' x='108' y='140' width='40' height='40' rx='6'/>
            <rect class='node-box tool' x='152' y='140' width='40' height='40' rx='6'/>
            <line class='edge' x1='200' y1='150' x2='280' y2='150' marker-end='url(#arrow2)'/>
            <text class='edge-label' x='240' y='143' text-anchor='middle'>offset A</text>
            <line class='edge' x1='200' y1='170' x2='280' y2='188' marker-end='url(#arrow2)'/>
            <text class='edge-label' x='240' y='188' text-anchor='middle'>offset B</text>
            <rect class='node-box worker' x='280' y='138' width='120' height='30' rx='6'/>
            <text class='node-text' x='340' y='158' text-anchor='middle'>Consumer 1</text>
            <rect class='node-box worker' x='280' y='176' width='120' height='30' rx='6'/>
            <text class='node-text' x='340' y='196' text-anchor='middle'>Consumer 2</text>
          </svg>
          <div class='diagram-caption'>Queue: one reader tears items off. Log: many readers, each tracking its own position.</div>
        </div>

        <h3>When to reach for which</h3>
        <div class='pattern-card'>
          <h4>Message queue (SQS / RabbitMQ)</h4>
          <p>Discrete jobs, task offloading, RPC-ish async work, low-to-moderate throughput, you don't need history.</p>
          <div class='tag-row'><span class='tag use'>use when: background jobs, decoupling a slow task</span><span class='tag avoid'>avoid when: you need replay or many independent readers</span></div>
        </div>
        <div class='pattern-card'>
          <h4>Event stream (Kafka / Kinesis)</h4>
          <p>High-throughput event pipelines, event sourcing, multiple downstream consumers of the same data, replay/reprocessing, strict per-key ordering.</p>
          <div class='tag-row'><span class='tag use'>use when: millions/sec, replay, many consumers</span><span class='tag avoid'>avoid when: simple job queue (operational overkill)</span></div>
        </div>

        <div class='callout warn'>
          <div class='c-title'>Gotcha: RabbitMQ can look stream-ish and Kafka can look queue-ish</div>
          RabbitMQ Streams and Kafka's consumer-in-a-group blur the line. Argue by <strong>semantics</strong> (delete-on-consume vs retain-with-offset), not brand names.
        </div>

        <div class='callout good'>
          <div class='c-title'>Interview soundbite</div>
          'A queue is a work-distribution buffer — consume once, then delete. A log is a replayable source of truth — append-only, retained, each consumer group owns its offset. Pick the queue for tasks, the log for event streams and event sourcing.'
        </div>
      `,
    },
    {
      id: 'pubsub-fanout',
      group: 'Transports',
      nav: '2 · Pub/sub & fan-out',
      title: 'Pub/sub, fan-out & consumer groups',
      lede: 'How do you get one event to ten teams — and scale one of those teams to twenty workers — without the others noticing?',
      html: `
        <p>Two dials you must never mix up: <span class='kicker'>fan-out</span> (one event → many <em>different</em> subscribers) and <span class='kicker'>scaling</span> (one subscriber → many <em>identical</em> workers). Consumer groups are how a log does both at once.</p>

        <h3>Fan-out: broadcast to distinct interests</h3>
        <p>SNS→SQS fan-out, RabbitMQ topic exchanges, Kafka topics with many consumer groups — same idea: publish once, and Email, Inventory, and Analytics each get their <em>own copy</em>. Adding a new subscriber is a config change, not a redeploy of the publisher.</p>

        <h3>Consumer groups: the elegant trick</h3>
        <p>In Kafka a topic has N <strong>partitions</strong>. A <strong>consumer group</strong> is a named team; the broker hands each partition to exactly one member of the group. So:</p>
        <ul>
          <li><strong>Within</strong> a group → partitions are split across members = horizontal scale (each message processed once by the group).</li>
          <li><strong>Across</strong> groups → every group independently reads all messages = fan-out.</li>
        </ul>

        <div class='diagram'>
          <svg viewBox='0 0 640 230' width='640'>
            <defs><marker id='arrow3' markerWidth='10' markerHeight='10' refX='8' refY='3' orient='auto'><path d='M0,0 L8,3 L0,6 Z' fill='#8b98a9'/></marker></defs>
            <rect class='node-box tool' x='20' y='30' width='120' height='30' rx='6'/>
            <text class='node-text' x='80' y='50' text-anchor='middle'>partition 0</text>
            <rect class='node-box tool' x='20' y='70' width='120' height='30' rx='6'/>
            <text class='node-text' x='80' y='90' text-anchor='middle'>partition 1</text>
            <rect class='node-box tool' x='20' y='110' width='120' height='30' rx='6'/>
            <text class='node-text' x='80' y='130' text-anchor='middle'>partition 2</text>
            <line class='edge' x1='140' y1='45' x2='250' y2='45' marker-end='url(#arrow3)'/>
            <line class='edge' x1='140' y1='85' x2='250' y2='75' marker-end='url(#arrow3)'/>
            <line class='edge' x1='140' y1='125' x2='250' y2='105' marker-end='url(#arrow3)'/>
            <rect class='node-box worker' x='250' y='30' width='150' height='30' rx='6'/>
            <text class='node-text' x='325' y='50' text-anchor='middle'>Group A · worker 1</text>
            <rect class='node-box worker' x='250' y='75' width='150' height='30' rx='6'/>
            <text class='node-text' x='325' y='95' text-anchor='middle'>Group A · worker 2</text>
            <text class='node-sub' x='250' y='125'>Group A = scale (split partitions)</text>
            <line class='edge' x1='140' y1='55' x2='250' y2='175' marker-end='url(#arrow3)'/>
            <line class='edge' x1='140' y1='95' x2='250' y2='185' marker-end='url(#arrow3)'/>
            <line class='edge' x1='140' y1='125' x2='250' y2='195' marker-end='url(#arrow3)'/>
            <rect class='node-box' x='250' y='165' width='150' height='40' rx='6'/>
            <text class='node-text' x='325' y='190' text-anchor='middle'>Group B · worker 1</text>
            <text class='node-sub' x='420' y='188'>Group B = fan-out (own copy)</text>
          </svg>
          <div class='diagram-caption'>Same topic: Group A splits the load; Group B independently reads everything.</div>
        </div>

        <div class='callout warn'>
          <div class='c-title'>Rule of thumb: partitions cap your parallelism</div>
          A consumer group can only have as many active workers as there are partitions. 6 partitions → at most 6 useful workers; a 7th sits idle. Size partitions for your peak concurrency <strong>up front</strong> — repartitioning later reshuffles keys and breaks ordering guarantees.
        </div>

        <div class='callout good'>
          <div class='c-title'>Interview soundbite</div>
          'Fan-out is one event to many distinct subscribers; scaling is many identical workers sharing one subscription. Kafka does both with consumer groups: within a group, partitions split the work; across groups, everyone gets a full copy.'
        </div>
      `,
    },
    {
      id: 'delivery-guarantees',
      group: 'Guarantees',
      nav: '3 · Delivery guarantees',
      title: 'Delivery guarantees & the truth about "exactly-once"',
      lede: 'At-most-once, at-least-once, exactly-once. One of these is mostly marketing. Know which — and why.',
      html: `
        <p>Every messaging interview eventually asks about delivery semantics. There are three claims, and the honest senior answer is: <strong>in a distributed system you get at-least-once, and you engineer the rest.</strong></p>

        <table>
          <tr><th>Guarantee</th><th>What it means</th><th>Failure mode</th><th>Ack strategy</th></tr>
          <tr><td><strong>At-most-once</strong></td><td>0 or 1 delivery</td><td>can <em>lose</em> messages</td><td>ack <em>before</em> processing</td></tr>
          <tr><td><strong>At-least-once</strong></td><td>1 or more deliveries</td><td>can <em>duplicate</em> messages</td><td>ack <em>after</em> processing</td></tr>
          <tr><td><strong>Exactly-once</strong></td><td>precisely 1 effect</td><td>hard/impossible end-to-end</td><td>at-least-once + idempotency</td></tr>
        </table>

        <h3>Why 'exactly-once' is a half-truth</h3>
        <p>The classic problem: a consumer processes a message, then crashes <em>before</em> it can commit the ack. On restart the broker re-delivers — you can't tell 'processed but didn't ack' from 'never processed'. This is the <strong>two-generals problem</strong> wearing a messaging costume. You cannot atomically 'do the side effect' and 'ack the broker' across two systems.</p>

        <div class='callout danger'>
          <div class='c-title'>War story</div>
          A payments team believed their broker's 'exactly-once' flag and skipped idempotency. A broker failover re-delivered a batch; customers got charged twice. 'Exactly-once' held <strong>inside</strong> the broker (producer→log), but the <strong>side effect</strong> (charging a card in Stripe) was a second system it couldn't control.
        </div>

        <div class='callout'>
          <div class='c-title'>What Kafka's 'exactly-once' actually covers</div>
          Idempotent producers + transactions give exactly-once for <strong>Kafka-to-Kafka</strong> (read topic → process → write topic + commit offset, atomically). The moment your side effect leaves Kafka (a DB, an email, a card charge), you're back to at-least-once + idempotency.
        </div>

        <h3>The pragmatic default</h3>
        <p><strong>Choose at-least-once, then make handlers idempotent.</strong> At-most-once is for cases where a lost message is cheaper than a duplicate (e.g. high-volume metrics where you'd rather drop a sample than double-count).</p>

        <div class='callout good'>
          <div class='c-title'>Interview soundbite</div>
          'Real systems give at-least-once; true end-to-end exactly-once is impossible because you can't atomically commit a side effect and an ack across two systems — that's the two-generals problem. So we do at-least-once delivery plus idempotent consumers, which is effectively-once.'
        </div>
      `,
    },
    {
      id: 'idempotency',
      group: 'Guarantees',
      nav: '4 · Idempotency',
      title: 'Idempotency & deduplication',
      lede: 'At-least-once means duplicates WILL happen. Idempotency is the shield that makes replaying the same message boring instead of catastrophic.',
      html: `
        <p><span class='kicker'>Idempotent</span> = doing it twice has the same effect as doing it once. Pressing an elevator button five times still summons one elevator. Your <code>ChargeCard</code> handler must behave the same way.</p>

        <h3>The four levers</h3>
        <ol>
          <li><strong>Idempotency key</strong> — attach a stable unique id to each event (a UUID minted by the producer, <em>not</em> re-generated on retry). Consumers dedupe on it.</li>
          <li><strong>Dedup store</strong> — record processed keys in a table/cache with a TTL. On arrival: <code>INSERT ... ON CONFLICT DO NOTHING</code>; if it was already there, skip.</li>
          <li><strong>Natural idempotency</strong> — model operations as <em>set</em> not <em>increment</em>. <code>status = 'PAID'</code> is safe to replay; <code>balance = balance - 10</code> is not.</li>
          <li><strong>Idempotent writes</strong> — upserts keyed by a deterministic id, or a <code>UNIQUE</code> constraint that turns a duplicate into a no-op.</li>
        </ol>

        <pre><code>async function handle(event) {
  // 1. cheap dedup: claim the key atomically
  const claimed = await db.query(
    'INSERT INTO processed (id) VALUES ($1) ON CONFLICT DO NOTHING RETURNING id',
    [event.idempotencyKey]
  );
  if (claimed.rowCount === 0) return; // already handled — ack and move on

  // 2. do the real work, ideally in the SAME transaction
  await applyEffect(event);
}</code></pre>

        <div class='callout warn'>
          <div class='c-title'>Gotcha: the outbox / inbox split</div>
          Dedup-record and side-effect must be atomic, or you can crash between them and lose idempotency. The <strong>inbox pattern</strong> writes the processed-key and the effect in one DB transaction. Its mirror, the <strong>outbox pattern</strong>, writes your business change and the outgoing event in one transaction, then a relay ships the event — killing dual-write inconsistency.
        </div>

        <div class='diagram'>
          <svg viewBox='0 0 640 160' width='640'>
            <defs><marker id='arrow4' markerWidth='10' markerHeight='10' refX='8' refY='3' orient='auto'><path d='M0,0 L8,3 L0,6 Z' fill='#8b98a9'/></marker></defs>
            <rect class='node-box' x='20' y='55' width='120' height='50' rx='8'/>
            <text class='node-text' x='80' y='84' text-anchor='middle'>Duplicate?</text>
            <line class='edge' x1='140' y1='70' x2='240' y2='40' marker-end='url(#arrow4)'/>
            <text class='edge-label' x='190' y='42' text-anchor='middle'>yes</text>
            <rect class='node-box worker' x='240' y='20' width='150' height='40' rx='8'/>
            <text class='node-text' x='315' y='45' text-anchor='middle'>skip + ack</text>
            <line class='edge' x1='140' y1='95' x2='240' y2='120' marker-end='url(#arrow4)'/>
            <text class='edge-label' x='190' y='122' text-anchor='middle'>no</text>
            <rect class='node-box tool' x='240' y='100' width='180' height='40' rx='8'/>
            <text class='node-text' x='330' y='125' text-anchor='middle'>claim key + effect (1 txn)</text>
          </svg>
          <div class='diagram-caption'>Dedup first, then apply the effect in the same transaction.</div>
        </div>

        <div class='callout good'>
          <div class='c-title'>Interview soundbite</div>
          'Because delivery is at-least-once, I make consumers idempotent: producers stamp a stable idempotency key, consumers dedupe on it in the same transaction as the side effect, and I prefer set-semantics and upserts over increments so replays are no-ops.'
        </div>
      `,
    },
    {
      id: 'ordering-partitioning',
      group: 'Guarantees',
      nav: '5 · Ordering & partitioning',
      title: 'Ordering & partitioning',
      lede: 'Global ordering is a lie you can\'t afford. Per-key ordering is the deal you actually make — and partition keys are how you make it.',
      html: `
        <p>Everyone wants 'events in order.' The senior insight: <strong>total ordering across a whole topic doesn't scale</strong> (it means one partition, one consumer, no parallelism). What you really need is <span class='kicker'>per-entity ordering</span> — all events for <em>account 42</em> in order, but account 42 and account 99 can fly in parallel.</p>

        <h3>How partition keys buy you ordering</h3>
        <p>Kafka guarantees order <strong>within a partition</strong>. Pick a <strong>partition key</strong> and the broker hashes it: <code>partition = hash(key) % numPartitions</code>. Use <code>accountId</code> as the key and every event for that account lands on the same partition, read by one consumer, in produce order. Different accounts spread across partitions for throughput.</p>

        <pre><code>producer.send({
  topic: 'account-events',
  key: event.accountId,        // same account -> same partition -> ordered
  value: JSON.stringify(event),
});</code></pre>

        <div class='diagram'>
          <svg viewBox='0 0 640 170' width='640'>
            <defs><marker id='arrow5' markerWidth='10' markerHeight='10' refX='8' refY='3' orient='auto'><path d='M0,0 L8,3 L0,6 Z' fill='#8b98a9'/></marker></defs>
            <rect class='node-box' x='20' y='30' width='150' height='30' rx='6'/>
            <text class='node-text' x='95' y='50' text-anchor='middle'>acct 42 events</text>
            <rect class='node-box' x='20' y='100' width='150' height='30' rx='6'/>
            <text class='node-text' x='95' y='120' text-anchor='middle'>acct 99 events</text>
            <line class='edge' x1='170' y1='45' x2='300' y2='45' marker-end='url(#arrow5)'/>
            <text class='edge-label' x='235' y='38' text-anchor='middle'>hash(42)</text>
            <line class='edge' x1='170' y1='115' x2='300' y2='115' marker-end='url(#arrow5)'/>
            <text class='edge-label' x='235' y='108' text-anchor='middle'>hash(99)</text>
            <rect class='node-box tool' x='300' y='30' width='150' height='30' rx='6'/>
            <text class='node-text' x='375' y='50' text-anchor='middle'>partition 0 (FIFO)</text>
            <rect class='node-box tool' x='300' y='100' width='150' height='30' rx='6'/>
            <text class='node-text' x='375' y='120' text-anchor='middle'>partition 1 (FIFO)</text>
          </svg>
          <div class='diagram-caption'>Key on accountId: per-account order preserved, accounts parallelized.</div>
        </div>

        <div class='callout warn'>
          <div class='c-title'>Gotchas that bite in production</div>
          <ul>
            <li><strong>Hot keys</strong> — a whale account with 90% of traffic pins one partition; ordering is fine but throughput collapses.</li>
            <li><strong>Repartitioning</strong> — change <code>numPartitions</code> and <code>hash(key) % N</code> remaps keys → ordering guarantee breaks across the boundary.</li>
            <li><strong>Retries reorder</strong> — with <code>max.in.flight &gt; 1</code> and retries, a re-sent message can land after a later one. Enable the idempotent producer to keep in-partition order.</li>
            <li><strong>Consumer concurrency</strong> — if one consumer fans a partition out to a thread pool, you just threw ordering away again.</li>
          </ul>
        </div>

        <div class='callout'>
          <div class='c-title'>SQS note</div>
          Standard SQS is best-effort ordering. <strong>SQS FIFO</strong> gives strict ordering + dedup, scoped by <code>MessageGroupId</code> (the same per-key idea), but caps throughput (300–3000 msg/s with batching).
        </div>

        <div class='callout good'>
          <div class='c-title'>Interview soundbite</div>
          'I don't promise global ordering — it forces one partition and kills throughput. I choose a partition key like accountId so all events for one entity stay ordered on one partition, while different entities parallelize. The tradeoffs are hot keys and painful repartitioning.'
        </div>
      `,
    },
    {
      id: 'saga-choreography-orchestration',
      group: 'Patterns',
      nav: '6 · Sagas',
      title: 'Choreography vs orchestration & the Saga pattern',
      lede: 'You can\'t hold a distributed transaction across five services. Sagas trade ACID atomicity for a chain of local commits and compensations.',
      html: `
        <p>An order touches Payment, Inventory, and Shipping — three databases, no shared transaction. A <span class='kicker'>Saga</span> breaks the workflow into local transactions; if step 3 fails, you run <strong>compensating actions</strong> to semantically undo steps 1–2 (refund, restock). It's not rollback — it's <em>apology</em>.</p>

        <div class='two-col'>
          <div>
            <h4>💃 Choreography</h4>
            <p>No conductor. Each service reacts to events and emits the next one. <code>OrderPlaced</code> → Payment emits <code>PaymentCaptured</code> → Inventory emits <code>StockReserved</code> → Shipping…</p>
            <div class='tag-row'><span class='tag use'>use when: 2–4 steps, loose coupling</span><span class='tag avoid'>avoid when: complex flows (logic smeared everywhere)</span></div>
          </div>
          <div>
            <h4>🎼 Orchestration</h4>
            <p>A central <strong>orchestrator</strong> (often a state machine — Step Functions, Temporal, Camunda) sends commands and awaits replies, driving the flow and compensations explicitly.</p>
            <div class='tag-row'><span class='tag use'>use when: many steps, need visibility</span><span class='tag avoid'>avoid when: trivial flow (orchestrator is overhead)</span></div>
          </div>
        </div>

        <div class='diagram'>
          <svg viewBox='0 0 640 200' width='640'>
            <defs><marker id='arrow6' markerWidth='10' markerHeight='10' refX='8' refY='3' orient='auto'><path d='M0,0 L8,3 L0,6 Z' fill='#8b98a9'/></marker></defs>
            <text class='node-sub' x='20' y='24'>Choreography (event chain)</text>
            <rect class='node-box' x='20' y='34' width='90' height='36' rx='6'/>
            <text class='node-text' x='65' y='57' text-anchor='middle'>Order</text>
            <line class='edge' x1='110' y1='52' x2='180' y2='52' marker-end='url(#arrow6)'/>
            <rect class='node-box worker' x='180' y='34' width='90' height='36' rx='6'/>
            <text class='node-text' x='225' y='57' text-anchor='middle'>Payment</text>
            <line class='edge' x1='270' y1='52' x2='340' y2='52' marker-end='url(#arrow6)'/>
            <rect class='node-box worker' x='340' y='34' width='90' height='36' rx='6'/>
            <text class='node-text' x='385' y='57' text-anchor='middle'>Inventory</text>
            <text class='node-sub' x='20' y='118'>Orchestration (central brain)</text>
            <rect class='node-box tool' x='240' y='128' width='150' height='40' rx='6'/>
            <text class='node-text' x='315' y='153' text-anchor='middle'>Orchestrator</text>
            <line class='edge' x1='240' y1='148' x2='150' y2='148' marker-end='url(#arrow6)'/>
            <rect class='node-box worker' x='40' y='128' width='110' height='40' rx='6'/>
            <text class='node-text' x='95' y='153' text-anchor='middle'>Payment</text>
            <line class='edge' x1='390' y1='148' x2='470' y2='148' marker-end='url(#arrow6)'/>
            <rect class='node-box worker' x='470' y='128' width='110' height='40' rx='6'/>
            <text class='node-text' x='525' y='153' text-anchor='middle'>Inventory</text>
          </svg>
          <div class='diagram-caption'>Choreography spreads control across events; orchestration centralizes it.</div>
        </div>

        <div class='callout warn'>
          <div class='c-title'>Compensations aren't free</div>
          Design each step to be idempotent AND compensable. Some things can't truly be undone (an email was sent, a rocket launched) — for those, use <strong>semantic compensation</strong> (send a correction) or a human step. Watch for the ordering trap where a compensation races the action it's meant to undo.
        </div>

        <div class='callout good'>
          <div class='c-title'>Interview soundbite</div>
          'A Saga replaces a distributed transaction with a sequence of local commits plus compensating actions for rollback. Choreography wires services together with events — great for a few steps; orchestration uses a central state machine — better for complex flows you need to observe and version.'
        </div>
      `,
    },
    {
      id: 'backpressure-retries-dlq',
      group: 'Reliability',
      nav: '7 · Retries & DLQs',
      title: 'Backpressure, retries & dead-letter queues',
      lede: 'A poison message can take down your whole pipeline by retrying forever. DLQs are the padded room you put it in.',
      html: `
        <p>Three failure realities of any consumer: it can be <strong>overwhelmed</strong> (backpressure), it can hit a <strong>transient error</strong> (retry), or it can hit a message it will <em>never</em> process (a <span class='kicker'>poison message</span> → dead-letter it).</p>

        <h3>Backpressure — don't let producers outrun consumers</h3>
        <ul>
          <li><strong>Pull-based</strong> brokers (Kafka, SQS) are naturally backpressure-friendly: consumers fetch at their own pace; the log just grows.</li>
          <li><strong>Push-based</strong> systems need flow control: bounded prefetch (<code>prefetch=10</code> in RabbitMQ), concurrency limits, and lag alarms.</li>
          <li>Watch <strong>consumer lag</strong> (offset behind head). Rising lag = provision more partitions/consumers or shed load.</li>
        </ul>

        <h3>Retries — but with a brain</h3>
        <ul>
          <li><strong>Exponential backoff + jitter</strong> so a downstream outage doesn't get a synchronized retry stampede when it recovers.</li>
          <li><strong>Cap the attempts</strong> (e.g. 5). Infinite in-line retries on a poison message block the whole partition behind it — head-of-line blocking.</li>
          <li>Prefer a <strong>retry topic</strong> ladder (retry-5s, retry-1m, retry-10m) over blocking in place, so healthy messages keep flowing.</li>
        </ul>

        <div class='diagram'>
          <svg viewBox='0 0 640 160' width='640'>
            <defs><marker id='arrow7' markerWidth='10' markerHeight='10' refX='8' refY='3' orient='auto'><path d='M0,0 L8,3 L0,6 Z' fill='#8b98a9'/></marker></defs>
            <rect class='node-box' x='20' y='55' width='120' height='50' rx='8'/>
            <text class='node-text' x='80' y='84' text-anchor='middle'>Consumer</text>
            <line class='edge' x1='140' y1='80' x2='240' y2='80' marker-end='url(#arrow7)'/>
            <text class='edge-label' x='190' y='72' text-anchor='middle'>retry x5</text>
            <rect class='node-box tool' x='240' y='55' width='120' height='50' rx='8'/>
            <text class='node-text' x='300' y='84' text-anchor='middle'>Retry topic</text>
            <line class='edge' x1='360' y1='80' x2='460' y2='80' marker-end='url(#arrow7)'/>
            <text class='edge-label' x='410' y='72' text-anchor='middle'>still failing</text>
            <rect class='node-box' x='460' y='55' width='150' height='50' rx='8' style='fill:#5b2330'/>
            <text class='node-text' x='535' y='84' text-anchor='middle'>DLQ ☠️</text>
          </svg>
          <div class='diagram-caption'>Transient failure → retry with backoff; exhausted → park in the DLQ for humans/replay.</div>
        </div>

        <div class='callout danger'>
          <div class='c-title'>War story: the duplicate storm</div>
          A consumer crashed mid-batch and never committed offsets, so every restart re-processed the same 100k messages — which failed again, restarted again. A <strong>tight retry cap + DLQ</strong> would have parked the poison batch in minutes instead of melting the cluster for hours.
        </div>

        <div class='callout'>
          <div class='c-title'>Operate your DLQ — don't just create it</div>
          A DLQ with no alarm is a silent black hole. Alert on DLQ depth &gt; 0, keep the original message + error + stack + attempt count, and build a one-click <strong>redrive</strong> to replay after a fix.
        </div>

        <div class='callout good'>
          <div class='c-title'>Interview soundbite</div>
          'Retry transient errors with capped exponential backoff and jitter; never retry a poison message forever — that causes head-of-line blocking. After N attempts, route it to a dead-letter queue with full context, alarm on DLQ depth, and provide a redrive to replay once fixed.'
        </div>
      `,
    },
    {
      id: 'event-sourcing-cqrs',
      group: 'Patterns',
      nav: '8 · Event sourcing & CQRS',
      title: 'Event sourcing & CQRS',
      lede: 'Stop storing the current balance. Store every deposit and withdrawal — the balance is just a fold over history.',
      html: `
        <p><span class='kicker'>Event sourcing</span>: instead of persisting <em>state</em>, persist the immutable sequence of <strong>events</strong> that produced it. State = <code>reduce(events)</code>. Your bank doesn't store 'balance: $100'; it stores every transaction and computes the balance. The log is the source of truth.</p>

        <div class='two-col'>
          <div>
            <h4>State-oriented (CRUD)</h4>
            <pre><code>UPDATE account
SET balance = 100
WHERE id = 42;
-- history? gone.</code></pre>
          </div>
          <div>
            <h4>Event-sourced</h4>
            <pre><code>append Deposited(+50)
append Deposited(+70)
append Withdrew(-20)
-- balance = fold = 100
-- full history retained</code></pre>
          </div>
        </div>

        <h3>CQRS — the natural companion</h3>
        <p><strong>Command Query Responsibility Segregation</strong> splits the <em>write</em> model from the <em>read</em> model. Commands append events; <strong>projections</strong> consume those events to build read-optimized views (a SQL table, a search index, a cache) tuned for queries. Writes and reads scale and evolve independently.</p>

        <div class='diagram'>
          <svg viewBox='0 0 640 190' width='640'>
            <defs><marker id='arrow8' markerWidth='10' markerHeight='10' refX='8' refY='3' orient='auto'><path d='M0,0 L8,3 L0,6 Z' fill='#8b98a9'/></marker></defs>
            <rect class='node-box' x='20' y='75' width='110' height='44' rx='8'/>
            <text class='node-text' x='75' y='102' text-anchor='middle'>Command</text>
            <line class='edge' x1='130' y1='97' x2='210' y2='97' marker-end='url(#arrow8)'/>
            <rect class='node-box tool' x='210' y='75' width='130' height='44' rx='8'/>
            <text class='node-text' x='275' y='95' text-anchor='middle'>Event Log</text>
            <text class='node-sub' x='275' y='110' text-anchor='middle'>source of truth</text>
            <line class='edge' x1='340' y1='85' x2='430' y2='40' marker-end='url(#arrow8)'/>
            <line class='edge' x1='340' y1='105' x2='430' y2='150' marker-end='url(#arrow8)'/>
            <rect class='node-box worker' x='430' y='18' width='180' height='44' rx='8'/>
            <text class='node-text' x='520' y='38' text-anchor='middle'>Read model: SQL</text>
            <text class='node-sub' x='520' y='53' text-anchor='middle'>projection</text>
            <rect class='node-box worker' x='430' y='128' width='180' height='44' rx='8'/>
            <text class='node-text' x='520' y='148' text-anchor='middle'>Read model: Search</text>
            <text class='node-sub' x='520' y='163' text-anchor='middle'>projection</text>
          </svg>
          <div class='diagram-caption'>Write side appends events; multiple read projections are rebuilt by replaying the log.</div>
        </div>

        <h3>Superpowers</h3>
        <ul>
          <li><strong>Time travel</strong> — reconstruct state as of any past instant for audit or debugging.</li>
          <li><strong>New views for free</strong> — spin up a fresh projection and replay history to backfill it.</li>
          <li><strong>Perfect audit log</strong> — the 'why' is baked in; compliance loves it.</li>
        </ul>

        <div class='callout warn'>
          <div class='c-title'>Costs, so you sound balanced</div>
          Eventual consistency between write and read models; ever-growing logs need <strong>snapshots</strong> so you don't fold millions of events per read; schema evolution of old events is forever (next lesson); and you can't simply <code>DELETE</code> — GDPR 'right to be forgotten' clashes with an immutable log (use crypto-shredding or tombstones).
        </div>

        <div class='callout good'>
          <div class='c-title'>Interview soundbite</div>
          'Event sourcing stores the immutable sequence of events, not current state — state is a fold over the log, which gives audit and time-travel for free. CQRS pairs with it: commands append events, projections build read-optimized views. The price is eventual consistency, snapshots, and forever-compatible event schemas.'
        </div>
      `,
    },
    {
      id: 'schema-evolution',
      group: 'Patterns',
      nav: '9 · Schema evolution',
      title: 'Schema evolution & versioning',
      lede: 'Your events outlive your code. A field you rename today can break a consumer — or a five-year-old event replay — tomorrow.',
      html: `
        <p>Events are a <span class='kicker'>contract</span> between teams and across time. In event sourcing they're immortal: a consumer written next year must still read an event produced today. Schema evolution is about changing that contract <strong>without breaking anyone</strong>.</p>

        <h3>The compatibility modes (say these words)</h3>
        <table>
          <tr><th>Mode</th><th>Meaning</th><th>Safe change</th></tr>
          <tr><td><strong>Backward</strong></td><td>new consumer reads old data</td><td>add optional field (with default), remove a field</td></tr>
          <tr><td><strong>Forward</strong></td><td>old consumer reads new data</td><td>add a field old readers ignore; delete an optional field</td></tr>
          <tr><td><strong>Full</strong></td><td>both directions</td><td>only add/remove optional fields with defaults</td></tr>
        </table>

        <div class='callout danger'>
          <div class='c-title'>Breaking changes — never do these in place</div>
          Renaming a field, changing its type (<code>string</code> → <code>int</code>), making an optional field required, or repurposing an enum value. Each silently corrupts old consumers or old replays. Instead: add a new field and <strong>version the event</strong>.
        </div>

        <h3>Tactics that work</h3>
        <ul>
          <li><strong>Schema registry</strong> (Confluent Avro/Protobuf/JSON-Schema) enforces compatibility at publish time — a breaking change is rejected before it ships.</li>
          <li><strong>Tolerant reader</strong> (Postel's law) — consumers ignore unknown fields and default missing ones, so additive changes are non-events.</li>
          <li><strong>Explicit versioning</strong> — carry a <code>schemaVersion</code>; either add <code>OrderPlacedV2</code> or <strong>upcast</strong> old events to the latest shape on read.</li>
          <li><strong>Expand / contract</strong> (parallel change) — add the new field, dual-write both, migrate consumers, then retire the old field once nothing reads it.</li>
        </ul>

        <pre><code>// Upcasting old events on read
function upcast(event) {
  if (event.schemaVersion === 1) {
    return { ...event, schemaVersion: 2, currency: 'USD' }; // sensible default
  }
  return event;
}</code></pre>

        <div class='callout warn'>
          <div class='c-title'>Rule of thumb</div>
          Prefer <strong>additive, optional</strong> changes with defaults. Treat every event schema as a public API you can never fully recall — because a replay from offset 0 will always find the oldest version.
        </div>

        <div class='callout good'>
          <div class='c-title'>Interview soundbite</div>
          'Events are forever, so I only make additive, optional changes and enforce backward/forward compatibility with a schema registry. Breaking changes get a new event version, and I use tolerant readers plus upcasting so old events replayed from offset zero still deserialize.'
        </div>
      `,
    },
    {
      id: 'observability-pitfalls',
      group: 'Reliability',
      nav: '10 · Observability',
      title: 'Observability & the classic pitfalls',
      lede: 'There\'s no single stack trace across an async fan-out. If you can\'t trace, measure lag, and detect duplicates, EDA becomes a haunted house.',
      html: `
        <p>The dark side of decoupling: when something goes wrong, the story is scattered across a dozen services and a broker. <strong>Observability isn't optional in EDA — it's the price of admission.</strong></p>

        <h3>The three things you must instrument</h3>
        <ol>
          <li><strong>Distributed tracing</strong> — propagate a <code>traceId</code> / <code>correlationId</code> in every event header (W3C <code>traceparent</code>, OpenTelemetry) so you can stitch one business action across all hops.</li>
          <li><strong>Consumer lag</strong> — the #1 health metric. Rising lag = consumers falling behind; alarm on it before the log fills.</li>
          <li><strong>DLQ depth & redrive rate</strong> — anything &gt; 0 means messages are dying; know instantly.</li>
        </ol>

        <h3>The pitfalls interviewers love</h3>
        <div class='pattern-card'>
          <h4>👻 Lost events</h4>
          <p>Producer acked too early, or the dual-write problem (DB commit succeeds, event publish fails). Fix with the <strong>outbox pattern</strong> and producer acks=all.</p>
          <div class='tag-row'><span class='tag use'>detect: reconciliation counts, sequence gaps</span><span class='tag avoid'>avoid: fire-and-forget publish after a separate DB write</span></div>
        </div>
        <div class='pattern-card'>
          <h4>🌪️ Duplicate storms</h4>
          <p>Offset never committed → endless reprocessing. Fix with idempotency, commit offsets correctly, and cap retries.</p>
          <div class='tag-row'><span class='tag use'>detect: spike in processed count vs unique keys</span><span class='tag avoid'>avoid: side effects before dedup</span></div>
        </div>
        <div class='pattern-card'>
          <h4>🔀 Ordering bugs</h4>
          <p>Wrong/absent partition key, or concurrent consumers reordering a partition. Fix by keying on the entity id and keeping per-partition processing single-threaded.</p>
          <div class='tag-row'><span class='tag use'>detect: out-of-sequence version numbers</span><span class='tag avoid'>avoid: round-robin keys when order matters</span></div>
        </div>

        <div class='callout warn'>
          <div class='c-title'>Gotcha: the thundering herd on recovery</div>
          A downstream comes back after an outage and every buffered event + synchronized retry hits it at once, knocking it over again. Backoff <strong>with jitter</strong> and rate-limited draining smooth the recovery.
        </div>

        <div class='callout good'>
          <div class='c-title'>Interview soundbite</div>
          'In EDA there's no single stack trace, so I propagate a correlationId through event headers for distributed tracing, alarm on consumer lag and DLQ depth, and defend against the big three — lost events (outbox + acks=all), duplicate storms (idempotency + correct offset commits), and ordering bugs (partition keys).'
        </div>
      `,
    },
    {
      id: 'recap-cheatsheet',
      group: 'Recap',
      nav: '11 · Rapid-fire recap',
      title: 'Rapid-fire interview Q&A cheat-sheet',
      lede: 'Everything above, compressed into answers you can fire back in under fifteen seconds each. Skim this the night before.',
      html: `
        <p>You've got the models — here's the ammo. Each is a crisp, quotable answer. Cover the right column and quiz yourself. 🎯</p>

        <h3>Concepts</h3>
        <table>
          <tr><th>Q</th><th>15-second answer</th></tr>
          <tr><td>Command vs event?</td><td>Command = 'do this', imperative, one handler, sender cares. Event = 'this happened', past tense, 0..N listeners, fire-and-forget.</td></tr>
          <tr><td>Queue vs log?</td><td>Queue = consume-and-delete work buffer. Log = append-only, retained, replayable, per-group offsets.</td></tr>
          <tr><td>SQS vs Kafka?</td><td>SQS = managed job queue, no replay. Kafka = high-throughput partitioned log, replay, many consumer groups.</td></tr>
          <tr><td>Fan-out vs scaling?</td><td>Fan-out = one event to many distinct consumers. Scaling = many identical workers in one group sharing partitions.</td></tr>
        </table>

        <h3>Guarantees</h3>
        <table>
          <tr><th>Q</th><th>15-second answer</th></tr>
          <tr><td>Is exactly-once real?</td><td>Not end-to-end — two-generals. You get at-least-once + idempotency = effectively-once. Kafka EOS is Kafka-to-Kafka only.</td></tr>
          <tr><td>How to handle duplicates?</td><td>Idempotency key + dedup store in the same txn as the effect; prefer set-semantics and upserts over increments.</td></tr>
          <tr><td>How to keep order?</td><td>Partition key on the entity id → per-key ordering within a partition; accept no global order.</td></tr>
          <tr><td>Dual-write problem?</td><td>DB commit + event publish aren't atomic → outbox pattern: write both in one txn, relay ships the event.</td></tr>
        </table>

        <h3>Patterns & ops</h3>
        <table>
          <tr><th>Q</th><th>15-second answer</th></tr>
          <tr><td>Distributed transaction?</td><td>Saga: local commits + compensating actions. Choreography (events) for simple, orchestration (state machine) for complex.</td></tr>
          <tr><td>Poison message?</td><td>Capped backoff+jitter retries, then dead-letter with full context; alarm on DLQ depth; provide redrive.</td></tr>
          <tr><td>Event sourcing?</td><td>Store events not state; state = fold(events). Pair with CQRS projections. Cost: eventual consistency + snapshots.</td></tr>
          <tr><td>Schema change?</td><td>Additive optional fields, schema registry for compat, version + upcast for breaking changes; events are forever.</td></tr>
          <tr><td>How to debug async?</td><td>correlationId in headers for tracing, watch consumer lag + DLQ depth, guard the big three failure modes.</td></tr>
        </table>

        <div class='callout'>
          <div class='c-title'>Mnemonic: the EDA reliability stack — 'I OWED'</div>
          <strong>I</strong>dempotency · <strong>O</strong>utbox · <strong>W</strong>ith-backoff retries · <strong>E</strong>vent versioning · <strong>D</strong>LQ. Get those five right and your design survives the follow-up questions.
        </div>

        <div class='callout warn'>
          <div class='c-title'>When they ask 'would you use EDA here?'</div>
          Resist reflexively saying yes. If two services could just make a synchronous call and you don't need decoupling, replay, or spike absorption, say so. Reaching for Kafka to connect two services is a red flag, not a green one.
        </div>

        <div class='callout good'>
          <div class='c-title'>Final soundbite</div>
          'Event-driven architecture buys decoupling, elasticity, and replay by embracing async and eventual consistency. The senior craft is the reliability layer: at-least-once plus idempotency, the outbox pattern, per-key ordering, capped retries into DLQs, and forever-compatible event schemas — all made debuggable with correlation IDs and lag alarms.'
        </div>
      `,
    },
  ],
  quizzes: [
    {
      question: 'A service needs to notify three unrelated downstream teams that an order was placed, and you must be able to add a fourth consumer later without redeploying the producer. What best describes the right primitive?',
      options: [
        { text: 'Publish a past-tense event to a broker; consumers subscribe independently', correct: true },
        { text: 'Send a command directly to each of the three known handlers', correct: false },
        { text: 'Have the order service synchronously call each downstream REST API', correct: false },
      ],
      explain: 'This is textbook pub/sub fan-out: a past-tense event (OrderPlaced) is published once and any number of consumers subscribe without the publisher knowing about them, so a fourth consumer is just a new subscription.',
    },
    {
      question: 'You need each message processed exactly once by a team of workers, AND a separate analytics team to also see every message. In Kafka, how do you achieve both?',
      options: [
        { text: 'Put both teams\' workers in a single consumer group', correct: false },
        { text: 'Use two consumer groups; within each, workers share partitions', correct: true },
        { text: 'Create one partition so ordering forces single processing', correct: false },
      ],
      explain: 'Across consumer groups you get fan-out (each group reads everything); within a group, partitions are split among workers so each message is handled once by the group. Two groups gives the worker team single-processing and analytics its own full copy.',
    },
    {
      question: 'A candidate claims their broker\'s "exactly-once" flag means they can skip idempotency when charging a credit card. What is the correct pushback?',
      options: [
        { text: 'Correct — modern brokers guarantee exactly-once end-to-end', correct: false },
        { text: 'Exactly-once holds inside the broker; a side effect in an external system (Stripe) is still at-least-once, so idempotency is required', correct: true },
        { text: 'They should switch to at-most-once to avoid the problem entirely', correct: false },
      ],
      explain: 'Kafka-style exactly-once covers Kafka-to-Kafka processing. The moment the effect leaves the broker (charging a card), you cannot atomically commit the effect and the ack — two-generals — so you need at-least-once delivery plus an idempotency key.',
    },
    {
      question: 'You must guarantee that all events for a given account are processed in order, while still parallelizing across accounts. What is the primary mechanism?',
      options: [
        { text: 'Use a single partition so the whole topic is totally ordered', correct: false },
        { text: 'Set the partition key to accountId so each account maps to one partition', correct: true },
        { text: 'Fan messages out to a thread pool per partition for speed', correct: false },
      ],
      explain: 'Keying on accountId hashes all of an account\'s events to the same partition (ordered), while different accounts spread across partitions for throughput. A single partition kills parallelism, and a thread pool per partition destroys the ordering you just bought.',
    },
    {
      question: 'A consumer keeps hitting a malformed "poison" message it can never process, and inline retries are blocking every message behind it. What is the correct design?',
      options: [
        { text: 'Retry indefinitely until the message eventually succeeds', correct: false },
        { text: 'Cap retries with backoff, then route the message to a dead-letter queue with context and alarm on it', correct: true },
        { text: 'Silently drop the message and continue', correct: false },
      ],
      explain: 'Infinite retries cause head-of-line blocking. Capped exponential backoff with jitter, then dead-lettering the poison message (with the original payload, error, and attempt count) plus a DLQ-depth alarm and redrive is the standard, non-lossy pattern.',
    },
    {
      question: 'Your team writes a business row to the DB and then publishes an event, but occasionally the DB commit succeeds while the event publish fails, losing events. Which pattern fixes this?',
      options: [
        { text: 'The outbox pattern: write the business change and the event in one transaction, then relay the event', correct: true },
        { text: 'Publish the event first, then write to the DB', correct: false },
        { text: 'Add more retries to the publish call', correct: false },
      ],
      explain: 'This is the dual-write problem: two systems can\'t be updated atomically. The outbox pattern writes the domain change and an outbox record in a single DB transaction, and a separate relay reliably ships the event, eliminating lost events.',
    },
    {
      question: 'In an event-sourced system, another team must rename an event field and change its type in place. Why is this dangerous, and what is the right approach?',
      options: [
        { text: 'It\'s fine — consumers automatically migrate old events', correct: false },
        { text: 'Old events replayed from offset zero would fail to deserialize; instead add a new versioned field/event and upcast', correct: true },
        { text: 'Just delete all old events so only the new schema exists', correct: false },
      ],
      explain: 'Events are immortal, so a replay from the beginning still encounters the oldest schema. Renaming/retyping in place breaks those old events. The safe path is additive, optional changes plus explicit versioning and upcasting old events to the current shape on read.',
    },
  ],
};
