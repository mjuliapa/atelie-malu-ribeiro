import { AlunoNav } from '@/components/aluno/AlunoNav'

export default function AlunoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-brand-cream pt-20 pb-24">
      <AlunoNav />
      {children}
    </div>
  )
}
