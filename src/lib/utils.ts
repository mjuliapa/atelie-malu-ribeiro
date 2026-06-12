import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatDate(dateStr: string, fmt = 'dd/MM/yyyy'): string {
  try {
    return format(parseISO(dateStr), fmt, { locale: ptBR })
  } catch {
    return dateStr
  }
}

export function formatDateTime(dateStr: string): string {
  return formatDate(dateStr, "dd/MM/yyyy 'às' HH:mm")
}

export function formatMonth(monthStr: string): string {
  // "2026-06" → "junho/2026"
  try {
    const [year, month] = monthStr.split('-')
    const date = new Date(Number(year), Number(month) - 1, 1)
    return format(date, "MMMM/yyyy", { locale: ptBR })
  } catch {
    return monthStr
  }
}

export function formatSlotTime(start: string, end: string): string {
  return `${formatDate(start, 'HH:mm')} – ${formatDate(end, 'HH:mm')}`
}

export function currentMonth(): string {
  return format(new Date(), 'yyyy-MM')
}

export function calculateVolume(h: number, w: number, l: number): number {
  return Math.round(h * w * l * 100) / 100
}

export function calculatePieceValue(
  h: number,
  w: number,
  l: number,
  coefficient: number
): number {
  const volume = calculateVolume(h, w, l)
  return Math.round(volume * coefficient * 100) / 100
}

export function pieceStatusLabel(status: string): string {
  const map: Record<string, string> = {
    open: 'Em aberto',
    closed: 'Fechada',
    paid: 'Paga',
    cancelled: 'Cancelada',
  }
  return map[status] ?? status
}

export function closingStatusLabel(status: string): string {
  const map: Record<string, string> = {
    open: 'Em aberto',
    awaiting_payment: 'Aguardando pagamento',
    paid: 'Pago',
  }
  return map[status] ?? status
}

export function appointmentStatusLabel(status: string): string {
  const map: Record<string, string> = {
    confirmed: 'Confirmada',
    cancelled: 'Cancelada',
    no_show: 'Falta',
  }
  return map[status] ?? status
}

export function whatsappLink(phone: string, message: string): string {
  const cleaned = phone.replace(/\D/g, '')
  const encoded = encodeURIComponent(message)
  return `https://wa.me/55${cleaned}?text=${encoded}`
}

export function buildClosingWhatsApp(
  studentName: string,
  month: string,
  items: { name: string; value: number }[],
  total: number,
  pixKey?: string
): string {
  const monthLabel = formatMonth(month)
  const lines = items
    .map((i) => `• ${i.name}: ${formatCurrency(i.value)}`)
    .join('\n')

  let msg = `Olá, ${studentName}! 🌸\n\n`
  msg += `Segue o fechamento do Ateliê Malu Ribeiro referente a *${monthLabel}*:\n\n`
  msg += lines
  msg += `\n\n*Total: ${formatCurrency(total)}*`
  if (pixKey) {
    msg += `\n\nPIX: ${pixKey}`
  }
  msg += '\n\nQualquer dúvida, estou à disposição! 🏺'
  return msg
}
