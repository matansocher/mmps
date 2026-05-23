export function computePoints(
  g: { readonly home: number; readonly away: number },
  a: { readonly home: number; readonly away: number },
): 0 | 1 | 3 | 5 {
  if (g.home === a.home && g.away === a.away) return 5;
  if (g.home - g.away === a.home - a.away) return 3;
  if (Math.sign(g.home - g.away) === Math.sign(a.home - a.away)) return 1;
  return 0;
}
