import Link from 'next/link'

interface ToolPageLayoutProps {
  icon: string
  title: string
  description: string
  children: React.ReactNode
}

export default function ToolPageLayout({ icon, title, description, children }: ToolPageLayoutProps) {
  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-center gap-2 mb-8 text-sm text-subtle">
        <Link href="/" className="hover:text-slate-300 transition-colors">SSL Tools</Link>
        <span>/</span>
        <span className="text-primary-light">{title}</span>
      </div>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{icon}</span>
          <h1 className="text-2xl font-bold text-slate-200">{title}</h1>
        </div>
        <p className="text-subtle">{description}</p>
      </div>
      {children}
    </div>
  )
}
