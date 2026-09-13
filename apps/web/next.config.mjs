/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next 14's embedded ESLint integration predates ESLint 10. CI runs `pnpm lint`
  // as a required separate step before this build; type checking stays enabled.
  eslint: { ignoreDuringBuilds: true },
  // WEB-017 follow-up (owner direction 2026-09-12): the landing was first removed
  // for its invented people content, then re-created at /landing with factual
  // content only. The old /student path redirects there for backward
  // compatibility; temporary until every known link has moved over.
  async redirects() {
    return [{ source: '/student/landing', destination: '/landing', permanent: false }];
  },
};

export default nextConfig;
