/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  // Standalone output for the Docker image (apps/web/Dockerfile) -- traces
  // the minimal node_modules subset instead of shipping the whole monorepo.
  output: "standalone",
}

export default nextConfig
