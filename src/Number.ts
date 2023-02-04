const intl = new Intl.NumberFormat("en", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatShort(n: number) {
  if (n < 1e5) {
    return n
  } else if (n < 1e8) {
    return `${intl.format(n / 1e3)}K`
  } else {
    return `${intl.format(n / 1e6)}M`
  }
}
