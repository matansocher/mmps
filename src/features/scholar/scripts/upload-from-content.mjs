import { Pinecone } from '@pinecone-database/pinecone';
import { config } from 'dotenv';
import { MongoClient } from 'mongodb';
import { join } from 'node:path';
import { cwd, env } from 'node:process';
import OpenAI from 'openai';
import { claudeCodeBestPractices } from './claude-code-best-practices.mjs';
import { generateChunkSummary } from './utils/generate-chunk-summary.mjs';
import { generateLessonPlan } from './utils/generate-lesson-plan.mjs';

config({ path: join(cwd(), '../../../../.env') });

const CHUNK_SIZE = 1000; // words per chunk
const OVERLAP = 100; // word overlap between chunks

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
const pinecone = new Pinecone({ apiKey: env.PINECONE_API_KEY });

// Chunk text
function chunkText(text, chunkSize = CHUNK_SIZE, overlap = OVERLAP) {
  const words = text.split(/\s+/);
  const chunks = [];
  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    if (chunk.trim()) chunks.push(chunk);
  }
  return chunks;
}

// Analyze and determine lesson count (without lesson plan yet)
async function determineLessonCount(content, topic) {
  console.log('\n🤖 Analyzing material to determine lesson count...');
  const totalWords = content.split(/\s+/).length;
  const totalChunks = Math.ceil(totalWords / CHUNK_SIZE);

  const prompt = `You are analyzing learning material for a course on "${topic}".

Total word count: ${totalWords}
Total chunks: ${totalChunks}

Material preview (first 2000 chars):
${content.substring(0, 2000)}

Based on this material, determine:
1. How many lessons should this course have? (Consider: depth, breadth, complexity)
2. What's your rationale?
3. Estimate total tokens in the material

Respond in JSON format:
{
  "recommendedLessonCount": <number>,
  "rationale": "<explanation>",
  "estimatedTokens": <number>
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });
    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error(`   ✗ Error: ${error.message}`);
    const fallbackLessons = Math.max(3, Math.ceil(totalChunks / 5));
    return {
      recommendedLessonCount: fallbackLessons,
      rationale: `Fallback: ${totalChunks} chunks ÷ 5 = ${fallbackLessons} lessons`,
      estimatedTokens: Math.ceil(totalWords * 1.3),
    };
  }
}

// Generate embedding
async function generateEmbedding(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
    encoding_format: 'float',
    dimensions: 1024,
  });
  return response.data[0].embedding;
}

// Main function
async function main(topic) {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║       Scholar Bot - Web Content Upload Script           ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  console.log(`📚 Topic: ${topic}`);

  // Connect to MongoDB
  console.log('📦 Connecting to MongoDB...');
  const client = new MongoClient(env.MONGO_DB_URL);
  await client.connect();

  const coursesCollection = client.db('Scholar').collection('Course');
  console.log('   ✓ Connected\n');

  const content = claudeCodeBestPractices;

  if (!content || content.trim().length === 0) {
    console.error('❌ No content available to process. Exiting.');
    process.exit(1);
  }

  const analysis = await determineLessonCount(content, topic);
  console.log(`   ✓ Recommended Lessons: ${analysis.recommendedLessonCount}`);
  console.log(`   ✓ Rationale: ${analysis.rationale}`);

  // Chunk and summarize
  console.log('\n📦 Processing chunks...');
  const chunks = chunkText(content);
  console.log(`   Processing ${chunks.length} chunks from content`);

  const chunkSummaries = [];
  for (let i = 0; i < chunks.length; i++) {
    const summary = await generateChunkSummary(chunks[i]);
    chunkSummaries.push(summary);
    if ((i + 1) % 5 === 0) process.stdout.write('.');
  }
  console.log('');
  console.log(`   ✓ Generated ${chunkSummaries.length} chunk summaries`);

  // Generate lesson plan
  const lessonOutlines = await generateLessonPlan(chunkSummaries, topic, analysis.recommendedLessonCount);

  console.log('\n💾 Creating course...');
  const courseResult = await coursesCollection.insertOne({
    topic,
    materialSummary: `course from text content`,
    totalLessons: analysis.recommendedLessonCount,
    estimatedTokens: analysis.estimatedTokens,
    lessonOutlines,
    createdAt: new Date(),
  });
  const courseId = courseResult.insertedId.toString();

  // Store chunks with summaries in Pinecone
  console.log('\n📦 Storing chunks with summaries in Pinecone...');
  const index = pinecone.index('scholar-materials');
  let totalChunksStored = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const summary = chunkSummaries[i];

    try {
      const embedding = await generateEmbedding(chunk);
      await index.upsert([
        {
          id: `${courseId}_chunk_${totalChunksStored}`,
          values: embedding,
          metadata: {
            courseId,
            chunkIndex: totalChunksStored,
            content: chunk.substring(0, 40000),
            summary: summary.substring(0, 2000),
          },
        },
      ]);
    } catch (error) {
      console.error(`   ✗ Error storing chunk ${totalChunksStored}: ${error.message}`);
    }

    totalChunksStored++;
    if (totalChunksStored % 5 === 0) process.stdout.write('.');
  }
  console.log('');

  console.log(`   ✓ Stored ${totalChunksStored} total chunks with summaries`);

  // Summary
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║                    Upload Complete! ✅                    ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`📚 Topic:          ${topic}`);
  console.log(`📖 Total Lessons:  ${analysis.recommendedLessonCount}`);
  console.log(`📦 Total Chunks:   ${totalChunksStored}`);
  console.log(`🔢 Est. Tokens:    ${analysis.estimatedTokens}`);
  console.log('\n✨ You can now start this course with /course command\n');
}

const topic = 'Claude Code Best Practices';
main(topic).catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
