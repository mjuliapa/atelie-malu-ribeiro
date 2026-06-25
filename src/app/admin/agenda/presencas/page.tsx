'use client'

import { useState, useEffect } from 'react'
import { AdminNavHeader } from '@/components/admin/AdminNav'
import { formatSlotTime, formatDate } from '@/lib/utils'

type Student = { id: string; full_name: string }

type Record = {
  id: string
  status: string
  notes: string | null
  aluna: string
  student_id: string
  modality: string
  start_time: string
  end_time: string
}

const STATUS_LABEL: Record<string, string> = { present: 'Presente', absent: 'Falta', justified: 'Justificada' }
const STATUS_COLOR: Record<string, string> = {
  present: 'bg-status-paid-bg text-status-paid-text',
  absent: 'bg-status-open-bg text-status-open-text',
  justified: 'bg-status-closed-bg text-status-closed-text',
}

function getFirstDayOfMonth() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
}
function getLastDayOfMonth() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
}

export default function PresencasPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [studentId, setStudentId] = useState('')
  const [from, setFrom] = useState(getFirstDayOfMonth())
  const [to, setTo] = useState(getLastDayOfMonth())
  const [records, setRecords] = useState<Record[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/form-data')
      .then(r => r.json())
      .then(({ students }) => setStudents(students))
  }, [])

  function load() {
    setLoading(true)
    const params = new URLSearchParams({ from, to })
    if (studentId) params.set('student_id', studentId)
    fetch(`/api/admin/attendance-report?${params}`)
      .then(r => r.json())
      .then(data => { setRecords(Array.isArray(data) ? data : []); setLoading(false) })
  }

  useEffect(() => { load() }, [studentId, from, to])

  const porDia = records.reduce((acc: Record<string, Record[]>, r: any) => {
    const dia = r.start_time ? r.start_time.split('T')[0] : 'sem-data'
    if (!acc[dia]) acc[dia] = []
    acc[dia].push(r)
    return acc
  }, {} as Record<string, Record[]>)

  const dias = Object.keys(porDia).sort((a, b) => b.localeCompare(a))

  return (
    <>
      <AdminNavHeader title="Presenças" showBack />
      <div className="px-4 pt-4 pb-6 space-y-4">
        <h1 className="font-display text-2xl text-brand-text">Presenças</h1>

        <div>
          <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">Aluna</label>
          <select value={studentId} onChange={e => setStudentId(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-brand-line bg-white text-brand-text focus:outline-none focus:border-brand-mauve">
            <option value="">Todas as alunas</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">De</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              className="w-full px-3 py-3 rounded-xl border border-brand-line bg-white text-brand-text text-sm focus:outline-none focus:border-brand-mauve" />
          </div>
          <div>
            <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">Até</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              className="w-full px-3 py-3 rounded-xl border border-brand-line bg-white text-brand-text text-sm focus:outline-none focus:border-brand-mauve" />
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />)}</div>
        ) : dias.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center shadow-card">
            <p className="text-sm text-brand-muted">Nenhum registro no período.</p>
          </div>
        ) : (
          dias.map(dia => (
            <div key={dia} className="space-y-2">
              <h2 className="font-display text-base text-brand-text capitalize">
                {dia === 'sem-data' ? 'Sem data' : formatDate(dia, "EEEE, d 'de' MMMM")}
              </h2>
              <div className="bg-white rounded-xl shadow-card divide-y divide-brand-line">
                {porDia[dia].map(r => (
                  <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-brand-text truncate">{r.aluna}</p>
                      <p className="text-xs text-brand-muted">
                        {r.start_time && r.end_time ? formatSlotTime(r.start_time, r.end_time) : ''} · {r.modality === 'torno' ? 'Torno' : 'Manual'}
                      </p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[r.status] ?? ''}`}>
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  )
}