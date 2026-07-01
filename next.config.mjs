/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // Supabase Storage public URLs (ajustar el host a tu proyecto)
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default nextConfig;
