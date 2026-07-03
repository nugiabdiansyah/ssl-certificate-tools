import ToolCard from '@/components/ToolCard'

const tools = [
  { icon: '🔍', title: 'SSL Checker',           description: 'Check SSL certificate status and details for any live domain.', href: '/ssl-checker' },
  { icon: '🔏', title: 'Fingerprint',            description: 'Get SHA-1, SHA-256, and Proxmox/PBS fingerprint — live check or file upload.', href: '/fingerprint' },
  { icon: '📄', title: 'CSR Decoder',            description: 'Decode a Certificate Signing Request and inspect all its fields.', href: '/csr-decoder' },
  { icon: '🧾', title: 'CSR Creator',            description: 'Create a CSR with a new private key or an uploaded private key.', href: '/csr-creator' },
  { icon: '🔐', title: 'Certificate Decoder',    description: 'Parse an X.509 certificate (PEM/DER) and display all details.', href: '/cert-decoder' },
  { icon: '🔑', title: 'Key Matcher',            description: 'Verify whether a private key matches a given certificate.', href: '/key-matcher' },
  { icon: '🔄', title: 'SSL Converter',          description: 'Convert certificate formats: PEM ↔ DER ↔ PFX/P12 ↔ P7B.', href: '/ssl-converter' },
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
        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
          {tools.slice(4).map((tool) => (
            <ToolCard key={tool.href} {...tool} />
          ))}
        </div>
      </div>
    </div>
  )
}
