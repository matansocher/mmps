import { getScoreMessage } from './get-score-message';

describe('getScoreMessage', () => {
  it('should return perfect score message for 100%', () => {
    const result = getScoreMessage(10, 10);

    expect(result).toContain('Quiz Complete!');
    expect(result).toContain('10/10');
    expect(result).toContain('Outstanding!');
    expect(result).toContain('Perfect score!');
    expect(result).toContain('🎉🏆');
  });

  it('should return excellent message for 80-99%', () => {
    const result = getScoreMessage(8, 10);

    expect(result).toContain('8/10');
    expect(result).toContain('Excellent!');
    expect(result).toContain('👏');
  });

  it('should return excellent message for exactly 80%', () => {
    const result = getScoreMessage(4, 5);

    expect(result).toContain('4/5');
    expect(result).toContain('Excellent!');
  });

  it('should return good job message for 60-79%', () => {
    const result = getScoreMessage(7, 10);

    expect(result).toContain('7/10');
    expect(result).toContain('Good job!');
    expect(result).toContain('👍');
  });

  it('should return good job message for exactly 60%', () => {
    const result = getScoreMessage(6, 10);

    expect(result).toContain('6/10');
    expect(result).toContain('Good job!');
  });

  it('should return not bad message for 40-59%', () => {
    const result = getScoreMessage(5, 10);

    expect(result).toContain('5/10');
    expect(result).toContain('Not bad!');
    expect(result).toContain('📚');
  });

  it('should return not bad message for exactly 40%', () => {
    const result = getScoreMessage(4, 10);

    expect(result).toContain('4/10');
    expect(result).toContain('Not bad!');
  });

  it('should return review message for below 40%', () => {
    const result = getScoreMessage(3, 10);

    expect(result).toContain('3/10');
    expect(result).toContain('Consider reviewing');
    expect(result).toContain('📚');
  });

  it('should return review message for 0%', () => {
    const result = getScoreMessage(0, 10);

    expect(result).toContain('0/10');
    expect(result).toContain('Consider reviewing');
  });

  it('should handle single question quiz', () => {
    const resultPerfect = getScoreMessage(1, 1);
    expect(resultPerfect).toContain('1/1');
    expect(resultPerfect).toContain('Perfect score!');

    const resultZero = getScoreMessage(0, 1);
    expect(resultZero).toContain('0/1');
    expect(resultZero).toContain('Consider reviewing');
  });

  it('should format message with proper line breaks', () => {
    const result = getScoreMessage(8, 10);
    const lines = result.split('\n');

    expect(lines[0]).toContain('Quiz Complete!');
    expect(lines[2]).toContain('8/10');
  });

  it('should include markdown bold formatting', () => {
    const result = getScoreMessage(5, 10);

    expect(result).toContain('*Quiz Complete!*');
    expect(result).toContain('*Your Score:');
  });
});
