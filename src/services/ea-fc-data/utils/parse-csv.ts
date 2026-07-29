// Minimal RFC-4180 CSV parser (dependency-free). Handles quoted fields containing
// commas, newlines, and escaped double-quotes (""). Returns an array of row objects
// keyed by the header row. Sufficient for the EA FC 26 dataset import.
export function parseCsv(input: string): Record<string, string>[] {
  const rows: string[][] = [];
  let field = '';
  let record: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      record.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      // Handle \r\n as a single line break.
      if (char === '\r' && input[i + 1] === '\n') i++;
      record.push(field);
      field = '';
      rows.push(record);
      record = [];
    } else {
      field += char;
    }
  }

  // Flush trailing field/record (file may not end with newline).
  if (field.length > 0 || record.length > 0) {
    record.push(field);
    rows.push(record);
  }

  if (rows.length === 0) return [];

  const header = rows[0];
  return rows.slice(1).map((cols) => {
    const obj: Record<string, string> = {};
    for (let c = 0; c < header.length; c++) {
      obj[header[c]] = cols[c] ?? '';
    }
    return obj;
  });
}
