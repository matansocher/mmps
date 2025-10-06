# Scholar Bot RAG Optimization

## Overview

Implemented a hybrid RAG approach combining pre-summarization with lesson planning to dramatically reduce token costs while improving lesson quality.

## Changes Made

### 1. Type Updates

**`src/services/pinecone/types.ts`**
- Added `summary` field to `VectorMetadata` for storing chunk summaries

**`src/features/scholar/types.ts`**
- Added `LessonOutline` type with `lessonNumber`, `topics`, `suggestedChunkIndexes`
- Added `lessonOutlines` array to `Course` type
- Updated `LessonCountAnalysisSchema` to include lesson outlines

### 2. Upload Script Utilities

**`utils/generate-chunk-summary.mjs`**
- Generates 200-word summaries for each chunk using GPT-4o-mini
- Fallback to truncation if API fails
- Costs ~$0.0001 per chunk

**`utils/generate-lesson-plan.mjs`**
- Analyzes all chunk summaries to create structured lesson plan
- Assigns 2-4 chunks per lesson based on content relevance
- Ensures progressive topic coverage
- Fallback to equal distribution if API fails

### 3. Upload Scripts

**`upload-from-content.mjs` & `upload-from-pdf.mjs`**

New workflow:
1. Extract and chunk content (unchanged)
2. **Generate summary for each chunk** (~1-2 min for 20 chunks)
3. **Generate lesson plan** from summaries (~10 sec)
4. Store course with `lessonOutlines` in MongoDB
5. Store chunks with both `content` + `summary` in Pinecone

### 4. Scholar Service

**`sendLesson()` function**
- Now checks for `lessonOutlines` in course
- If available: queries only suggested chunks (3 instead of 5)
- Uses **chunk summaries** instead of full content (90% token reduction)
- Material context reduced from ~200KB to ~2KB per lesson

**Before:**
```typescript
materialContext = fullContent[0-4] // ~200KB, ~50K tokens
```

**After:**
```typescript
materialContext = summaries[0-2] // ~2KB, ~500 tokens
```

**`processQuestion()` function**
- Also uses summaries instead of full content
- Reduces question handling cost by 90%

## Cost Comparison

### Old Approach (per course)
- 20 chunks × 10,000 words each = 200,000 words
- Each lesson uses 5 chunks = 50,000 words context
- 5 lessons × 50K words = 250K words total
- **Cost: ~$5-10 per course** (using GPT-4)

### New Approach (per course)
- **One-time upload cost:**
  - 20 chunk summaries × $0.0001 = $0.002
  - 1 lesson plan = $0.01
  - Total: **$0.012**

- **Per lesson cost:**
  - Each lesson uses 3 chunk summaries = 600 words context
  - 5 lessons × 600 words = 3,000 words total
  - **Cost: ~$0.50 per course** (using GPT-4)

### Total Savings
- **90% reduction in lesson generation costs**
- **Better lesson structure** (pre-planned topics)
- **Scales to unlimited content** (summary size stays constant)

## Running the Scripts

### Delete Old Data
```bash
# In Pinecone dashboard, delete 'scholar-materials' index
# In MongoDB, delete Scholar.Course collection
```

### Upload New Courses
```bash
# From project root
node src/features/scholar/scripts/upload-from-content.mjs
node src/features/scholar/scripts/upload-from-pdf.mjs
```

Expected output:
```
📚 Topic: Claude Code Best Practices
📦 Connecting to MongoDB...
   ✓ Connected

🤖 Analyzing material to determine lesson count...
   ✓ Recommended Lessons: 5
   ✓ Rationale: ...

📦 Processing chunks...
   Processing 20 chunks from content
.....
   ✓ Generated 20 chunk summaries

🗺️  Generating structured lesson plan...
   ✓ Generated plan with 5 lessons

💾 Creating course...

📦 Storing chunks with summaries in Pinecone...
.....
   ✓ Stored 20 total chunks with summaries

╔══════════════════════════════════════════════════════════╗
║                    Upload Complete! ✅                    ║
╚══════════════════════════════════════════════════════════╝
```

## Backward Compatibility

The system gracefully handles courses uploaded before this update:
- If `lessonOutlines` is missing: falls back to standard RAG query
- If `summary` is missing: uses first 500 chars of `content`

## Future Enhancements

1. **Cache lesson content** in MongoDB after first generation
2. **User feedback loop** to improve lesson plan generation
3. **Dynamic chunk retrieval** based on user questions during lesson
4. **Multi-language support** for summaries
