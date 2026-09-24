import type { Bot } from 'grammy';
import { fetchUserEmails, trashEmail } from '@services/gmail';
import { sendShortenedMessage } from '@services/telegram';
import { askJevNoul } from '@services/typesafe';
import { buildCleanupReport, buildEmailState, emailCleanup } from './email-cleanup';

vi.mock('@services/gmail', () => ({ fetchUserEmails: vi.fn(), trashEmail: vi.fn() }));
vi.mock('@services/telegram', () => ({ sendShortenedMessage: vi.fn() }));
vi.mock('@services/typesafe', () => ({ askJevNoul: vi.fn() }));

const bot = {} as unknown as Bot;

function email(id: string) {
  return { id, from: `sender-${id}@example.com`, subject: `Subject ${id}`, snippet: `Snippet ${id}` };
}

describe('emailCleanup()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(trashEmail).mockResolvedValue('ok');
  });

  it('should trash only emails with probability above 0.75', async () => {
    vi.mocked(fetchUserEmails).mockResolvedValue([email('a'), email('b'), email('c')]);
    vi.mocked(askJevNoul).mockResolvedValueOnce(0.75).mockResolvedValueOnce(0.76).mockResolvedValueOnce(0.1);

    await emailCleanup(bot);

    expect(vi.mocked(trashEmail).mock.calls).toEqual([['b']]);
    expect(sendShortenedMessage).toHaveBeenCalledTimes(1);
    expect(vi.mocked(sendShortenedMessage).mock.calls[0][2]).toContain('Subject b');
  });

  it('should query unread inbox emails from the last day, up to 50', async () => {
    vi.mocked(fetchUserEmails).mockResolvedValue([]);

    await emailCleanup(bot);

    expect(fetchUserEmails).toHaveBeenCalledWith('in:inbox is:unread newer_than:1d', 50);
  });

  it('should keep an email when Jev fails and still process the rest', async () => {
    vi.mocked(fetchUserEmails).mockResolvedValue([email('a'), email('b')]);
    vi.mocked(askJevNoul).mockRejectedValueOnce(new Error('429')).mockResolvedValueOnce(0.9);

    await emailCleanup(bot);

    expect(vi.mocked(trashEmail).mock.calls).toEqual([['b']]);
  });

  it('should not report an email whose trash call failed', async () => {
    vi.mocked(fetchUserEmails).mockResolvedValue([email('a')]);
    vi.mocked(askJevNoul).mockResolvedValue(0.99);
    vi.mocked(trashEmail).mockRejectedValue(new Error('gmail down'));

    await emailCleanup(bot);

    expect(sendShortenedMessage).not.toHaveBeenCalled();
  });

  test.each([{ emails: [] }, { emails: undefined }])('should do nothing when the inbox returns $emails', async ({ emails }) => {
    vi.mocked(fetchUserEmails).mockResolvedValue(emails);

    await emailCleanup(bot);

    expect(askJevNoul).not.toHaveBeenCalled();
    expect(sendShortenedMessage).not.toHaveBeenCalled();
  });

  it('should stay silent when nothing was trashed', async () => {
    vi.mocked(fetchUserEmails).mockResolvedValue([email('a')]);
    vi.mocked(askJevNoul).mockResolvedValue(0.2);

    await emailCleanup(bot);

    expect(trashEmail).not.toHaveBeenCalled();
    expect(sendShortenedMessage).not.toHaveBeenCalled();
  });
});

describe('buildEmailState()', () => {
  it('should include sender, subject and snippet', () => {
    expect(buildEmailState(email('a'))).toEqual('From: sender-a@example.com\nSubject: Subject a\nSnippet: Snippet a');
  });
});

describe('buildCleanupReport()', () => {
  test.each([
    { count: 1, header: '🧹 Moved 1 spam/ad email to trash:' },
    { count: 2, header: '🧹 Moved 2 spam/ad emails to trash:' },
  ])('should use header "$header" for $count emails', ({ count, header }) => {
    const trashed = Array.from({ length: count }, (_, i) => ({ id: `${i}`, from: `f${i}`, subject: `s${i}`, probability: 0.914 }));
    const report = buildCleanupReport(trashed);
    expect(report.split('\n')[0]).toEqual(header);
    expect(report).toContain('• f0 — s0 (91%)');
  });
});
