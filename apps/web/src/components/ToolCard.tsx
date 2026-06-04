import Link from 'next/link'

interface ToolCardProps {
  icon: string
  title: string
  description: string
  href: string
  featured?: boolean
}

export default function ToolCard({ icon, title, description, href, featured }: ToolCardProps) {
  return (
    <Link href={href}
      className={`block rounded-xl p-5 border transition-all hover:border-primary-light hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] group
        ${featured ? 'border-primary bg-surface' : 'border-border bg-surface'}`}>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">{icon}</span>
        <h3 className="font-bold text-slate-200 group-hover:text-primary-light transition-colors">{title}</h3>
      </div>
      <p className="text-subtle text-sm leading-relaxed">{description}</p>
      <span className="mt-4 inline-block text-primary-light text-sm font-medium">Use tool →</span>
    </Link>
  )
}
