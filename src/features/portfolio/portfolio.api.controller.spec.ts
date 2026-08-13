import { describe, expect, it, test } from 'vitest';
import { ContactRequestSchema } from './portfolio.api.controller';

describe('ContactRequestSchema', () => {
  it('should accept a valid submission and trim fields', () => {
    const result = ContactRequestSchema.safeParse({ name: '  John Doe  ', email: 'john@example.com', message: 'Hello there' });
    expect(result.success).toEqual(true);
    expect(result.data).toEqual({ name: 'John Doe', email: 'john@example.com', message: 'Hello there' });
  });

  test.each([
    { case: 'missing name', body: { email: 'john@example.com', message: 'Hi' } },
    { case: 'empty name', body: { name: '   ', email: 'john@example.com', message: 'Hi' } },
    { case: 'name too long', body: { name: 'a'.repeat(101), email: 'john@example.com', message: 'Hi' } },
    { case: 'missing email', body: { name: 'John', message: 'Hi' } },
    { case: 'invalid email', body: { name: 'John', email: 'not-an-email', message: 'Hi' } },
    { case: 'missing message', body: { name: 'John', email: 'john@example.com' } },
    { case: 'empty message', body: { name: 'John', email: 'john@example.com', message: '  ' } },
    { case: 'message too long', body: { name: 'John', email: 'john@example.com', message: 'a'.repeat(2001) } },
  ])('should reject $case', ({ body }) => {
    expect(ContactRequestSchema.safeParse(body).success).toEqual(false);
  });
});
