import type { Metadata } from "next";
import { AuthProvider } from "@/components/auth/auth-provider";
import { ThemeProvider } from "@/components/theme/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Powerful — AI-Powered PR Review Agent",
  description:
    "Review every Pull Request with your team's historical context, learning patterns, and automated insights.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // JSON.stringify safely escapes the values so an environment variable
  // containing quotes or angle brackets cannot break out of the script tag.
  const apiUrl = JSON.stringify(process.env.NEXT_PUBLIC_API_URL || "http://api:3000");
  const apiUrlBrowser = JSON.stringify(
    process.env.NEXT_PUBLIC_API_URL_BROWSER || "http://localhost:3000"
  );

  return (
    <html lang="en" className="h-full antialiased font-sans" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Geist+Mono:wght@100..900&family=Inter:wght@100..900&display=swap"
          rel="stylesheet"
        />
        {/* Runtime config - must load before any client components */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var config = window.__RUNTIME_CONFIG__ || {};
                  window.__RUNTIME_CONFIG__ = {
                    apiUrl: config.apiUrl || ${apiUrl},
                    apiUrlBrowser: config.apiUrlBrowser || ${apiUrlBrowser}
                  };
                } catch (e) {
                  console.warn("Failed to load runtime config:", e);
                }
              })();
            `
          }}
        />
        <script src="/runtime-config.js" defer />
      </head>
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)] transition-colors duration-300">
        <AuthProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
