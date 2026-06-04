'use client'
import { useState } from 'react'

export default function CliHint({ command }: { command: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-6 bg-bg border border-border rounded-lg overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 text-left flex items-center justify-between text-subtle text-sm hover:text-slate-300 transition-colors">
        <span>CLI equivalent</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-4 pb-3 border-t border-border">
          <code className="text-primary-light text-sm font-mono">{command}</code>
        </div>
      )}
    </div>
  )
}
