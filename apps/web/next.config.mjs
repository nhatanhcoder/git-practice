/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next 14's embedded ESLint integration predates ESLint 10. CI runs `pnpm lint`
  // as a required separate step before this build; type checking stays enabled.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
