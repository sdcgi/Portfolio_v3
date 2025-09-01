// app/layout.tsx
import "./global.css";     // ✅ singular filename
import "./variables.css";
import "./lightbox.css";   // ✅ include the lightbox styles at root
import Link from "next/link";

export const metadata = {
  title: "Portfolio",
  description: "Folder-based photography/CGI portfolio",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Material Symbols (Outlined) — official variable font URL */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
      </head>
      <body>
        <header className="site-header">
          <div className="header-inner">
            <div className="brand">
              <Link href="/portfolio">Brand Name</Link>
            </div>
            <nav className="main-nav">
              <Link href="/portfolio">Stills</Link>
              <Link href="/motion">Motion</Link>
              <Link href="/about">About</Link>
              <Link href="/contact">Contact</Link>
            </nav>
          </div>
        </header>
        <main className="site-main">{children}</main>
      </body>
    </html>
  );
}
