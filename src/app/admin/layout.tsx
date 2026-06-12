import { AdminNavBottom } from '@/components/admin/AdminNav'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-brand-cream pb-24">
      {children}
      <AdminNavBottom />
    </div>
  )
}
