import { promises as fs } from 'node:fs';
import path from 'node:path';
import { PDFParse } from 'pdf-parse';
import { fileToDataUrl } from '../utils';
import type { ExtractedFileContent, FileSummaryMetadata, FileSummaryRejection, PrepareFileSummaryInput, PreparedFileSummary, SupportedFileKind } from './types';

export const FILE_SUMMARY_MAX_BYTES = 10 * 1024 * 1024;
export const FILE_SUMMARY_MAX_TEXT_CHARS = 60_000;

const PDF_MIME_TYPES = new Set(['application/pdf']);
const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const TEXT_MIME_TYPES = new Set([
  'application/json',
  'application/xml',
  'application/yaml',
  'text/csv',
  'text/html',
  'text/markdown',
  'text/plain',
  'text/tab-separated-values',
  'text/xml',
]);

const TEXT_EXTENSIONS = new Set(['.csv', '.json', '.log', '.md', '.markdown', '.txt', '.tsv', '.xml', '.yaml', '.yml']);
const IMAGE_EXTENSIONS = new Set(['.gif', '.jpeg', '.jpg', '.png', '.webp']);

export function formatFileSize(sizeBytes: number): string {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  const sizeKb = sizeBytes / 1024;
  if (sizeKb < 1024) return `${sizeKb.toFixed(1)} KB`;
  return `${(sizeKb / 1024).toFixed(1)} MB`;
}

export function detectSupportedFileKind(filename: string, mimeType: string): SupportedFileKind | null {
  const normalizedMimeType = mimeType.toLowerCase();
  const extension = path.extname(filename).toLowerCase();

  if (PDF_MIME_TYPES.has(normalizedMimeType) || extension === '.pdf') return 'pdf';
  if (IMAGE_MIME_TYPES.has(normalizedMimeType) || IMAGE_EXTENSIONS.has(extension)) return 'image';
  if (normalizedMimeType.startsWith('text/') || TEXT_MIME_TYPES.has(normalizedMimeType) || TEXT_EXTENSIONS.has(extension)) return 'text';

  return null;
}

export function getFileSummaryRejection(metadata: FileSummaryMetadata): FileSummaryRejection | null {
  if (metadata.sizeBytes > FILE_SUMMARY_MAX_BYTES) {
    return {
      reason: 'too_large',
      message: `I can summarize PDF, text, and image files up to ${formatFileSize(FILE_SUMMARY_MAX_BYTES)}. This file is ${formatFileSize(metadata.sizeBytes)}, so it is too large for this version.`,
    };
  }

  if (!detectSupportedFileKind(metadata.filename, metadata.mimeType)) {
    return {
      reason: 'unsupported',
      message: 'I can summarize PDF files, text files, and images/screenshots in this version. This file type is not supported yet.',
    };
  }

  return null;
}

export class FileSummaryService {
  async prepareSummary(input: PrepareFileSummaryInput): Promise<PreparedFileSummary> {
    const rejection = getFileSummaryRejection(input);
    if (rejection) {
      throw new Error(rejection.message);
    }

    const extracted = await this.extract(input);
    return {
      prompt: buildFileSummaryPrompt(extracted, input.caption),
      images: extracted.images,
    };
  }

  private async extract(input: PrepareFileSummaryInput): Promise<ExtractedFileContent> {
    const kind = detectSupportedFileKind(input.filename, input.mimeType);
    if (!kind) {
      throw new Error('Unsupported file type');
    }

    if (kind === 'image') {
      return {
        kind,
        metadata: input,
        images: [await fileToDataUrl(input.localPath)],
      };
    }

    if (kind === 'pdf') {
      const buffer = await fs.readFile(input.localPath);
      const parser = new PDFParse({ data: buffer });
      try {
        const parsed = await parser.getText();
        return {
          kind,
          metadata: input,
          text: truncateText(parsed.text.trim()),
          pageCount: parsed.total,
          truncated: parsed.text.trim().length > FILE_SUMMARY_MAX_TEXT_CHARS,
        };
      } finally {
        await parser.destroy();
      }
    }

    const text = await fs.readFile(input.localPath, 'utf-8');
    return {
      kind,
      metadata: input,
      text: truncateText(text.trim()),
      truncated: text.trim().length > FILE_SUMMARY_MAX_TEXT_CHARS,
    };
  }
}

export function buildFileSummaryPrompt(content: ExtractedFileContent, caption?: string): string {
  const userInstruction = caption?.trim() || 'Summarize this file.';
  const metadata = [
    `Filename: ${content.metadata.filename}`,
    `Type: ${content.kind}${content.metadata.mimeType ? ` (${content.metadata.mimeType})` : ''}`,
    `Size: ${formatFileSize(content.metadata.sizeBytes)}`,
    content.pageCount ? `Pages: ${content.pageCount}` : null,
  ].filter(Boolean);

  const baseInstructions = [
    'The user sent a Telegram file.',
    'Reply in the same language as the user instruction when possible.',
    'Start with the file metadata, then provide concise bullets and key takeaways.',
    'If the user asked for something more specific, follow that request instead of a generic summary.',
    content.truncated ? 'The extracted text below was truncated because the file is long. Say that the summary is based on the available extracted text.' : null,
  ].filter(Boolean);

  if (content.kind === 'image') {
    return `${baseInstructions.join('\n')}\n\nUser instruction:\n${userInstruction}\n\nFile metadata:\n${metadata.join('\n')}\n\nAnalyze the attached image visually.`;
  }

  const text = content.text?.trim();
  if (!text) {
    return `${baseInstructions.join('\n')}\n\nUser instruction:\n${userInstruction}\n\nFile metadata:\n${metadata.join('\n')}\n\nNo readable text could be extracted from this file. Explain that briefly and suggest sending a clearer scan or image if appropriate.`;
  }

  return `${baseInstructions.join('\n')}\n\nUser instruction:\n${userInstruction}\n\nFile metadata:\n${metadata.join('\n')}\n\nExtracted file text:\n${text}`;
}

function truncateText(text: string): string {
  if (text.length <= FILE_SUMMARY_MAX_TEXT_CHARS) return text;
  return `${text.slice(0, FILE_SUMMARY_MAX_TEXT_CHARS)}\n\n[Text truncated]`;
}
