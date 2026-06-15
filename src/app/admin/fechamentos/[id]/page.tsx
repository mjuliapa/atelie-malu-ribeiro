'use client'

import { useState, useEffect } from 'react'
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
  student_id: string
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
  const [pdfLoading, setPdfLoading] = useState(false)

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/admin/fechamentos?id=${id}`)
      if (!res.ok) { setLoading(false); return }
      const data = await res.json()
      if (!data) { setLoading(false); return }

      setFechamento(data.fechamento as Fechamento)
      setItems((data.items ?? []) as Item[])

      if (data.fechamento?.id) {
        const argilaRes = await fetch(`/api/admin/argila?closing_id=${data.fechamento.id}`)
        const argilaData = await argilaRes.json()
        setArgilas(argilaData ?? [])
      }

      setLoading(false)
    }
    load()
  }, [id])

  async function marcarPago() {
    if (!fechamento) return
    await fetch('/api/admin/fechamentos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: fechamento.id,
        status: 'paid',
        paid_at: new Date().toISOString(),
        piece_ids: items.map(i => i.piece_id).filter(Boolean),
        argila_ids: argilas.map(a => a.id),
      }),
    })
    setFechamento(prev => prev ? { ...prev, status: 'paid', paid_at: new Date().toISOString() } : null)
  }

  async function gerarPDFECompartilhar() {
    if (!fechamento) return
    setPdfLoading(true)

    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

      const MAUVE = '#9E6B68'
      const MAUVE_DARK = '#7A4F4C'
      const BLUSH = '#F2EBE6'
      const TEXT = '#3D2B29'
      const MUTED = '#9E8A88'
      const WHITE = '#FFFFFF'
      const PIX = '46.504.315/0001-77'

      const nome = fechamento.profiles?.full_name ?? 'Aluna'
      const phone = fechamento.profiles?.phone?.replace(/\D/g, '')
      const totalPecas = items.reduce((sum, i) => sum + i.value_snapshot, 0)
      const totalArgila = argilas.reduce((sum, a) => sum + a.total_value, 0)

      const pageW = 210
      const margin = 20

      // ── Header ──────────────────────────────────────────────
      doc.setFillColor(MAUVE)
      doc.roundedRect(0, 0, pageW, 38, 0, 0, 'F')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(18)
      doc.setTextColor(WHITE)
      doc.text('Ateliê Malu Ribeiro', pageW / 2, 16, { align: 'center' })

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor('#F0D8D5')
      doc.text('cerâmica artesanal', pageW / 2, 23, { align: 'center' })

      // ── Subtítulo ────────────────────────────────────────────
      doc.setFillColor(BLUSH)
      doc.rect(0, 38, pageW, 18, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(MAUVE_DARK)
      doc.text(`Fechamento — ${fechamento.reference_month}`, pageW / 2, 47, { align: 'center' })
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(MUTED)
      doc.text(nome, pageW / 2, 53, { align: 'center' })

      let y = 68

      // ── Seção Peças ──────────────────────────────────────────
      if (items.length > 0) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.setTextColor(MUTED)
        doc.text('PEÇAS', margin, y)
        y += 5

        doc.setDrawColor('#E8DADA')
        doc.setLineWidth(0.3)

        for (const item of items) {
          doc.setFillColor(WHITE)
          doc.rect(margin, y, pageW - margin * 2, 10, 'F')
          doc.line(margin, y + 10, pageW - margin, y + 10)

          doc.setFont('helvetica', 'normal')
          doc.setFontSize(9)
          doc.setTextColor(TEXT)
          doc.text(item.pieces?.name ?? 'Peça', margin + 2, y + 6.5)

          doc.setTextColor(MUTED)
          doc.setFontSize(8)
          doc.text(formatDate(item.pieces?.piece_date ?? ''), margin + 2, y + 9.5)

          doc.setFont('helvetica', 'bold')
          doc.setFontSize(9)
          doc.setTextColor(TEXT)
          doc.text(formatCurrency(item.value_snapshot), pageW - margin - 2, y + 6.5, { align: 'right' })

          y += 11
        }

        // subtotal peças
        doc.setFillColor(BLUSH)
        doc.rect(margin, y, pageW - margin * 2, 8, 'F')
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(MUTED)
        doc.text('Subtotal peças', margin + 2, y + 5.5)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(MAUVE_DARK)
        doc.text(formatCurrency(totalPecas), pageW - margin - 2, y + 5.5, { align: 'right' })
        y += 14
      }

      // ── Seção Argila ─────────────────────────────────────────
      if (argilas.length > 0) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.setTextColor(MUTED)
        doc.text('ARGILA', margin, y)
        y += 5

        for (const a of argilas) {
          doc.setFillColor(WHITE)
          doc.rect(margin, y, pageW - margin * 2, 10, 'F')
          doc.setDrawColor('#E8DADA')
          doc.line(margin, y + 10, pageW - margin, y + 10)

          doc.setFont('helvetica', 'normal')
          doc.setFontSize(9)
          doc.setTextColor(TEXT)
          doc.text(`${a.quantity}x ${(a.clay_types as any)?.name ?? 'Argila'}`, margin + 2, y + 6.5)

          doc.setTextColor(MUTED)
          doc.setFontSize(8)
          doc.text(formatDate(a.sale_date), margin + 2, y + 9.5)

          doc.setFont('helvetica', 'bold')
          doc.setFontSize(9)
          doc.setTextColor(TEXT)
          doc.text(formatCurrency(a.total_value), pageW - margin - 2, y + 6.5, { align: 'right' })

          y += 11
        }

        doc.setFillColor(BLUSH)
        doc.rect(margin, y, pageW - margin * 2, 8, 'F')
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(MUTED)
        doc.text('Subtotal argila', margin + 2, y + 5.5)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(MAUVE_DARK)
        doc.text(formatCurrency(totalArgila), pageW - margin - 2, y + 5.5, { align: 'right' })
        y += 14
      }

      // ── Total ────────────────────────────────────────────────
      doc.setFillColor(MAUVE)
      doc.roundedRect(margin, y, pageW - margin * 2, 14, 3, 3, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(WHITE)
      doc.text('Total', margin + 6, y + 9.5)
      doc.text(formatCurrency(fechamento.total_value), pageW - margin - 6, y + 9.5, { align: 'right' })
      y += 22

      // ── PIX ──────────────────────────────────────────────────
      doc.setFillColor(BLUSH)
      doc.roundedRect(margin, y, pageW - margin * 2, 16, 3, 3, 'F')
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(MUTED)
      doc.text('Chave PIX', pageW / 2, y + 6, { align: 'center' })
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(MAUVE_DARK)
      doc.text(PIX, pageW / 2, y + 13, { align: 'center' })
      y += 24

      // ── Rodapé ───────────────────────────────────────────────
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(MUTED)
      doc.text('Ateliê Malu Ribeiro · cerâmica artesanal', pageW / 2, y + 6, { align: 'center' })

      // ── Compartilhar ─────────────────────────────────────────
      const pdfBlob = doc.output('blob')
      const blobUrl = URL.createObjectURL(pdfBlob)

      // abre o PDF em nova aba (usuário salva/compartilha)
      window.open(blobUrl, '_blank')

      // WhatsApp com aviso de que o PDF está aberto
      const msg = `Olá ${nome}! 🏺\n\nSegue o fechamento do Ateliê Malu Ribeiro referente a ${fechamento.reference_month}.\n\nO PDF foi gerado — por favor salve e compartilhe aqui! 😊\n\n*Total: ${formatCurrency(fechamento.total_value)}*\nPIX: ${PIX}`
      const waUrl = phone
        ? `https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`
        : `https://wa.me/?text=${encodeURIComponent(msg)}`
      setTimeout(() => window.open(waUrl, '_blank'), 800)

    } catch (err) {
      console.error('Erro ao gerar PDF:', err)
      alert('Não foi possível gerar o PDF. Tente novamente.')
    } finally {
      setPdfLoading(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-brand-muted">Carregando...</div>
  if (!fechamento) return <div className="p-8 text-center text-brand-muted">Fechamento não encontrado.</div>

  const nome = fechamento.profiles?.full_name ?? 'Aluna'
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
            <p className="text-xs font-medium tracking-widest uppercase text-brand-muted px-1">Argila</p> text-brand-muted px-1">Peças</p> text-brand-muted px-1">Peças</p>
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
            <p className="text-xs font-medium tracking-widest uppercase text-brand-muted px-1">Argila</p> text-brand-muted px-1">Peças</p>