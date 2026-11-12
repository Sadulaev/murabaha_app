const isDevServer = process.argv.some((arg) => arg === "dev");

const nextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
};

// `output: "export"` rejects rewrites at build time. Dev still needs `/ur/:slug`
// to return the home page; production nginx does the same fallback.
if (isDevServer) {
  nextConfig.rewrites = async () => [{ source: "/ur/:slug", destination: "/" }];
}

export default nextConfig;
