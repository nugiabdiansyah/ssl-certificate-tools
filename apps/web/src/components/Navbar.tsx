import Link from 'next/link'

export default function Navbar() {
  return (
    <nav className="border-b border-border px-6 py-4 flex items-center justify-between">
      <Link href="/" className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-sm">🔒</div>
        <span className="font-bold text-slate-200">SSL Tools</span>
      </Link>
      <div className="flex items-center gap-6">
        <Link href="/#tools" className="text-subtle text-sm hover:text-slate-300 transition-colors">Tools</Link>
        <Link href="/cli" className="text-subtle text-sm hover:text-slate-300 transition-colors">CLI</Link>
        <a href="https://github.com/yourusername/ssl-certificate-tools" target="_blank" rel="noopener noreferrer"
          className="bg-primary text-white text-sm px-4 py-1.5 rounded-md hover:bg-indigo-500 transition-colors">
          GitHub
        </a>
      </div>
    </nav>
  )
}
