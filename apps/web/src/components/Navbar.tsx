import Link from 'next/link'
import ThemeToggle from './ThemeToggle'

export default function Navbar() {
  return (
    <nav className="border-b border-border px-6 py-4 flex items-center justify-between bg-surface">
      <Link href="/" className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-sm">🔒</div>
        <span className="font-bold text-slate-200">SSL Tools</span>
      </Link>
      <div className="flex items-center gap-5">
        <Link href="/#tools" className="text-subtle text-sm hover:text-slate-300 transition-colors">Tools</Link>
        <Link href="/fingerprint" className="text-subtle text-sm hover:text-slate-300 transition-colors">Fingerprint</Link>
        <Link href="/cli" className="text-subtle text-sm hover:text-slate-300 transition-colors">CLI</Link>
        <ThemeToggle />
        <a
          href="https://github.com/nugiabdiansyah/ssl-certificate-tools"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-primary text-white text-sm px-4 py-1.5 rounded-md hover:bg-indigo-500 transition-colors"
        >
          GitHub
        </a>
      </div>
    </nav>
  )
}
