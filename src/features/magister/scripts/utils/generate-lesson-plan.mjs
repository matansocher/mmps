export async function generateLessonPlan(openai, chunkSummaries, topic, lessonCount) {
  console.log('\\n🗺️  Generating structured lesson plan...');

  const summariesWithIndexes = chunkSummaries.map((summary, idx) => `[Chunk ${idx}]: ${summary}`).join('\\n\\n');

  const prompt = `You are an expert curriculum designer. Given these material summaries for a course on "${topic}", create a structured lesson plan.

Total lessons: ${lessonCount}
Total chunks: ${chunkSummaries.length}

Material summaries:
${summariesWithIndexes}

Create a lesson plan where:
1. Each lesson covers specific topics
2. Each lesson uses 2-4 relevant chunks (specify chunk indexes)
3. Lessons build on each other progressively
4. All chunks are distributed across lessons

Respond in JSON format:
{
  "lessonOutlines": [
    {
      "lessonNumber": 1,
      "topics": ["topic1", "topic2"],
      "suggestedChunkIndexes": [0, 1, 2]
    },
    ...
  ]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content);
    console.log(`   ✓ Generated plan with ${result.lessonOutlines.length} lessons`);

    return result.lessonOutlines;
  } catch (error) {
    console.error(`   ✗ Error generating lesson plan: ${error.message}`);

    // Fallback: simple distribution
    const chunksPerLesson = Math.ceil(chunkSummaries.length / lessonCount);
    const fallbackOutlines = [];

    for (let i = 0; i < lessonCount; i++) {
      const startIdx = i * chunksPerLesson;
      const endIdx = Math.min(startIdx + chunksPerLesson, chunkSummaries.length);
      const chunkIndexes = Array.from({ length: endIdx - startIdx }, (_, j) => startIdx + j);

      fallbackOutlines.push({
        lessonNumber: i + 1,
        topics: [`Lesson ${i + 1} topics`],
        suggestedChunkIndexes: chunkIndexes,
      });
    }

    return fallbackOutlines;
  }
}
