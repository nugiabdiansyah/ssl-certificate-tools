interface ResultRow { label: string; value: string | string[] }

interface ResultCardProps {
  status?: 'success' | 'error' | 'warning'
  statusText?: string
  rows: ResultRow[]
}

export default function ResultCard({ status, statusText, rows }: ResultCardProps) {
  const statusColor = { success: 'text-green-400', error: 'text-red-400', warning: 'text-yellow-400' }

  return (
    <div className="bg-surface border border-border rounded-xl p-5 mt-4">
      {statusText && (
        <div className={`flex items-center gap-2 mb-4 pb-4 border-b border-border font-semibold ${statusColor[status ?? 'success']}`}>
          <span>{status === 'success' ? '✓' : status === 'error' ? '✗' : '⚠'}</span>
          {statusText}
        </div>
      )}
      <dl className="grid grid-cols-2 gap-3">
        {rows.map(({ label, value }) => {
          const isLong = typeof value === 'string' && value.length > 50
          const fullWidth = Array.isArray(value) || isLong
          return (
            <div key={label} className={fullWidth ? 'col-span-2' : ''}>
              <dt className="text-muted text-xs mb-1">{label}</dt>
              <dd className="text-slate-200 text-sm break-all">
                {Array.isArray(value)
                  ? <div className="flex flex-wrap gap-1">{value.map(v => <span key={v} className="bg-border text-primary-light text-xs px-2 py-0.5 rounded">{v}</span>)}</div>
                  : value
                }
              </dd>
            </div>
          )
        })}
      </dl>
    </div>
  )
}
