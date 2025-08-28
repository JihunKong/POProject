import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/Providers";
import Navigation from "@/components/Navigation";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// FORCE DISABLE ALL CACHING 
export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: {
    default: "Pure-Ocean Project - AI 챗봇",
    template: "%s | Pure-Ocean Project"
  },
  description: "완도고등학교 Pure-Ocean Project를 위한 소크라테스식 AI 코칭 챗봇. 해양 환경 보호 프로젝트 진행을 위한 팀워크 및 학습 지원 플랫폼.",
  keywords: ["Pure Ocean", "완도고등학교", "AI 챗봇", "소크라테스", "해양 환경", "프로젝트", "교육"],
  authors: [{ name: "Pure Ocean Team" }],
  creator: "Pure Ocean Team",
  publisher: "완도고등학교",
  verification: {
    google: "5-NzFHPrzi4fhK9xrM0lBxoa5LdAG9qkpYqrE8Kl_Zc",
  },
  metadataBase: new URL('https://xn--ox6bo4n.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "Pure-Ocean Project - AI 챗봇",
    description: "완도고등학교 Pure-Ocean Project를 위한 소크라테스식 AI 코칭 챗봇. 해양 환경 보호 프로젝트 진행을 위한 팀워크 및 학습 지원 플랫폼.",
    url: 'https://xn--ox6bo4n.com',
    siteName: 'Pure-Ocean Project',
    locale: 'ko_KR',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Pure-Ocean Project AI 챗봇',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Pure-Ocean Project - AI 챗봇",
    description: "완도고등학교 Pure-Ocean Project를 위한 소크라테스식 AI 코칭 챗봇",
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  category: 'education',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <Navigation />
          {children}
        </Providers>
      </body>
    </html>
  );
}