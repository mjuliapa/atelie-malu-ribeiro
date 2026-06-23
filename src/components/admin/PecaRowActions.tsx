'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export function PecaRowActions({ id, name }: { id: string; name: string }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!window.confirm(`Excluir "${name}"?`)) return
    setDeleting(true)
    const res = await fetch(`/api/admin/pecas?id=${id}`, { method: 'DELETE' })
    setDeleting(false)
    if (res.ok) {
      router.refresh()
    } else {
      const err = await res.json().catch(() => ({}))
      alert(err.error ?? 'Erro ao excluir.')
    }
  }

  return (
    <div className="flex items-center gap-1 flex-shrink-0">
      <Link href={`/admin/pecas/${id}/editar`} className="p-1.5 text-brand-muted hover:text-brand-mauve transition-colors">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </Link>
      <button onClick={handleDelete} disabled={deleting} className="p-1.5 text-brand-muted hover:text-status-open-text transition-colors disabled:opacity-50">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
          <polyline strokeLinecap="round" strokeLinejoin="round" points="3 6 5 6 21 6" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </button>
    </div>
  )
}