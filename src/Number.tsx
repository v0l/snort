export function formatShort(n: number) {
  if (n < 999) {
    return n
  } else if (n < 1e8) {
    return `${Math.floor(n / 1e3)}K`
  } else {
    return `${Math.floor(n / 1e6)}M`
  }
}

