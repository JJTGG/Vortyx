import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Vortyx",
  description: "An independent AI proactivity engine.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}