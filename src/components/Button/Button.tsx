import type { ButtonHTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/cn'

const button = cva(
  'inline-flex items-center justify-center font-semibold transition-opacity disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary: 'bg-cta text-on-dark rounded-button shadow-sm',
        secondary: 'bg-on-dark text-text-brown rounded-button',
        disabled: 'bg-divider text-on-dark rounded-button opacity-60',
      },
      size: {
        md: 'h-10 px-5 text-sm',
        lg: 'h-12 px-7 text-base',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

type ButtonVariant = NonNullable<VariantProps<typeof button>['variant']>

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    Omit<VariantProps<typeof button>, 'variant'> {
  variant?: ButtonVariant
}

export function Button({
  variant = 'primary',
  size,
  className,
  disabled,
  children,
  ...rest
}: ButtonProps) {
  const resolved: ButtonVariant = disabled ? 'disabled' : variant

  return (
    <button
      data-variant={resolved}
      disabled={disabled}
      className={cn(button({ variant: resolved, size }), className)}
      {...rest}
    >
      {children}
    </button>
  )
}
