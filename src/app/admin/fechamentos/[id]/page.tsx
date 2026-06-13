'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminNavHeader } from '@/components/admin/AdminNav'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useParams } from 'next/navigation'

type Fechamento = {
  id: string
  reference_month: string
  total_value: number
  status: string
  created_at: string
  paid_at: string | null
  profiles: { full_name: string; phone: string | null }
}

type Item = {
  id: string
  value_snapshot: number
  pieces: { name: string; piece_date: string }
}

export default function FechamentoDetailPage() {
  const { id } = useParams()
  const [fechamento, setFechamento] = useState<Fechamento | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const [{ data: f }, { data: i }] = await Promise.all([
        supabase.from('monthly_closings').select('*, profiles:student_id(full_name, phone)').eq('id', id).single(),
        supabase.from('closing_items').select('*, pieces(name, piece_date)').eq('closing_id', id).order('id'),
      ])
      setFechamento(f as unknown as Fechamento)
      setItems(i as unknown as Item[] ?? [])
      setLoading(false)
    }
    load()
  }, [id])

  async function marcarPago() {
    await supabase.from('monthly_closings').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', id)
    await supabase.from('pieces').update({ status: 'paid' })
      .in('id', items.map(i => i.pieces ? (i as unknown as { piece_id: string }).piece_id : null).filter(Boolean))
    setFechamento(prev => prev ? { ...prev, status: 'paid' } : null)
  }

  function compartilharWhatsApp() {
    if (!fechamento) return
    const nome = (fechamento.profiles as unknown as { full_name: string })?.full_name ?? 'Aluna'
    const linhas = items.map(i => `• ${i.pieces?.name} ............. ${formatCurrency(i.value_snapshot)}`).join('\n')
    const msg = `*Ateliê Malu Ribeiro*\nFechamento ${fechamento.reference_month}\n*${nome}*\n\n${linhas}\n\n*Total: ${formatCurrency(fechamento.total_value)}*\n\nPIX: 46.504.315/0001-77`
    const phone = (fechamento.profiles as unknown as { phone: string | null })?.phone?.replace(/\D/g, '')
    const url = phone ? `https://wa.me/55${phone}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')
  }

  if (loading) return <div className="p-8 text-center text-brand-muted">Carregando...</div>
  if (!fechamento) return <div className="p-8 text-center text-brand-muted">Fechamento não encontrado.</div>

  const nome = (fechamento.profiles as unknown as { full_name: string })?.full_name ?? 'Aluna'

  return (
    <>
      <AdminNavHeader title="Fechamento" showBack />
      <div className="px-4 pt-4 pb-6 space-y-4">
        {/* Cabeçalho */}
        <div>
          <h1 className="font-display text-2xl text-brand-text">{nome}</h1>
          <p className="text-sm text-brand-muted capitalize">{fechamento.reference_month}</p>
        </div>

        {/* Status */}
        <div className={`rounded-xl px-4 py-3 flex items-center justify-between ${
          fechamento.status === 'paid' ? 'bg-status-paid-bg' : 'bg-status-open-bg'
        }`}>
          <p className={`text-sm font-medium ${
            fechamento.status === 'paid' ? 'text-status-paid-text' : 'text-status-open-text'
          }`}>
            {fechamento.status === 'paid' ? '✓ Pago' : 'Aguardando pagamento'}
          </p>
          {fechamento.paid_at && (
            <p className="text-xs text-status-paid-text">{formatDate(fechamento.paid_at)}</p>
          )}
        </div>

        {/* Itens */}
        <div className="bg-white rounded-xl shadow-card divide-y divide-brand-line">
          {items.map(item => (
            <div key={item.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-brand-text">{item.pieces?.name}</p>
                <p className="text-xs text-brand-muted">{formatDate(item.pieces?.piece_date)}</p>
              </div>
              <p className="text-sm font-medium text-brand-text">{formatCurrency(item.value_snapshot)}</p>
            </div>
          ))}
          <div className="flex items-center justify-between px-4 py-3 bg-brand-cream">
            <p className="font-display text-base text-brand-text">Total</p>
            <p className="font-display text-xl text-brand-text">{formatCurrency(fechamento.total_value)}</p>
          </div>
        </div>

        {/* PIX */}
        <div className="bg-white rounded-xl shadow-card px-4 py-3 text-center">
          <p className="text-xs text-brand-muted mb-1">Chave PIX</p>
          <p className="text-sm font-medium text-brand-text">46.504.315/0001-77</p>
        </div>

        {/* Ações */}
        <div className="space-y-2">
          <button onClick={compartilharWhatsApp}
            className="w-full py-3 bg-[#25D366] text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2">
            📱 Enviar via WhatsApp
          </button>

          {fechamento.status !== 'paid' && (
            <button onClick={marcarPago}
              className="w-full py-3 bg-brand-ink text-brand-cream rounded-xl font-medium text-sm">
              ✓ Marcar como pago
            </button>
          )}
        </div>
      </div>
    </>
  )
}
