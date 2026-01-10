import type { SummaryDetails } from '../types';
import { formatLessonProgress, generateSummaryMessage } from './message-utils';

describe('generateSummaryMessage', () => {
  const createMockSummaryDetails = (overrides: Partial<SummaryDetails> = {}): SummaryDetails => ({
    topicTitle: 'Introduction to TypeScript',
    summary: 'TypeScript is a typed superset of JavaScript that compiles to plain JavaScript.',
    keyTakeaways: ['Type safety reduces bugs', 'Better IDE support', 'Easier refactoring'],
    practicalApplications: ['Building large-scale apps', 'Team collaboration', 'API integration'],
    nextSteps: ['Practice exercises', 'Build a small project', 'Read documentation'],
    createdAt: new Date('2025-01-10T12:00:00Z'),
    ...overrides,
  });

  it('should generate summary message with all sections', () => {
    const details = createMockSummaryDetails();
    const result = generateSummaryMessage(details);

    expect(result).toContain('📚 *Course Summary: Introduction to TypeScript*');
    expect(result).toContain('TypeScript is a typed superset');
    expect(result).toContain('*🎯 Key Takeaways:*');
    expect(result).toContain('*💡 Practical Applications:*');
    expect(result).toContain('*🚀 Next Steps:*');
  });

  it('should include numbered key takeaways', () => {
    const details = createMockSummaryDetails();
    const result = generateSummaryMessage(details);

    expect(result).toContain('1. Type safety reduces bugs');
    expect(result).toContain('2. Better IDE support');
    expect(result).toContain('3. Easier refactoring');
  });

  it('should include numbered practical applications', () => {
    const details = createMockSummaryDetails();
    const result = generateSummaryMessage(details);

    expect(result).toContain('1. Building large-scale apps');
    expect(result).toContain('2. Team collaboration');
    expect(result).toContain('3. API integration');
  });

  it('should include numbered next steps', () => {
    const details = createMockSummaryDetails();
    const result = generateSummaryMessage(details);

    expect(result).toContain('1. Practice exercises');
    expect(result).toContain('2. Build a small project');
    expect(result).toContain('3. Read documentation');
  });

  it('should return "No summary available" for null input', () => {
    const result = generateSummaryMessage(null as any);

    expect(result).toBe('No summary available');
  });

  it('should return "No summary available" for undefined input', () => {
    const result = generateSummaryMessage(undefined as any);

    expect(result).toBe('No summary available');
  });

  it('should handle empty arrays', () => {
    const details = createMockSummaryDetails({
      keyTakeaways: [],
      practicalApplications: [],
      nextSteps: [],
    });
    const result = generateSummaryMessage(details);

    expect(result).toContain('*🎯 Key Takeaways:*');
    expect(result).toContain('*💡 Practical Applications:*');
    expect(result).toContain('*🚀 Next Steps:*');
  });

  it('should handle single item arrays', () => {
    const details = createMockSummaryDetails({
      keyTakeaways: ['Only one takeaway'],
      practicalApplications: ['Only one application'],
      nextSteps: ['Only one step'],
    });
    const result = generateSummaryMessage(details);

    expect(result).toContain('1. Only one takeaway');
    expect(result).toContain('1. Only one application');
    expect(result).toContain('1. Only one step');
  });
});

describe('formatLessonProgress', () => {
  it('should format lesson progress for first lesson', () => {
    const result = formatLessonProgress(1, 10);

    expect(result).toContain('📖 *Lesson 1 of 10*');
    expect(result).toContain('[>---------]');
    expect(result).toContain('0%');
    expect(result).toContain('(0/10)');
  });

  it('should format lesson progress for middle lesson', () => {
    const result = formatLessonProgress(5, 10);

    expect(result).toContain('📖 *Lesson 5 of 10*');
    expect(result).toContain('40%');
    expect(result).toContain('(4/10)');
  });

  it('should format lesson progress for last lesson', () => {
    const result = formatLessonProgress(10, 10);

    expect(result).toContain('📖 *Lesson 10 of 10*');
    expect(result).toContain('90%');
    expect(result).toContain('(9/10)');
  });

  it('should format lesson progress for completed course', () => {
    // After completing lesson 5 of 5 (all done)
    const result = formatLessonProgress(6, 5);

    expect(result).toContain('📖 *Lesson 6 of 5*');
    expect(result).toContain('100%');
  });

  it('should include progress bar with brackets', () => {
    const result = formatLessonProgress(3, 10);

    expect(result).toContain('[');
    expect(result).toContain(']');
  });

  it('should show correct percentage at halfway point', () => {
    const result = formatLessonProgress(6, 10);

    expect(result).toContain('50%');
    expect(result).toContain('(5/10)');
  });

  it('should handle single lesson course', () => {
    const result = formatLessonProgress(1, 1);

    expect(result).toContain('📖 *Lesson 1 of 1*');
    expect(result).toContain('0%');
    expect(result).toContain('(0/1)');
  });

  it('should include newlines for formatting', () => {
    const result = formatLessonProgress(3, 10);
    const lines = result.split('\n');

    expect(lines.length).toBeGreaterThan(1);
  });
});
