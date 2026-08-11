import { AIMessage, ToolMessage } from '@langchain/core/messages';
import { describe, expect, it, test } from 'vitest';
import { SecretaryActionService } from './secretary-action.service';

function createService(messages: Array<AIMessage | ToolMessage>): SecretaryActionService {
  return new SecretaryActionService(async () => ({ messages }));
}

describe('SecretaryActionService.execute()', () => {
  it('should succeed when the tool response reports success', async () => {
    const service = createService([
      new ToolMessage({ content: [{ type: 'text', text: '{ "success": true }' }], tool_call_id: 'call-1' }),
      new AIMessage({ content: [{ type: 'text', text: 'Reminder created.' }] }),
    ]);

    await expect(service.execute('Create a reminder')).resolves.toEqual({ ok: true, text: 'Reminder created.' });
  });

  test.each(['{"success":false}', '{ "success" : false }', '{\n  "success": false,\n  "error": "not created"\n}'])(
    'should fail when the tool response explicitly reports failure: %s',
    async (content) => {
      const service = createService([new ToolMessage({ content, tool_call_id: 'call-1' }), new AIMessage('Could not create it.')]);

      await expect(service.execute('Create a reminder')).resolves.toEqual({ ok: false, text: 'Could not create it.' });
    },
  );

  it('should fail when the agent makes no tool call', async () => {
    const service = createService([new AIMessage('I need more information.')]);

    await expect(service.execute('Create a reminder')).resolves.toEqual({ ok: false, text: 'I need more information.' });
  });

  test.each([
    new ToolMessage({ content: 'not json', tool_call_id: 'call-1' }),
    new ToolMessage({ content: '{"success":"yes"}', tool_call_id: 'call-1' }),
    new ToolMessage({ content: [{ type: 'image', url: 'https://example.com/result.png' }], tool_call_id: 'call-1' }),
  ])('should fail when a tool response is malformed', async (toolMessage) => {
    const service = createService([toolMessage, new AIMessage('Done.')]);

    await expect(service.execute('Create a reminder')).resolves.toEqual({ ok: false, text: 'Done.' });
  });

  it('should fail with the agent error when invocation throws', async () => {
    const service = new SecretaryActionService(async () => {
      throw new Error('agent unavailable');
    });

    await expect(service.execute('Create a reminder')).resolves.toEqual({ ok: false, text: 'Failed to perform the action: agent unavailable' });
  });
});
