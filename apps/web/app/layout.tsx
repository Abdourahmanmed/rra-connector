import { Geist, Geist_Mono } from "next/font/google"

import "./globals.css"
import { AppHeader, AppShell } from "@/src/components/layout"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/src/lib/utils"

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", geist.variable)}
    >
      <body>
        <ThemeProvider>
          <AppShell>
            <AppHeader />
            {children}
          </AppShell>
        </ThemeProvider>
      </body>
    </html>
  )
}
