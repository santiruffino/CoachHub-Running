import type { Metadata, Viewport } from "next";
import { Manrope, Inter, Exo_2, IBM_Plex_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { Providers } from "./providers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { getServerUser } from "@/features/auth/services/auth.server";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const exo2 = Exo_2({
  variable: "--font-exo-2",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Endurix",
  description: "Plataforma para entrenadores de running",
  // favicon.ico, apple-icon.png, icon0.svg, icon1.png and manifest.json
  // are all co-located in src/app/ and auto-discovered by Next.js App Router.
  appleWebApp: {
    title: "Endurix",
    capable: true,
    statusBarStyle: "black-translucent",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "theme-color": "#F35B04",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const initialUser = await getServerUser();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${inter.variable} ${manrope.variable} ${exo2.variable} ${ibmPlexMono.variable} font-sans antialiased`}
      >
        <NextIntlClientProvider messages={messages}>
          <Providers initialUser={initialUser}>
            <Suspense fallback={null}>
              <GoogleAnalytics />
            </Suspense>
            {children}
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
