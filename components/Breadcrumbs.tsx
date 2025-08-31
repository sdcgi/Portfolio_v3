
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Breadcrumbs({ baseLabel }: { baseLabel: string }) {
  const pathname = usePathname();
  const parts = pathname.split('/').filter(Boolean);
  const crumbs: { href: string; label: string }[] = [];
  let href = '';
  for (const p of parts) {
    href += '/' + p;
    crumbs.push({ href, label: decodeURIComponent(p) });
  }
  return (
    <div className="breadcrumbs">
      <Link href="/">Home</Link>
      {crumbs.map((c, i) => (
        <span key={c.href}> / {i === 0 ? <Link href={c.href}>{baseLabel}</Link> : <Link href={c.href}>{c.label}</Link>}</span>
      ))}
    </div>
  );
}
