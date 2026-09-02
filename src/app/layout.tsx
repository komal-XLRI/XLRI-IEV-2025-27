import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: {
    default: `${BRAND.unitShort} ${BRAND.product} · ${BRAND.institution}`,
    template: `%s · ${BRAND.unitShort} ${BRAND.institution}`,
  },
  description: `${BRAND.institutionFull}, ${BRAND.campus} — ${BRAND.unit} student activity portal for workshops, mentoring, internships, capstone, demo day and the startup conclave.`,
  applicationName: `${BRAND.unitShort} ${BRAND.product}`,
  openGraph: {
    title: `${BRAND.unitShort} ${BRAND.product}`,
    siteName: BRAND.institution,
    description: `${BRAND.unit} · ${BRAND.institutionFull}`,
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1c3f94" },
    { media: "(prefers-color-scheme: dark)", color: "#0e2054" },
  ],
};

/**
 * Applied before paint so a dark-mode reload never flashes the light theme.
 */
const themeScript = `(function(){try{var t=localStorage.getItem("iev-theme");if(!t){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
        />
      </head>
      <body className="min-h-screen antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
