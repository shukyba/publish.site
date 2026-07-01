/** @type {import('next').NextConfig} */
// Only prefix assets for production builds (deployed under www.cliposts.com/publish).
// Local `next dev` must serve at the root, so the prefix stays empty unless overridden.
const assetPrefix =
  process.env.NEXT_PUBLIC_ASSET_PREFIX ?? (process.env.NODE_ENV === "production" ? "/publish" : "");

const nextConfig = {
  ...(assetPrefix ? { assetPrefix } : {}),
};

export default nextConfig;
