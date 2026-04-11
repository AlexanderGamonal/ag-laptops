import Image from 'next/image'

type BrandMarkProps = {
  compact?: boolean
  showSlogan?: boolean
  inverted?: boolean
  align?: 'left' | 'center'
  variant?: 'full' | 'icon'
}

export default function BrandMark({
  compact = false,
  showSlogan = false,
  inverted = false,
  align = 'left',
  variant = 'full',
}: BrandMarkProps) {
  const alignment = align === 'center' ? 'items-center text-center' : 'items-start text-left'
  const titleColor = inverted ? 'text-white' : 'text-slate-900'
  const secondaryColor = inverted ? 'text-slate-300' : 'text-slate-500'
  const accentColor = inverted ? 'text-blue-200' : 'text-blue-600'
  const iconOnly = variant === 'icon'

  return (
    <div className={`inline-flex ${iconOnly ? '' : 'flex-col gap-2'} ${alignment}`}>
      <div className={`relative flex-shrink-0 ${iconOnly ? compact ? 'h-9 w-14 sm:h-10 sm:w-16' : 'h-16 w-24 sm:h-20 sm:w-28' : compact ? 'h-11 w-[4.5rem] sm:h-12 sm:w-[5rem]' : 'h-16 w-24 sm:h-20 sm:w-28'}`}>
        <Image
          src="/brand/ag-logo.png"
          alt="AG"
          fill
          priority={compact}
          className="object-contain"
          sizes={compact ? '(max-width: 640px) 56px, 64px' : '(max-width: 640px) 96px, 112px'}
        />
      </div>

      {!iconOnly && (
        <div className={`flex flex-col ${alignment}`}>
          <p className={`${compact ? 'text-[11px] sm:text-xs tracking-[0.28em]' : 'text-sm sm:text-base tracking-[0.32em]'} font-semibold uppercase leading-tight ${secondaryColor}`}>
            Solutions &amp; Services
          </p>
          <p className={`${compact ? 'mt-1 text-[13px] sm:text-[15px]' : 'mt-1 text-xl sm:text-2xl'} font-semibold leading-tight ${titleColor}`}>
            <span className={accentColor}>AG</span> Solutions &amp; Services
          </p>
          {showSlogan && (
            <p className={`mt-1.5 max-w-xs text-xs sm:text-sm font-medium leading-5 ${secondaryColor}`}>
              Tecnología confiable para trabajar, estudiar y crecer
            </p>
          )}
        </div>
      )}
    </div>
  )
}
