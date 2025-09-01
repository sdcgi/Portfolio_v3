
import "./global.css";
import "./variables.css";
import Link from "next/link";

export const metadata = {
  title: "Portfolio",
  description: "Folder-based photography/CGI portfolio"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Material Symbols (Outlined) for LB arrows/close, etc. */}
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:FILL@0..1,GRAD@-25..200,opsz@20..48,wght@100..700"
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