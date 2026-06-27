import "./globals.css";
import Script from "next/script";

export const metadata = {
  title: "منصة مدرسة أبي دجانة المتوسطة - إدارة المعلمين",
  description: "نظام رسمي لإدارة حضور وغياب وتأخير معلمين مدرسة أبي دجانة المتوسطة بمكة المكرمة بالهوية البصرية الرسمية لوزارة التعليم والتقويم الهجري.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <Script src="https://cdn.lordicon.com/lordicon.js" strategy="afterInteractive" />
      </head>
      <body>
        <div className="root-viewport-wrapper">
          {children}
        </div>
      </body>
    </html>
  );
}
