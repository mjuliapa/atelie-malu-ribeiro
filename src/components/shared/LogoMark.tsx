import Image from 'next/image'

interface LogoMarkProps {
  size?: number
  color?: 'dark' | 'mauve' | 'white'
  className?: string
}

export function LogoMark({ size = 48, color = 'mauve', className = '' }: LogoMarkProps) {
  const src = color === 'white'
    ? '/logo.png'
    : color === 'dark'
      ? '/logo-dark.png'
      : '/logo-mauve.png'

  return (
    <Image
      src={src}
      alt="Malu Ribeiro"
      width={size}
      height={Math.round(size * 0.65)}
      className={className}
      priority
    />
  )
}
