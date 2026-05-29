import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stock Tracker 📡 | ลงทุนหุ้นอเมริกา",
  description: "ติดตามหุ้น US จาก YouTube channel ลงทุนหุ้นอเมริกา",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
