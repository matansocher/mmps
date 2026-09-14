// AUTO-GENERATED from apps/learner-web/src/lib/bites.data.ts + quizzes.data.ts.
// Lightweight catalog for the bot (titles, curriculum, one sample question per bite).
// The full bite HTML lives only in the mini-app.
import type { GuideId } from './types';

export type LearnerCatalogEntry = {
  readonly id: string;
  readonly guide: GuideId;
  readonly title: string;
  readonly subtitle: string;
  readonly minutes: number;
  readonly isReference: boolean;
  readonly firstQuestion: string | null;
};

export const LEARNER_GUIDES: Record<GuideId, { readonly label: string; readonly icon: string }> = {
  "system-design": {
    "label": "System Design",
    "icon": "📐"
  },
  "ai-engineering": {
    "label": "AI Engineering",
    "icon": "🧠"
  }
};

export const LEARNER_CATALOG: ReadonlyArray<LearnerCatalogEntry> = [
  {
    "id": "system-design:delivery",
    "guide": "system-design",
    "title": "The Delivery Framework",
    "subtitle": "",
    "minutes": 3,
    "isReference": false,
    "firstQuestion": "What is the correct order of the system design delivery framework?"
  },
  {
    "id": "system-design:numbers",
    "guide": "system-design",
    "title": "Numbers to Know (2026)",
    "subtitle": "",
    "minutes": 1,
    "isReference": false,
    "firstQuestion": "Roughly how long does a round trip within the same datacenter take?"
  },
  {
    "id": "system-design:networking",
    "guide": "system-design",
    "title": "Networking Essentials",
    "subtitle": "",
    "minutes": 2,
    "isReference": false,
    "firstQuestion": "Which real-time transport is best when the server must push updates but the client rarely sends data?"
  },
  {
    "id": "system-design:api-design",
    "guide": "system-design",
    "title": "API Design",
    "subtitle": "",
    "minutes": 1,
    "isReference": false,
    "firstQuestion": "How should you paginate a large list endpoint at scale?"
  },
  {
    "id": "system-design:data-modeling",
    "guide": "system-design",
    "title": "Data Modeling",
    "subtitle": "",
    "minutes": 2,
    "isReference": false,
    "firstQuestion": "When is NoSQL (denormalized) generally the better honest choice?"
  },
  {
    "id": "system-design:caching",
    "guide": "system-design",
    "title": "Caching",
    "subtitle": "",
    "minutes": 2,
    "isReference": false,
    "firstQuestion": "A \"cache stampede\" (thundering herd) happens when…"
  },
  {
    "id": "system-design:sharding",
    "guide": "system-design",
    "title": "Sharding & Partitioning",
    "subtitle": "",
    "minutes": 2,
    "isReference": false,
    "firstQuestion": "What distinguishes sharding from replication?"
  },
  {
    "id": "system-design:consistent-hashing",
    "guide": "system-design",
    "title": "Consistent Hashing",
    "subtitle": "",
    "minutes": 2,
    "isReference": false,
    "firstQuestion": "Why does plain modulo hashing (hash % N) fail when scaling nodes?"
  },
  {
    "id": "system-design:cap",
    "guide": "system-design",
    "title": "CAP Theorem",
    "subtitle": "",
    "minutes": 1,
    "isReference": false,
    "firstQuestion": "The correct framing of CAP is: during a network partition you must choose between…"
  },
  {
    "id": "system-design:indexing",
    "guide": "system-design",
    "title": "Database Indexing",
    "subtitle": "",
    "minutes": 1,
    "isReference": false,
    "firstQuestion": "For a composite index on (a, b, c), which query can it NOT help directly?"
  },
  {
    "id": "system-design:p-realtime",
    "guide": "system-design",
    "title": "Real-time Updates",
    "subtitle": "",
    "minutes": 1,
    "isReference": false,
    "firstQuestion": "In real-time systems, \"fanout\" refers to…"
  },
  {
    "id": "system-design:p-contention",
    "guide": "system-design",
    "title": "Dealing with Contention",
    "subtitle": "",
    "minutes": 2,
    "isReference": false,
    "firstQuestion": "Ordered from weakest to strongest, which contention tool is the strongest guarantee?"
  },
  {
    "id": "system-design:p-multistep",
    "guide": "system-design",
    "title": "Multi-step Processes (Sagas & Durable Execution)",
    "subtitle": "",
    "minutes": 1,
    "isReference": false,
    "firstQuestion": "A saga handles a failed step in a multi-service workflow by…"
  },
  {
    "id": "system-design:p-reads",
    "guide": "system-design",
    "title": "Scaling Reads",
    "subtitle": "",
    "minutes": 1,
    "isReference": false,
    "firstQuestion": "The first, cheapest lever to scale reads is usually…"
  },
  {
    "id": "system-design:p-writes",
    "guide": "system-design",
    "title": "Scaling Writes",
    "subtitle": "",
    "minutes": 1,
    "isReference": false,
    "firstQuestion": "Which technique most directly scales write throughput?"
  },
  {
    "id": "system-design:p-blobs",
    "guide": "system-design",
    "title": "Handling Large Blobs",
    "subtitle": "",
    "minutes": 1,
    "isReference": false,
    "firstQuestion": "The standard way to upload large files without routing them through your API servers is…"
  },
  {
    "id": "system-design:p-longtasks",
    "guide": "system-design",
    "title": "Managing Long-Running Tasks",
    "subtitle": "",
    "minutes": 1,
    "isReference": false,
    "firstQuestion": "The standard shape for long-running work triggered by an API is…"
  },
  {
    "id": "system-design:dd-redis",
    "guide": "system-design",
    "title": "Redis",
    "subtitle": "",
    "minutes": 1,
    "isReference": false,
    "firstQuestion": "Which is NOT a typical use of Redis?"
  },
  {
    "id": "system-design:dd-kafka",
    "guide": "system-design",
    "title": "Kafka",
    "subtitle": "",
    "minutes": 1,
    "isReference": false,
    "firstQuestion": "Kafka guarantees message ordering…"
  },
  {
    "id": "system-design:dd-postgres",
    "guide": "system-design",
    "title": "PostgreSQL",
    "subtitle": "",
    "minutes": 1,
    "isReference": false,
    "firstQuestion": "Why does PostgreSQL \"win interviews\" as a default choice?"
  },
  {
    "id": "system-design:dd-cassandra",
    "guide": "system-design",
    "title": "Cassandra",
    "subtitle": "",
    "minutes": 1,
    "isReference": false,
    "firstQuestion": "Cassandra is the right call when you need…"
  },
  {
    "id": "system-design:dd-dynamodb",
    "guide": "system-design",
    "title": "DynamoDB",
    "subtitle": "",
    "minutes": 1,
    "isReference": false,
    "firstQuestion": "DynamoDB data modeling revolves around…"
  },
  {
    "id": "system-design:dd-elasticsearch",
    "guide": "system-design",
    "title": "Elasticsearch",
    "subtitle": "",
    "minutes": 1,
    "isReference": false,
    "firstQuestion": "Elasticsearch is built on which core data structure?"
  },
  {
    "id": "system-design:dd-flink",
    "guide": "system-design",
    "title": "Flink (Stream Processing)",
    "subtitle": "",
    "minutes": 1,
    "isReference": false,
    "firstQuestion": "Flink is designed primarily for…"
  },
  {
    "id": "system-design:dd-zookeeper",
    "guide": "system-design",
    "title": "ZooKeeper / etcd (Coordination)",
    "subtitle": "",
    "minutes": 1,
    "isReference": false,
    "firstQuestion": "ZooKeeper / etcd are used for…"
  },
  {
    "id": "system-design:dd-apigw",
    "guide": "system-design",
    "title": "API Gateway",
    "subtitle": "",
    "minutes": 1,
    "isReference": false,
    "firstQuestion": "Which is a core responsibility of an API gateway?"
  },
  {
    "id": "system-design:dd-proximity",
    "guide": "system-design",
    "title": "Proximity / Geospatial Search",
    "subtitle": "",
    "minutes": 2,
    "isReference": false,
    "firstQuestion": "Encoding 2-D coordinates into a sortable 1-D key (e.g. geohash) lets you…"
  },
  {
    "id": "system-design:dd-timeseries",
    "guide": "system-design",
    "title": "Time-Series Databases",
    "subtitle": "",
    "minutes": 1,
    "isReference": false,
    "firstQuestion": "What makes time-series databases special?"
  },
  {
    "id": "system-design:dd-vectordb",
    "guide": "system-design",
    "title": "Vector Databases & Semantic Search ⭐",
    "subtitle": "",
    "minutes": 2,
    "isReference": false,
    "firstQuestion": "A vector database enables search by…"
  },
  {
    "id": "system-design:dd-bigdata",
    "guide": "system-design",
    "title": "Big Data / Batch Processing",
    "subtitle": "",
    "minutes": 1,
    "isReference": false,
    "firstQuestion": "The classic building block for distributed batch processing is…"
  },
  {
    "id": "system-design:dd-cdc",
    "guide": "system-design",
    "title": "Change Data Capture (CDC)",
    "subtitle": "",
    "minutes": 1,
    "isReference": false,
    "firstQuestion": "Change Data Capture works by…"
  },
  {
    "id": "system-design:cheatsheet",
    "guide": "system-design",
    "title": "Interview Cheat Sheet",
    "subtitle": "",
    "minutes": 2,
    "isReference": true,
    "firstQuestion": null
  },
  {
    "id": "ai-engineering:foundations",
    "guide": "ai-engineering",
    "title": "LLM Foundations",
    "subtitle": "The vocabulary and mechanics you must own before anything else. Interviewers probe these first.",
    "minutes": 4,
    "isReference": false,
    "firstQuestion": "What is a token?"
  },
  {
    "id": "ai-engineering:prompting",
    "guide": "ai-engineering",
    "title": "Prompting & Structured Output",
    "subtitle": "Prompting is programming in natural language. Structured output is how you make an LLM safe to call from code.",
    "minutes": 4,
    "isReference": false,
    "firstQuestion": "Chain-of-Thought prompting improves results by…"
  },
  {
    "id": "ai-engineering:embeddings",
    "guide": "ai-engineering",
    "title": "Embeddings & Vector Search",
    "subtitle": "How you make a computer search by meaning instead of keywords. The foundation of RAG and semantic memory.",
    "minutes": 4,
    "isReference": false,
    "firstQuestion": "An embedding is…"
  },
  {
    "id": "ai-engineering:rag",
    "guide": "ai-engineering",
    "title": "RAG — Retrieval-Augmented Generation",
    "subtitle": "The single most important architecture in applied AI. Give the model private/fresh knowledge without retraining it.",
    "minutes": 3,
    "isReference": false,
    "firstQuestion": "RAG stands for and does what, in order?"
  },
  {
    "id": "ai-engineering:advanced-rag",
    "guide": "ai-engineering",
    "title": "Advanced RAG Patterns",
    "subtitle": "The techniques from the repo's RAG projects that turn a demo into something that actually works on hard questions.",
    "minutes": 5,
    "isReference": false,
    "firstQuestion": "HyDE improves retrieval by…"
  },
  {
    "id": "ai-engineering:agents",
    "guide": "ai-engineering",
    "title": "AI Agents & Tool Calling",
    "subtitle": "An agent is an LLM in a loop that can take actions in the world. This is where most of the repo's projects live.",
    "minutes": 4,
    "isReference": false,
    "firstQuestion": "When the model \"calls a tool\", what actually runs the function?"
  },
  {
    "id": "ai-engineering:multi-agent",
    "guide": "ai-engineering",
    "title": "Multi-Agent Systems",
    "subtitle": "Many of the repo's flagship projects use a team of specialized agents. Here's how and why.",
    "minutes": 3,
    "isReference": false,
    "firstQuestion": "When are multiple agents worth the extra complexity?"
  },
  {
    "id": "ai-engineering:multimodal",
    "guide": "ai-engineering",
    "title": "Multimodal, OCR & Audio",
    "subtitle": "Modern models see and hear, not just read. A whole third of the repo is vision, document, and audio projects.",
    "minutes": 3,
    "isReference": false,
    "firstQuestion": "Passing an image to a vision-capable LLM lets you…"
  },
  {
    "id": "ai-engineering:finetuning",
    "guide": "ai-engineering",
    "title": "Fine-tuning & Model Adaptation",
    "subtitle": "The last resort, not the first. Know exactly when it's the right tool — a very common interview discriminator.",
    "minutes": 3,
    "isReference": false,
    "firstQuestion": "What is the recommended order of the \"adaptation ladder\"?"
  },
  {
    "id": "ai-engineering:production",
    "guide": "ai-engineering",
    "title": "Production, Evaluation & Safety",
    "subtitle": "This is what separates an AI engineer from someone who wrote a chatbot demo. Interviewers dig here to find seniority.",
    "minutes": 4,
    "isReference": false,
    "firstQuestion": "How do you defend against prompt injection?"
  },
  {
    "id": "ai-engineering:interview",
    "guide": "ai-engineering",
    "title": "Interview Questions",
    "subtitle": "Click any question to reveal a strong, concise answer. Grouped by topic. Practice saying these out loud.",
    "minutes": 9,
    "isReference": true,
    "firstQuestion": null
  },
  {
    "id": "ai-engineering:glossary",
    "guide": "ai-engineering",
    "title": "Glossary & Cheat Sheet",
    "subtitle": "Every term from this guide, one line each. Skim before an interview.",
    "minutes": 4,
    "isReference": true,
    "firstQuestion": null
  }
];

export const LEARNER_CURRICULUM: ReadonlyArray<string> = [
  "system-design:delivery",
  "ai-engineering:foundations",
  "system-design:numbers",
  "ai-engineering:prompting",
  "system-design:networking",
  "ai-engineering:embeddings",
  "system-design:api-design",
  "ai-engineering:rag",
  "system-design:data-modeling",
  "ai-engineering:advanced-rag",
  "system-design:caching",
  "ai-engineering:agents",
  "system-design:sharding",
  "ai-engineering:multi-agent",
  "system-design:consistent-hashing",
  "ai-engineering:multimodal",
  "system-design:cap",
  "ai-engineering:finetuning",
  "system-design:indexing",
  "ai-engineering:production",
  "system-design:p-realtime",
  "system-design:p-contention",
  "system-design:p-multistep",
  "system-design:p-reads",
  "system-design:p-writes",
  "system-design:p-blobs",
  "system-design:p-longtasks",
  "system-design:dd-redis",
  "system-design:dd-kafka",
  "system-design:dd-postgres",
  "system-design:dd-cassandra",
  "system-design:dd-dynamodb",
  "system-design:dd-elasticsearch",
  "system-design:dd-flink",
  "system-design:dd-zookeeper",
  "system-design:dd-apigw",
  "system-design:dd-proximity",
  "system-design:dd-timeseries",
  "system-design:dd-vectordb",
  "system-design:dd-bigdata",
  "system-design:dd-cdc"
];

const BY_ID = new Map(LEARNER_CATALOG.map((e) => [e.id, e]));

export function getCatalogEntry(id: string): LearnerCatalogEntry | undefined {
  return BY_ID.get(id);
}
