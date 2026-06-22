'use client'

import { ScheduleSlot } from '@/types'
import { formatSlotTime, formatDate, cn } from '@/lib/utils'
import { parseISO, isPast } from 'date-fns'
import { AddAlunaToSlot } from './AddAlunaToSlot'

interface SlotCardProps {
  slot: ScheduleSlot
  expanded?: boolean
  onSelect?: () => void
  onMarkAttendance?: () => void
  onBlock?: () => void
  onRefresh?: () => void
}

export function SlotCard({
  slot,
  expanded = false,
  onSelect,
  onMarkAttendance,
  onBlock,
  onRefresh,
}: SlotCardProps) {
  const confirmed = slot.confirmed_count ?? 0
  const available = slot.available_spots ?? slot.max_students
  const isFull = available === 0
  const isPastSlot = isPast(parseISO(slot.start_time))
  const occupancyPct = Math.round((confirmed / slot.max_students) * 100)
  const canAddAluna = !slot.is_blocked && !isPastSlot && !isFull

  if (!expanded) {
    return (
      <button
        onClick={onSelect}
        className={cn(
          'w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors',
          slot.is_blocked
            ? 'bg-brand-cream border border-brand-line opacity-60'
            : 'bg-brand-cream hover:bg-brand-blush border border-brand-line'
        )}
      >
        <div className={cn(
          'w-1 self-stretch rounded-full',
          slot.is_blocked
            ? 'bg-brand-line'
            : isFull
              ? 'bg-status-open-text'
              : 'bg-brand-mauve'
        )} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-brand-text">
            {formatSlotTime(slot.start_time, slot.end_time)}
          </p>
          {slot.is_blocked ? (
            <p className="text-xs text-brand-muted truncate">
              Bloqueada{slot.block_reason ? ` — ${slot.block_reason}` : ''}
            </p>
          ) : (
            <p className="text-xs text-brand-muted">
              {confirmed}/{slot.max_students} aluna{confirmed !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        {!slot.is_blocked && (
          <div className={cn(
            'text-xs font-medium px-2 py-0.5 rounded-full',
            isFull
              ? 'bg-status-open-bg text-status-open-text'
              : 'bg-status-paid-bg text-status-paid-text'
          )}>
            {isFull ? 'Lotada' : `${available} vaga${available !== 1 ? 's' : ''}`}
          </div>
        )}
      </button>
    )
  }

  // Versão expandida (visão diária)
  return (
    <div className={cn(
      'bg-white rounded-xl shadow-card overflow-hidden',
      slot.is_blocked && 'opacity-70'
    )}>
      {/* Header do card */}
      <div className={cn(
        'px-4 py-3 flex items-center justify-between',
        slot.is_blocked ? 'bg-brand-sand-light' : 'bg-brand-blush'
      )}>
        <div>
          <p className="font-display text-lg text-brand-text">
            {formatSlotTime(slot.start_time, slot.end_time)}
          </p>
          <p className="text-xs text-brand-muted">
            {formatDate(slot.start_time, "EEEE, d 'de' MMMM")}
          </p>
        </div>
        {slot.is_blocked ? (
          <span className="text-xs bg-brand-sand text-brand-ink px-2 py-1 rounded-full font-medium">
            Bloqueada
          </span>
        ) : (
          <span className={cn(
            'text-xs px-2 py-1 rounded-full font-medium',
            isFull
              ? 'bg-status-open-bg text-status-open-text'
              : 'bg-status-paid-bg text-status-paid-text'
          )}>
            {isFull ? 'Lotada' : `${available}/${slot.max_students} vagas`}
          </span>
        )}
      </div>

      {/* Barra de ocupação */}
      {!slot.is_blocked && (
        <div className="px-4 pt-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="flex-1 h-1.5 bg-brand-cream rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  isFull ? 'bg-status-open-text' : 'bg-brand-mauve'
                )}
                style={{ width: `${occupancyPct}%` }}
              />
            </div>
            <span className="text-xs text-brand-muted">{occupancyPct}%</span>
          </div>
        </div>
      )}

      {/* Lista de alunas */}
      {!slot.is_blocked && slot.appointments && slot.appointments.length > 0 && (
        <div className="px-4 py-3 space-y-2">
          <p className="text-xs font-medium tracking-widest uppercase text-brand-muted mb-2">
            Alunas agendadas
          </p>
          {slot.appointments
            .filter((a) => a.status === 'confirmed')
            .map((appointment) => (
              <div key={appointment.id} className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-brand-blush flex items-center justify-center">
                  <span className="text-xs font-medium text-brand-mauve">
                    {((appointment.profiles ?? appointment.student) as { full_name?: string })?.full_name?.charAt(0).toUpperCase() ?? '?'}
                  </span>
                </div>
                <span className="text-sm text-brand-text">
                  {((appointment.profiles ?? appointment.student) as { full_name?: string })?.full_name ?? 'Aluna'}
                </span>
              </div>
            ))}
        </div>
      )}

      {/* Bloco vazio */}
      {!slot.is_blocked && slot.appointments?.filter((a) => a.status === 'confirmed').length === 0 && (
        <div className="px-4 py-4 text-center">
          <p className="text-sm text-brand-muted">Nenhuma aluna agendada ainda.</p>
        </div>
      )}

      {/* Adicionar aluna direto no card expandido */}
      {canAddAluna && onRefresh && (
        <div className="px-4 pb-3">
          <AddAlunaToSlot slotId={slot.id} onAdded={onRefresh} />
        </div>
      )}

      {/* Razão do bloqueio */}
      {slot.is_blocked && slot.block_reason && (
        <div className="px-4 py-3">
          <p className="text-sm text-brand-muted">{slot.block_reason}</p>
        </div>
      )}

      {/* Ações */}
      <div className="px-4 py-3 border-t border-brand-line flex gap-2 flex-wrap">
        {!slot.is_blocked && isPastSlot && onMarkAttendance && (
          <button
            onClick={onMarkAttendance}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-brand-ink text-brand-cream rounded-lg font-medium hover:bg-brand-text transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Registrar presença
          </button>
        )}
        {onBlock && !isPastSlot && (
          <button
            onClick={onBlock}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-white text-brand-muted border border-brand-line rounded-lg font-medium hover:text-brand-text hover:border-brand-sand transition-colors"
          >
            {slot.is_blocked ? 'Desbloquear' : 'Bloquear'}
          </button>
        )}
      </div>
    </div>
  )
}