import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
// import { GeistMono } from 'geist/font/mono'
import './globals.css'

export const metadata: Metadata = {
  title: 'Plataforma de Microservicios',
  description: 'Aplicación para crear, ejecutar y gestionar microservicios con Docker.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body
        className={`font-sans ${GeistSans.variable} antialiased bg-gray-50 text-gray-900`}
      >
        {children}
      </body>
    </html>
  )
}
