import http from "node:http"
import { spawn } from "node:child_process"

const child = spawn(process.argv[2], process.argv.slice(3), {
  stdio: "inherit",
})

const server = http.createServer((_, res) => {
  if (!child.kill(9)) {
    console.error("killing the subprocess failed")
  }
  res.end()
  process.exit(1)
})

server.listen(8000)
