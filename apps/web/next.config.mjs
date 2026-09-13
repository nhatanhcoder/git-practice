/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next 14's embedded ESLint integration predates ESLint 10. CI runs `pnpm lint`
  // as a required separate step before this build; type checking stays enabled.
  eslint: { ignoreDuringBuilds: true },
  // WEB-017: the prototype landing page (invented teachers and student results)
  // was removed on the owner's decision 2026-09-12. Temporary redirect so old
  // links and the `new_invoice`-adjacent bookmarks land on the login gate
  // instead of a 404; restore as `permanent: false` until a real landing page
  // with approved content exists.
  async redirects() {
    return [{ source: '/student/landing', destination: '/login', permanent: false }];
  },
};

export default nextConfig;
