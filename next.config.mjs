/** @type {import('next').NextConfig} */
const assetPrefix = process.env.NEXT_PUBLIC_ASSET_PREFIX ?? "/publish";

const nextConfig = {
  ...(assetPrefix ? { assetPrefix } : {}),
};

export default nextConfig;
