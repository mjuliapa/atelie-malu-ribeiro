'use client'

import { useState, useEffect } from 'react'
import { AdminNavHeader } from '@/components/admin/AdminNav'
import { formatCurrency, formatDate } from '@/lib/utils'

type Student = { id: string; full_name: string }

type RelatorioData = {
  periodo: { from: string; to: string }
  pecas: any[]
  argilas: any[]
  pacotes: any[]
  fechamentos: any[]
  resumoPorAluna: {
    student_id: string
    nome: string
    totalPecas: number
    totalArgila: number
    totalPacotes: number
    totalGeral: number
    totalPago: number
    totalAberto: number
    totalAguardando: number
    totalFechamento: number
  }[]
  porCanal: Record<string, { aguardando: number; fechamento: number; pago: number; total: number }>
  totalGeral: {
    pecas: number
    argila: number
    pacotes: number
    custos: number
    pago: number
    aberto: number
    fechamento: number
    aguardando: number
    total: number
  }
}

function getFirstDayOfMonth() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
}
function getLastDayOfMonth() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
}

export default function RelatoriosPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [tipo, setTipo] = useState<'geral' | 'aluna'>('geral')
  const [studentId, setStudentId] = useState('')
  const [from, setFrom] = useState(getFirstDayOfMonth())
  const [to, setTo] = useState(getLastDayOfMonth())
  const [data, setData] = useState<RelatorioData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/admin/form-data')
      .then(r => r.json())
      .then(({ students }) => setStudents(students))
  }, [])

  async function handleGerar() {
    setLoading(true)
    const params = new URLSearchParams({ from, to })
    if (tipo === 'aluna' && studentId) params.set('student_id', studentId)
    const res = await fetch(`/api/admin/relatorios?${params}`)
    const json = await res.json()
    setData(json)
    setLoading(false)
  }

  async function handleGerarPDF() {
    if (!data) return
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const MAUVE = '#9E6B68'
    const MAUVE_DARK = '#7A4F4C'
    const BLUSH = '#F2EBE6'
    const TEXT = '#3D2B29'
    const MUTED = '#9E8A88'
    const WHITE = '#FFFFFF'
    const pageW = 210
    const margin = 20
    let y = 0

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
    const tituloRelatorio = tipo === 'geral' ? 'Relatorio geral' : `Relatorio - ${students.find(s => s.id === studentId)?.full_name ?? ''}`
    doc.text(tituloRelatorio, pageW / 2, 51, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(MUTED)
    doc.text(`${formatDate(from)} a ${formatDate(to)}`, pageW / 2, 57, { align: 'center' })

    y = 72

    if (tipo === 'geral') {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(MUTED)
      doc.text('RESUMO POR ALUNA', margin, y)
      y += 6

      for (const a of data.resumoPorAluna) {
        if (y > 260) { doc.addPage(); y = 20 }
        doc.setFillColor(WHITE)
        doc.rect(margin, y, pageW - margin * 2, 12, 'F')
        doc.setDrawColor('#E8DADA')
        doc.setLineWidth(0.3)
        doc.line(margin, y + 12, pageW - margin, y + 12)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(TEXT)
        doc.text(a.nome, margin + 2, y + 5)
        doc.setFontSize(7)
        doc.setTextColor(MUTED)
        doc.text(`Aguard: ${formatCurrency(a.totalAguardando)} | Fech: ${formatCurrency(a.totalFechamento)} | Pago: ${formatCurrency(a.totalPago)}`, margin + 2, y + 10)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.setTextColor(MAUVE_DARK)
        doc.text(formatCurrency(a.totalGeral), pageW - margin - 2, y + 7, { align: 'right' })
        y += 13
      }

      y += 8
      // garante espaço pra todos os cards (4 cards × ~20px + breakdown ~35px = ~115px)
      if (y > 170) { doc.addPage(); y = 20 }

      doc.setFillColor('#E0B05A')
      doc.roundedRect(margin, y, pageW - margin * 2, 16, 3, 3, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(WHITE)
      doc.text('EM ABERTO (ainda nao recebido)', margin + 6, y + 6.5)
      doc.setFontSize(12)
      doc.text(formatCurrency(data.totalGeral.aguardando), margin + 6, y + 13)
      y += 20

      doc.setFillColor('#8C9DA8')
      doc.roundedRect(margin, y, pageW - margin * 2, 16, 3, 3, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(WHITE)
      doc.text('NO FECHAMENTO (aguardando pagamento)', margin + 6, y + 6.5)
      doc.setFontSize(12)
      doc.text(formatCurrency(data.totalGeral.fechamento), margin + 6, y + 13)
      y += 20

      doc.setFillColor('#5FA08C')
      doc.roundedRect(margin, y, pageW - margin * 2, 16, 3, 3, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(WHITE)
      doc.text('FLUXO DE CAIXA REAL (recebido - custos pagos)', margin + 6, y + 6.5)
      doc.setFontSize(12)
      doc.text(formatCurrency(data.totalGeral.pago - data.totalGeral.custos), margin + 6, y + 13)
      y += 20

      doc.setFillColor(MAUVE)
      doc.roundedRect(margin, y, pageW - margin * 2, 16, 3, 3, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(WHITE)
      doc.text('RESULTADO SE TUDO FOSSE PAGO (competência)', margin + 6, y + 6.5)
      doc.setFontSize(12)
      doc.text(formatCurrency(data.totalGeral.total), margin + 6, y + 13)
      y += 24

      doc.setFillColor(BLUSH)
      doc.roundedRect(margin, y, pageW - margin * 2, data.totalGeral.custos > 0 ? 30 : 24, 3, 3, 'F')
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(MUTED)
      doc.text('Pecas', margin + 6, y + 7)
      doc.text('Argila', margin + 6, y + 13)
      doc.text('Pacotes', margin + 6, y + 19)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(MAUVE_DARK)
      doc.text(formatCurrency(data.totalGeral.pecas), pageW - margin - 6, y + 7, { align: 'right' })
      doc.text(formatCurrency(data.totalGeral.argila), pageW - margin - 6, y + 13, { align: 'right' })
      doc.text(formatCurrency(data.totalGeral.pacotes), pageW - margin - 6, y + 19, { align: 'right' })
      if (data.totalGeral.custos > 0) {
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(MUTED)
        doc.text('Custos', margin + 6, y + 25)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor('#B0524F')
        doc.text(`- ${formatCurrency(data.totalGeral.custos)}`, pageW - margin - 6, y + 25, { align: 'right' })
      }

    } else {
      if (data.pecas.length > 0) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.setTextColor(MUTED)
        doc.text('PECAS', margin, y)
        y += 5
        for (const p of data.pecas) {
          if (y > 260) { doc.addPage(); y = 20 }
          doc.setFillColor(WHITE)
          doc.rect(margin, y, pageW - margin * 2, 10, 'F')
          doc.setDrawColor('#E8DADA')
          doc.line(margin, y + 10, pageW - margin, y + 10)
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(9)
          doc.setTextColor(TEXT)
          doc.text(p.name, margin + 2, y + 6.5)
          doc.setFont('helvetica', 'bold')
          doc.text(formatCurrency(p.calculated_value), pageW - margin - 2, y + 6.5, { align: 'right' })
          y += 11
        }
        y += 6
      }

      if (data.argilas.length > 0) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.setTextColor(MUTED)
        doc.text('ARGILA', margin, y)
        y += 5
        for (const a of data.argilas) {
          if (y > 260) { doc.addPage(); y = 20 }
          doc.setFillColor(WHITE)
          doc.rect(margin, y, pageW - margin * 2, 10, 'F')
          doc.setDrawColor('#E8DADA')
          doc.line(margin, y + 10, pageW - margin, y + 10)
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(9)
          doc.setTextColor(TEXT)
          doc.text(`${a.quantity}x ${(a.clay_types as any)?.name ?? 'Argila'}`, margin + 2, y + 6.5)
          doc.setFont('helvetica', 'bold')
          doc.text(formatCurrency(a.total_value), pageW - margin - 2, y + 6.5, { align: 'right' })
          y += 11
        }
        y += 6
      }

      if (data.pacotes.length > 0) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.setTextColor(MUTED)
        doc.text('PACOTES', margin, y)
        y += 5
        for (const pk of data.pacotes) {
          if (y > 260) { doc.addPage(); y = 20 }
          doc.setFillColor(WHITE)
          doc.rect(margin, y, pageW - margin * 2, 10, 'F')
          doc.setDrawColor('#E8DADA')
          doc.line(margin, y + 10, pageW - margin, y + 10)
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(9)
          doc.setTextColor(TEXT)
          doc.text(`Pacote ${pk.package_type}`, margin + 2, y + 6.5)
          doc.setFont('helvetica', 'bold')
          doc.text(formatCurrency(pk.value), pageW - margin - 2, y + 6.5, { align: 'right' })
          y += 11
        }
        y += 6
      }

      doc.setFillColor(MAUVE)
      doc.roundedRect(margin, y, pageW - margin * 2, 14, 3, 3, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(WHITE)
      doc.text('Resultado se tudo fosse pago', margin + 6, y + 9.5)
      doc.text(formatCurrency(data.totalGeral.total), pageW - margin - 6, y + 9.5, { align: 'right' })
      y += 16
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(MUTED)
      doc.text('(receita gerada no periodo menos custos, incluindo aberto/fechamento - nao e o caixa real)', margin, y)
    }

    const blob = doc.output('blob')
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `relatorio-${tipo}-${from}-a-${to}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <>
      <AdminNavHeader title="Relatórios" />
      <div className="px-4 pt-4 pb-6 space-y-5">
        <h1 className="font-display text-2xl text-brand-text">Relatórios</h1>

        <div className="space-y-2">
          <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted">Tipo</label>
          <div className="grid grid-cols-2 gap-2">
            {(['geral', 'aluna'] as const).map(t => (
              <button key={t} onClick={() => setTipo(t)}
                className={`py-3 rounded-xl border text-sm font-medium transition-colors ${tipo === t ? 'border-brand-mauve bg-brand-blush text-brand-mauve' : 'border-brand-line bg-white text-brand-text'}`}>
                {t === 'geral' ? 'Geral' : 'Por aluna'}
              </button>
            ))}
          </div>
        </div>

        {tipo === 'aluna' && (
          <div>
            <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">Aluna</label>
            <select value={studentId} onChange={e => setStudentId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-brand-line bg-white text-brand-text focus:outline-none focus:border-brand-mauve">
              <option value="">Selecione a aluna</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 min-w-0">
          <div className="min-w-0">
            <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">De</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              className="w-full min-w-0 px-3 py-3 rounded-xl border border-brand-line bg-white text-brand-text text-sm focus:outline-none focus:border-brand-mauve" />
          </div>
          <div className="min-w-0">
            <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">Até</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              className="w-full min-w-0 px-3 py-3 rounded-xl border border-brand-line bg-white text-brand-text text-sm focus:outline-none focus:border-brand-mauve" />
          </div>
        </div>

        <button onClick={handleGerar} disabled={loading || (tipo === 'aluna' && !studentId)}
          className="w-full py-3 bg-brand-ink text-brand-cream rounded-xl font-medium text-sm disabled:opacity-50">
          {loading ? 'Gerando...' : 'Gerar relatório'}
        </button>

        {data && (
          <div className="space-y-4">
            <div className="bg-status-paid-bg rounded-xl p-4 space-y-2">
              <p className="text-xs font-medium tracking-widest uppercase text-status-paid-text">💰 Fluxo de caixa real</p>
              <div className="flex justify-between items-center">
                <p className="text-sm text-status-paid-text">Recebido − Custos pagos</p>
                <p className="font-display text-2xl text-status-paid-text">{formatCurrency(data.totalGeral.pago - data.totalGeral.custos)}</p>
              </div>
              <p className="text-[10px] text-status-paid-text/70">
                Recebido: {formatCurrency(data.totalGeral.pago)} · Custos: {formatCurrency(data.totalGeral.custos)}
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-card p-4 space-y-1">
              <p className="text-xs font-medium tracking-widest uppercase text-brand-muted mb-2">Controle (não é caixa)</p>
              <div className="flex justify-between text-sm">
                <span className="text-brand-muted">Aguardando</span>
                <span className="font-medium text-status-open-text">{formatCurrency(data.totalGeral.aguardando)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-brand-muted">No fechamento</span>
                <span className="font-medium text-status-closed-text">{formatCurrency(data.totalGeral.fechamento)}</span>
              </div>
            </div>

            <div className="bg-brand-blush rounded-xl p-4 space-y-2">
              <p className="text-xs text-brand-mauve">Período: {formatDate(data.periodo.from)} a {formatDate(data.periodo.to)}</p>
              <div className="flex justify-between items-center">
                <p className="text-sm text-brand-mauve">Total faturado no período (competência)</p>
                <p className="font-display text-2xl text-brand-mauve">{formatCurrency(data.totalGeral.total)}</p>
              </div>
              <p className="text-[10px] text-brand-mauve/70">
                Resultado se TUDO fosse pago (alunas em aberto e no fechamento) — não é o caixa real, é a receita gerada menos custos.
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs text-brand-mauve/80 pt-1">
                <p>Pago: {formatCurrency(data.totalGeral.pago)}</p>
                <p>Em aberto: {formatCurrency(data.totalGeral.aberto)}</p>
              </div>
              {data.totalGeral.custos > 0 && (
                <p className="text-xs text-status-open-text pt-1">− Custos: {formatCurrency(data.totalGeral.custos)}</p>
              )}
            </div>

            {tipo === 'geral' ? (
              <div className="space-y-4">
              <div className="space-y-2">
                <h2 className="font-display text-base text-brand-text">Por canal de venda (Peças)</h2>
                <div className="bg-white rounded-xl shadow-card divide-y divide-brand-line">
                  {Object.entries(data.porCanal ?? {}).filter(([, v]) => v.total > 0).map(([canal, v]) => (
                    <div key={canal} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-brand-text">{canal}</p>
                        <p className="text-xs text-brand-muted">
                          Aguardando: {formatCurrency(v.aguardando)} · Fechamento: {formatCurrency(v.fechamento)} · Pago: {formatCurrency(v.pago)}
                        </p>
                      </div>
                      <p className="text-sm font-medium text-brand-text">{formatCurrency(v.total)}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="font-display text-base text-brand-text">Por aluna</h2>
                <div className="bg-white rounded-xl shadow-card divide-y divide-brand-line">
                  {data.resumoPorAluna.length === 0 ? (
                    <p className="text-sm text-brand-muted text-center py-6">Nenhum dado no período.</p>
                  ) : (
                    data.resumoPorAluna.map(a => (
                      <div key={a.student_id} className="flex items-center justify-between px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-brand-text">{a.nome}</p>
                          <p className="text-xs text-brand-muted">
                            Aguardando: {formatCurrency(a.totalAguardando)} · Fechamento: {formatCurrency(a.totalFechamento)} · Pago: {formatCurrency(a.totalPago)}
                          </p>
                        </div>
                        <p className="text-sm font-medium text-brand-text">{formatCurrency(a.totalGeral)}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
              </div>
            ) : (
              <div className="space-y-4">
                {data.pecas.length > 0 && (
                  <div className="space-y-2">
                    <h2 className="font-display text-base text-brand-text">Peças</h2>
                    <div className="bg-white rounded-xl shadow-card divide-y divide-brand-line">
                      {data.pecas.map((p: any) => (
                        <div key={p.id} className="flex items-center justify-between px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-brand-text">{p.name}</p>
                            <p className="text-xs text-brand-muted">{formatDate(p.piece_date)}</p>
                          </div>
                          <p className="text-sm font-medium text-brand-text">{formatCurrency(p.calculated_value)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {data.argilas.length > 0 && (
                  <div className="space-y-2">
                    <h2 className="font-display text-base text-brand-text">Argila</h2>
                    <div className="bg-white rounded-xl shadow-card divide-y divide-brand-line">
                      {data.argilas.map((a: any) => (
                        <div key={a.id} className="flex items-center justify-between px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-brand-text">{a.quantity}x {(a.clay_types as any)?.name}</p>
                            <p className="text-xs text-brand-muted">{formatDate(a.sale_date)}</p>
                          </div>
                          <p className="text-sm font-medium text-brand-text">{formatCurrency(a.total_value)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {data.pacotes.length > 0 && (
                  <div className="space-y-2">
                    <h2 className="font-display text-base text-brand-text">Pacotes</h2>
                    <div className="bg-white rounded-xl shadow-card divide-y divide-brand-line">
                      {data.pacotes.map((pk: any) => (
                        <div key={pk.id} className="flex items-center justify-between px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-brand-text">Pacote {pk.package_type}</p>
                            <p className="text-xs text-brand-muted">{formatDate(pk.created_at)}</p>
                          </div>
                          <p className="text-sm font-medium text-brand-text">{formatCurrency(pk.value)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <button onClick={handleGerarPDF}
              className="w-full py-3 bg-[#25D366] text-white rounded-xl font-medium text-sm">
              Gerar PDF
            </button>
          </div>
        )}
      </div>
    </>
  )
}