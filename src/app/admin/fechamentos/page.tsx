import { createClient } from '@/lib/supabase/server'
import { AdminNavHeader } from '@/components/admin/AdminNav'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'

export default async function AdminFechamentosPage() {
  const supabase = await createClient()

  const { data: fechamentos } = await supabase
    .from('monthly_closings')
    .select('*, profiles:student_id(full_name)')
    .order('created_at', { ascending: false })

  return (
    <>
      <AdminNavHeader title="Fechamentos" />
      <div className="px-4 pt-4 pb-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl text-brand-text">Fechamentos</h1>
            <p className="text-sm text-brand-muted">{fechamentos?.length ?? 0} no total</p>
          </div>
          <Link href="/admin/fechamentos/novo"
            className="bg-brand-ink text-brand-cream px-4 py-2 rounded-xl text-sm font-medium">
            + Novo
          </Link>
        </div>

        {!fechamentos?.length ? (
          <div className="bg-white rounded-xl p-8 text-center shadow-card">
            <p className="font-display text-base text-brand-text mb-1">Nenhum fechamento ainda</p>
            <Link href="/admin/fechamentos/novo" className="text-sm text-brand-mauve hover:underline">
              Gerar primeiro fechamento
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-card divide-y divide-brand-line">
            {fechamentos.map((f) => (
              <Link key={f.id} href={`/admin/fechamentos/${f.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-brand-cream transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-brand-text">
                    {(f.profiles as unknown as { full_name: string })?.full_name}
                  </p>
                  <p className="text-xs text-brand-muted">{f.reference_month} · {formatDate(f.created_at)}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-medium text-brand-text">{formatCurrency(f.total_value)}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    f.status === 'paid'
                      ? 'bg-status-paid-bg text-status-paid-text'
                      : 'bg-status-open-bg text-status-open-text'
                  }`}>
                    {f.status === 'paid' ? 'Pago' : 'Pendente'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
