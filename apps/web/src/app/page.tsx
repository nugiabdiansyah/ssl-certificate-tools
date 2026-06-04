import ToolCard from '@/components/ToolCard'

const tools = [
  { icon: '🔍', title: 'SSL Checker', description: 'Cek status dan detail sertifikat SSL dari domain yang aktif secara langsung.', href: '/ssl-checker' },
  { icon: '📄', title: 'CSR Decoder', description: 'Decode Certificate Signing Request dan tampilkan semua field di dalamnya.', href: '/csr-decoder' },
  { icon: '🔐', title: 'Certificate Decoder', description: 'Parse sertifikat X.509 (PEM/DER) dan tampilkan informasi lengkap.', href: '/cert-decoder' },
  { icon: '🔑', title: 'Key Matcher', description: 'Verifikasi apakah private key cocok dengan sertifikat yang dimiliki.', href: '/key-matcher' },
  { icon: '🔄', title: 'SSL Converter', description: 'Konversi format sertifikat: PEM ↔ DER ↔ PFX/P12 dengan mudah.', href: '/ssl-converter' },
]

export default function Home() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      <div className="text-center mb-16">
        <p className="text-xs text-primary-light tracking-widest font-semibold mb-4 uppercase">SSL Certificate Tools</p>
        <h1 className="text-4xl font-extrabold text-slate-200 mb-4">
          Free SSL Utilities<br />
          <span className="text-primary-light">for Developers</span>
        </h1>
        <p className="text-subtle max-w-md mx-auto mb-8">
          Decode, verify, and convert SSL certificates online. No data stored. Open source.
        </p>
        <div className="flex justify-center gap-3">
          <a href="#tools" className="bg-primary text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-indigo-500 transition-colors">
            Browse Tools
          </a>
          <a href="/cli" className="border border-border text-slate-300 px-6 py-2.5 rounded-lg hover:border-slate-500 transition-colors">
            Install CLI
          </a>
        </div>
      </div>
      <div id="tools" className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tools.slice(0, 4).map((tool) => (
          <ToolCard key={tool.href} {...tool} />
        ))}
        <div className="md:col-span-2">
          <ToolCard {...tools[4]} />
        </div>
      </div>
    </div>
  )
}
