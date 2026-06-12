import type { FileImportSummary, FileMeta } from '@shared/expenses/importers';

function formatHeader(meta: FileMeta): string {
  if (meta.kind === 'discount') return `*Discount/Mizrahi* · card \`${meta.cardLast4}\` · ${meta.statementYm}`;
  return `*Isracard/Cal* · ${meta.statementYear} (multi-month, multi-card)`;
}

export function formatFileSummary(file: FileImportSummary): string {
  const header = formatHeader(file.meta);
  const lines = [`✅ ${header}`, `• Inserted: ${file.inserted}`, `• Skipped (already in DB): ${file.skipped - file.ambiguous}`, `• Inherited overrides: ${file.inherited}`];
  if (file.ambiguous > 0) lines.push(`• Ambiguous (manual review): ${file.ambiguous}`);
  if (file.aiCategorized.length > 0) {
    const previewed = file.aiCategorized.slice(0, 10);
    lines.push(`• AI-categorized: ${file.aiCategorized.length}`);
    for (const r of previewed) lines.push(`   ↳ \`${r.vendor}\` → ${r.category}`);
    if (file.aiCategorized.length > previewed.length) {
      lines.push(`   …and ${file.aiCategorized.length - previewed.length} more`);
    }
  }
  if (file.ambiguousRows.length > 0) {
    lines.push('');
    lines.push('*Ambiguous rows:*');
    for (const r of file.ambiguousRows.slice(0, 10)) {
      const d = r.transactionDate.toISOString().slice(0, 10);
      lines.push(`   ↳ ${d} · ${r.amount} ${r.currency} · \`${r.vendor}\` ⇄ ${r.candidateVendors.join(' / ')}`);
    }
  }
  return lines.join('\n');
}
