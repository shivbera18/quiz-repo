import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  // Standalone output for the Docker image (apps/web/Dockerfile) -- traces
  // the minimal node_modules subset instead of shipping the whole monorepo.
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"),
}

export default nextConfig
