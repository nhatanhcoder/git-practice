/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next 14's embedded ESLint integration predates ESLint 10. CI runs `pnpm lint`
  // as a required separate step before this build; type checking stays enabled.
  eslint: { ignoreDuringBuilds: true },
  // WEB-017, final resolution (owner decision on record: "Gỡ trang + redirect"):
  // the landing page carried invented teachers and student results. It was moved
  // to /landing by PR #83 and is now removed again — no public page may assert
  // invented facts about people. Both historical paths land on the login gate.
  // Temporary redirects: a landing built from approved real content can return.
  async redirects() {
    return [
      { source: "/landing", destination: "/login", permanent: false },
      { source: "/student/landing", destination: "/login", permanent: false },
      { source: "/student/landing/:path*", destination: "/login", permanent: false },
    ];
  },
};

export default nextConfig;
