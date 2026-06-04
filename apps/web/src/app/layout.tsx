import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import ThemeProvider from '@/components/ThemeProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SSL Certificate Tools — Free SSL Utilities for Developers',
  description: 'Free, open-source SSL tools: SSL Checker, CSR Decoder, Certificate Decoder, Key Matcher, SSL Converter. No data stored.',
}

// Runs before React hydrates to prevent flash of wrong theme
const antiFlashScript = `(function(){try{var t=localStorage.getItem('ssl-tools-theme')||'dark';document.documentElement.classList.add(t);}catch(e){document.documentElement.classList.add('dark');}})();`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-bg min-h-screen flex flex-col`} suppressHydrationWarning>
        {/* Anti-flash: sets theme class before first paint */}
        <script dangerouslySetInnerHTML={{ __html: antiFlashScript }} />
        <ThemeProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  )
}
