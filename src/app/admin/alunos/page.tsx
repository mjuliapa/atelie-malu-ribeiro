'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminNavHeader } from '@/components/admin/AdminNav'
import Link from 'next/link'

type Aluna = {
  id: string
  full_name: string
  phone: string | null
  status: string
  created_at: string
}

export default function AdminAlunosPage() {
  const [alunos, setAlunos] = useState<Aluna[]>([])
  const [filter, setFilter] = useState<'active' | 'all'>('active')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const supabase = createClient()
      let query = supabase
        .from('profiles')
        .select('id, full_name, phone, status, created_at')
        .eq('role', 'student')
        .order('full_name')

      if (filter === 'active') query = query.eq('status', 'active')

      const { data } = await query
      setAlunos(data ?? [])
      setLoading(false)
    }
    load()
  }, [filter])

  const statusLabel: Record<string, string> = { active: 'Ativa', paused: 'Pausada', former: 'Ex-aluna' }
  const statusColor: Record<string, string> = {
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
            <p className="text-sm text-brand-muted">{alunos.length} {filter === 'active' ? 'ativas' : 'cadastradas'}</p>
          </div>
        </div>

        <div className="flex gap-2">
          {(['active', 'all'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                filter === f ? 'bg-brand-ink text-brand-cream' : 'bg-white text-brand-muted border border-brand-line'
              }`}>
              {f === 'active' ? 'Ativas' : 'Todas'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-card divide-y divide-brand-line">
            {!alunos.length ? (
              <div className="p-8 text-center">
                <p className="font-display text-base text-brand-text mb-1">Nenhuma aluna encontrada</p>
                <p className="text-sm text-brand-muted">As alunas aparecem aqui após o primeiro acesso.</p>
              </div>
            ) : (
              alunos.map((aluna) => (
                <Link key={aluna.id} href={`/admin/alunos/${aluna.id}`}
                  className={`flex items-center gap-3 px-4 py-3 hover:bg-brand-cream transition-colors ${aluna.status !== 'active' ? 'opacity-60' : ''}`}>
                  <div className="w-9 h-9 rounded-full bg-brand-blush flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-brand-mauve">
                      {aluna.full_name?.charAt(0).toUpperCase() ?? '?'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-brand-text truncate">{aluna.full_name}</p>
                    <p className="text-xs text-brand-muted">{aluna.phone ?? 'Sem telefone'}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColor[aluna.status] ?? ''}`}>
                    {statusLabel[aluna.status] ?? aluna.status}
                  </span>
                </Link>
              ))
            )}
          </div>
        )}
      </div>
    </>
  )
}