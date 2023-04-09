/**
 * Serve tests in the browser.
 */

import express from "express"
import * as path from "path"
import * as fs from "fs"

const port = 33543
const app = express()

app.use("/", (req: express.Request, res: express.Response) => {
  if (req.path === "/" || req.path === "/nostr-object") {
    const index = fs.readFileSync(path.join(__dirname, "index.html"), {
      encoding: "utf8",
    })
    const tests = fs
      .readdirSync(path.join(__dirname, "..", "..", "dist", "test"))
      .filter(
        (f) =>
          f.startsWith("test.") && !f.endsWith(".map") && !f.endsWith(".d.ts")
      )
      .map((src) => `<script src="${src}"></script>`)
      .join("\n")
    res.set("Content-Type", "text/html")
    res.send(index.replace("<!-- TESTS -->", tests))
    res.end()
  } else if (req.path === "/favicon.ico") {
    res.status(404)
    res.end()
  } else {
    const file = path.join(__dirname, "..", "..", "dist", "test", req.path)
    res.sendFile(file, (err) => {
      if (err) {
        console.error(err)
        res.status(404)
      }
      res.end()
    })
  }
})

app.listen(port, () => {
  console.log(`Browser tests: http://localhost:${port}`)
})
