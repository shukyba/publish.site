/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "/publish";

const nextConfig = {
  basePath,
  assetPrefix: basePath,
};

export default nextConfig;
