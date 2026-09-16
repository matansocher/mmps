import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildFileSummaryPrompt,
  detectSupportedFileKind,
  FileSummaryService,
  FILE_SUMMARY_MAX_BYTES,
  FILE_SUMMARY_MAX_TEXT_CHARS,
  formatFileSize,
  getFileSummaryRejection,
} from './file-summary.service';
import type { ExtractedFileContent } from './types';

vi.mock('pdf-parse', () => ({
  PDFParse: vi.fn(function () {
    return {
      getText: vi.fn(async () => ({ text: 'PDF extracted text', total: 3 })),
      destroy: vi.fn(async () => undefined),
    };
  }),
}));

let tempDir: string;

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'file-summary-'));
});

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});

describe('detectSupportedFileKind()', () => {
  it('detects PDFs by mime type or extension', () => {
    expect(detectSupportedFileKind('report.bin', 'application/pdf')).toEqual('pdf');
    expect(detectSupportedFileKind('report.pdf', 'application/octet-stream')).toEqual('pdf');
  });

  it('detects text files by mime type or extension', () => {
    expect(detectSupportedFileKind('notes.bin', 'text/plain')).toEqual('text');
    expect(detectSupportedFileKind('data.json', 'application/octet-stream')).toEqual('text');
  });

  it('detects image files by mime type or extension', () => {
    expect(detectSupportedFileKind('screenshot.bin', 'image/png')).toEqual('image');
    expect(detectSupportedFileKind('screenshot.jpg', 'application/octet-stream')).toEqual('image');
  });

  it('rejects unsupported files', () => {
    expect(detectSupportedFileKind('archive.zip', 'application/zip')).toBeNull();
  });
});

describe('getFileSummaryRejection()', () => {
  it('rejects files over the 10 MB limit', () => {
    const rejection = getFileSummaryRejection({ filename: 'large.pdf', mimeType: 'application/pdf', sizeBytes: FILE_SUMMARY_MAX_BYTES + 1 });

    expect(rejection?.reason).toEqual('too_large');
    expect(rejection?.message).toContain('10.0 MB');
  });

  it('rejects unsupported file types', () => {
    const rejection = getFileSummaryRejection({ filename: 'archive.zip', mimeType: 'application/zip', sizeBytes: 1024 });

    expect(rejection?.reason).toEqual('unsupported');
    expect(rejection?.message).toContain('PDF files, text files, and images');
  });

  it('accepts supported files within the size limit', () => {
    expect(getFileSummaryRejection({ filename: 'notes.txt', mimeType: 'text/plain', sizeBytes: 1024 })).toBeNull();
  });
});

describe('buildFileSummaryPrompt()', () => {
  it('includes metadata, user instruction, and extracted text', () => {
    const prompt = buildFileSummaryPrompt(
      {
        kind: 'text',
        metadata: { filename: 'notes.txt', mimeType: 'text/plain', sizeBytes: 2048 },
        text: 'The important content',
      },
      'Give me action items',
    );

    expect(prompt).toContain('Reply in the same language');
    expect(prompt).toContain('User instruction:\nGive me action items');
    expect(prompt).toContain('Filename: notes.txt');
    expect(prompt).toContain('Size: 2.0 KB');
    expect(prompt).toContain('Extracted file text:\nThe important content');
  });

  it('asks the model to analyze image attachments visually', () => {
    const prompt = buildFileSummaryPrompt({
      kind: 'image',
      metadata: { filename: 'screen.png', mimeType: 'image/png', sizeBytes: 500 },
      images: ['data:image/png;base64,abc'],
    });

    expect(prompt).toContain('Analyze the attached image visually');
  });

  it('mentions truncated extracted text', () => {
    const content: ExtractedFileContent = {
      kind: 'pdf',
      metadata: { filename: 'long.pdf', mimeType: 'application/pdf', sizeBytes: 1024 },
      text: 'content',
      pageCount: 10,
      truncated: true,
    };

    const prompt = buildFileSummaryPrompt(content);

    expect(prompt).toContain('Pages: 10');
    expect(prompt).toContain('truncated');
  });
});

describe('FileSummaryService', () => {
  it('prepares text files for summarization', async () => {
    const filePath = path.join(tempDir, 'notes.txt');
    await fs.writeFile(filePath, 'hello from a text file');

    const prepared = await new FileSummaryService().prepareSummary({
      localPath: filePath,
      filename: 'notes.txt',
      mimeType: 'text/plain',
      sizeBytes: 22,
    });

    expect(prepared.images).toBeUndefined();
    expect(prepared.prompt).toContain('hello from a text file');
  });

  it('truncates long text files', async () => {
    const filePath = path.join(tempDir, 'long.txt');
    await fs.writeFile(filePath, 'a'.repeat(FILE_SUMMARY_MAX_TEXT_CHARS + 100));

    const prepared = await new FileSummaryService().prepareSummary({
      localPath: filePath,
      filename: 'long.txt',
      mimeType: 'text/plain',
      sizeBytes: FILE_SUMMARY_MAX_TEXT_CHARS + 100,
    });

    expect(prepared.prompt).toContain('[Text truncated]');
    expect(prepared.prompt).toContain('summary is based on the available extracted text');
  });

  it('prepares PDFs with page count metadata', async () => {
    const filePath = path.join(tempDir, 'report.pdf');
    await fs.writeFile(filePath, 'fake pdf bytes');

    const prepared = await new FileSummaryService().prepareSummary({
      localPath: filePath,
      filename: 'report.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 14,
    });

    expect(prepared.prompt).toContain('Pages: 3');
    expect(prepared.prompt).toContain('PDF extracted text');
  });
});

describe('formatFileSize()', () => {
  it('formats bytes, KB, and MB', () => {
    expect(formatFileSize(12)).toEqual('12 B');
    expect(formatFileSize(2048)).toEqual('2.0 KB');
    expect(formatFileSize(2 * 1024 * 1024)).toEqual('2.0 MB');
  });
});
