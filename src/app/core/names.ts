// Comparación de nombres de jugadores para detectar el mismo jugador escrito de otra forma
// ("Rafa Luego" / "Rafa Luengo", "Iñaqui" / "Iñaki").

/** Sin tildes, mayúsculas ni espacios dobles: igual que PairService.normalize en el Back (mismo jugador). */
export function normalizeName(s: string | null | undefined) {
  return (s ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim().replace(/\s+/g, ' ');
}

/** Además sin signos, solo para comparar parecidos. */
function key(s: string) { return normalizeName(s).replace(/[^a-z0-9 ]/g, ' ').trim().replace(/\s+/g, ' '); }

function distance(a: string, b: string) {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

/** Nombres distintos que probablemente son la misma persona (pequeña errata o un apellido de más). */
export function similarNames(a: string, b: string) {
  if (normalizeName(a) === normalizeName(b)) return false;
  const x = key(a), y = key(b);
  if (!x || !y) return false;
  if (x === y) return true;
  if (distance(x, y) <= (Math.min(x.length, y.length) >= 10 ? 2 : 1)) return true;
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  const words = short.split(' ');
  return words.length >= 2 && words.every(w => long.split(' ').includes(w));
}

/** Primer jugador con un nombre parecido, salvo que ya haya uno con el mismo nombre exacto. */
export function findSimilar<T extends { fullName: string }>(name: string, list: T[]): T | undefined {
  const n = normalizeName(name);
  if (n.length < 4 || list.some(p => normalizeName(p.fullName) === n)) return undefined;
  return list.find(p => similarNames(name, p.fullName));
}
