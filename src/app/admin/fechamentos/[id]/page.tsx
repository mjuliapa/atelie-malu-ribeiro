'use client'

import { useState, useEffect } from 'react'
import { AdminNavHeader } from '@/components/admin/AdminNav'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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
  piece_id: string
  pieces: { name: string; piece_date: string } | null
}

type ArgilaSale = {
  id: string
  quantity: number
  total_value: number
  sale_date: string
  clay_types: { name: string } | null
}

export default function FechamentoDetailPage() {
  const { id } = useParams()
  const [fechamento, setFechamento] = useState<Fechamento | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [argilas, setArgilas] = useState<ArgilaSale[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [{ data: f }, { data: i }] = await Promise.all([
        supabase.from('monthly_closings')
          .select('*, profiles:student_id(full_name, phone)')
          .eq('id', id).single(),
        supabase.from('closing_items')
          .select('*, pieces(name, piece_date)')
          .eq('closing_id', id).order('id'),
      ])

      setFechamento(f as unknown as Fechamento)
      setItems((i as unknown as Item[]) ?? [])

      if (f?.student_id) {
        const res = await fetch(`/api/admin/argila?student_id=${f.student_id}&status=closed`)
        const data = await res.json()
        setArgilas(data ?? [])
      }

      setLoading(false)
    }
    load()
  }, [id])

  async function marcarPago() {
    const supabase = createClient()
    await supabase.from('monthly_closings')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', id)
    await supabase.from('pieces')
      .update({ status: 'paid' })
      .in('id', items.map(i => i.piece_id).filter(Boolean))
    await supabase.from('clay_sales')
      .update({ status: 'paid' })
      .in('id', argilas.map(a => a.id))
    setFechamento(prev => prev ? { ...prev, status: 'paid' } : null)
  }

  function compartilharWhatsApp() {
    if (!fechamento) return
    const nome = (fechamento.profiles as any)?.full_name ?? 'Aluna'
    const phone = (fechamento.profiles as any)?.phone?.replace(/\D/g, '')

    const linhasPecas = items.map(i =>
      `• ${i.pieces?.name ?? 'Peça'} ............. ${formatCurrency(i.value_snapshot)}`
    ).join('\n')

    const linhasArgila = argilas.map(a =>
      `• ${a.quantity}x ${(a.clay_types as any)?.name ?? 'Argila'} ............. ${formatCurrency(a.total_value)}`
    ).join('\n')

    const secoes = []
    if (linhasPecas) secoes.push(linhasPecas)
    if (linhasArgila) secoes.push(linhasArgila)

    const msg = `*Ateliê Malu Ribeiro*\nFechamento ${fechamento.reference_month}\n*${nome}*\n\n${secoes.join('\n')}\n\n*Total: ${formatCurrency(fechamento.total_value)}*\n\nPIX: 46.504.315/0001-77`
    const url = phone
      ? `https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')
  }

  if (loading) return <div className="p-8 text-center text-brand-muted">Carregando...</div>
  if (!fechamento) return <div className="p-8 text-center text-brand-muted">Fechamento não encontrado.</div>

  const nome = (fechamento.profiles as any)?.full_name ?? 'Aluna'
  const totalPecas = items.reduce((sum, i) => sum + i.value_snapshot, 0)
  const totalArgila = argilas.reduce((sum, a) => sum + a.total_value, 0)

  return (
    <>
      <AdminNavHeader title="Fechamento" showBack />
      <div className="px-4 pt-4 pb-6 space-y-4">
        <div>
          <h1 className="font-display text-2xl text-brand-text">{nome}</h1>
          <p className="text-sm text-brand-muted capitalize">{fechamento.reference_month}</p>
        </div>

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

        {items.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium tracking-widest uppercase text-brand-muted px-1">Peças</p>
            <div className="bg-white rounded-xl shadow-card divide-y divide-brand-line">
              {items.map(item => (
                <div key={item.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-brand-text">{item.pieces?.name}</p>
                    <p className="text-xs text-brand-muted">{formatDate(item.pieces?.piece_date ?? '')}</p>
                  </div>
                  <p className="text-sm font-medium text-brand-text">{formatCurrency(item.value_snapshot)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {argilas.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium tracking-widest uppercase text-brand-muted px-1">Argila</p>
            <div className="bg-white rounded-xl shadow-card divide-y divide-brand-line">
              {argilas.map(a => (
                <div key={a.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-brand-text">
                      {a.quantity}x {(a.clay_types as any)?.name ?? 'Argila'}
                    </p>
                    <p className="text-xs text-brand-muted">{formatDate(a.sale_date)}</p>
                  </div>
                  <p className="text-sm font-medium text-brand-text">{formatCurrency(a.total_value)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-card divide-y divide-brand-line">
          {totalPecas > 0 && (
            <div className="flex justify-between px-4 py-3">
              <p className="text-sm text-brand-muted">Peças</p>
              <p className="text-sm font-medium text-brand-text">{formatCurrency(totalPecas)}</p>
            </div>
          )}
          {totalArgila > 0 && (
            <div className="flex justify-between px-4 py-3">
              <p className="text-sm text-brand-muted">Argila</p>
              <p className="text-sm font-medium text-brand-text">{formatCurrency(totalArgila)}</p>
            </div>
          )}
          <div className="flex items-center justify-between px-4 py-3 bg-brand-cream rounded-b-xl">
            <p className="font-display text-base text-brand-text">Total</p>
            <p className="font-display text-xl text-brand-text">{formatCurrency(fechamento.total_value)}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-card px-4 py-3 text-center">
          <p className="text-xs text-brand-muted mb-1">Chave PIX</p>
          <p className="text-sm font-medium text-brand-text">46.504.315/0001-77</p>
        </div>

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