import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { buildStructuredInstruction, parseStructuredResponse } from './utils';

describe('buildStructuredInstruction()', () => {
  it('should reference the schema keys in the instruction', () => {
    const instruction = buildStructuredInstruction(z.object({ hasMatches: z.boolean() }));
    expect(instruction).toContain('@@STRUCTURED@@');
    expect(instruction).toContain('hasMatches');
  });
});

describe('parseStructuredResponse()', () => {
  const schema = z.object({ hasMatches: z.boolean() });

  it('should split the user message from the sentinel and parse the structured value', () => {
    const raw = 'Here are the matches!\n@@STRUCTURED@@ {"hasMatches": true}';
    const { message, structured } = parseStructuredResponse(raw, schema);
    expect(message).toEqual('Here are the matches!');
    expect(structured).toEqual({ hasMatches: true });
  });

  it('should return null structured when the sentinel is missing', () => {
    const raw = 'No sentinel here';
    const { message, structured } = parseStructuredResponse(raw, schema);
    expect(message).toEqual('No sentinel here');
    expect(structured).toBeNull();
  });

  it('should return null structured and keep the clean message when the sentinel JSON is invalid', () => {
    const raw = 'Partial message\n@@STRUCTURED@@ not-json';
    const { message, structured } = parseStructuredResponse(raw, schema);
    expect(message).toEqual('Partial message');
    expect(structured).toBeNull();
  });

  it('should use the last sentinel occurrence', () => {
    const raw = 'talk about @@STRUCTURED@@ in the body\n@@STRUCTURED@@ {"hasMatches": false}';
    const { structured } = parseStructuredResponse(raw, schema);
    expect(structured).toEqual({ hasMatches: false });
  });
});
