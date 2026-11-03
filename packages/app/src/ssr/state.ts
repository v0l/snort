export const isServer = typeof document === "undefined"

let status = 200

export function setStatus(code: number) {
  status = code === 200 ? 200 : Math.max(status, code)
}

export function takeStatus() {
  return status
}
