import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["mongoose", "nodemailer", "@googleapis/drive"],
};

export default nextConfig;
