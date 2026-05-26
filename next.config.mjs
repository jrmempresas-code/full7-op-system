/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pdf-lib', 'sharp', 'imap', 'mailparser', 'pdf-parse', 'tesseract.js'],
  },
  images: {
    domains: ['trello.com', 'supabase.co'],
  },
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default nextConfig;
