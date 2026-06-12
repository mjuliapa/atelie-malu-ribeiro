import { AlunoNav } from '@/components/aluno/AlunoNav'

export default function AlunoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-brand-cream pb-24">
      {children}
      <AlunoNav />
    </div>
  )
}
