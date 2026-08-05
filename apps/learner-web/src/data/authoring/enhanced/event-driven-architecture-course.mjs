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

        <h3>Temporal vs spatial vs sync decoupling</h3>
        <p>EDA buys you three flavors of decoupling that interviewers love to hear named:</p>
        <ul>
          <li><span class='kicker'>Spatial</span> — publisher doesn't know consumers' locations/identity.</li>
          <li><span class='kicker'>Temporal</span> — publisher and consumer need not be up at the same instant; the broker buffers.</li>
          <li><span class='kicker'>Synchronization</span> — publisher doesn't block waiting for consumers to finish.</li>
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
      id: 'broker-landscape',
      group: 'Foundations',
      nav: '1 · Broker landscape',
      title: 'The broker landscape: who is who',
      lede: 'Kafka, RabbitMQ, SQS/SNS, Pulsar, NATS, Kinesis, Redis Streams — six answers to "what do I run?" Knowing which is which is table stakes.',
      html: `
        <p>You will be asked <em>'what broker would you pick and why?'</em>. The wrong move is to say 'Kafka' reflexively. The right move is to classify by <strong>data structure</strong> (queue vs log), <strong>ordering/retention model</strong>, and <strong>ops cost</strong>, then map that to the workload.</p>

        <h3>The cheat table</h3>
        <table>
          <tr><th>Broker</th><th>Shape</th><th>Retention / replay</th><th>Ordering</th><th>Sweet spot</th></tr>
          <tr><td><strong>Kafka</strong></td><td>Distributed log</td><td>Retained (time/size/compaction); full replay</td><td>Per-partition</td><td>High-throughput streams, event sourcing, CDC backbone</td></tr>
          <tr><td><strong>AWS Kinesis</strong></td><td>Distributed log (shards)</td><td>24h–365d; replay by seq #</td><td>Per-shard</td><td>Kafka-like on AWS without running Kafka</td></tr>
          <tr><td><strong>Apache Pulsar</strong></td><td>Log + queue (2-layer: brokers + BookKeeper)</td><td>Tiered storage, replay; also queue subscriptions</td><td>Per-partition / per-key</td><td>Multi-tenant, geo-replication, both models in one</td></tr>
          <tr><td><strong>RabbitMQ</strong></td><td>Queue (AMQP) + Streams add-on</td><td>Delete-on-ack (queues); retained (Streams)</td><td>Per-queue FIFO</td><td>Flexible routing, RPC, task queues, complex topologies</td></tr>
          <tr><td><strong>AWS SQS + SNS</strong></td><td>Queue (SQS) + pub/sub fanout (SNS)</td><td>Delete-on-ack; up to 14d in queue</td><td>Standard = best-effort; FIFO queues available</td><td>Serverless glue, zero-ops task queues</td></tr>
          <tr><td><strong>NATS / JetStream</strong></td><td>Lightweight pub/sub + JetStream log</td><td>Core = none; JetStream = retained</td><td>Per-subject/stream</td><td>Edge, IoT, microservice RPC, ultra-low latency</td></tr>
          <tr><td><strong>Redis Streams</strong></td><td>In-memory log w/ consumer groups</td><td>Capped (MAXLEN); short-lived</td><td>Per-stream</td><td>Simple, fast, already-have-Redis pipelines</td></tr>
        </table>

        <div class='callout'>
          <div class='c-title'>SNS + SQS is the canonical AWS pattern</div>
          <strong>SNS fans out</strong> one message to N subscribers; each subscriber is often an <strong>SQS queue</strong> that buffers and lets a fleet of workers drain at their own pace. This is the AWS answer to 'Kafka topic with multiple consumer groups' — one publish, many durable inboxes.
        </div>

        <h3>Kafka mechanics you must be able to name</h3>
        <ul>
          <li><span class='kicker'>Topic</span> → split into <span class='kicker'>partitions</span> (the unit of parallelism and ordering).</li>
          <li><span class='kicker'>Offset</span> — a consumer's position in a partition; committed to track progress.</li>
          <li><span class='kicker'>Consumer group</span> — partitions are divided among members; add members to scale (up to #partitions).</li>
          <li><span class='kicker'>Replication factor</span> + <span class='kicker'>ISR</span> (in-sync replicas) — durability; <code>acks=all</code> waits for the ISR set.</li>
          <li><span class='kicker'>Log compaction</span> — keep only the latest value per key (great for 'current state' topics).</li>
          <li>Historically <span class='kicker'>ZooKeeper</span> managed metadata; modern Kafka uses <span class='kicker'>KRaft</span> (built-in Raft) instead.</li>
        </ul>

        <div class='callout warn'>
          <div class='c-title'>Gotcha: 'Kafka scales infinitely' is false</div>
          A consumer group can have at most <strong>one active consumer per partition</strong>. If a topic has 12 partitions, 13 consumers means one sits idle. You scale consumers only up to the partition count — so partition count is a capacity decision you make early and change painfully.
        </div>

        <div class='callout good'>
          <div class='c-title'>Interview soundbite</div>
          'Pick by semantics, not brand: SQS/RabbitMQ for delete-on-ack task queues, Kafka/Kinesis/Pulsar for retained replayable logs. On AWS, SNS→SQS fan-out is the pub/sub workhorse. Kafka parallelism is capped by partition count.'
        </div>
      `,
    },
    {
      id: 'queues-vs-streams',
      group: 'Transports',
      nav: '2 · Queues vs streams',
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

        <div class='callout'>
          <div class='c-title'>Push vs pull</div>
          RabbitMQ <strong>pushes</strong> to consumers (broker tracks state, per-message ack). Kafka consumers <strong>pull</strong> and manage their own offset (broker is dumb and fast). Pull gives natural backpressure — a slow consumer just polls less; the broker doesn't care.
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
      nav: '3 · Pub/sub & fan-out',
      title: 'Pub/sub, fan-out & consumer groups',
      lede: 'How do you get one event to ten teams — and scale one of those teams to twenty workers — without the others noticing?',
      html: `
        <p>Two orthogonal axes get conflated constantly. <strong>Fan-out</strong> is 'one event, many <em>different</em> consumers'. <strong>Consumer groups / competing consumers</strong> is 'one logical consumer, many <em>identical</em> workers sharing the load'. Senior candidates keep these straight.</p>

        <div class='diagram'>
          <svg viewBox='0 0 640 240' width='640'>
            <defs><marker id='arrow3' markerWidth='10' markerHeight='10' refX='8' refY='3' orient='auto'><path d='M0,0 L8,3 L0,6 Z' fill='#8b98a9'/></marker></defs>
            <rect class='node-box tool' x='20' y='100' width='110' height='50' rx='8'/>
            <text class='node-text' x='75' y='130' text-anchor='middle'>Topic</text>
            <line class='edge' x1='130' y1='115' x2='240' y2='55' marker-end='url(#arrow3)'/>
            <line class='edge' x1='130' y1='135' x2='240' y2='195' marker-end='url(#arrow3)'/>
            <rect class='node-box' x='240' y='30' width='150' height='50' rx='8'/>
            <text class='node-text' x='315' y='52' text-anchor='middle'>Group: Billing</text>
            <text class='node-sub' x='315' y='68' text-anchor='middle'>own offset</text>
            <rect class='node-box' x='240' y='170' width='150' height='50' rx='8'/>
            <text class='node-text' x='315' y='192' text-anchor='middle'>Group: Analytics</text>
            <text class='node-sub' x='315' y='208' text-anchor='middle'>own offset</text>
            <line class='edge' x1='390' y1='45' x2='470' y2='30' marker-end='url(#arrow3)'/>
            <line class='edge' x1='390' y1='55' x2='470' y2='78' marker-end='url(#arrow3)'/>
            <rect class='node-box worker' x='470' y='14' width='150' height='30' rx='6'/>
            <text class='node-text' x='545' y='34' text-anchor='middle'>worker 1</text>
            <rect class='node-box worker' x='470' y='60' width='150' height='30' rx='6'/>
            <text class='node-text' x='545' y='80' text-anchor='middle'>worker 2</text>
          </svg>
          <div class='diagram-caption'>Fan-out across groups (Billing + Analytics each get every event); competing consumers within a group split the partitions.</div>
        </div>

        <h3>The mechanics per platform</h3>
        <table>
          <tr><th>Concept</th><th>Kafka</th><th>AWS</th><th>RabbitMQ</th></tr>
          <tr><td>Fan-out to many teams</td><td>Many consumer groups on one topic</td><td>SNS → many SQS queues</td><td>Fanout exchange → many queues</td></tr>
          <tr><td>Scale one team</td><td>Add consumers (≤ #partitions)</td><td>Add workers polling one SQS queue</td><td>Multiple consumers on one queue</td></tr>
          <tr><td>Routing/filtering</td><td>Consumer-side, or topic-per-type</td><td>SNS filter policies</td><td>Topic/direct exchange + routing keys</td></tr>
        </table>

        <div class='callout'>
          <div class='c-title'>Topic granularity is a real design decision</div>
          Too coarse (one giant <code>events</code> topic) → consumers filter 95% of traffic they don't want. Too fine (a topic per event type) → ordering across related events is lost and you drown in topics. Rule of thumb: <strong>one topic per aggregate/entity</strong> (e.g. <code>orders</code>), event type in a header.
        </div>

        <div class='callout warn'>
          <div class='c-title'>War story: the accidental broadcast storm</div>
          A team put a <em>command</em> ('SendEmail') on a fan-out topic. Every one of the 6 consumer groups happily sent the email. 6× the emails, angry users. Fan-out is for <strong>facts</strong> (0..N may react); commands want exactly one handler — use a queue, not a broadcast.
        </div>

        <div class='callout good'>
          <div class='c-title'>Interview soundbite</div>
          'Fan-out = one event to many distinct consumers (Kafka consumer groups, SNS→SQS). Competing consumers = many identical workers sharing one logical consumer to scale throughput. Keep them separate: fan-out is about breadth, consumer groups are about depth.'
        </div>
      `,
    },
    {
      id: 'event-design-styles',
      group: 'Design',
      nav: '4 · Event design',
      title: 'Event design: thin, fat, or sourced',
      lede: 'How much do you cram into an event? Just an ID? The whole record? The answer decides how coupled — and how chatty — your system becomes.',
      html: `
        <p>Once you commit to events, the very next question is <em>what goes inside them</em>. There are three canonical styles, and interviewers love asking you to compare them.</p>

        <div class='pattern-card'>
          <h4>1. Event notification (thin / 'skinny' event)</h4>
          <p>Carry just IDs: <code>OrderPlaced { orderId: 123 }</code>. Consumers call back to the source for details.</p>
          <div class='tag-row'><span class='tag use'>use when: minimal coupling to payload shape, small events</span><span class='tag avoid'>avoid when: callbacks create chatty coupling & runtime dependency on source</span></div>
        </div>
        <div class='pattern-card'>
          <h4>2. Event-carried state transfer (fat event)</h4>
          <p>Embed the data consumers need: <code>OrderPlaced { orderId, items[], total, customer }</code>. Consumers keep a local read-model, no callback.</p>
          <div class='tag-row'><span class='tag use'>use when: you want temporal decoupling & consumer autonomy</span><span class='tag avoid'>avoid when: payloads bloat, data duplicated, staleness matters</span></div>
        </div>
        <div class='pattern-card'>
          <h4>3. Event sourcing</h4>
          <p>The events <em>are</em> the state. You never store 'current'; you fold the log. (Full lesson later.)</p>
          <div class='tag-row'><span class='tag use'>use when: full audit, temporal queries, rebuildable state</span><span class='tag avoid'>avoid when: team unready for the complexity tax</span></div>
        </div>

        <h3>Thin vs fat — the core trade-off</h3>
        <table>
          <tr><th>Dimension</th><th>Thin (notification)</th><th>Fat (state transfer)</th></tr>
          <tr><td>Coupling to source at runtime</td><td>High (must call back)</td><td>Low (self-contained)</td></tr>
          <tr><td>Coupling to schema</td><td>Low</td><td>High (payload shape)</td></tr>
          <tr><td>Network chatter</td><td>N callbacks per event</td><td>Zero extra calls</td></tr>
          <tr><td>Staleness risk</td><td>Always fresh (fetch now)</td><td>Snapshot at publish time</td></tr>
          <tr><td>Payload size / PII exposure</td><td>Tiny</td><td>Bigger; may leak data</td></tr>
        </table>

        <div class='callout'>
          <div class='c-title'>Claim-check pattern for big payloads</div>
          When the event is huge (a 40MB video, a giant document), don't push it through the broker. Store the blob in S3, put the <strong>URL/key in the event</strong> — the 'claim check'. Consumers redeem it when they need the payload. Keeps topics fast and within message-size limits (Kafka default ~1MB, SQS 256KB).
        </div>

        <div class='callout warn'>
          <div class='c-title'>Gotcha: fat events and PII</div>
          Event-carried state transfer means customer data now sits in a retained log for days. GDPR 'right to be forgotten' + immutable log = pain. Mitigations: <strong>crypto-shredding</strong> (store data encrypted, delete the key), keep PII thin, or use compacted/tombstoned topics.
        </div>

        <div class='callout good'>
          <div class='c-title'>Interview soundbite</div>
          'Thin events minimize schema coupling but create chatty callbacks and a runtime dependency on the source. Fat events (event-carried state transfer) give consumers autonomy and temporal decoupling at the cost of duplication and staleness. Use the claim-check pattern for large payloads.'
        </div>
      `,
    },
    {
      id: 'delivery-guarantees',
      group: 'Guarantees',
      nav: '5 · Delivery guarantees',
      title: 'Delivery guarantees & the truth about "exactly-once"',
      lede: 'At-most-once, at-least-once, exactly-once. One of these is mostly marketing. Know which — and why.',
      html: `
        <p>This is the most common EDA interview question, and most candidates fumble 'exactly-once'. Let's make you the person who gets it right.</p>

        <table>
          <tr><th>Guarantee</th><th>What it means</th><th>Failure mode</th><th>When to pick</th></tr>
          <tr><td><strong>At-most-once</strong></td><td>Fire and forget; ack before processing</td><td>Messages can be <em>lost</em></td><td>Metrics, telemetry — a dropped sample is fine</td></tr>
          <tr><td><strong>At-least-once</strong></td><td>Ack after processing; retry on doubt</td><td>Messages can be <em>duplicated</em></td><td>The default for almost everything</td></tr>
          <tr><td><strong>Exactly-once</strong></td><td>Every message effectively takes effect once</td><td>Hard/impossible end-to-end</td><td>Only within specific engines, or faked via idempotency</td></tr>
        </table>

        <h3>Why exactly-once is (mostly) a myth end-to-end</h3>
        <p>The Two Generals problem: after you process a message and try to ack, the ack can be lost. Now the broker doesn't know if you succeeded. It must choose: redeliver (→ possible duplicate = at-least-once) or not (→ possible loss = at-most-once). There is <strong>no third option</strong> across an unreliable network with independent side effects.</p>

        <div class='callout'>
          <div class='c-title'>What vendors actually mean by "exactly-once"</div>
          <strong>Kafka EOS</strong> (idempotent producer + transactions) gives exactly-once <em>within Kafka</em> — read-process-write where the output topic <em>and</em> offset commit are one atomic transaction. The moment your side effect is 'charge a credit card' (outside Kafka), you're back to at-least-once + idempotency. <strong>Flink</strong> achieves it via checkpointed state + transactional sinks. It's exactly-once <em>processing</em>, not exactly-once <em>delivery</em>.
        </div>

        <div class='diagram'>
          <svg viewBox='0 0 640 160' width='640'>
            <defs><marker id='arrow4' markerWidth='10' markerHeight='10' refX='8' refY='3' orient='auto'><path d='M0,0 L8,3 L0,6 Z' fill='#8b98a9'/></marker></defs>
            <rect class='node-box tool' x='20' y='55' width='120' height='50' rx='8'/>
            <text class='node-text' x='80' y='85' text-anchor='middle'>Broker</text>
            <line class='edge' x1='140' y1='70' x2='260' y2='70' marker-end='url(#arrow4)'/>
            <text class='edge-label' x='200' y='62' text-anchor='middle'>deliver</text>
            <rect class='node-box worker' x='260' y='55' width='140' height='50' rx='8'/>
            <text class='node-text' x='330' y='78' text-anchor='middle'>Consumer</text>
            <text class='node-sub' x='330' y='94' text-anchor='middle'>process + side effect</text>
            <line class='edge' x1='260' y1='95' x2='140' y2='95' marker-end='url(#arrow4)'/>
            <text class='edge-label' x='200' y='115' text-anchor='middle'>ack (may be lost 💥)</text>
          </svg>
          <div class='diagram-caption'>If the ack is lost after the side effect, the broker must redeliver or drop. That fork is why exactly-once end-to-end is unattainable.</div>
        </div>

        <div class='callout good'>
          <div class='c-title'>The pragmatic recipe</div>
          <strong>At-least-once delivery + idempotent consumers = effectively-once processing.</strong> This is what real systems do. Say this sentence and you've answered the question better than 90% of candidates.
        </div>

        <div class='callout warn'>
          <div class='c-title'>Gotcha: ack timing changes the guarantee</div>
          Ack <em>before</em> work → at-most-once (crash loses it). Ack <em>after</em> work → at-least-once (crash redelivers). The guarantee is a property of <strong>when you ack</strong>, not a checkbox.
        </div>

        <div class='callout good'>
          <div class='c-title'>Interview soundbite</div>
          'Exactly-once delivery is impossible end-to-end (Two Generals). Kafka/Flink offer exactly-once <em>processing</em> within their boundary. In practice you engineer at-least-once delivery plus idempotent consumers to get effectively-once.'
        </div>
      `,
    },
    {
      id: 'idempotency',
      group: 'Guarantees',
      nav: '6 · Idempotency',
      title: 'Idempotency & deduplication',
      lede: 'At-least-once means duplicates WILL happen. Idempotency is the shield that makes replaying the same message boring instead of catastrophic.',
      html: `
        <p><span class='kicker'>Idempotent</span>: doing it once and doing it five times leave the system in the same state. If your consumer is idempotent, duplicate delivery is a non-event. This is the load-bearing wall of every reliable EDA system.</p>

        <h3>Three ways to get there</h3>
        <div class='pattern-card'>
          <h4>1. Dedup on a business/idempotency key</h4>
          <p>Every event carries a stable <code>eventId</code> (or business key like <code>paymentId</code>). Consumer records processed IDs in a store with a unique constraint; a repeat insert fails → skip.</p>
          <div class='tag-row'><span class='tag use'>use when: side effects aren't naturally idempotent (charge, email)</span><span class='tag avoid'>avoid when: you'd need an unbounded dedup table with no TTL</span></div>
        </div>
        <div class='pattern-card'>
          <h4>2. Naturally idempotent operations</h4>
          <p><code>SET status = 'PAID'</code> (upsert) is safe to repeat. <code>balance += 10</code> (increment) is NOT — design writes as 'set to X', not 'add X', where possible.</p>
          <div class='tag-row'><span class='tag use'>use when: you can express the write as an absolute set/upsert</span><span class='tag avoid'>avoid when: the operation is inherently relative</span></div>
        </div>
        <div class='pattern-card'>
          <h4>3. Broker-level dedup</h4>
          <p>SQS FIFO dedups within a 5-minute window; Kafka's idempotent producer prevents duplicate <em>produces</em> on retry. Helps, but is a window, not a guarantee — still make consumers idempotent.</p>
          <div class='tag-row'><span class='tag use'>use when: short-window producer retries</span><span class='tag avoid'>avoid when: you rely on it as your only defense</span></div>
        </div>

        <pre><code>// Dedup with a unique constraint (the workhorse pattern)
async function handle(event) {
  try {
    await db.insert('processed_events', { id: event.eventId }); // unique PK
  } catch (e) {
    if (isDuplicateKey(e)) return; // already handled → skip
    throw e;
  }
  await doTheSideEffect(event); // charge card, send email, etc.
}</code></pre>

        <div class='callout warn'>
          <div class='c-title'>Gotcha: the dedup-store / side-effect atomicity gap</div>
          If you record 'processed' and then crash before the side effect — you'll skip it forever (lost). If you do the side effect then crash before recording — you'll repeat it (duplicate). Close the gap by making the side effect and the dedup record <strong>one transaction</strong> (same DB), or by making the side effect itself idempotent (e.g. pass the <code>eventId</code> as the payment provider's idempotency key — Stripe supports exactly this).
        </div>

        <div class='callout'>
          <div class='c-title'>TTL your dedup table</div>
          You can't keep every processed ID forever. Pick a window comfortably larger than your max redelivery delay (e.g. 7 days) and TTL the rest. Duplicates older than the window are astronomically unlikely.
        </div>

        <div class='callout good'>
          <div class='c-title'>Interview soundbite</div>
          'I assume at-least-once, so consumers must be idempotent. I dedup on a stable event/business key stored with a unique constraint, ideally in the same transaction as the side effect — or I push the idempotency key down to the downstream API (like Stripe) so the repeat is a no-op.'
        </div>
      `,
    },
    {
      id: 'ordering-partitioning',
      group: 'Guarantees',
      nav: '7 · Ordering & partitioning',
      title: 'Ordering & partitioning',
      lede: 'Global ordering is a lie you can\'t afford. Per-key ordering is the deal you actually make — and partition keys are how you make it.',
      html: `
        <p>Interviewers probe this to see if you understand the throughput/ordering tension. The truth: <strong>total ordering across a topic requires a single partition = single-threaded = no scale.</strong> So you don't order globally — you order <em>per key</em>.</p>

        <h3>How Kafka/Kinesis actually order things</h3>
        <ul>
          <li>Ordering is guaranteed <strong>only within a partition/shard</strong>.</li>
          <li>The <span class='kicker'>partition key</span> (e.g. <code>userId</code>, <code>orderId</code>) is hashed to choose a partition.</li>
          <li>All events with the same key → same partition → strict order. Different keys → maybe different partitions → no cross-key order.</li>
        </ul>

        <div class='diagram'>
          <svg viewBox='0 0 640 200' width='640'>
            <defs><marker id='arrow5' markerWidth='10' markerHeight='10' refX='8' refY='3' orient='auto'><path d='M0,0 L8,3 L0,6 Z' fill='#8b98a9'/></marker></defs>
            <rect class='node-box' x='20' y='80' width='150' height='50' rx='8'/>
            <text class='node-text' x='95' y='105' text-anchor='middle'>Producer</text>
            <text class='node-sub' x='95' y='121' text-anchor='middle'>key = orderId</text>
            <line class='edge' x1='170' y1='95' x2='300' y2='45' marker-end='url(#arrow5)'/>
            <line class='edge' x1='170' y1='115' x2='300' y2='165' marker-end='url(#arrow5)'/>
            <rect class='node-box tool' x='300' y='20' width='280' height='40' rx='6'/>
            <text class='node-text' x='440' y='45' text-anchor='middle'>Partition 0: A1 → A2 → A3 (ordered)</text>
            <rect class='node-box tool' x='300' y='140' width='280' height='40' rx='6'/>
            <text class='node-text' x='440' y='165' text-anchor='middle'>Partition 1: B1 → B2 (ordered)</text>
          </svg>
          <div class='diagram-caption'>Same key stays on one partition (ordered). Across partitions there is no ordering — and that's the price of parallelism.</div>
        </div>

        <div class='callout'>
          <div class='c-title'>Choosing the partition key = choosing your ordering boundary</div>
          Key by <code>orderId</code> → all events for an order are ordered (usually what you want). Key by <code>userId</code> → all of a user's actions are ordered. The key defines the smallest unit within which order holds — pick the aggregate that needs consistency.
        </div>

        <div class='callout warn'>
          <div class='c-title'>Gotcha: hot partitions & key skew</div>
          If one key is 90% of traffic (a celebrity user, a mega-merchant), its partition becomes a hotspot while others idle. Symptoms: rising lag on one partition only. Fixes: composite keys, sub-keys, or accept the skew if that entity genuinely needs serial processing.
        </div>

        <div class='callout warn'>
          <div class='c-title'>Gotcha: retries reorder within a key</div>
          If a producer retries a failed send while later messages already landed, order breaks — unless you enable idempotent producer + <code>max.in.flight.requests</code> constraints. On the consumer side, parallelizing processing <em>within</em> a partition also destroys order. Ordered means serial per key.
        </div>

        <div class='callout good'>
          <div class='c-title'>Interview soundbite</div>
          'I never rely on global ordering — it forces a single partition and kills throughput. I get per-key ordering by choosing a partition key aligned to my consistency boundary (usually the aggregate id), and I watch for hot-partition skew.'
        </div>
      `,
    },
    {
      id: 'transactional-outbox',
      group: 'Reliability',
      nav: '8 · Outbox & dual-write',
      title: 'The dual-write problem & transactional outbox',
      lede: 'You updated the DB, then the broker call failed. Now your database and your event stream disagree — forever. This is the bug that eats event-driven systems.',
      html: `
        <p>This is the single most important reliability pattern in EDA, and a favorite senior interview question. The setup: a service must <strong>(1) write to its database</strong> and <strong>(2) publish an event</strong>. These are two separate systems with no shared transaction.</p>

        <div class='callout danger'>
          <div class='c-title'>The dual-write problem</div>
          Order 1: DB commit ✅ then broker publish 💥 → the order exists but no one is notified (lost event). Order 2: broker publish ✅ then DB commit 💥 → consumers act on an order that doesn't exist (phantom event). <strong>You cannot make two independent writes atomic by just doing them one after another.</strong>
        </div>

        <h3>The transactional outbox pattern</h3>
        <p>Write the event into an <code>outbox</code> table <em>in the same local DB transaction</em> as your business data. Now the state change and the intent-to-publish commit atomically. A separate <strong>relay</strong> reads the outbox and publishes to the broker (at-least-once), marking rows as sent.</p>

        <div class='diagram'>
          <svg viewBox='0 0 640 220' width='640'>
            <defs><marker id='arrow6' markerWidth='10' markerHeight='10' refX='8' refY='3' orient='auto'><path d='M0,0 L8,3 L0,6 Z' fill='#8b98a9'/></marker></defs>
            <rect class='node-box' x='20' y='90' width='150' height='60' rx='8'/>
            <text class='node-text' x='95' y='115' text-anchor='middle'>Service</text>
            <text class='node-sub' x='95' y='133' text-anchor='middle'>1 tx: order + outbox</text>
            <line class='edge' x1='170' y1='120' x2='260' y2='120' marker-end='url(#arrow6)'/>
            <rect class='node-box tool' x='260' y='80' width='150' height='80' rx='8'/>
            <text class='node-text' x='335' y='110' text-anchor='middle'>DB</text>
            <text class='node-sub' x='335' y='128' text-anchor='middle'>orders + outbox</text>
            <line class='edge' x1='410' y1='120' x2='490' y2='120' marker-end='url(#arrow6)'/>
            <text class='edge-label' x='450' y='112' text-anchor='middle'>poll / CDC</text>
            <rect class='node-box worker' x='490' y='90' width='130' height='60' rx='8'/>
            <text class='node-text' x='555' y='115' text-anchor='middle'>Relay</text>
            <text class='node-sub' x='555' y='133' text-anchor='middle'>→ broker</text>
          </svg>
          <div class='diagram-caption'>State change and event land in one transaction. A relay ships the outbox to the broker asynchronously.</div>
        </div>

        <h3>Two ways to run the relay</h3>
        <table>
          <tr><th>Approach</th><th>How</th><th>Trade-off</th></tr>
          <tr><td><strong>Polling publisher</strong></td><td>Cron/loop: <code>SELECT * FROM outbox WHERE sent=false</code>, publish, mark sent</td><td>Simple; adds DB load & latency; needs FOR UPDATE SKIP LOCKED to scale</td></tr>
          <tr><td><strong>Change Data Capture (CDC)</strong></td><td>Tail the DB transaction log (Debezium → Kafka Connect)</td><td>Low latency, no polling; more infra to run</td></tr>
        </table>

        <div class='callout'>
          <div class='c-title'>Sibling patterns to name-drop</div>
          <strong>Listen-to-yourself</strong>: publish first, then update DB in your own consumer. <strong>Event sourcing</strong> sidesteps dual-write entirely — appending the event <em>is</em> the state change, so there's nothing to keep in sync. <strong>Debezium</strong> is the go-to open-source CDC tool; the 'Outbox Event Router' SMT is purpose-built for this.
        </div>

        <div class='callout warn'>
          <div class='c-title'>Outbox is at-least-once → dedup downstream</div>
          The relay can crash after publishing but before marking <code>sent=true</code>, so it republishes. That's fine — it's why every consumer must be idempotent (previous lesson). Outbox guarantees <strong>no lost events</strong>, not no duplicates.
        </div>

        <div class='callout good'>
          <div class='c-title'>Interview soundbite</div>
          'Never dual-write to DB and broker directly — a crash between them corrupts your event stream. I use the transactional outbox: write business data and the event to an outbox table in one local transaction, then a relay (polling or Debezium CDC) publishes at-least-once. Consumers dedup.'
        </div>
      `,
    },
    {
      id: 'saga-choreography-orchestration',
      group: 'Patterns',
      nav: '9 · Sagas',
      title: 'Choreography vs orchestration & the Saga pattern',
      lede: 'You can\'t hold a distributed transaction across five services. Sagas trade ACID atomicity for a chain of local commits and compensations.',
      html: `
        <p>A business process spans Order, Payment, Inventory, and Shipping — four databases, no shared transaction. You can't use 2-phase commit at scale (it locks and blocks). The <span class='kicker'>Saga</span> pattern breaks the transaction into a sequence of <strong>local transactions</strong>, each publishing an event that triggers the next. If a step fails, you run <strong>compensating actions</strong> to semantically undo the prior steps.</p>

        <div class='two-col'>
          <div>
            <h4>💃 Choreography</h4>
            <ul>
              <li>No central brain. Each service reacts to events and emits the next.</li>
              <li><code>OrderCreated</code> → Payment reacts → <code>PaymentCaptured</code> → Inventory reacts...</li>
              <li>Great for a <strong>few steps</strong>; maximally decoupled.</li>
              <li>Downside: the flow is <em>emergent</em> — no one place shows the whole process; hard to reason about at 8 steps.</li>
            </ul>
          </div>
          <div>
            <h4>🎼 Orchestration</h4>
            <ul>
              <li>A central <strong>orchestrator</strong> (saga coordinator) sends commands and awaits replies.</li>
              <li>The workflow lives in one place — visible, testable, easy to change.</li>
              <li>Great for <strong>complex, many-step</strong> flows.</li>
              <li>Downside: the orchestrator is a coupling point and can become a god-service.</li>
            </ul>
          </div>
        </div>

        <div class='diagram'>
          <svg viewBox='0 0 640 200' width='640'>
            <defs><marker id='arrow7' markerWidth='10' markerHeight='10' refX='8' refY='3' orient='auto'><path d='M0,0 L8,3 L0,6 Z' fill='#8b98a9'/></marker></defs>
            <rect class='node-box tool' x='250' y='20' width='140' height='44' rx='8'/>
            <text class='node-text' x='320' y='47' text-anchor='middle'>Orchestrator</text>
            <line class='edge' x1='250' y1='55' x2='120' y2='120' marker-end='url(#arrow7)'/>
            <line class='edge' x1='320' y1='64' x2='320' y2='120' marker-end='url(#arrow7)'/>
            <line class='edge' x1='390' y1='55' x2='520' y2='120' marker-end='url(#arrow7)'/>
            <rect class='node-box worker' x='40' y='120' width='140' height='44' rx='8'/>
            <text class='node-text' x='110' y='147' text-anchor='middle'>Payment</text>
            <rect class='node-box worker' x='250' y='120' width='140' height='44' rx='8'/>
            <text class='node-text' x='320' y='147' text-anchor='middle'>Inventory</text>
            <rect class='node-box worker' x='460' y='120' width='140' height='44' rx='8'/>
            <text class='node-text' x='530' y='147' text-anchor='middle'>Shipping</text>
          </svg>
          <div class='diagram-caption'>Orchestration: one coordinator issues commands and handles replies/compensations. Choreography would remove the top box and let the workers chain events directly.</div>
        </div>

        <div class='callout'>
          <div class='c-title'>Compensations are semantic undo, not rollback</div>
          You already captured the payment; you can't 'un-commit' it. You issue a <code>RefundPayment</code> compensation. Sagas give <strong>eventual consistency + atomicity-of-outcome</strong>, not isolation — other actors may observe intermediate states (a briefly-reserved seat). Design compensations to be idempotent and commutative where possible.
        </div>

        <div class='callout warn'>
          <div class='c-title'>Gotcha: no isolation → the 'reserved then released' visibility</div>
          Because there's no global lock, a partially-completed saga is visible. Use <strong>semantic locks</strong> (mark a record PENDING), <strong>commutative updates</strong>, or a <strong>pessimistic step order</strong> (do the reversible things first, the irreversible things last). Tools: Temporal, AWS Step Functions, Camunda/Zeebe, and Axon implement saga orchestration.
        </div>

        <div class='callout good'>
          <div class='c-title'>Interview soundbite</div>
          'A saga replaces a distributed ACID transaction with a sequence of local transactions plus compensating actions. Choreography (event chains) suits a few steps and max decoupling; orchestration (a central coordinator like Temporal/Step Functions) suits complex flows you need to see and change. You get atomic outcome and eventual consistency, but no isolation.'
        </div>
      `,
    },
    {
      id: 'backpressure-retries-dlq',
      group: 'Reliability',
      nav: '10 · Retries & DLQs',
      title: 'Backpressure, retries & dead-letter queues',
      lede: 'A poison message can take down your whole pipeline by retrying forever. DLQs are the padded room you put it in.',
      html: `
        <p>Failures are normal in EDA — a downstream is down, a message is malformed, a rate limit is hit. Your job is to fail <em>gracefully</em>: retry the transient, quarantine the permanent, and never let one bad message wedge the stream.</p>

        <h3>The retry ladder</h3>
        <ol>
          <li><strong>Retry with exponential backoff + jitter.</strong> 1s, 2s, 4s, 8s... plus randomness so a thundering herd of retries doesn't sync up and hammer the recovering downstream.</li>
          <li><strong>Cap the attempts.</strong> After N tries (e.g. 5), stop — a malformed message will <em>never</em> succeed.</li>
          <li><strong>Dead-letter it.</strong> Move the failed message to a <span class='kicker'>DLQ</span> for offline inspection, alerting, and manual replay.</li>
        </ol>

        <div class='callout danger'>
          <div class='c-title'>The poison message that ate the pipeline</div>
          A malformed event throws on every attempt. With naive infinite in-place retry — and in Kafka, where a partition is ordered — the consumer retries message #5 forever and <strong>everything behind it is blocked</strong>. Lag explodes, the whole partition stalls. This is <em>head-of-line blocking</em>. The DLQ (or a retry topic) is how you skip past it.
        </div>

        <div class='callout'>
          <div class='c-title'>Retry topics vs in-place retry (the Kafka nuance)</div>
          SQS has native retry + DLQ (redrive policy, maxReceiveCount). Kafka does not — a common pattern is <strong>tiered retry topics</strong>: on failure, publish to <code>orders.retry.5s</code>, then <code>orders.retry.1m</code>, then <code>orders.DLT</code> (dead-letter topic). This keeps the main partition flowing while the failed message backs off elsewhere. Spring Kafka and Confluent ship this out of the box.
        </div>

        <h3>Backpressure: don't let producers outrun consumers</h3>
        <ul>
          <li><strong>Pull-based brokers (Kafka)</strong> give natural backpressure — a slow consumer just polls slower; the log buffers the backlog.</li>
          <li><strong>Push-based brokers (RabbitMQ)</strong> use a <strong>prefetch/QoS limit</strong> so a worker isn't handed 10k unacked messages it can't process.</li>
          <li>Watch <strong>consumer lag</strong> as your early-warning signal (next lesson). Rising lag = producers &gt; consumers; scale out or shed load.</li>
        </ul>

        <div class='callout warn'>
          <div class='c-title'>Gotcha: DLQs are where messages go to be forgotten</div>
          A DLQ with no <strong>alerting</strong>, no <strong>dashboard</strong>, and no <strong>redrive runbook</strong> is a silent data-loss bucket. Alarm on DLQ depth &gt; 0. Also: retries with side effects need idempotency, or you'll charge the card 5 times while retrying.
        </div>

        <div class='callout good'>
          <div class='c-title'>Interview soundbite</div>
          'Retry transient failures with capped exponential backoff + jitter; after N attempts, dead-letter the message so one poison event can\'t cause head-of-line blocking. In Kafka I use tiered retry topics + a DLT; in SQS a redrive policy. And I alarm on DLQ depth — a DLQ nobody watches is silent data loss.'
        </div>
      `,
    },
    {
      id: 'event-sourcing-cqrs',
      group: 'Patterns',
      nav: '11 · Event sourcing & CQRS',
      title: 'Event sourcing & CQRS',
      lede: 'Stop storing the current balance. Store every deposit and withdrawal — the balance is just a fold over history.',
      html: `
        <p><span class='kicker'>Event sourcing</span>: instead of storing current state and mutating it, you store the <strong>immutable sequence of events</strong> that led to it. Current state = <code>reduce(events, apply)</code>. The classic analogy: a bank account isn't a number — it's a ledger, and the number is derived.</p>

        <pre><code>// State is a left-fold over the event log
const events = [
  { type: 'Deposited',  amount: 100 },
  { type: 'Withdrew',   amount: 30  },
  { type: 'Deposited',  amount: 50  },
];
const balance = events.reduce((b, e) =>
  e.type === 'Deposited' ? b + e.amount : b - e.amount, 0); // 120</code></pre>

        <h3>Why anyone does this</h3>
        <ul>
          <li><strong>Perfect audit log</strong> — every change is a first-class, queryable fact (finance, healthcare love this).</li>
          <li><strong>Time travel</strong> — reconstruct state as of any past moment; debug 'how did we get here?'.</li>
          <li><strong>Rebuildable read models</strong> — derive new views/projections by replaying history.</li>
          <li><strong>No dual-write</strong> — appending the event <em>is</em> the write; nothing to keep in sync.</li>
        </ul>

        <h3>CQRS: the natural partner</h3>
        <p><span class='kicker'>Command Query Responsibility Segregation</span> splits the <strong>write model</strong> (append events, optimized for validation/consistency) from one or more <strong>read models / projections</strong> (denormalized views optimized for queries). The write side emits events; projectors consume them to build query-friendly tables (SQL, Elasticsearch, a cache).</p>

        <div class='diagram'>
          <svg viewBox='0 0 640 210' width='640'>
            <defs><marker id='arrow8' markerWidth='10' markerHeight='10' refX='8' refY='3' orient='auto'><path d='M0,0 L8,3 L0,6 Z' fill='#8b98a9'/></marker></defs>
            <rect class='node-box' x='20' y='80' width='120' height='50' rx='8'/>
            <text class='node-text' x='80' y='110' text-anchor='middle'>Command</text>
            <line class='edge' x1='140' y1='105' x2='210' y2='105' marker-end='url(#arrow8)'/>
            <rect class='node-box tool' x='210' y='75' width='150' height='60' rx='8'/>
            <text class='node-text' x='285' y='100' text-anchor='middle'>Event Store</text>
            <text class='node-sub' x='285' y='118' text-anchor='middle'>append-only log</text>
            <line class='edge' x1='360' y1='90' x2='460' y2='45' marker-end='url(#arrow8)'/>
            <line class='edge' x1='360' y1='120' x2='460' y2='165' marker-end='url(#arrow8)'/>
            <rect class='node-box worker' x='460' y='20' width='160' height='44' rx='8'/>
            <text class='node-text' x='540' y='47' text-anchor='middle'>SQL read model</text>
            <rect class='node-box worker' x='460' y='145' width='160' height='44' rx='8'/>
            <text class='node-text' x='540' y='172' text-anchor='middle'>Search index</text>
          </svg>
          <div class='diagram-caption'>Write once to the event store; project into as many read models as you need. Reads and writes scale independently.</div>
        </div>

        <div class='callout'>
          <div class='c-title'>Snapshots keep replay cheap</div>
          Folding 10 million events on every load is slow. Periodically persist a <strong>snapshot</strong> (state at event #N); on load, hydrate from the snapshot then apply only events after N. Tools: EventStoreDB, Axon, Marten (Postgres), or Kafka as the log + a projector.
        </div>

        <div class='callout warn'>
          <div class='c-title'>Gotcha: eventual consistency between write and read</div>
          The read model lags the write by the projection time. A user who just placed an order may not see it in the list yet. Handle with 'read your own writes' tricks (return the command result directly, or read from the write side for that user). Also: CQRS/ES is a <strong>heavy</strong> pattern — don't apply it to a simple CRUD app. Use it where audit, temporal queries, or complex domains justify the cost.
        </div>

        <div class='callout danger'>
          <div class='c-title'>Immutable log + GDPR = tension</div>
          You can't 'edit history' to delete personal data. Use <strong>crypto-shredding</strong> (encrypt per-subject, throw away the key) or design events to keep PII out of the permanent log.
        </div>

        <div class='callout good'>
          <div class='c-title'>Interview soundbite</div>
          'Event sourcing stores state as an immutable event log; current state is a fold over it, with snapshots to keep replay fast. CQRS separates the write model (append events) from denormalized read models built by projecting those events. You gain audit, time-travel, and rebuildable views; you pay with eventual consistency and real complexity — reserve it for domains that need it.'
        </div>
      `,
    },
    {
      id: 'schema-evolution',
      group: 'Patterns',
      nav: '12 · Schema evolution',
      title: 'Schema evolution & versioning',
      lede: 'Your events outlive your code. A field you rename today can break a consumer — or a five-year-old event replay — tomorrow.',
      html: `
        <p>In EDA the event schema is a <strong>contract</strong> between teams you may never meet, across versions that may run for years. Break it and you break replays, downstream consumers, and event-sourced history. This is where a <span class='kicker'>schema registry</span> earns its keep.</p>

        <h3>Two kinds of compatibility (know the difference cold)</h3>
        <table>
          <tr><th>Type</th><th>Meaning</th><th>Safe change</th></tr>
          <tr><td><strong>Backward compatible</strong></td><td>New consumer can read old events</td><td>Add a field <em>with a default</em>; delete an optional field</td></tr>
          <tr><td><strong>Forward compatible</strong></td><td>Old consumer can read new events</td><td>Add an optional field the old code ignores</td></tr>
          <tr><td><strong>Full</strong></td><td>Both directions</td><td>Only additive optional changes</td></tr>
        </table>

        <div class='callout danger'>
          <div class='c-title'>Breaking changes that bite</div>
          <strong>Renaming</strong> a field, <strong>changing its type</strong> (string → int), <strong>removing a required</strong> field, or repurposing an enum value. In an event-sourced system this can make ancient events <em>unreadable</em> during replay. Never mutate meaning — only add.
        </div>

        <h3>The golden rules</h3>
        <ul>
          <li><strong>Only add optional fields with defaults.</strong> Additive changes are the safe path.</li>
          <li><strong>Never rename or retype in place.</strong> Add the new field, dual-write both, migrate consumers, then retire the old one — the <em>expand/contract</em> (parallel-change) migration.</li>
          <li><strong>Version explicitly</strong> when you must break — <code>OrderPlaced.v2</code> as a new type/topic, run both until consumers migrate.</li>
          <li><strong>Enforce with a registry</strong> — the Confluent Schema Registry checks Avro/Protobuf/JSON-Schema compatibility <em>at publish time</em> and rejects incompatible schemas before they poison the topic.</li>
        </ul>

        <div class='callout'>
          <div class='c-title'>Format matters: Avro / Protobuf / JSON</div>
          <strong>Avro</strong> (schema travels via registry ID, compact, great evolution rules) and <strong>Protobuf</strong> (field numbers give robust evolution — never reuse a number) are the serious choices for high-volume streams. <strong>JSON Schema</strong> is human-friendly but bulky and weaker on evolution guarantees. Whatever you pick, register it.
        </div>

        <div class='callout warn'>
          <div class='c-title'>Gotcha: consumers must tolerate unknown fields</div>
          Forward compatibility only works if old consumers <strong>ignore</strong> fields they don't recognize instead of throwing. Configure your deserializer to be lenient ('ignore unknown properties'), or a producer adding a field will crash every old consumer.
        </div>

        <div class='callout good'>
          <div class='c-title'>Interview soundbite</div>
          'Events are long-lived contracts, so I only make additive, optional changes and enforce compatibility with a schema registry (Avro/Protobuf). Breaking changes get a new version/topic with a parallel-change migration — never a rename in place, because that breaks live consumers and event replays.'
        </div>
      `,
    },
    {
      id: 'observability-pitfalls',
      group: 'Reliability',
      nav: '13 · Observability',
      title: 'Observability & the classic pitfalls',
      lede: 'There\'s no single stack trace across an async fan-out. If you can\'t trace, measure lag, and detect duplicates, EDA becomes a haunted house.',
      html: `
        <p>The #1 operational complaint about EDA is <em>'where did my event go?'</em>. In request/response you get one stack trace. In EDA a single user action becomes a tree of async reactions across services and time. You must engineer observability in from day one.</p>

        <h3>The three pillars for EDA specifically</h3>
        <ul>
          <li><strong>Distributed tracing</strong> — propagate a <span class='kicker'>trace/correlation ID</span> in every event header (W3C <code>traceparent</code>, OpenTelemetry). Now Jaeger/Tempo/Honeycomb can stitch producer → broker → consumer → the next event into one timeline.</li>
          <li><strong>Metrics</strong> — the star metric is <span class='kicker'>consumer lag</span> (how far behind the latest offset a consumer is). Rising lag = you're falling behind. Also: throughput, error rate, retry rate, DLQ depth, processing latency.</li>
          <li><strong>Logs</strong> — always log the event ID + correlation ID so you can grep a message's whole journey.</li>
        </ul>

        <div class='callout'>
          <div class='c-title'>Consumer lag is your heartbeat</div>
          Lag near zero = healthy. Lag steadily climbing = producers outpace consumers → scale out or shed load. Lag flat but high = stuck consumer (maybe a poison message blocking a partition). Tools: Kafka's <code>consumer-groups --describe</code>, Burrow, Kafka Lag Exporter → Prometheus/Grafana.
        </div>

        <div class='diagram'>
          <svg viewBox='0 0 640 160' width='640'>
            <defs><marker id='arrow9' markerWidth='10' markerHeight='10' refX='8' refY='3' orient='auto'><path d='M0,0 L8,3 L0,6 Z' fill='#8b98a9'/></marker></defs>
            <rect class='node-box tool' x='40' y='55' width='420' height='40' rx='6'/>
            <text class='node-sub' x='60' y='45'>partition log</text>
            <line class='edge' x1='250' y1='95' x2='250' y2='120'/>
            <text class='edge-label' x='250' y='138' text-anchor='middle'>consumer offset</text>
            <line class='edge' x1='250' y1='75' x2='455' y2='75' marker-end='url(#arrow9)'/>
            <text class='edge-label' x='360' y='68' text-anchor='middle'>LAG</text>
            <text class='node-sub' x='470' y='80'>latest offset</text>
          </svg>
          <div class='diagram-caption'>Lag = distance between the latest offset and where the consumer has committed. It is the single number that tells you if you're keeping up.</div>
        </div>

        <h3>The classic pitfalls (a checklist to recite)</h3>
        <table>
          <tr><th>Pitfall</th><th>Symptom</th><th>Fix</th></tr>
          <tr><td>No correlation IDs</td><td>Can't trace a flow across services</td><td>Propagate trace headers everywhere</td></tr>
          <tr><td>Ignoring duplicates</td><td>Double charges/emails</td><td>Idempotent consumers</td></tr>
          <tr><td>Assuming ordering</td><td>Race bugs across partitions</td><td>Per-key partitioning; don't assume global order</td></tr>
          <tr><td>Dual-write</td><td>DB & stream disagree</td><td>Transactional outbox</td></tr>
          <tr><td>Unwatched DLQ</td><td>Silent data loss</td><td>Alarm on DLQ depth</td></tr>
          <tr><td>Event soup</td><td>Emergent, unknowable flows</td><td>Document event catalog; consider orchestration</td></tr>
          <tr><td>EDA where a call would do</td><td>Needless complexity</td><td>Use sync calls for simple 1:1 request/response</td></tr>
        </table>

        <div class='callout warn'>
          <div class='c-title'>War story: the invisible cycle</div>
          Service A emits X, B reacts and emits Y, C reacts to Y and emits X again → an infinite event loop nobody designed. With no tracing it looked like 'random load spikes'. Correlation IDs + a documented event catalog (AsyncAPI, EventCatalog) surface these before they page you at 3am.
        </div>

        <div class='callout good'>
          <div class='c-title'>Interview soundbite</div>
          'EDA has no single stack trace, so I bake in observability: correlation/trace IDs in every event header (OpenTelemetry), and I watch consumer lag as the heartbeat plus error/retry rate and DLQ depth. Most production pain — duplicates, ordering races, lost events, event loops — is one of a known set of pitfalls with a known fix.'
        </div>
      `,
    },
    {
      id: 'recap-cheatsheet',
      group: 'Recap',
      nav: '14 · Rapid-fire recap',
      title: 'Rapid-fire interview Q&A cheat-sheet',
      lede: 'Everything above, compressed into answers you can fire back in under fifteen seconds each. Skim this the night before.',
      html: `
        <p>Read these out loud. Each is a complete, senior-grade answer.</p>

        <h3>Foundations</h3>
        <ul>
          <li><strong>Command vs event?</strong> Command = imperative 'do this', one handler, sender expects a result. Event = past-tense 'this happened', 0..N listeners, fire-and-forget. EDA inverts the dependency — publishers don't know consumers.</li>
          <li><strong>Three decouplings EDA buys?</strong> Spatial (who), temporal (when), synchronization (blocking).</li>
          <li><strong>When NOT to use EDA?</strong> Simple 1:1 request/response where you need an immediate answer — just make the call. EDA trades simplicity now for flexibility later.</li>
        </ul>

        <h3>Transports</h3>
        <ul>
          <li><strong>Queue vs log?</strong> Queue = consume-and-delete work buffer (SQS, RabbitMQ). Log = append-only, retained, per-consumer offset, replayable (Kafka, Kinesis).</li>
          <li><strong>Kafka parallelism cap?</strong> One active consumer per partition — you scale consumers only up to the partition count.</li>
          <li><strong>Fan-out vs competing consumers?</strong> Fan-out = one event to many <em>distinct</em> consumers (consumer groups / SNS→SQS). Competing consumers = many <em>identical</em> workers sharing load.</li>
          <li><strong>AWS pub/sub?</strong> SNS fans out to multiple SQS queues; each queue buffers for a worker fleet.</li>
        </ul>

        <h3>Guarantees</h3>
        <ul>
          <li><strong>Exactly-once?</strong> Impossible end-to-end (Two Generals). Kafka/Flink give exactly-once <em>processing</em> within their boundary. In practice: at-least-once + idempotency = effectively-once.</li>
          <li><strong>Idempotency how?</strong> Dedup on a stable event/business key with a unique constraint, ideally in the same transaction as the side effect; or push an idempotency key to the downstream API (Stripe).</li>
          <li><strong>Ordering?</strong> Only per-partition. Choose a partition key = your consistency boundary (usually the aggregate id). Watch for hot-partition skew.</li>
          <li><strong>Ack timing?</strong> Ack before work = at-most-once (loss); ack after work = at-least-once (dupes).</li>
        </ul>

        <h3>Reliability & patterns</h3>
        <ul>
          <li><strong>Dual-write problem?</strong> DB write + broker publish aren't atomic → lost/phantom events. Fix: transactional outbox (+ polling or Debezium CDC relay).</li>
          <li><strong>Poison message?</strong> Capped exponential backoff + jitter, then DLQ / retry-topic tier to avoid head-of-line blocking. Alarm on DLQ depth.</li>
          <li><strong>Saga?</strong> Distributed transaction → sequence of local transactions + compensating actions. Choreography (event chains, few steps) vs orchestration (central coordinator like Temporal/Step Functions, complex flows). Eventual consistency, no isolation.</li>
          <li><strong>Event sourcing / CQRS?</strong> Store the event log; state = fold + snapshots. CQRS splits append-only write model from projected read models. Eventual consistency between them.</li>
          <li><strong>Thin vs fat events?</strong> Thin = IDs only (low schema coupling, chatty callbacks). Fat = event-carried state transfer (autonomy, staleness, duplication). Claim-check for big blobs.</li>
        </ul>

        <h3>Ops</h3>
        <ul>
          <li><strong>Schema evolution?</strong> Additive optional changes only; enforce with a registry (Avro/Protobuf); breaking = new version/topic + parallel-change migration.</li>
          <li><strong>Observability?</strong> Correlation/trace IDs in headers (OpenTelemetry); consumer lag is the heartbeat; watch error/retry rate and DLQ depth.</li>
        </ul>

        <div class='callout good'>
          <div class='c-title'>One-breath summary</div>
          'EDA = past-tense facts on a broker, publishers blind to consumers. Pick queue vs log by semantics. Assume at-least-once, so make consumers idempotent; order per-key via partition keys; never dual-write — use an outbox. Sagas for cross-service transactions, event sourcing/CQRS for audit and rebuildable views, a schema registry for evolution, and correlation IDs + consumer lag for observability. Exactly-once is a myth — engineer effectively-once.'
        </div>

        <div class='callout'>
          <div class='c-title'>Interview soundbite</div>
          'The senior signal isn't naming Kafka — it's reasoning about trade-offs: delivery guarantees, ordering vs throughput, the dual-write problem, and how you keep an async system observable and idempotent.'
        </div>
      `,
    },
  ],
  quizzes: [
    {
      question: 'In event-driven architecture, what most precisely distinguishes an event from a command?',
      options: [
        { text: 'An event is synchronous while a command is asynchronous', correct: false },
        { text: 'An event is a past-tense notification with 0..N unknown listeners; a command is an imperative request with one intended handler that expects a result', correct: true },
        { text: 'Events are stored in databases; commands are only ever in memory', correct: false },
        { text: 'Commands can only be sent over Kafka; events can only be sent over SQS', correct: false },
      ],
      explain: 'The core distinction is semantic: events announce that state already changed (past tense, fire-and-forget, many possible listeners), while commands request a change (imperative, one handler, sender cares about the outcome).',
    },
    {
      question: 'A team needs many independent downstream systems to each replay the full history of orders on demand. Which transport fits best?',
      options: [
        { text: 'An SQS standard queue, because it deletes messages after they are acked', correct: false },
        { text: 'A RabbitMQ work queue with competing consumers', correct: false },
        { text: 'A distributed log like Kafka or Kinesis, where messages are retained and each consumer group tracks its own offset', correct: true },
        { text: 'A direct HTTP webhook to each system', correct: false },
      ],
      explain: 'Replay by multiple independent readers requires a retained, append-only log with per-consumer offsets (Kafka/Kinesis). Queues delete on ack and offer no replay to multiple independent readers.',
    },
    {
      question: 'Why is true "exactly-once delivery" considered unattainable end-to-end?',
      options: [
        { text: 'Because brokers are too slow to deduplicate messages', correct: false },
        { text: 'Because after processing, the acknowledgment can be lost, forcing the broker to choose between redelivery (possible duplicate) or not (possible loss) — the Two Generals problem', correct: true },
        { text: 'Because TCP does not guarantee packet delivery', correct: false },
        { text: 'Because Kafka does not support transactions', correct: false },
      ],
      explain: 'A lost ack after a side effect leaves the broker unable to know whether processing succeeded. It must redeliver (risking a duplicate) or not (risking loss). Kafka/Flink offer exactly-once processing within their boundary, not true end-to-end delivery.',
    },
    {
      question: 'A consumer processes with at-least-once delivery and must charge a credit card. What is the standard way to make duplicates safe?',
      options: [
        { text: 'Switch the broker to at-most-once so duplicates never occur', correct: false },
        { text: 'Make the consumer idempotent — dedup on a stable event/business key (unique constraint), or pass that key as the downstream provider\'s idempotency key so a repeat is a no-op', correct: true },
        { text: 'Add more partitions so duplicates land elsewhere', correct: false },
        { text: 'Retry faster so the duplicate is processed before the original', correct: false },
      ],
      explain: 'Since at-least-once guarantees duplicates can happen, the consumer must be idempotent: dedup on a stable key with a unique constraint (ideally atomic with the side effect), or propagate an idempotency key to the downstream API (e.g. Stripe).',
    },
    {
      question: 'You need all events for a given order to be processed in strict order, while still scaling throughput across a Kafka topic. What do you do?',
      options: [
        { text: 'Use a single partition for the whole topic to guarantee global ordering', correct: false },
        { text: 'Use the orderId as the partition key so all of an order\'s events hash to the same partition, accepting no ordering across different orders', correct: true },
        { text: 'Enable exactly-once semantics, which also guarantees global ordering', correct: false },
        { text: 'Process each partition with a thread pool to speed up ordered processing', correct: false },
      ],
      explain: 'Ordering is guaranteed only within a partition. Keying by orderId keeps each order\'s events on one partition (ordered) while different orders spread across partitions for throughput. A single partition would kill scale; parallelizing within a partition would break order.',
    },
    {
      question: 'A service commits an order to its database and then the broker publish fails. Which pattern prevents the resulting inconsistency?',
      options: [
        { text: 'Two-phase commit across the database and the broker', correct: false },
        { text: 'The transactional outbox: write the event to an outbox table in the same local DB transaction, then a relay (polling or Debezium CDC) publishes it at-least-once', correct: true },
        { text: 'Publishing the event first, then writing to the database', correct: false },
        { text: 'Increasing the broker publish timeout', correct: false },
      ],
      explain: 'The dual-write problem is that two independent writes can\'t be made atomic by ordering them. The transactional outbox couples the state change and the event in one local transaction; a relay then ships the outbox to the broker (at-least-once, so consumers dedup).',
    },
    {
      question: 'A malformed "poison" message throws on every attempt on an ordered Kafka partition. What is the correct handling?',
      options: [
        { text: 'Retry it in place forever until it eventually succeeds', correct: false },
        { text: 'Retry with capped exponential backoff + jitter, then move it to a dead-letter topic/queue so it can\'t cause head-of-line blocking on the partition', correct: true },
        { text: 'Delete the entire partition and recreate it', correct: false },
        { text: 'Acknowledge it immediately before processing to skip it', correct: false },
      ],
      explain: 'Infinite in-place retry blocks everything behind the message on an ordered partition (head-of-line blocking). Cap retries with backoff+jitter, then dead-letter (or use tiered retry topics), and alarm on DLQ depth so it isn\'t silent data loss.',
    },
    {
      question: 'Which schema change is safe to make to an event without breaking existing consumers or historical replay?',
      options: [
        { text: 'Renaming an existing field to a clearer name', correct: false },
        { text: 'Changing a field\'s type from string to integer', correct: false },
        { text: 'Adding a new optional field with a default value', correct: true },
        { text: 'Removing a required field that some consumers still read', correct: false },
      ],
      explain: 'Only additive, optional changes with defaults preserve backward/forward compatibility. Renames, type changes, and removing required fields are breaking — they can make live consumers fail and render historical events unreadable during replay. Enforce with a schema registry.',
    },
    {
      question: 'When would you choose saga orchestration over choreography?',
      options: [
        { text: 'When you have a simple two-step flow and want maximum decoupling', correct: false },
        { text: 'When the workflow has many steps and you need it visible, testable, and easy to change in one place — using a coordinator like Temporal or AWS Step Functions', correct: true },
        { text: 'When you want to guarantee ACID isolation across all services', correct: false },
        { text: 'When you want to avoid writing any compensating actions', correct: false },
      ],
      explain: 'Choreography (services reacting to each other\'s events) suits a few steps with maximum decoupling but becomes an unknowable "emergent" flow at scale. Orchestration centralizes complex, many-step workflows in a coordinator, making them visible and maintainable — at the cost of a coupling point. Neither provides isolation.',
    },
    {
      question: 'What single metric is the best early-warning "heartbeat" that consumers are failing to keep up with producers?',
      options: [
        { text: 'CPU utilization on the broker', correct: false },
        { text: 'Consumer lag — the distance between the latest offset and the consumer\'s committed offset', correct: true },
        { text: 'The total number of topics in the cluster', correct: false },
        { text: 'The replication factor of the topic', correct: false },
      ],
      explain: 'Consumer lag directly measures how far behind a consumer is. Steadily rising lag means producers outpace consumers (scale out or shed load); high-but-flat lag can indicate a stuck consumer (e.g. a poison message blocking a partition).',
    },
  ],
};
