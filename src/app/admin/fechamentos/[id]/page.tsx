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
  profiles: { full_name: string; phone: string | null; package_type: string | null }
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
      const packageValue = fechamento.total_value - totalPecas - totalArgila
      const packageLabel = fechamento.profiles?.package_type === 'torno' ? 'Pacote Torno' : 'Pacote Manual'
      const pageW = 210
      const margin = 20

      const logoBase64 = await fetch('/logo.png')
        .then(r => r.blob())
        .then(blob => new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve((reader.result as string).split(',')[1])
          reader.readAsDataURL(blob)
        }))

      doc.setFillColor(MAUVE)
      doc.roundedRect(0, 0, pageW, 42, 0, 0, 'F')
      doc.addImage(logoBase64, 'PNG', pageW / 2 - 30, 6, 60, 28)

      doc.setFillColor(BLUSH)
      doc.rect(0, 42, pageW, 18, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(MAUVE_DARK)
      doc.text('Fechamento - ' + fechamento.reference_month, pageW / 2, 51, { align: 'center' })
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(MUTED)
      doc.text(nome, pageW / 2, 57, { align: 'center' })

      let y = 72

      if (packageValue > 0) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.setTextColor(MUTED)
        doc.text('PACOTE', margin, y)
        y += 5
        doc.setFillColor(WHITE)
        doc.rect(margin, y, pageW - margin * 2, 10, 'F')
        doc.setDrawColor('#E8DADA')
        doc.setLineWidth(0.3)
        doc.line(margin, y + 10, pageW - margin, y + 10)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(TEXT)
        doc.text(packageLabel, margin + 2, y + 6.5)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(TEXT)
        doc.text(formatCurrency(packageValue), pageW - margin - 2, y + 6.5, { align: 'right' })
        y += 11
        doc.setFillColor(BLUSH)
        doc.rect(margin, y, pageW - margin * 2, 8, 'F')
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(MUTED)
        doc.text('Subtotal pacote', margin + 2, y + 5.5)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(MAUVE_DARK)
        doc.text(formatCurrency(packageValue), pageW - margin - 2, y + 5.5, { align: 'right' })
        y += 14
      }

      if (items.length > 0) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.setTextColor(MUTED)
        doc.text('PECAS', margin, y)
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
          doc.text(item.pieces?.name ?? 'Peca', margin + 2, y + 6.5)
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(9)
          doc.setTextColor(TEXT)
          doc.text(formatCurrency(item.value_snapshot), pageW - margin - 2, y + 6.5, { align: 'right' })
          y += 11
        }
        doc.setFillColor(BLUSH)
        doc.rect(margin, y, pageW - margin * 2, 8, 'F')
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(MUTED)
        doc.text('Subtotal pecas', margin + 2, y + 5.5)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(MAUVE_DARK)
        doc.text(formatCurrency(totalPecas), pageW - margin - 2, y + 5.5, { align: 'right' })
        y += 14
      }

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
          const clayName = (a.clay_types as any)?.name ?? 'Argila'
          doc.text(a.quantity + 'x ' + clayName, margin + 2, y + 6.5)
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

      doc.setFillColor(MAUVE)
      doc.roundedRect(margin, y, pageW - margin * 2, 14, 3, 3, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(WHITE)
      doc.text('Total', margin + 6, y + 9.5)
      doc.text(formatCurrency(fechamento.total_value), pageW - margin - 6, y + 9.5, { align: 'right' })
      y += 22

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

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(MUTED)
      doc.text('Atelie Malu Ribeiro - ceramica artesanal', pageW / 2, y + 6, { align: 'center' })

      const pdfBlob = doc.output('blob')
      const blobUrl = URL.createObjectURL(pdfBlob)
      window.open(blobUrl, '_blank')

      const msg = 'Ola ' + nome + '!\n\nSegue o fechamento do Atelie Malu Ribeiro referente a ' + fechamento.reference_month + '.\n\nO PDF foi gerado - por favor salve e compartilhe aqui!\n\nTotal: ' + formatCurrency(fechamento.total_value) + '\nPIX: ' + PIX
      const waUrl = phone
        ? 'https://wa.me/55' + phone + '?text=' + encodeURIComponent(msg)
        : 'https://wa.me/?text=' + encodeURIComponent(msg)
      setTimeout(() => window.open(waUrl, '_blank'), 800)

    } catch (err) {
      console.error('Erro ao gerar PDF:', err)
      alert('Nao foi possivel gerar o PDF. Tente novamente.')
    } finally {
      setPdfLoading(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-brand-muted">Carregando...</div>
  if (!fechamento) return <div className="p-8 text-center text-brand-muted">Fechamento nao encontrado.</div>

  const nome = fechamento.profiles?.full_name ?? 'Aluna'
  const totalPecas = items.reduce((sum, i) => sum + i.value_snapshot, 0)
  const totalArgila = argilas.reduce((sum, a) => sum + a.total_value, 0)

  return (
    <>
      <AdminNavHeader title="Fechamento" showBack />
      <div className="px-4 pt-4 pb-6 space-y-4">
        <div>
          <h1 className="font-display text-2xl text-brand-text">{nome}</h1>
          <p className="text-sm text-brand-muted">{fechamento.reference_month}</p>
        </div>
        <div className={`rounded-xl px-4 py-3 flex items-center justify-between ${fechamento.status === 'paid' ? 'bg-status-paid-bg' : 'bg-status-open-bg'}`}>
          <p className={`text-sm font-medium ${fechamento.status === 'paid' ? 'text-status-paid-text' : 'text-status-open-text'}`}>
            {fechamento.status === 'paid' ? 'Pago' : 'Aguardando pagamento'}
          </p>
          {fechamento.paid_at && (
            <p className="text-xs text-status-paid-text">{formatDate(fechamento.paid_at)}</p>
          )}
        </div>
        {items.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium tracking-widest uppercase text-brand-muted px-1">Pecas</p>
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
              <p className="text-sm text-brand-muted">Pecas</p>
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
          <button
            onClick={gerarPDFECompartilhar}
            disabled={pdfLoading}
            className="w-full py-3 bg-[#25D366] text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {pdfLoading ? 'Gerando PDF...' : 'Gerar PDF e enviar via WhatsApp'}
          </button>
          {fechamento.status !== 'paid' && (
            <button
              onClick={marcarPago}
              className="w-full py-3 bg-brand-ink text-brand-cream rounded-xl font-medium text-sm"
            >
              Marcar como pago
            </button>
          )}
        </div>
      </div>
    </>
  )
}