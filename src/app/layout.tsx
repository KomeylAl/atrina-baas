import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { AppProviders } from "@/components/app-providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Atrina BaaS — پلتفرم بک‌اند به عنوان سرویس",
  description:
    "پلتفرم BaaS چند-پروژه‌ای آترینا برای ساخت، مدیریت و مقیاس‌دهی اپلیکیشن‌های موبایل، وب و SaaS.",
  keywords: [
    "Atrina",
    "BaaS",
    "Backend as a Service",
    "آترینا",
    "پلتفرم",
    "اپلیکیشن",
  ],
  authors: [{ name: "Atrina" }],
  openGraph: {
    title: "Atrina BaaS",
    description: "پلتفرم بک‌اند به عنوان سرویس",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased bg-background text-foreground`}
      >
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("atrina-theme");var d=document.documentElement;if(t==="light"){d.classList.remove("dark");d.style.colorScheme="light"}else{d.classList.add("dark");d.style.colorScheme="dark"}}catch(e){document.documentElement.classList.add("dark")}`,
          }}
        />
        <ThemeProvider>
          <AppProviders>{children}</AppProviders>
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
