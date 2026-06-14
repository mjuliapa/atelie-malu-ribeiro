'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LogoMark } from '@/components/shared/LogoMark'

const adminNavItems = [
  {
    href: '/admin',
    label: 'Início',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline strokeLinecap="round" strokeLinejoin="round" points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    exact: true,
  },
  {
    href: '/admin/agenda',
    label: 'Agenda',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="16" y1="2" x2="16" y2="6" strokeLinecap="round" />
        <line x1="8" y1="2" x2="8" y2="6" strokeLinecap="round" />
        <line x1="3" y1="10" x2="21" y2="10" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/admin/alunos',
    label: 'Alunos',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: '/admin/pecas',
    label: 'Peças',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
      </svg>
    ),
  },
  {
    href: '/admin/argila',
    label: 'Argila',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 7V5a2 2 0 0 0-2-2H8" />
      </svg>
    ),
  },
  {
    href: '/admin/fechamentos',
    label: 'Cobranças',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <line x1="12" y1="1" x2="12" y2="23" strokeLinecap="round" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
]

export function AdminNavBottom() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-brand-line safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {adminNavItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors min-w-[56px]',
                isActive
                  ? 'text-brand-mauve'
                  : 'text-brand-muted hover:text-brand-text'
              )}
            >
              {item.icon}
              <span className={cn('text-[10px] font-medium', isActive && 'text-brand-mauve')}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export function AdminNavHeader({ title, showBack }: { title: string; showBack?: boolean }) {
  const router = useRouter()

  async function handleLogout() {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="sticky top-0 z-40 bg-brand-cream border-b border-brand-line">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          {showBack ? (
            <Link
              href="#"
              onClick={(e) => { e.preventDefault(); window.history.back() }}
              className="p-1 -ml-1 text-brand-muted hover:text-brand-text"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
              </svg>
            </Link>
          ) : (
            <LogoMark size={28} color="mauve" />
          )}
          <span className="font-display text-base text-brand-text">{title}</span>
        </div>
        <button
          onClick={handleLogout}
          className="p-2 rounded-lg text-brand-muted hover:text-brand-text hover:bg-brand-sand-light transition-colors"
          aria-label="Sair"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline strokeLinecap="round" strokeLinejoin="round" points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </header>
  )
}