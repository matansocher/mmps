import { config } from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';
import { join } from 'node:path';
import { cwd, env } from 'node:process';

const topics = [
  // // Front-End Topics
  // 'Advanced JavaScript: Event Loop and Async/Await',
  // 'Advanced JavaScript: Prototypal Inheritance',
  // 'Advanced JavaScript: ES Modules and Module Systems',
  // 'Browser APIs: Web Storage and Service Workers',
  // 'Performance Optimization: Lazy Loading and Code Splitting',
  // 'UI Design Principles: Accessibility (WCAG Guidelines)',
  // 'UI Design Principles: Responsive Design',
  // 'Component Design Patterns: Compound Components and Render Props',
  // 'State Management: Redux, MobX, or Angular Signals',
  //
  // // Back-End Topics
  // 'Node.js: Event Loop and Non-Blocking I/O',
  // 'Node.js: Streams and Buffering',
  // 'Authentication: OAuth 2.0 and OpenID Connect',
  // 'API Design: REST Principles and Constraints',
  // 'API Design: GraphQL Schema and Resolvers',
  // 'Microservices: Service Discovery and Orchestration',
  // 'Back-End Optimization: Caching Strategies (CDN and In-Memory)',
  //
  // // Databases
  // 'Relational Databases: Normalization and Indexing',
  // 'Relational Databases: Transactions and ACID Principles',
  // 'NoSQL: Document Stores and CAP Theorem',
  // 'NoSQL: Key-Value Stores and Use Cases',
  // 'Database Design Patterns: Sharding and Partitioning',
  // 'Database Design Patterns: Replication Strategies',
  //
  // // Design Patterns
  // 'Design Patterns: Singleton, Factory, and Builder',
  // 'Design Patterns: Observer, Strategy, and Command',
  // 'Architectural Patterns: MVC, MVVM, and Clean Architecture',
  // 'Enterprise Design Patterns: Dependency Injection',
  // 'Enterprise Design Patterns: Repository and Unit of Work',
  //
  // // Architecture
  // 'Scalability: Horizontal vs. Vertical Scaling',
  // 'Serverless: Building with AWS Lambda or Azure Functions',
  // 'Event-Driven Architecture: Pub/Sub Mechanisms',
  // 'Monolith vs. Microservices: Transition Strategies',
  // 'System Design: High-Level Design for Scalability',
  //
  // // DevOps
  // 'Cloud Providers: Core Concepts of AWS/GCP/Azure',
  // 'CI/CD Pipelines: Automated Testing and Deployment',
  // 'Containerization: Docker Basics',
  // 'Kubernetes: Orchestration and Scaling',
  // 'Monitoring and Observability: ELK Stack Basics',
  //
  // // Security
  // 'OWASP Top 10: Web Application Security Risks',
  // 'SSL/TLS and HTTPS: Principles and Implementation',
  // 'Encryption: Symmetric and Asymmetric Encryption',
  //
  // // General Software Principles
  // 'SOLID Principles: Single Responsibility Principle',
  // 'SOLID Principles: Open/Closed Principle',
  // 'DRY, KISS, and YAGNI: Software Development Guidelines',
  // 'Domain-Driven Design: Strategic Design',
  //
  // // Algorithms and Data Structures
  // 'Algorithms: Sorting and Searching',
  // 'Algorithms: Graphs and Trees',
  // 'Algorithms: Dynamic Programming Basics',
  //
  // // Bonus Topics
  // 'Event Sourcing: Principles and Applications',
  // 'CQRS: Command Query Responsibility Segregation',
  // 'Distributed Tracing and Monitoring',
  // 'High Availability: Designing for Fault Tolerance',
  // // AI
  // 'Prompt Engineering - Learn how to write effective prompts',
  // 'LLMs as APIs - Understand how to use LLMs via APIs',
  // 'LLMs Usage - best practices',
  // 'LangChain & Alternatives - Build workflows around LLMs using LangChain',
  // 'Retrieval-Augmented Generation (RAG)',
  // 'Vector Databases - What embeddings are and how vector search works',
  // 'AI Agents & Workflows - LLM + memory + tools + feedback loop',

  'Event Delegation & Bubbling/Composed Events (especially with Web Components or Shadow DOM)',
  'JavaScript Proxies & Reflect API – Metaprogramming beyond basics',
  'Advanced TypeScript Types: Conditional Types, Mapped Types, Template Literal Types',
  'Zones and Async Context Tracking (e.g., in Node.js)',
  'Reactive Programming with RxJS – Flattening strategies and memory traps',
  'DOM diffing algorithms (React, Angular, etc.) – how reconciliation works under the hood',
  'JavaScript Engine Internals – Hidden classes, inline caches, and optimizations (V8 focus)',
  'Designing Scalable APIs – Pagination, filtering, and performance best practices',
  'Circuit Breakers, Retries, and Timeouts – How to make systems resilient',
  'Backpressure in Node.js Streams – Handling slow consumers',
  'Distributed Systems Concepts: CAP Theorem, Eventual Consistency, and Idempotency',
  'Rate Limiting Techniques (token bucket, leaky bucket, Redis-backed implementations)',
  'Profiling Node.js Applications (CPU, heap, event loop lag)',
  'Memory Leak Patterns – Detached DOM, Closures, Listeners, etc.',
  'Source Maps and Debugging Transpiled Code',
  'Flame Graphs and CPU Profiling Tools (0x, Clinic.js)',
  'Dockerfile Optimization – Layer caching, multi-stage builds, reducing image size',
  'CI/CD Design – Caching, dependency pinning, and securing pipelines',
  'Kubernetes Concepts – Pods vs Deployments vs Jobs, and debugging tips',
  'GitHub Actions – Advanced workflows and job optimization',
  'Caching Strategies – CDN, memory, localStorage, Redis',
  'Authorization Models – RBAC, ABAC, JWT vs sessions, OAuth2 flows',
  'Time Handling in Systems – UTC, time zones, clock drift, CRON pitfalls',
  'Secure by Design – XSS/CSRF examples, CSP, input sanitization at scale',
  'State Machines & Statecharts – When logic gets messy',
];

async function main() {
  config({ path: join(cwd(), '.env.serve') });
  const client = new MongoClient(env.MONGO_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB.');
    const courseCollection = client.db('Teacher').collection('Course');

    for (const topic of topics) {
      try {
        const course = {
          _id: new ObjectId(),
          topic,
          createdAt: new Date(),
        };
        const result = await courseCollection.insertOne(course);
        console.log(`Inserted course with ID: ${result.insertedId} - "${topic}"`);
      } catch (error) {
        console.error(`Failed to insert topic "${topic}":`, error);
      }
    }

    console.log('All courses inserted');
  } catch (error) {
    console.error('Error during insertion:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB.');
  }
}

main().catch(console.error);
