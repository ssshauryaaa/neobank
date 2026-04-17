/** @type {import('next').NextConfig} */
const nextConfig = {
  // Intentionally expose server info
  poweredByHeader: true,
  // Allow serving from public directory without restrictions
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Powered-By', value: 'Express' },
          { key: 'Server', value: 'NeoBank/1.0' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
