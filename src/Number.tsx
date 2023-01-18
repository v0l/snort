export function formatShort(n: number) {
  if (n < 999) {
    return n
  } else if (n < 1e8) {
    return `${n / 1e3}K`
  } else {
    return `${n / 1e6}M`
  }
}

