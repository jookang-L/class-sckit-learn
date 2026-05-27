import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sckit-Learn Lab",
  description: "고등학생 대상 sklearn 실습 플랫폼",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="dark">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
