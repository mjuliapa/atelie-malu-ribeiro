'use client'

import { useState } from 'react'
import { AdminNavHeader } from '@/components/admin/AdminNav'
import { formatCurrency } from '@/lib/utils'
import { useRouter } from 'next/navigation'

const GRUPOS = [
  { id: 'produtos', label: 'Produtos e serviços', icon: '🏺' },
  { id: 'operacional', label: 'Operacional', icon: '🏢' },
  { id: 'investimento', label: 'Investimento', icon: '💼' },
] as const

const CATEGORIAS: Record<string, string[]> = {
  produtos: ['Argila', 'Esmaltes', 'Decalques', 'Ouro líquido', 'Ferramentas e moldes', 'Equipamentos do forno', 'Embalagens', 'Materiais de workshop'],
  operacional: ['Aluguel', 'Condomínio', 'Energia elétrica', 'Internet', 'Material de limpeza', 'Faxineira', 'Manutenção geral', 'Café', 'Água', 'Lanches', 'Flores e plantas'],
  investimento: ['iPad', 'Forno', 'Estantes', 'Móveis', 'Reformas e melhorias'],
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

export default function NovoCustoPage() {
  const router = useRouter()
  const [grupo, setGrupo] = useState<'produtos' | 'operacional' | 'investimento' | ''>('')
  const [categoria, setCategoria] = useState('')
  const [categoriaCustom, setCategoriaCustom] = useState('')
  const [tipo, setTipo] = useState<'fixo' | 'variavel'>('variavel')
  const [valor, setValor] = useState('')
  const [data, setData] = useState(new Date().toISOString().split('T')[0])
  const [diaDoMes, setDiaDoMes] = useState('10')
  const [descricao, setDescricao] = useState('')
  const [loading, setLoading] = useState(false)

  const valorNum = parseFloat(valor) || 0
  const categoriaFinal = categoria === '__outro__' ? categoriaCustom.trim() : categoria

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!grupo || !categoriaFinal || valorNum <= 0) return
    setLoading(true)

    await fetch('/api/admin/custos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grupo,
        categoria: categoriaFinal,
        tipo,
        valor: valorNum,
        data,
        descricao: descricao.trim() || null,
        recorrente: tipo === 'fixo',
        dia_do_mes: tipo === 'fixo' ? parseInt(diaDoMes) : null,
      }),
    })

    setLoading(false)
    router.push('/admin/financeiro/custos')
  }

  return (
    <>
      <AdminNavHeader title="Novo custo" showBack />
      <div className="px-4 pt-4 pb-6">
        <h1 className="font-display text-2xl text-brand-text mb-5">Novo custo</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-2">Grupo</label>
            <div className="grid grid-cols-1 gap-2">
              {GRUPOS.map(g => (
                <button key={g.id} type="button"
                  onClick={() => { setGrupo(g.id); setCategoria('') }}
                  className={cn(
                    'px-4 py-3 rounded-xl border text-sm text-left transition-colors flex items-center gap-2',
                    grupo === g.id
                      ? 'border-brand-mauve bg-brand-blush text-brand-mauve font-medium'
                      : 'border-brand-line bg-white text-brand-text hover:border-brand-mauve'
                  )}>
                  <span>{g.icon}</span>
                  <span>{g.label}</span>
                </button>
              ))}
            </div>
          </div>

          {grupo && (
            <div>
              <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-2">Categoria</label>
              <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                {CATEGORIAS[grupo].map(c => (
                  <button key={c} type="button" onClick={() => setCategoria(c)}
                    className={cn(
                      'px-4 py-2.5 rounded-xl border text-sm text-left transition-colors',
                      categoria === c
                        ? 'border-brand-mauve bg-brand-blush text-brand-mauve font-medium'
                        : 'border-brand-line bg-white text-brand-text hover:border-brand-mauve'
                    )}>
                    {c}
                  </button>
                ))}
                <button type="button" onClick={() => setCategoria('__outro__')}
                  className={cn(
                    'px-4 py-2.5 rounded-xl border text-sm text-left transition-colors',
                    categoria === '__outro__'
                      ? 'border-brand-mauve bg-brand-blush text-brand-mauve font-medium'
                      : 'border-brand-line bg-white text-brand-text hover:border-brand-mauve'
                  )}>
                  Outro...
                </button>
              </div>
              {categoria === '__outro__' && (
                <input value={categoriaCustom} onChange={e => setCategoriaCustom(e.target.value)}
                  placeholder="Nome da categoria"
                  className="w-full mt-2 px-4 py-3 rounded-xl border border-brand-line bg-white text-brand-text focus:outline-none focus:border-brand-mauve" />
              )}
            </div>
          )}

          {grupo && categoriaFinal && (
            <>
              <div className="space-y-2">
                <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted">Tipo</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['variavel', 'fixo'] as const).map(t => (
                    <button key={t} type="button" onClick={() => setTipo(t)}
                      className={cn(
                        'py-3 rounded-xl border text-sm font-medium transition-colors',
                        tipo === t ? 'border-brand-mauve bg-brand-blush text-brand-mauve' : 'border-brand-line bg-white text-brand-text'
                      )}>
                      {t === 'variavel' ? 'Variável' : 'Fixo (mensal)'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">Valor (R$)</label>
                <input type="number" min="0" step="0.01" required value={valor} onChange={e => setValor(e.target.value)}
                  placeholder="0,00"
                  className="w-full px-4 py-3 rounded-xl border border-brand-line bg-white text-brand-text focus:outline-none focus:border-brand-mauve" />
              </div>

              {tipo === 'variavel' ? (
                <div>
                  <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">Data</label>
                  <input type="date" required value={data} onChange={e => setData(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-brand-line bg-white text-brand-text focus:outline-none focus:border-brand-mauve" />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">Dia do mês (cobrança recorrente)</label>
                  <input type="number" min="1" max="31" required value={diaDoMes} onChange={e => setDiaDoMes(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-brand-line bg-white text-brand-text focus:outline-none focus:border-brand-mauve" />
                  <p className="text-xs text-brand-muted mt-1">Este custo será projetado todo mês neste dia.</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium tracking-widest uppercase text-brand-muted mb-1.5">Descrição</label>
                <textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={2}
                  placeholder="Opcional"
                  className="w-full px-4 py-3 rounded-xl border border-brand-line bg-white text-brand-text focus:outline-none focus:border-brand-mauve resize-none" />
              </div>

              {valorNum > 0 && (
                <div className="bg-brand-blush rounded-xl p-4 flex justify-between items-center">
                  <p className="text-sm text-brand-mauve">{categoriaFinal} · {tipo === 'fixo' ? 'mensal' : 'avulso'}</p>
                  <p className="font-display text-2xl text-brand-mauve">{formatCurrency(valorNum)}</p>
                </div>
              )}

              <button type="submit" disabled={loading || valorNum <= 0}
                className="w-full py-3 bg-brand-ink text-brand-cream rounded-xl font-medium text-sm disabled:opacity-50">
                {loading ? 'Salvando...' : 'Registrar custo'}
              </button>
            </>
          )}
        </form>
      </div>
    </>
  )
}