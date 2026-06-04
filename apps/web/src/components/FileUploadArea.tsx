'use client'
import { useRef } from 'react'

interface FileUploadAreaProps {
  value: string
  onChange: (value: string) => void
  placeholder: string
  accept?: string
  label: string
}

export default function FileUploadArea({ value, onChange, placeholder, accept = '.pem,.crt,.csr,.der,.key', label }: FileUploadAreaProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => onChange(ev.target?.result as string)
    reader.readAsText(file)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-slate-300 text-sm font-medium">{label}</label>
        <button type="button" onClick={() => inputRef.current?.click()}
          className="text-primary-light text-xs hover:underline">Upload file</button>
        <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleFile} />
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={8}
        className="w-full bg-bg border border-border rounded-lg p-3 text-slate-200 text-sm font-mono resize-y focus:outline-none focus:border-primary placeholder:text-muted"
      />
    </div>
  )
}
