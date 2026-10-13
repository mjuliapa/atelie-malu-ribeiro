'use client'

import { useState, useEffect } from 'react'
import { AdminNavHeader } from '@/components/admin/AdminNav'
import { formatCurrency } from '@/lib/utils'

type ClayType = { id: string; name: string; price: number }
type InventoryItem = {
  id: string
  clay_type_id: string
  initial_quantity: number
  current_quantity: number
  unit: string
  notes: string | null
  clay_types: ClayType | null
}

export default function EstoqueArgilaPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [clayTypes, setClayTypes] = useState<ClayType[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  // form novo tipo
  const [formClayTypeId, setFormClayTypeId] = useState('')
  const [formQty, setFormQty] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // form ajuste
  const [adjustQty, setAdjustQty] = useState('')
  const [adjustNotes, setAdjustNotes] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const [inv, ft] = await Promise.all([
      fetch('/api/admin/estoque-argila').then(r => r.json()),
      fetch('/api/admin/form-data').then(r => r.json()).then(d => d.clayTypes ?? []),
    ])
    setItems(inv)
    setClayTypes(ft)
    setLoading(false)
  }

  // tipos que ainda não têm entrada no estoque
  const tiposSemEstoque = clayTypes.filter(ct => !items.find(i => i.clay_type_id === ct.id))

  async function handleAdd() {
    if (!formClayTypeId || !formQty) return
    setSaving(true)
    await fetch('/api/admin/estoque-argila', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clay_type_id: formClayTypeId,
        initial_quantity: parseFloat(formQty),
        notes: formNotes || null,
      }),
    })
    setShowForm(false)
    setFormClayTypeId('')
    setFormQty('')
    setFormNotes('')
    setSaving(false)
    load()
  }

  async function handleAdjust(item: InventoryItem) {
    if (!adjustQty) return
    setSaving(true)
    await fetch('/api/admin/estoque-argila', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: item.id,
        current_quantity: parseFloat(adjustQty),
        notes: adjustNotes || item.notes,
      }),
    })
    setEditingId(null)
    setAdjustQty('')
    setAdjustNotes('')
    setSaving(false)
    load()
  }

  function statusColor(item: InventoryItem) {
    const pct = item.initial_quantity > 0
      ? item.current_quantity / item.initial_quantity
      : 1
    if (pct <= 0.1) return 'text-red-500'
    if (pct <= 0.3) return 'text-amber-500'
    return 'text-green-600'
  }

  function statusLabel(item: InventoryItem) {
    const pct = item.initial_quantity > 0
      ? item.current_quantity / item.initial_quantity
      : 1
    if (item.current_quantity <= 0) return 'Esgotado'
    if (pct <= 0.1) return 'Crítico'
    if (pct <= 0.3) return 'Baixo'
    return 'OK'
  }

  return (
    <>
      <AdminNavHeader title="Estoque de argila" showBack />
      <div className="px-4 pt-4 pb-6 space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl text-brand-text">Estoque de argila</h1>
          {tiposSemEstoque.length > 0 && (
            <button
              onClick={() => setShowForm(true)}
              className="text-sm px-4 py-2 bg-brand-ink text-brand-cream rounded-xl font-medium"
            >
              + Adicionar
            </button>
          )}
        </div>

        {/* Formulário novo tipo */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-card p-4 space-y-3">
            <p className="text-sm font-medium text-brand-text">Novo tipo no estoque</p>
            <select
              value={formClayTypeId}
              onChange={e => setFormClayTypeId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-brand-line text-sm"
            >
              <option value="">Selecione o tipo</option>
              {tiposSemEstoque.map(ct => (
                <option key={ct.id} value={ct.id}>{ct.name}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Quantidade inicial (kg)"
                value={formQty}
                onChange={e => setFormQty(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-brand-line text-sm"
              />
            </div>
            <input
              type="text"
              placeholder="Observação (opcional)"
              value={formNotes}
              onChange={e => setFormNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-brand-line text-sm"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-2 rounded-xl border border-brand-line text-sm text-brand-muted"
              >
                Cancelar
              </button>
              <button
                onClick={handleAdd}
                disabled={saving || !formClayTypeId || !formQty}
                className="flex-1 py-2 bg-brand-ink text-brand-cream rounded-xl text-sm disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-xl shadow-card p-6 text-center">
            <p className="text-brand-muted text-sm">Nenhum estoque cadastrado ainda.</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-3 text-sm text-brand-mauve font-medium"
            >
              Adicionar primeiro tipo
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(item => (
              <div key={item.id} className="bg-white rounded-xl shadow-card overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-brand-text">
                      {item.clay_types?.name ?? '—'}
                    </p>
                    <p className="text-xs text-brand-muted mt-0.5">
                      {formatCurrency(item.clay_types?.price ?? 0)}/kg
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-display font-medium ${statusColor(item)}`}>
                      {item.current_quantity} kg
                    </p>
                    <p className={`text-xs font-medium ${statusColor(item)}`}>
                      {statusLabel(item)}
                    </p>
                  </div>
                </div>

                {/* barra de progresso */}
                <div className="px-4 pb-3">
                  <div className="h-1.5 bg-brand-blush rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        statusLabel(item) === 'Esgotado' || statusLabel(item) === 'Crítico'
                          ? 'bg-red-400'
                          : statusLabel(item) === 'Baixo'
                          ? 'bg-amber-400'
                          : 'bg-green-400'
                      }`}
                      style={{
                        width: `${Math.min(100, item.initial_quantity > 0
                          ? (item.current_quantity / item.initial_quantity) * 100
                          : 0)}%`
                      }}
                    />
                  </div>
                  <p className="text-xs text-brand-muted mt-1">
                    Inicial: {item.initial_quantity} kg
                    {item.notes ? ` · ${item.notes}` : ''}
                  </p>
                </div>

                {/* ajuste */}
                {editingId === item.id ? (
                  <div className="border-t border-brand-line px-4 py-3 space-y-2">
                    <p className="text-xs font-medium text-brand-muted uppercase tracking-widest">Ajustar quantidade atual</p>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Nova quantidade (kg)"
                        value={adjustQty}
                        onChange={e => setAdjustQty(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg border border-brand-line text-sm"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Observação (opcional)"
                      value={adjustNotes}
                      onChange={e => setAdjustNotes(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-brand-line text-sm"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setEditingId(null); setAdjustQty(''); setAdjustNotes('') }}
                        className="flex-1 py-2 rounded-xl border border-brand-line text-sm text-brand-muted"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleAdjust(item)}
                        disabled={saving || !adjustQty}
                        className="flex-1 py-2 bg-brand-ink text-brand-cream rounded-xl text-sm disabled:opacity-50"
                      >
                        {saving ? 'Salvando...' : 'Confirmar'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="border-t border-brand-line px-4 py-2">
                    <button
                      onClick={() => { setEditingId(item.id); setAdjustQty(String(item.current_quantity)) }}
                      className="text-xs text-brand-mauve font-medium"
                    >
                      Ajustar estoque
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}