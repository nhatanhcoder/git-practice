/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next 14's embedded ESLint integration predates ESLint 10. CI runs `pnpm lint`
  // as a required separate step before this build; type checking stays enabled.
  eslint: { ignoreDuringBuilds: true },
  // The public landing page moved from /student/landing to /landing (it was never
  // part of the guarded learner area). Keep the old URL working as a permanent
  // redirect rather than a 404 for bookmarks.
  async redirects() {
    return [
      { source: "/student/landing", destination: "/landing", permanent: true },
      { source: "/student/landing/:path*", destination: "/landing/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
