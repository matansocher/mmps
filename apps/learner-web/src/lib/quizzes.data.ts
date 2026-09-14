// Hand-authored, checked-in quiz bank. 2-3 multiple-choice questions per non-reference bite.
// answerIndex is the 0-based index of the correct option.
import type { QuizQuestion } from './types';

export const QUIZZES: QuizQuestion[] = [
  // ===== System Design: The Delivery Framework =====
  {
    biteId: 'system-design:delivery',
    question: 'What is the correct order of the system design delivery framework?',
    options: [
      'High-level design → Requirements → API → Deep dives',
      'Requirements → Core entities → API → High-level design → Deep dives',
      'API → Requirements → Deep dives → Core entities',
      'Core entities → Deep dives → Requirements → API',
    ],
    answerIndex: 1,
    explanation: 'Start by nailing requirements, then core entities, then the API, then a high-level design, and finally targeted deep dives.',
  },
  {
    biteId: 'system-design:delivery',
    question: 'Non-functional requirements should always be…',
    options: ['Vague and flexible', 'Quantified (numbers: latency, QPS, availability)', 'Ignored until deep dives', 'The same for every system'],
    answerIndex: 1,
    explanation: 'Non-functional requirements ("the system should be…") only score points when you quantify them.',
  },

  // ===== System Design: Numbers to Know =====
  {
    biteId: 'system-design:numbers',
    question: 'Roughly how long does a round trip within the same datacenter take?',
    options: ['~0.5 ms', '~150 ms', '~1 second', '~10 microseconds'],
    answerIndex: 0,
    explanation: 'Intra-datacenter round trips are sub-millisecond (~0.5 ms); cross-continent is ~150 ms.',
  },
  {
    biteId: 'system-design:numbers',
    question: 'Reading sequentially from an SSD vs. memory is approximately…',
    options: ['The same speed', 'About 4x slower', 'Orders of magnitude slower', 'Faster than memory'],
    answerIndex: 2,
    explanation: 'Memory is dramatically faster than SSD, which is far faster than disk — the latency ladder spans orders of magnitude.',
  },

  // ===== System Design: Networking Essentials =====
  {
    biteId: 'system-design:networking',
    question: 'Which real-time transport is best when the server must push updates but the client rarely sends data?',
    options: ['Long polling', 'WebSockets', 'Server-Sent Events (SSE)', 'Plain HTTP GET'],
    answerIndex: 2,
    explanation: 'SSE is a one-way server→client stream — ideal for feeds/notifications. WebSockets are for bidirectional.',
  },
  {
    biteId: 'system-design:networking',
    question: 'Which HTTP verb is NOT idempotent?',
    options: ['GET', 'PUT', 'DELETE', 'POST'],
    answerIndex: 3,
    explanation: 'POST is not idempotent — repeating it can create duplicates. GET/PUT/DELETE are idempotent.',
  },

  // ===== System Design: API Design =====
  {
    biteId: 'system-design:api-design',
    question: 'How should you paginate a large list endpoint at scale?',
    options: ['Offset/limit on huge tables', 'Cursor-based pagination', 'Return everything at once', 'Random sampling'],
    answerIndex: 1,
    explanation: 'Cursor (keyset) pagination is stable and efficient at scale; deep offset pagination gets slow.',
  },
  {
    biteId: 'system-design:api-design',
    question: 'To make a create endpoint safe to retry, you should…',
    options: ['Use a GET request', 'Accept an idempotency key', 'Disable retries', 'Return 500 on duplicates'],
    answerIndex: 1,
    explanation: 'An idempotency key lets the server dedupe retried create requests.',
  },

  // ===== System Design: Data Modeling =====
  {
    biteId: 'system-design:data-modeling',
    question: 'When is NoSQL (denormalized) generally the better honest choice?',
    options: [
      'When you need multi-row ACID transactions and complex joins',
      'When access patterns are known and you need horizontal scale on simple key lookups',
      'Always, because SQL cannot scale',
      'Only for tiny datasets',
    ],
    answerIndex: 1,
    explanation: 'NoSQL shines for known access patterns and horizontal scale; SQL wins for relations, joins, and transactions.',
  },
  {
    biteId: 'system-design:data-modeling',
    question: 'Denormalization primarily trades…',
    options: ['Read speed for write/consistency complexity', 'Storage for latency only', 'Security for speed', 'Nothing — it is strictly better'],
    answerIndex: 0,
    explanation: 'Denormalization speeds reads but duplicates data, making writes and consistency harder.',
  },

  // ===== System Design: Caching =====
  {
    biteId: 'system-design:caching',
    question: 'A "cache stampede" (thundering herd) happens when…',
    options: [
      'The cache is too large',
      'Many requests miss the same hot key at once and all hit the DB',
      'Keys never expire',
      'The cache is write-through',
    ],
    answerIndex: 1,
    explanation: 'On a popular key expiring, many concurrent misses stampede the database. Fix with locks/single-flight or staggered TTLs.',
  },
  {
    biteId: 'system-design:caching',
    question: 'Which strategy writes to the cache and DB together to keep them consistent on writes?',
    options: ['Cache-aside (lazy)', 'Write-through', 'No caching', 'Read replica'],
    answerIndex: 1,
    explanation: 'Write-through updates cache and DB on each write; cache-aside populates lazily on read misses.',
  },
  {
    biteId: 'system-design:caching',
    question: 'A good defense against a hot key overwhelming one cache node is…',
    options: ['Delete the key', 'Replicate/split the hot key across nodes', 'Increase TTL to infinity', 'Disable the cache'],
    answerIndex: 1,
    explanation: 'Hot keys are mitigated by replicating them across nodes or adding a local in-process tier.',
  },

  // ===== System Design: Sharding & Partitioning =====
  {
    biteId: 'system-design:sharding',
    question: 'What distinguishes sharding from replication?',
    options: [
      'Sharding splits data across nodes; replication copies the same data to multiple nodes',
      'They are the same thing',
      'Replication splits data; sharding copies it',
      'Sharding is only for caches',
    ],
    answerIndex: 0,
    explanation: 'Sharding = horizontal partition of different data; replication = copies of the same data for HA/read scaling.',
  },
  {
    biteId: 'system-design:sharding',
    question: 'Choosing a bad shard key most directly causes…',
    options: ['Better compression', 'Hot shards / uneven load', 'Stronger consistency', 'Lower storage cost'],
    answerIndex: 1,
    explanation: 'A skewed shard key concentrates traffic on one shard (a hot shard). Pick a high-cardinality, evenly-distributed key.',
  },

  // ===== System Design: Consistent Hashing =====
  {
    biteId: 'system-design:consistent-hashing',
    question: 'Why does plain modulo hashing (hash % N) fail when scaling nodes?',
    options: [
      'It is too slow',
      'Adding/removing a node remaps almost all keys',
      'It cannot hash strings',
      'It requires a coordinator',
    ],
    answerIndex: 1,
    explanation: 'Changing N reshuffles nearly every key. Consistent hashing only moves a small fraction of keys.',
  },
  {
    biteId: 'system-design:consistent-hashing',
    question: 'Virtual nodes (vnodes) in consistent hashing exist to…',
    options: [
      'Encrypt keys',
      'Smooth out uneven key distribution across physical nodes',
      'Replace replication',
      'Reduce the hash space',
    ],
    answerIndex: 1,
    explanation: 'Vnodes give each physical node many points on the ring, balancing load and easing rebalancing.',
  },

  // ===== System Design: CAP Theorem =====
  {
    biteId: 'system-design:cap',
    question: 'The correct framing of CAP is: during a network partition you must choose between…',
    options: ['Cost and performance', 'Consistency and availability', 'Latency and durability', 'SQL and NoSQL'],
    answerIndex: 1,
    explanation: 'CAP is about partition behavior: when a partition occurs, you trade consistency vs. availability.',
  },
  {
    biteId: 'system-design:cap',
    question: 'A banking ledger should typically favor…',
    options: ['Availability (AP)', 'Consistency (CP)', 'Neither', 'Eventual consistency always'],
    answerIndex: 1,
    explanation: 'Money movement needs strong consistency (CP); showing a stale balance is worse than a brief unavailability.',
  },

  // ===== System Design: Database Indexing =====
  {
    biteId: 'system-design:indexing',
    question: 'For a composite index on (a, b, c), which query can it NOT help directly?',
    options: [
      'WHERE a = ?',
      'WHERE a = ? AND b = ?',
      'WHERE b = ? (only)',
      'WHERE a = ? AND b = ? AND c = ?',
    ],
    answerIndex: 2,
    explanation: 'Composite indexes follow a left-to-right prefix rule; you cannot skip the leading column.',
  },
  {
    biteId: 'system-design:indexing',
    question: 'Which index structure is best for full-text / fuzzy search?',
    options: ['B-tree', 'Hash index', 'Inverted index', 'Bitmap only'],
    answerIndex: 2,
    explanation: 'Inverted indexes map terms → documents, powering full-text search (e.g. Elasticsearch).',
  },

  // ===== System Design: Real-time Updates =====
  {
    biteId: 'system-design:p-realtime',
    question: 'In real-time systems, "fanout" refers to…',
    options: [
      'Cooling the servers',
      'Delivering one event to many subscribers',
      'Sharding the database',
      'Compressing messages',
    ],
    answerIndex: 1,
    explanation: 'Fanout is the hard part: propagating a single update to potentially millions of connected clients.',
  },
  {
    biteId: 'system-design:p-realtime',
    question: 'For a celebrity with millions of followers, which fanout approach avoids write amplification?',
    options: ['Fanout-on-write (push to every follower)', 'Fanout-on-read (pull at read time)', 'No fanout', 'Delete followers'],
    answerIndex: 1,
    explanation: 'Fanout-on-write explodes for huge fan-out; a hybrid/pull model is used for celebrity accounts.',
  },

  // ===== System Design: Dealing with Contention =====
  {
    biteId: 'system-design:p-contention',
    question: 'Ordered from weakest to strongest, which contention tool is the strongest guarantee?',
    options: ['Optimistic concurrency control', 'Atomic single-row update', 'Distributed lock / serializable transaction', 'Idempotency key'],
    answerIndex: 2,
    explanation: 'Distributed locks / serializable transactions are the strongest (and costliest) tools in the contention toolbox.',
  },
  {
    biteId: 'system-design:p-contention',
    question: 'Optimistic concurrency control works best when…',
    options: ['Conflicts are frequent', 'Conflicts are rare', 'You cannot retry', 'There is only one writer'],
    answerIndex: 1,
    explanation: 'OCC (version check + retry) is cheap when conflicts are rare; under high contention, pessimistic locking may win.',
  },

  // ===== System Design: Multi-step Processes (Sagas) =====
  {
    biteId: 'system-design:p-multistep',
    question: 'A saga handles a failed step in a multi-service workflow by…',
    options: [
      'Rolling back with a distributed 2PC transaction',
      'Running compensating actions to undo prior steps',
      'Ignoring the failure',
      'Restarting all services',
    ],
    answerIndex: 1,
    explanation: 'Sagas replace distributed transactions with compensating (undo) actions per completed step.',
  },
  {
    biteId: 'system-design:p-multistep',
    question: 'Durable execution engines (e.g. Temporal) primarily give you…',
    options: ['Free storage', 'Crash-safe, resumable long-running workflows', 'Faster networking', 'Automatic sharding'],
    answerIndex: 1,
    explanation: 'Durable execution persists workflow state so long-running processes survive crashes and resume where they left off.',
  },

  // ===== System Design: Scaling Reads =====
  {
    biteId: 'system-design:p-reads',
    question: 'The first, cheapest lever to scale reads is usually…',
    options: ['Sharding writes', 'Caching + read replicas', 'Rewriting in another language', 'Adding a message queue'],
    answerIndex: 1,
    explanation: 'Read scaling ladder: cache aggressively, then add read replicas, before more invasive changes.',
  },
  {
    biteId: 'system-design:p-reads',
    question: 'A downside of read replicas is…',
    options: ['They increase write throughput', 'Replication lag causes stale reads', 'They cannot serve reads', 'They require NoSQL'],
    answerIndex: 1,
    explanation: 'Async replicas lag, so reads can be slightly stale — fine for many read paths, not for read-after-write.',
  },

  // ===== System Design: Scaling Writes =====
  {
    biteId: 'system-design:p-writes',
    question: 'Which technique most directly scales write throughput?',
    options: ['Adding read replicas', 'Sharding / partitioning writes', 'Bigger cache', 'CDN'],
    answerIndex: 1,
    explanation: 'Writes scale by partitioning them across shards; replicas and caches mainly help reads.',
  },
  {
    biteId: 'system-design:p-writes',
    question: 'Buffering bursty writes through a queue (e.g. Kafka) primarily provides…',
    options: ['Stronger consistency', 'Back-pressure absorption / smoothing', 'Lower storage', 'Free indexing'],
    answerIndex: 1,
    explanation: 'A log/queue absorbs write spikes and lets consumers process at a sustainable rate.',
  },

  // ===== System Design: Handling Large Blobs =====
  {
    biteId: 'system-design:p-blobs',
    question: 'The standard way to upload large files without routing them through your API servers is…',
    options: ['Base64 in JSON', 'Pre-signed URLs to object storage (S3)', 'Store in the SQL DB', 'Email attachments'],
    answerIndex: 1,
    explanation: 'Issue a pre-signed URL and let the client upload directly to blob storage (S3/GCS), then store the reference.',
  },
  {
    biteId: 'system-design:p-blobs',
    question: 'Large media is typically served to users via…',
    options: ['The application server directly', 'A CDN in front of object storage', 'The database', 'A message queue'],
    answerIndex: 1,
    explanation: 'A CDN caches blobs at the edge for fast, cheap delivery close to users.',
  },

  // ===== System Design: Managing Long-Running Tasks =====
  {
    biteId: 'system-design:p-longtasks',
    question: 'The standard shape for long-running work triggered by an API is…',
    options: [
      'Block the request until done',
      'Enqueue a job, return immediately, process with workers, notify on completion',
      'Run it in the database',
      'Reject the request',
    ],
    answerIndex: 1,
    explanation: 'Accept → enqueue → async worker → status/notify. Never hold the HTTP request open for minutes.',
  },
  {
    biteId: 'system-design:p-longtasks',
    question: 'How should a client learn a background job finished?',
    options: ['Guess', 'Poll a status endpoint or receive a webhook/websocket push', 'Refresh forever', 'It cannot'],
    answerIndex: 1,
    explanation: 'Expose job status via polling or push (webhook/SSE/WebSocket) once the worker completes.',
  },

  // ===== System Design: Redis =====
  {
    biteId: 'system-design:dd-redis',
    question: 'Which is NOT a typical use of Redis?',
    options: ['Cache', 'Rate limiter', 'Primary source-of-truth relational store with joins', 'Leaderboard (sorted set)'],
    answerIndex: 2,
    explanation: 'Redis is an in-memory store for caching, rate limiting, queues, pub/sub, and leaderboards — not a relational system of record.',
  },
  {
    biteId: 'system-design:dd-redis',
    question: 'A Redis sorted set (ZSET) is the natural fit for…',
    options: ['Full-text search', 'Leaderboards / ranked data', 'Blob storage', 'ACID transactions across tables'],
    answerIndex: 1,
    explanation: 'ZSETs keep members ordered by score — perfect for leaderboards and top-N queries.',
  },

  // ===== System Design: Kafka =====
  {
    biteId: 'system-design:dd-kafka',
    question: 'Kafka guarantees message ordering…',
    options: ['Globally across the topic', 'Within a partition', 'Never', 'Only with one consumer'],
    answerIndex: 1,
    explanation: 'Ordering is per-partition. Use a partition key to keep related events ordered together.',
  },
  {
    biteId: 'system-design:dd-kafka',
    question: 'Consumers in Kafka track their position using…',
    options: ['A lock', 'An offset', 'A timestamp only', 'The producer'],
    answerIndex: 1,
    explanation: 'Each consumer group commits offsets, so it can resume and replay from a known point in the log.',
  },

  // ===== System Design: PostgreSQL =====
  {
    biteId: 'system-design:dd-postgres',
    question: 'Why does PostgreSQL "win interviews" as a default choice?',
    options: [
      'It is the only NoSQL database',
      'ACID + rich features (JSONB, full-text, extensions) cover most needs',
      'It cannot be replicated',
      'It has no transactions',
    ],
    answerIndex: 1,
    explanation: 'Postgres gives strong ACID guarantees plus JSONB, full-text, GIS, and extensions — a versatile default.',
  },
  {
    biteId: 'system-design:dd-postgres',
    question: 'Which concurrency-control mechanism can you cite for Postgres?',
    options: ['MVCC (multi-version concurrency control)', 'Global table lock per query', 'No concurrency support', 'Single-threaded only'],
    answerIndex: 0,
    explanation: 'Postgres uses MVCC so readers don’t block writers and vice versa.',
  },

  // ===== System Design: Cassandra =====
  {
    biteId: 'system-design:dd-cassandra',
    question: 'Cassandra is the right call when you need…',
    options: [
      'Complex ad-hoc joins and transactions',
      'Massive write throughput and horizontal scale with known queries',
      'A small single-node database',
      'Strong global consistency by default',
    ],
    answerIndex: 1,
    explanation: 'Cassandra is a wide-column, write-optimized, horizontally scalable store — but you must model around your queries.',
  },
  {
    biteId: 'system-design:dd-cassandra',
    question: 'The key modeling skill in Cassandra is…',
    options: ['Normalizing everything', 'Query-driven modeling (design tables per access pattern)', 'Avoiding partition keys', 'Using foreign keys'],
    answerIndex: 1,
    explanation: 'You design tables around the exact queries you’ll run; there are no joins to fall back on.',
  },

  // ===== System Design: DynamoDB =====
  {
    biteId: 'system-design:dd-dynamodb',
    question: 'DynamoDB data modeling revolves around…',
    options: ['Joins and views', 'Partition key + sort key access patterns', 'Full-text indexes', 'Stored procedures'],
    answerIndex: 1,
    explanation: 'You model around keys (PK/SK) and often single-table designs to satisfy access patterns.',
  },
  {
    biteId: 'system-design:dd-dynamodb',
    question: 'A DynamoDB partition that receives disproportionate traffic is a…',
    options: ['Cold key', 'Hot partition', 'Replica', 'Secondary index'],
    answerIndex: 1,
    explanation: 'Uneven key distribution creates hot partitions; choose high-cardinality keys and consider write sharding.',
  },

  // ===== System Design: Elasticsearch =====
  {
    biteId: 'system-design:dd-elasticsearch',
    question: 'Elasticsearch is built on which core data structure?',
    options: ['B-tree', 'Inverted index', 'Skip list', 'Bloom filter only'],
    answerIndex: 1,
    explanation: 'Elasticsearch uses inverted indexes for fast full-text search and relevance scoring.',
  },
  {
    biteId: 'system-design:dd-elasticsearch',
    question: 'Elasticsearch is usually treated as…',
    options: ['The single source of truth', 'A secondary search index fed from your primary DB', 'A cache only', 'A message queue'],
    answerIndex: 1,
    explanation: 'You typically keep the source of truth elsewhere and sync into Elasticsearch for search.',
  },

  // ===== System Design: Flink (Stream Processing) =====
  {
    biteId: 'system-design:dd-flink',
    question: 'Flink is designed primarily for…',
    options: ['Batch-only reports', 'Stateful stream processing with windowing', 'Blob storage', 'Relational joins on disk'],
    answerIndex: 1,
    explanation: 'Flink does low-latency, stateful stream processing (windows, aggregations, event-time handling).',
  },

  // ===== System Design: ZooKeeper / etcd =====
  {
    biteId: 'system-design:dd-zookeeper',
    question: 'ZooKeeper / etcd are used for…',
    options: ['Bulk analytics', 'Coordination: leader election, config, service discovery', 'Full-text search', 'Video streaming'],
    answerIndex: 1,
    explanation: 'They provide consistent coordination primitives (locks, leader election, config) using consensus.',
  },

  // ===== System Design: API Gateway =====
  {
    biteId: 'system-design:dd-apigw',
    question: 'Which is a core responsibility of an API gateway?',
    options: ['Running the database', 'Auth, rate limiting, routing, and request aggregation', 'Training ML models', 'Rendering the frontend'],
    answerIndex: 1,
    explanation: 'A gateway centralizes cross-cutting concerns: authentication, rate limiting, routing, and sometimes aggregation.',
  },

  // ===== System Design: Proximity / Geospatial Search =====
  {
    biteId: 'system-design:dd-proximity',
    question: 'Encoding 2-D coordinates into a sortable 1-D key (e.g. geohash) lets you…',
    options: ['Avoid indexes entirely', 'Use a normal range index for nearby lookups', 'Store images', 'Guarantee exact distances'],
    answerIndex: 1,
    explanation: 'Geohash/S2 turn 2-D into a 1-D sortable key so a plain B-tree/range index can answer proximity queries.',
  },
  {
    biteId: 'system-design:dd-proximity',
    question: 'Which family is best when data is geometric shapes/regions rather than points?',
    options: ['Encoded keys (geohash)', 'Spatial trees (R-tree/quadtree)', 'Hash indexes', 'Inverted indexes'],
    answerIndex: 1,
    explanation: 'Spatial trees (R-tree, quadtree, k-d tree) handle geometric shapes and range/nearest queries well.',
  },

  // ===== System Design: Time-Series Databases =====
  {
    biteId: 'system-design:dd-timeseries',
    question: 'What makes time-series databases special?',
    options: [
      'They store only text',
      'Append-heavy, time-ordered writes with downsampling/retention and time-bucketed queries',
      'They forbid indexes',
      'They are in-memory only',
    ],
    answerIndex: 1,
    explanation: 'TSDBs optimize for high-volume append writes ordered by time, with rollups, retention, and time-range queries.',
  },

  // ===== System Design: Vector Databases & Semantic Search =====
  {
    biteId: 'system-design:dd-vectordb',
    question: 'A vector database enables search by…',
    options: ['Exact keyword match only', 'Semantic similarity via nearest-neighbor on embeddings', 'SQL joins', 'Regex'],
    answerIndex: 1,
    explanation: 'Vector DBs store embeddings and find nearest neighbors, enabling semantic/meaning-based search.',
  },
  {
    biteId: 'system-design:dd-vectordb',
    question: 'Which is a common ANN index type to know?',
    options: ['B-tree', 'HNSW', 'LSM-tree', 'Bitmap'],
    answerIndex: 1,
    explanation: 'HNSW (graph-based) and IVF (inverted-file/clustering) are the two ANN index families to cite.',
  },

  // ===== System Design: Big Data / Batch Processing =====
  {
    biteId: 'system-design:dd-bigdata',
    question: 'The classic building block for distributed batch processing is…',
    options: ['MapReduce / Spark', 'A single cron on one server', 'A cache', 'A CDN'],
    answerIndex: 0,
    explanation: 'MapReduce and its successor Spark split huge datasets across a cluster for parallel batch computation.',
  },

  // ===== System Design: Change Data Capture (CDC) =====
  {
    biteId: 'system-design:dd-cdc',
    question: 'Change Data Capture works by…',
    options: [
      'Polling every table every second',
      'Tailing the database write-ahead log to stream row changes',
      'Taking full backups hourly',
      'Blocking writes',
    ],
    answerIndex: 1,
    explanation: 'CDC reads the DB’s replication/WAL log and emits change events (e.g. to Kafka) without heavy polling.',
  },
  {
    biteId: 'system-design:dd-cdc',
    question: 'A common use of CDC is…',
    options: ['Rendering HTML', 'Keeping a search index or cache in sync with the primary DB', 'Encrypting disks', 'Load balancing'],
    answerIndex: 1,
    explanation: 'CDC syncs derived stores (search, cache, data warehouse) with the source of truth in near real time.',
  },

  // ===== AI Engineering: LLM Foundations =====
  {
    biteId: 'ai-engineering:foundations',
    question: 'What is a token?',
    options: ['A full word always', 'A sub-word unit (~4 chars) the model processes', 'A single byte', 'An API key'],
    answerIndex: 1,
    explanation: 'Tokens are sub-word units (~4 chars). They drive cost, context limits, and latency.',
  },
  {
    biteId: 'ai-engineering:foundations',
    question: 'What does the temperature parameter control?',
    options: ['Model size', 'Randomness of token sampling', 'Context window length', 'Token price'],
    answerIndex: 1,
    explanation: 'Low temperature = focused/deterministic (extraction, code); high = diverse/creative.',
  },
  {
    biteId: 'ai-engineering:foundations',
    question: '"Lost in the middle" means…',
    options: [
      'The model forgets its name',
      'Models attend best to the start and end of a prompt, missing buried content',
      'Streaming drops tokens',
      'The API times out',
    ],
    answerIndex: 1,
    explanation: 'Put critical instructions/context at the edges of the prompt and retrieve only what’s relevant.',
  },

  // ===== AI Engineering: Prompting & Structured Output =====
  {
    biteId: 'ai-engineering:prompting',
    question: 'Chain-of-Thought prompting improves results by…',
    options: ['Lowering temperature to 0', 'Asking the model to reason step by step', 'Using more few-shot images', 'Shrinking the context'],
    answerIndex: 1,
    explanation: 'CoT elicits intermediate reasoning steps, improving accuracy on multi-step problems.',
  },
  {
    biteId: 'ai-engineering:prompting',
    question: 'The single most important production prompting skill is…',
    options: ['Emoji usage', 'Reliable structured output (JSON) validated against a schema', 'Longer prompts', 'Higher temperature'],
    answerIndex: 1,
    explanation: 'Structured output + schema validation (e.g. Zod) makes LLM responses machine-usable and reliable.',
  },
  {
    biteId: 'ai-engineering:prompting',
    question: 'ReAct combines…',
    options: ['React.js and TypeScript', 'Reasoning + Acting (tool calls) interleaved', 'Retrieval + Caching', 'Roles + Actions only'],
    answerIndex: 1,
    explanation: 'ReAct interleaves reasoning with tool actions and observations — the backbone of agents.',
  },

  // ===== AI Engineering: Embeddings & Vector Search =====
  {
    biteId: 'ai-engineering:embeddings',
    question: 'An embedding is…',
    options: ['A compressed image', 'A vector representing meaning so you can search by similarity', 'A database index', 'A prompt template'],
    answerIndex: 1,
    explanation: 'Embeddings turn text/images into vectors so semantically similar items sit close together.',
  },
  {
    biteId: 'ai-engineering:embeddings',
    question: 'Why use cosine similarity over Euclidean distance for text embeddings?',
    options: [
      'It is faster to type',
      'It measures direction (meaning) and ignores magnitude/length',
      'It requires no normalization ever',
      'Euclidean cannot be computed',
    ],
    answerIndex: 1,
    explanation: 'Cosine compares angle/direction, which encodes meaning; for normalized vectors it equals the dot product.',
  },
  {
    biteId: 'ai-engineering:embeddings',
    question: 'A reasonable starting point for chunking is…',
    options: ['1 token per chunk', '~500–1000 tokens with 10–20% overlap', 'The whole document as one chunk', '10,000 tokens, no overlap'],
    answerIndex: 1,
    explanation: 'Start around 500–1000 tokens with 10–20% overlap, then tune against a retrieval eval.',
  },

  // ===== AI Engineering: RAG =====
  {
    biteId: 'ai-engineering:rag',
    question: 'RAG stands for and does what, in order?',
    options: [
      'Retrieve → Augment → Generate a grounded answer',
      'Rank → Aggregate → Generate',
      'Read → Analyze → Guess',
      'Retrieve → Anonymize → Grade',
    ],
    answerIndex: 0,
    explanation: 'Retrieve relevant chunks, Augment the prompt with them, Generate a grounded, cited answer.',
  },
  {
    biteId: 'ai-engineering:rag',
    question: 'Which problem does RAG NOT directly solve?',
    options: ['Frozen training knowledge', 'Private/unknown data', 'The model being fundamentally bad at reasoning', 'Confident hallucination'],
    answerIndex: 2,
    explanation: 'RAG grounds answers in fresh/private sources and reduces hallucination, but it doesn’t upgrade core reasoning.',
  },
  {
    biteId: 'ai-engineering:rag',
    question: 'When should you prefer fine-tuning over RAG?',
    options: [
      'To add changing facts with citations',
      'To teach a consistent format/style/behavior',
      'To reduce hallucinations on private data',
      'To always avoid retraining',
    ],
    answerIndex: 1,
    explanation: 'RAG is for knowledge; fine-tuning is for behavior/format/style. They’re complementary.',
  },

  // ===== AI Engineering: Advanced RAG Patterns =====
  {
    biteId: 'ai-engineering:advanced-rag',
    question: 'HyDE improves retrieval by…',
    options: [
      'Hiding the query',
      'Generating a hypothetical answer and embedding that instead of the raw query',
      'Doubling chunk size',
      'Removing embeddings',
    ],
    answerIndex: 1,
    explanation: 'A fake answer sits closer to real answers in embedding space than the short question does.',
  },
  {
    biteId: 'ai-engineering:advanced-rag',
    question: 'Hybrid search combines…',
    options: ['Two LLMs', 'Dense (semantic) + sparse (keyword/BM25) retrieval', 'RAG + fine-tuning', 'Cache + CDN'],
    answerIndex: 1,
    explanation: 'Hybrid fuses semantic and keyword retrieval (e.g. via Reciprocal Rank Fusion) to catch meaning and exact terms.',
  },
  {
    biteId: 'ai-engineering:advanced-rag',
    question: 'Reranking typically works by…',
    options: [
      'Sorting alphabetically',
      'Using a cross-encoder to score query+chunk pairs and reorder top results',
      'Deleting duplicates',
      'Lowering temperature',
    ],
    answerIndex: 1,
    explanation: 'Retrieve wide, then a cross-encoder rescores each query+chunk pair — often the biggest single quality win.',
  },

  // ===== AI Engineering: AI Agents & Tool Calling =====
  {
    biteId: 'ai-engineering:agents',
    question: 'When the model "calls a tool", what actually runs the function?',
    options: ['The model executes it itself', 'Your code executes it and returns the result to the model', 'The vector DB', 'Nothing runs'],
    answerIndex: 1,
    explanation: 'The model only emits a structured request (name + JSON args); your code executes and returns a tool message.',
  },
  {
    biteId: 'ai-engineering:agents',
    question: 'Which safeguard stops an agent from looping forever?',
    options: ['Infinite retries', 'A hard max-step cap plus loop detection', 'Higher temperature', 'Removing tools'],
    answerIndex: 1,
    explanation: 'Cap steps, add per-tool timeouts/budgets, validate args, and detect repeated identical calls.',
  },
  {
    biteId: 'ai-engineering:agents',
    question: 'MCP (Model Context Protocol) is…',
    options: [
      'A model architecture',
      'An open standard to connect agents to tools/data via client/server',
      'A prompting technique',
      'A vector index',
    ],
    answerIndex: 1,
    explanation: 'MCP is "USB-C for AI tools" — a standard so tool authors and agent authors integrate reusably.',
  },

  // ===== AI Engineering: Multi-Agent Systems =====
  {
    biteId: 'ai-engineering:multi-agent',
    question: 'When are multiple agents worth the extra complexity?',
    options: [
      'For every task, always',
      'When distinct sub-roles (plan/research/write/critique) each benefit from focused prompts and tools',
      'Only to increase cost',
      'Never',
    ],
    answerIndex: 1,
    explanation: 'Split into agents when roles are genuinely distinct; otherwise it just adds latency, cost, and orchestration overhead.',
  },
  {
    biteId: 'ai-engineering:multi-agent',
    question: 'Which is a real form of agent memory?',
    options: [
      'Long-term semantic memory (facts in a vector store, retrieved when relevant)',
      'RAM overclocking',
      'Disk defragmentation',
      'GPU cache',
    ],
    answerIndex: 0,
    explanation: 'Agents use short-term (context), long-term semantic (RAG over past), episodic summaries, and scratchpad notes.',
  },

  // ===== AI Engineering: Multimodal, OCR & Audio =====
  {
    biteId: 'ai-engineering:multimodal',
    question: 'Passing an image to a vision-capable LLM lets you…',
    options: ['Only caption it', 'Extract structured data, answer questions, and do OCR-style extraction', 'Nothing useful', 'Train the model'],
    answerIndex: 1,
    explanation: 'Vision models can OCR, extract structured fields, and reason over image content.',
  },
  {
    biteId: 'ai-engineering:multimodal',
    question: 'STT and TTS refer to…',
    options: ['Storage tiers', 'Speech-to-Text and Text-to-Speech', 'Two vector indexes', 'Streaming protocols'],
    answerIndex: 1,
    explanation: 'STT = transcription (audio→text); TTS = synthesis (text→speech).',
  },

  // ===== AI Engineering: Fine-tuning & Model Adaptation =====
  {
    biteId: 'ai-engineering:finetuning',
    question: 'What is the recommended order of the "adaptation ladder"?',
    options: [
      'Fine-tune first, always',
      'Prompting → few-shot → RAG → fine-tuning (try cheaper options first)',
      'RAG → prompting only',
      'Quantization → prompting',
    ],
    answerIndex: 1,
    explanation: 'Exhaust prompting, few-shot, and RAG before reaching for fine-tuning.',
  },
  {
    biteId: 'ai-engineering:finetuning',
    question: 'How does LoRA differ from full fine-tuning?',
    options: [
      'It updates all weights',
      'It freezes the base and trains tiny low-rank adapters (~0.1% of params)',
      'It requires more GPUs',
      'It deletes the base model',
    ],
    answerIndex: 1,
    explanation: 'LoRA trains small adapter matrices — cheap, fast, swappable, and gentler on base capabilities (QLoRA adds 4-bit quant).',
  },
  {
    biteId: 'ai-engineering:finetuning',
    question: 'Quantization means…',
    options: ['Adding more parameters', 'Representing weights in fewer bits to save memory/speed', 'Encrypting weights', 'Chunking text'],
    answerIndex: 1,
    explanation: 'Lower-bit weights (16→8→4) cut memory and boost speed with small accuracy loss — enables local models and QLoRA.',
  },

  // ===== AI Engineering: Production, Evaluation & Safety =====
  {
    biteId: 'ai-engineering:production',
    question: 'How do you defend against prompt injection?',
    options: [
      'Trust retrieved content as instructions',
      'Treat all external content as untrusted data, delimit it, and never let it override the system prompt',
      'Increase temperature',
      'Auto-execute all tools',
    ],
    answerIndex: 1,
    explanation: 'External/retrieved content is data, not instructions; delimit it, gate destructive tools, and require approval for high-stakes actions.',
  },
  {
    biteId: 'ai-engineering:production',
    question: 'For RAG evaluation you especially track…',
    options: ['CPU temperature', 'Faithfulness, answer relevance, and context precision/recall', 'Only latency', 'Token color'],
    answerIndex: 1,
    explanation: 'RAG evals (e.g. RAGAS) measure faithfulness, relevance, and context precision/recall.',
  },
  {
    biteId: 'ai-engineering:production',
    question: 'Which technique reduces both cost and latency?',
    options: ['Bigger prompts', 'Model routing (small model for easy tasks, escalate when needed)', 'Higher temperature', 'Disabling caching'],
    answerIndex: 1,
    explanation: 'Route easy tasks to cheap models, cache (incl. semantic), rerank to shrink context, and stream for perceived speed.',
  },
];
