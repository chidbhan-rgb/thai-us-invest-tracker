/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Tell Vercel's file tracer to bundle data/ into the serverless function
    outputFileTracingIncludes: {
      "/": ["./data/**/*"],
    },
  },
};

export default nextConfig;
