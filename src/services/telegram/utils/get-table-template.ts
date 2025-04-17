type TableItems = {
  readonly name: string;
  readonly value: number | string;
};

export function getTableTemplate(items: Array<TableItems>): string {
  const indices = items.map((_, i) => String(i + 1));
  const names = items.map((item) => item.name);
  const values = items.map((item) => String(item.value));

  const idxWidth = Math.max(...indices.map((s) => s.length));
  const nameWidth = Math.max(...names.map((s) => s.length));
  const valuesWidth = Math.max(...values.map((s) => s.length));

  const rows = items.map((item, i) => {
    const idx = String(i + 1).padStart(idxWidth, ' ');
    const name = item.name.padEnd(nameWidth, ' ');
    const val = String(item.value).padStart(valuesWidth, ' ');
    return `${idx}  ${name}  ${val}`;
  });

  const table = rows.join('\n');
  return '```\n' + table + '\n```';
}
