import { createClient } from '@/lib/supabase/server'
import { AdminNavHeader } from '@/components/admin/AdminNav'
import Link from 'next/link'

export default async function AdminAlunosPage() {
  const supabase = await createClient()

  const { data: alunos } = await supabase
    .from('profiles')
    .select('id, full_name, phone, status, created_at')
    .eq('role', 'student')
    .order('full_name')

  const statusLabel = { active: 'Ativa', paused: 'Pausada', former: 'Ex-aluna' }
  const statusColor = {
    active: 'bg-status-paid-bg text-status-paid-text',
    paused: 'bg-status-open-bg text-status-open-text',
    former: 'bg-brand-cream text-brand-muted',
  }

  return (
    <>
      <AdminNavHeader title="Alunas" />
      <div className="px-4 pt-4 pb-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl text-brand-text">Alunas</h1>
            <p className="text-sm text-brand-muted">{alunos?.length ?? 0} cadastradas</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-card divide-y divide-brand-line">
          {!alunos?.length ? (
            <div className="p-8 text-center">
              <p className="font-display text-base text-brand-text mb-1">Nenhuma aluna ainda</p>
              <p className="text-sm text-brand-muted">As alunas aparecem aqui após o primeiro acesso.</p>
            </div>
          ) : (
            alunos.map((aluna) => (
              <Link key={aluna.id} href={`/admin/alunos/${aluna.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-brand-cream transition-colors">
                <div className="w-9 h-9 rounded-full bg-brand-blush flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-medium text-brand-mauve">
                    {aluna.full_name?.charAt(0).toUpperCase() ?? '?'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-brand-text truncate">{aluna.full_name}</p>
                  <p className="text-xs text-brand-muted">{aluna.phone ?? 'Sem telefone'}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColor[aluna.status as keyof typeof statusColor] ?? ''}`}>
                  {statusLabel[aluna.status as keyof typeof statusLabel] ?? aluna.status}
                </span>
              </Link>
            ))
          )}
        </div>
      </div>
    </>
  )
}
