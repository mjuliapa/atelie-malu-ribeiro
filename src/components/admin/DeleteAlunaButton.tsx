'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function DeleteAlunaButton({ id, nome }: { id: string; nome: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!window.confirm(`Excluir "${nome}" permanentemente? Só funciona se ela não tiver nenhum histórico.`)) return
    setLoading(true)
    const res = await fetch(`/api/admin/alunos?id=${id}`, { method: 'DELETE' })
    setLoading(false)
    if (res.ok) {
      router.push('/admin/alunos')
    } else {
      const err = await res.json().catch(() => ({}))
      alert(err.error ?? 'Erro ao excluir.')
    }
  }

  return (
    <button onClick={handleDelete} disabled={loading}
      className="w-full py-2.5 text-xs font-medium text-status-open-text border border-status-open-text rounded-xl hover:bg-status-open-bg transition-colors disabled:opacity-50">
      {loading ? 'Excluindo...' : 'Excluir aluna (somente sem histórico)'}
    </button>
  )
}