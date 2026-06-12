interface LogoMarkProps {
  size?: number
  color?: string
  className?: string
}

export function LogoMark({ size = 48, color = '#C8B9A8', className }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size * 1.3}
      viewBox="0 0 100 130"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Ateliê Malu Ribeiro — flor de lótus"
    >
      {/* Pétalas laterais externas */}
      <path
        d="M50 60 C35 55, 18 45, 20 28 C22 18, 32 12, 38 20 C42 26, 44 40, 50 60Z"
        fill={color}
        opacity="0.85"
      />
      <path
        d="M50 60 C65 55, 82 45, 80 28 C78 18, 68 12, 62 20 C58 26, 56 40, 50 60Z"
        fill={color}
        opacity="0.85"
      />
      {/* Pétalas laterais internas */}
      <path
        d="M50 60 C40 50, 28 38, 32 22 C35 12, 44 10, 47 20 C49 28, 50 44, 50 60Z"
        fill={color}
      />
      <path
        d="M50 60 C60 50, 72 38, 68 22 C65 12, 56 10, 53 20 C51 28, 50 44, 50 60Z"
        fill={color}
      />
      {/* Pétala central */}
      <path
        d="M50 60 C46 48, 44 34, 50 18 C56 34, 54 48, 50 60Z"
        fill={color}
      />
      {/* Caule com curva */}
      <path
        d="M50 62 C50 75, 44 88, 38 98 C35 104, 36 110, 42 112"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M42 112 C48 114, 54 116, 58 122"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.7"
      />
    </svg>
  )
}

// Versão com fundo sand (para usar em backgrounds escuros)
export function LogoMarkWhite({ size = 48, className }: Omit<LogoMarkProps, 'color'>) {
  return <LogoMark size={size} color="#FFFFFF" className={className} />
}

// Versão mauve (para uso em backgrounds claros com mais contraste)
export function LogoMarkMauve({ size = 48, className }: Omit<LogoMarkProps, 'color'>) {
  return <LogoMark size={size} color="#B07A80" className={className} />
}
