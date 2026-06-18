import { cn } from '../../lib/cn'
import banner from '../../assets/section2/banner/theme1.png'

export interface BannerProps {
  title?: string
  src?: string
  className?: string
}

export function Banner({ title, src = banner, className }: BannerProps) {
  return (
    <header className={cn('w-full', className)}>
      <img src={src} alt={title ?? 'banner'} className="w-full h-[240px] object-cover" />
    </header>
  )
}
