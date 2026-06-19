'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const STATUS_OPTIONS = [
  { value: 'active', label: 'Ativa', color: 'bg-status-paid-bg text-status-paid-text border-status-paid-text' },
  { value: 'paused', label: 'Pausada', color: 'bg-status-open-bg text-status-open-text border-status-open-text' },
  { value: 'former', label: 'Ex-aluna', color: 'bg-brand-cream text-brand-muted border-brand-line' },
] as const

export function AlunaStatusToggle({ id, currentStatus }: { id: string; currentStatus: string }) {
  const router = useRouter()
  const [status, setStatus] = useState(currentStatus)
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)

  async function handleChange(newStatus: string) {
    if (newStatus === status) { setOpen(false); return }

    if (newStatus !== 'active') {
      const confirmMsg = newStatus === 'paused'
        ? 'Pausar esta aluna? Ela não aparecerá mais nas listas de cobrança e fechamento, mas o histórico é mantido.'
        : 'Marcar como ex-aluna? Ela não aparecerá mais nas listas de cobrança e fechamento, mas o histórico é mantido.'
      if (!window.confirm(confirmMsg)) { setOpen(false); return }
    }

    setSaving(true)
    await fetch('/api/admin/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: newStatus }),
    })
    setStatus(newStatus)
    setSaving(false)
    setOpen(false)
    router.refresh()
  }

  const current = STATUS_OPTIONS.find(o => o.value === status) ?? STATUS_OPTIONS[0]

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={saving}
        className={`text-xs px-3 py-1.5 rounded-full font-medium border ${current.color} disabled:opacity-50`}
      >
        {saving ? 'Salvando...' : current.label}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 z-20 bg-white rounded-xl shadow-card border border-brand-line overflow-hidden min-w-[140px]">
            {STATUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleChange(opt.value)}
                className={`block w-full text-left px-4 py-2.5 text-sm hover:bg-brand-cream transition-colors ${opt.value === status ? 'font-medium text-brand-mauve' : 'text-brand-text'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}