// ─── PERFIS ────────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'student'
export type StudentStatus = 'active' | 'paused' | 'former'

export interface Profile {
  id: string
  full_name: string
  phone: string | null
  role: UserRole
  status: StudentStatus
  notes: string | null
  onboarding_completed: boolean
  first_open_piece_date: string | null
  created_at: string
}

// ─── TIPOS DE QUEIMA ───────────────────────────────────────────────────────

export interface FiringType {
  id: string
  name: string
  coefficient: number
  description: string | null
  is_active: boolean
  created_at: string
}

// ─── PEÇAS ─────────────────────────────────────────────────────────────────

export type PieceStatus = 'open' | 'closed' | 'paid' | 'cancelled'

export interface Piece {
  id: string
  student_id: string
  name: string
  description: string | null
  height: number
  width: number
  length: number
  volume: number
  firing_type_id: string
  coefficient: number
  calculated_value: number
  status: PieceStatus
  piece_date: string
  notes: string | null
  created_at: string
  created_by: string
  // joins
  student?: Profile
  firing_type?: FiringType
}

// ─── FECHAMENTOS ───────────────────────────────────────────────────────────

export type ClosingStatus = 'open' | 'awaiting_payment' | 'paid'

export interface MonthlyClosing {
  id: string
  student_id: string
  reference_month: string // "2026-06"
  total_value: number
  status: ClosingStatus
  closed_at: string
  paid_at: string | null
  notes: string | null
  created_by: string
  created_at: string
  // joins
  student?: Profile
  items?: ClosingItem[]
}

export interface ClosingItem {
  id: string
  closing_id: string
  piece_id: string
  value_snapshot: number
  piece?: Piece
}

// ─── AGENDA ────────────────────────────────────────────────────────────────

export interface ScheduleSlot {
  id: string
  start_time: string
  end_time: string
  max_students: number
  torno_spots: number
  is_blocked: boolean
  block_reason: string | null
  created_at: string
  // computed
  appointments?: Appointment[]
  confirmed_count?: number
  available_spots?: number
}

export type AppointmentStatus = 'confirmed' | 'cancelled' | 'no_show'

export interface Appointment {
  id: string
  slot_id: string
  student_id: string
  status: AppointmentStatus
  modality: 'manual' | 'torno'
  cancelled_at: string | null
  cancel_reason: string | null
  created_at: string
  // joins
  slot?: ScheduleSlot
  student?: Profile
  profiles?: Profile
}

export type AttendanceStatus = 'present' | 'absent' | 'justified'

export interface Attendance {
  id: string
  appointment_id: string
  status: AttendanceStatus
  notes: string | null
  recorded_at: string
  recorded_by: string
}

export interface WaitlistEntry {
  id: string
  slot_id: string
  student_id: string
  position: number
  status: 'waiting' | 'offered' | 'confirmed' | 'expired'
  offered_at: string | null
  expires_at: string | null
  created_at: string
  student?: Profile
}

// ─── CONFIGURAÇÕES ─────────────────────────────────────────────────────────

export interface SystemSettings {
  closing_notification_days: number
  max_days_ahead: number
  min_cancel_hours: number
  cancel_policy: 'block' | 'mark_absent' | 'require_approval'
  waitlist_offer_hours: number
  max_students_per_slot: number
}

// ─── AUDITORIA ─────────────────────────────────────────────────────────────

export type AuditAction =
  | 'piece_created'
  | 'piece_edited'
  | 'piece_cancelled'
  | 'closing_generated'
  | 'closing_paid'
  | 'appointment_created'
  | 'appointment_cancelled'
  | 'attendance_recorded'
  | 'slot_created'
  | 'slot_blocked'

export interface AuditLog {
  id: string
  user_id: string
  action: AuditAction
  entity_type: string
  entity_id: string
  payload: Record<string, unknown>
  created_at: string
  user?: Profile
}
