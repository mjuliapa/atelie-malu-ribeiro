'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AlunoNav } from '@/components/aluno/AlunoNav'
import { formatCurrency, formatDate } from '@/lib/utils'

type Peca = {
  id: string
  name: string
  calculated_value: number
  status: string
  piece_date: string
  firing_types: { name: string } | null
}

type ArgilaSale = {
  id: string
  quantity: number
  total_value: number
  sale_date: string
  status?: string
  clay_types: { name: string } | null
}

type Profile = {
  credits: number
  package_type: string | null
}

const PACKAGE_LABEL: Record<string, string> = {
  mensal: 'Pacote Mensal',
  trimestral: 'Pacote Trimestral',
  avulso: 'Avulso',
}

export default function AlunoPecasPage() {
  const [pecas, setPecas] = useState<Peca[]>([])
  const [argilas, setArgilas] = useState<ArgilaSale[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      // createClient() só para auth — permitido
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [pecasRes, argilasRes, profileRes] = await Promise.all([
        fetch(`/api/admin/pecas?student_id=${user.id}`),
        fetch(`/api/admin/argila?student_id=${user.id}`),
        fetch(`/api/admin/form-data`),
      ])

      const pecasData = await pecasRes.json()
      const argilasData = await argilasRes.json()

      // form-data retorna students — filtra o user atual para pegar créditos/pacote
      const formData = await profileRes.json()
      const me = formData?.students?.find((s: any) => s.id === user.id) ?? null

      setPecas(pecasData ?? [])
      setArgilas(argilasData ?? [])
      setProfile(me ? { credits: me.credits ?? 0, package_type: me.package_type ?? null } : null)
      setLoading(false)
    }
    load()
  }, [])

  const abertas = pecas.filter(p => p.status === 'open')
  const historico = pecas.filter(p => p.status !== 'open')
  const totalAberto = abertas.reduce((sum, p) => sum + p.calculated_value, 0)
  const argilasAbertas = argilas.filter(a => !a.status || a.status === 'open')
  const totalArgila = argilasAbertas.reduce((sum, a) => sum + a.total_value, 0)

  const statusLabel: Record<string, string> = {
    open: 'Em aberto', closed: 'Fechada', paid: 'Paga', cancelled: 'Cancelada'
  }
  const statusColor: Record<string, string> = {
    open: 'bg-status-open-bg text-status-open-text',
    closed: 'bg-status-closed-bg text-status-closed-text',
    paid: 'bg-status-paid-bg text-status-paid-text',
    cancelled: 'bg-brand-cream text-brand-muted',
  }

  return (
    <div className="px-4 pb-4 space-y-5">
      <div className="pt-20">
        <h1 className="font-display text-2xl text-brand-text">Minhas peças</h1>
      </div>

      {/* Créditos e pacote */}
      {profile && (
        <div className="bg-white rounded-xl shadow-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-brand-muted mb-0.5">Pacote</p>
            <p className="text-sm font-medium text-brand-text">
              {profile.package_type ? PACKAGE_LABEL[profile.package_type] ?? profile.package_type : 'Sem pacote'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-brand-muted mb-0.5">Créditos</p>
            <p className="font-display text-2xl text-brand-mauve">{profile.credits ?? 0}</p>
          </div>
        </div>
      )}

      {/* Saldo em aberto — peças + argila */}
      {(totalAberto > 0 || totalArgila > 0) && (
        <div className="bg-brand-blush rounded-xl p-4 flex justify-between items-center">
          <div>
            <p className="text-xs text-brand-mauve mb-0.5">Saldo em aberto</p>
            <p className="font-display text-2xl text-brand-mauve">
              {formatCurrency(totalAberto + totalArgila)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-brand-mauve">{abertas.length} peça{abertas.length !== 1 ? 's' : ''}</p>
            {argilasAbertas.length > 0 && (
              <p className="text-xs text-brand-mauve">{argilasAbertas.length} argila{argilasAbertas.length !== 1 ? 's' : ''}</p>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <>
          {pecas.length === 0 && argilas.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center shadow-card">
              <div className="text-4xl mb-3">🏺</div>
              <p className="font-display text-base text-brand-text">Nenhuma peça ainda</p>
              <p className="text-sm text-brand-muted mt-1">Suas peças aparecerão aqui após a Malu cadastrá-las.</p>
            </div>
          ) : (
            <>
              {/* Peças em aberto */}
              {abertas.length > 0 && (
                <div className="space-y-2">
                  <h2 className="font-display text-base text-brand-text">Peças em aberto</h2>
                  <div className="bg-white rounded-xl shadow-card divide-y divide-brand-line">
                    {abertas.map(p => (
                      <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="w-1 self-stretch rounded-full bg-status-open-text flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-brand-text truncate">{p.name}</p>
                          <p className="text-xs text-brand-muted">{formatDate(p.piece_date)}</p>
                        </div>
                        <p className="text-sm font-medium text-brand-text flex-shrink-0">
                          {formatCurrency(p.calculated_value)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Argila em aberto */}
              {argilasAbertas.length > 0 && (
                <div className="space-y-2">
                  <h2 className="font-display text-base text-brand-text">Argila em aberto</h2>
                  <div className="bg-white rounded-xl shadow-card divide-y divide-brand-line">
                    {argilasAbertas.map(a => (
                      <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="w-1 self-stretch rounded-full bg-brand-mauve flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-brand-text truncate">
                            {a.quantity}x {(a.clay_types as any)?.name ?? 'Argila'}
                          </p>
                          <p className="text-xs text-brand-muted">{formatDate(a.sale_date)}</p>
                        </div>
                        <p className="text-sm font-medium text-brand-text flex-shrink-0">
                          {formatCurrency(a.total_value)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Histórico de peças */}
              {historico.length > 0 && (
                <div className="space-y-2">
                  <h2 className="font-display text-base text-brand-text">Histórico</h2>
                  <div className="bg-white rounded-xl shadow-card divide-y divide-brand-line">
                    {historico.map(p => (
                      <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-brand-text truncate">{p.name}</p>
                          <p className="text-xs text-brand-muted">{formatDate(p.piece_date)}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-medium text-brand-text">{formatCurrency(p.calculated_value)}</p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColor[p.status]}`}>
                            {statusLabel[p.status]}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}