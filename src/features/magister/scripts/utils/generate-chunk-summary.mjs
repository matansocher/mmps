export async function generateChunkSummary(openai, chunk, maxWords = 200) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a content summarizer. Summarize the given text in a clear, concise way that captures the key information and main points. Keep it under ${maxWords} words. IMPORTANT: Write the summary in the same language as the original text.`,
        },
        {
          role: 'user',
          content: `Summarize this text:\n\n${chunk}`,
        },
      ],
      temperature: 0.3,
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error(`   ✗ Error generating summary: ${error.message}`);
    // Fallback: use first N words
    const words = chunk.split(/\s+/);
    return words.slice(0, maxWords).join(' ') + (words.length > maxWords ? '...' : '');
  }
}
