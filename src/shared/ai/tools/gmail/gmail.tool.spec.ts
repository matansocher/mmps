import { gmailTool } from './gmail.tool';

const { send, trash } = vi.hoisted(() => ({ send: vi.fn(), trash: vi.fn() }));

vi.mock('@services/gmail/auth', () => ({
  getGmailClient: vi.fn(async () => ({ users: { messages: { send, trash } } })),
}));

describe('gmailTool', () => {
  beforeEach(() => {
    send.mockReset();
    trash.mockReset();
  });

  it('should report the message id when gmail confirms the send', async () => {
    send.mockResolvedValue({ data: { id: 'm1' } });
    const result = await gmailTool.invoke({ action: 'send', recipient: 'a@b.com', subject: 's', body: 'b' });
    expect(JSON.stringify(result)).toContain('m1');
  });

  it('should not report success when gmail returns no message id on send', async () => {
    send.mockResolvedValue({ data: {} });
    await expect(gmailTool.invoke({ action: 'send', recipient: 'a@b.com', subject: 's', body: 'b' })).rejects.toThrow(/no message ID/);
  });

  it('should not report success when gmail returns no message id on delete', async () => {
    trash.mockResolvedValue({ data: {} });
    await expect(gmailTool.invoke({ action: 'delete', emailId: 'e1' })).rejects.toThrow(/no message ID/);
  });

  it('should reject an invalid recipient without sending', async () => {
    await expect(gmailTool.invoke({ action: 'send', recipient: 'not-an-email', subject: 's', body: 'b' })).rejects.toThrow();
    expect(send).not.toHaveBeenCalled();
  });
});
