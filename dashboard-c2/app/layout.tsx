import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FRONTIER-OS C4ISR | Unified Defense Dashboard",
  description: "Homeland Defense and Border Protection System of Systems Tactical Dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-frontier-darkest text-slate-100 min-h-screen overflow-hidden antialiased">
        {children}
      </body>
    </html>
  );
}

