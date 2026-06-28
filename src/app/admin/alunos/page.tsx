'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminNavHeader } from '@/components/admin/AdminNav'
import Link from 'next/link'

type Aluna = {
  id: string
  full_name: string
  phone: string | null
  email: string | null
  status: string
  created_at: string
}

export default function AdminAlunosPage() {
  const [alunos, setAlunos] = useState<Aluna[]>([])
  const [filter, setFilter] = useState<'active' | 'paused' |'former'>('active')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      const supabase = createClient()
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, phone, status, created_at')
        .eq('role', 'student')
        .eq('status', filter)
        .order('full_name')

      if (data && data.some(a => !a.full_name)) {
        const ids = data.filter(a => !a.full_name).map(a => a.id)
        const emailRes = await fetch(`/api/admin/emails-by-id?ids=${ids.join(',')}`)
        const emailMap = await emailRes.json()
        const merged = data.map(a => ({ ...a, email: emailMap[a.id] ?? null }))
        setAlunos(merged)
      } else {
        setAlunos((data ?? []).map(a => ({ ...a, email: null })))
      }
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
            <p className="text-sm text-brand-muted">{alunos.length} {statusLabel[filter].toLowerCase()}{alunos.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar aluna pelo nome..."
          className="w-full px-4 py-3 rounded-xl border border-brand-line bg-white text-brand-text focus:outline-none focus:border-brand-mauve" />

        <div className="flex gap-2 overflow-x-auto pb-1">
          {(['active', 'paused', 'former'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                filter === f ? 'bg-brand-ink text-brand-cream' : 'bg-white text-brand-muted border border-brand-line'
              }`}>
              {statusLabel[f]}s
            </button>
          ))}
        </div>
        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-card divide-y divide-brand-line">
            {(() => {
              const filtrados = alunos.filter(a => a.full_name?.toLowerCase().includes(search.toLowerCase()))
              if (!filtrados.length) {
                return (
                  <div className="p-8 text-center">
                    <p className="font-display text-base text-brand-text mb-1">
                      {search ? 'Nenhuma aluna encontrada' : `Nenhuma aluna ${statusLabel[filter].toLowerCase()}`}
                    </p>
                    <p className="text-sm text-brand-muted">{search ? 'Tente outro nome.' : 'Mude de aba para ver outras alunas.'}</p>
                  </div>
                )
              }
              return filtrados.map((aluna) => (

                <Link key={aluna.id} href={`/admin/alunos/${aluna.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-brand-cream transition-colors">
                  <div className="w-9 h-9 rounded-full bg-brand-blush flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-brand-mauve">
                      {aluna.full_name?.charAt(0).toUpperCase() ?? '?'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-brand-text truncate">{aluna.full_name || aluna.email || 'Sem nome'}</p>
                    <p className="text-xs text-brand-muted">{aluna.phone ?? (aluna.email ? aluna.email : 'Sem telefone')}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColor[aluna.status]}`}>
                    {statusLabel[aluna.status]}
                  </span>
                </Link>
              ))
            })()}
          </div>
        )}
      </div>
    </>
  )
}