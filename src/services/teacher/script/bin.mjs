import { MongoClient, ObjectId } from 'mongodb';
const mongoUriStg = 'mongodb+srv://playgrounds_staging:6lu9qXW2L17RwnUM@cluster0.yzvps.mongodb.net/';
const mongoUriPrd = 'mongodb+srv://wolt_reader:JJzd7SFJ2K4eXj3@playgrounds.rrd09yy.mongodb.net/';
const isPrd = true;
const mongoUri = isPrd ? mongoUriPrd : mongoUriStg;

const topics = [
  // Front-End Topics
  'Advanced JavaScript: Event Loop and Async/Await',
  'Advanced JavaScript: Prototypal Inheritance',
  'Advanced JavaScript: ES Modules and Module Systems',
  'Browser APIs: Web Storage and Service Workers',
  'Performance Optimization: Lazy Loading and Code Splitting',
  'UI Design Principles: Accessibility (WCAG Guidelines)',
  'UI Design Principles: Responsive Design',
  'Component Design Patterns: Compound Components and Render Props',
  'State Management: Redux, MobX, or Angular Signals',

  // Back-End Topics
  'Node.js: Event Loop and Non-Blocking I/O',
  'Node.js: Streams and Buffering',
  'Authentication: OAuth 2.0 and OpenID Connect',
  'API Design: REST Principles and Constraints',
  'API Design: GraphQL Schema and Resolvers',
  'Microservices: Service Discovery and Orchestration',
  'Back-End Optimization: Caching Strategies (CDN and In-Memory)',

  // Databases
  'Relational Databases: Normalization and Indexing',
  'Relational Databases: Transactions and ACID Principles',
  'NoSQL: Document Stores and CAP Theorem',
  'NoSQL: Key-Value Stores and Use Cases',
  'Database Design Patterns: Sharding and Partitioning',
  'Database Design Patterns: Replication Strategies',

  // Design Patterns
  'Design Patterns: Singleton, Factory, and Builder',
  'Design Patterns: Observer, Strategy, and Command',
  'Architectural Patterns: MVC, MVVM, and Clean Architecture',
  'Enterprise Design Patterns: Dependency Injection',
  'Enterprise Design Patterns: Repository and Unit of Work',

  // Architecture
  'Scalability: Horizontal vs. Vertical Scaling',
  'Serverless: Building with AWS Lambda or Azure Functions',
  'Event-Driven Architecture: Pub/Sub Mechanisms',
  'Monolith vs. Microservices: Transition Strategies',
  'System Design: High-Level Design for Scalability',

  // DevOps
  'Cloud Providers: Core Concepts of AWS/GCP/Azure',
  'CI/CD Pipelines: Automated Testing and Deployment',
  'Containerization: Docker Basics',
  'Kubernetes: Orchestration and Scaling',
  'Monitoring and Observability: ELK Stack Basics',

  // Security
  'OWASP Top 10: Web Application Security Risks',
  'SSL/TLS and HTTPS: Principles and Implementation',
  'Encryption: Symmetric and Asymmetric Encryption',

  // General Software Principles
  'SOLID Principles: Single Responsibility Principle',
  'SOLID Principles: Open/Closed Principle',
  'DRY, KISS, and YAGNI: Software Development Guidelines',
  'Domain-Driven Design: Strategic Design',

  // Algorithms and Data Structures
  'Algorithms: Sorting and Searching',
  'Algorithms: Graphs and Trees',
  'Algorithms: Dynamic Programming Basics',

  // Bonus Topics
  'Event Sourcing: Principles and Applications',
  'CQRS: Command Query Responsibility Segregation',
  'Distributed Tracing and Monitoring',
  'High Availability: Designing for Fault Tolerance'
];

class LessonService {
  lessonCollection;

  constructor(client, dbName) {
    this.lessonCollection = client.db(dbName).collection('Lesson');
  }

  async createLesson(topic) {
    const lesson = {
      _id: new ObjectId(),
      topic,
      status: 'pending',
      createdAt: new Date(),
    };
    return this.lessonCollection.insertOne(lesson);
  }

  async insertLessons(topics) {
    for (const topic of topics) {
      try {
        const result = await this.createLesson(topic);
        console.log(`Inserted lesson with ID: ${result.insertedId}`);
      } catch (error) {
        console.error(`Failed to insert topic "${topic}":`, error);
      }
    }
  }
}

async function main() {
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    console.log('Connected to MongoDB.');

    const lessonService = new LessonService(client, 'Teacher');
    await lessonService.insertLessons(topics);

    console.log('All lessons inserted.');
  } catch (error) {
    console.error('Error during insertion:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB.');
  }
}

main().catch(console.error);