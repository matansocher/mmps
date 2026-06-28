import type { Bot, Context } from 'grammy';
import { Logger } from '@core/utils';
import { notify } from '@services/notifier';
import { getMessageData, MessageLoader } from '@services/telegram';
import { detectFormat, importParsedFiles, parseInput } from '@shared/expenses/importers';
import { ANALYTIC_EVENT_NAMES, BOT_CONFIG, MAX_FILE_SIZE_BYTES, XLSX_EXT_RE } from './expenses.config';
import { ExpensesLauncherService } from './launcher.service';
import { fetchDocumentBuffer, formatFileSummary } from './utils';

export class ExpensesController {
  private readonly logger = new Logger(ExpensesController.name);

  constructor(
    private readonly bot: Bot,
    private readonly launcher: ExpensesLauncherService,
  ) {}

  init(): void {
    this.bot.command('start', (ctx) => this.startHandler(ctx));
    this.bot.on('message:document', (ctx) => this.documentHandler(ctx));
  }

  private async startHandler(ctx: Context): Promise<void> {
    const { chatId, userDetails } = getMessageData(ctx);
    await this.launcher.sendLauncher(chatId);
    notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.START }, userDetails);
  }

  private async documentHandler(ctx: Context): Promise<void> {
    const { chatId, messageId, userDetails } = getMessageData(ctx);
    const doc = ctx.message?.document;
    if (!doc) return;

    const fileName = doc.file_name ?? 'unknown.xlsx';
    if (!XLSX_EXT_RE.test(fileName)) {
      await ctx.reply(`❌ \`${fileName}\` — only .xlsx files are supported.`, { parse_mode: 'Markdown' });
      notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.IMPORT_FAILED, reason: 'not_xlsx', fileName }, userDetails);
      return;
    }
    if (doc.file_size && doc.file_size > MAX_FILE_SIZE_BYTES) {
      await ctx.reply(`❌ \`${fileName}\` — file too large (max ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB).`, { parse_mode: 'Markdown' });
      notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.IMPORT_FAILED, reason: 'too_large', fileName, sizeBytes: doc.file_size }, userDetails);
      return;
    }

    const loader = new MessageLoader(this.bot, chatId, messageId, { reactionEmoji: '👀', loaderMessage: `📥 Importing \`${fileName}\`…`, loadingAction: 'upload_document' });

    await loader.handleMessageWithLoader(async () => {
      try {
        const buffer = await fetchDocumentBuffer(this.bot, doc.file_id);
        const meta = detectFormat(buffer, fileName);
        if (!meta) {
          await ctx.reply(`❌ \`${fileName}\` — not a recognized card statement (Discount/Mizrahi or Isracard/Cal).`, { parse_mode: 'Markdown' });
          notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.IMPORT_FAILED, reason: 'unknown_format', fileName }, userDetails);
          return;
        }

        const rows = await parseInput({ buffer, fileName }, meta);
        if (rows.length === 0) {
          await ctx.reply(`⚠️ \`${fileName}\` — parsed 0 transactions. Nothing to import.`, { parse_mode: 'Markdown' });
          notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.IMPORT_FAILED, reason: 'empty', fileName, format: meta.kind }, userDetails);
          return;
        }

        const summary = await importParsedFiles([{ meta, rows }]);
        const file = summary.files[0];
        await ctx.reply(formatFileSummary(file), { parse_mode: 'Markdown' });
        notify(
          BOT_CONFIG,
          {
            action: ANALYTIC_EVENT_NAMES.IMPORT_SUCCESS,
            fileName,
            format: meta.kind,
            inserted: file.inserted,
            skipped: file.skipped,
            inherited: file.inherited,
            ambiguous: file.ambiguous,
            aiCategorized: file.aiCategorized.length,
          },
          userDetails,
        );
      } catch (err) {
        this.logger.error(`documentHandler ${fileName}: ${err instanceof Error ? (err.stack ?? err.message) : err}`);
        await ctx.reply(`❌ \`${fileName}\` — failed to import: ${err instanceof Error ? err.message : String(err)}`, { parse_mode: 'Markdown' });
        notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.IMPORT_FAILED, reason: 'error', fileName, error: err instanceof Error ? err.message : String(err) }, userDetails);
      }
    });
  }
}
