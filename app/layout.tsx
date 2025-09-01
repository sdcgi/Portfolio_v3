
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
      <body>
        <header className="site-header">
          <div className="header-inner">
            <div className="brand"><Link href="/portfolio">Brand Name</Link></div>
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
