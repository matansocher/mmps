export function formatDepth(depth: number): string {
  if (depth < 70) return `${depth.toFixed(1)}km (shallow)`;
  if (depth < 300) return `${depth.toFixed(1)}km (intermediate)`;
  return `${depth.toFixed(1)}km (deep)`;
}
