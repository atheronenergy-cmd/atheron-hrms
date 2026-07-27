import "@/styles/globals.css";

import { Inter, JetBrains_Mono } from "next/font/google";

import { Providers } from "@/components/providers/app-providers";
import { ErrorBoundary } from "@/components/providers/error-boundary";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata = {
  title: {
    default: "Atheron HRMS",
    template: "%s | Atheron HRMS",
  },
  description: "Enterprise Human Resource Management & Payroll System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <Providers>
          <ErrorBoundary>{children}</ErrorBoundary>
        </Providers>
      </body>
    </html>
  );
}
