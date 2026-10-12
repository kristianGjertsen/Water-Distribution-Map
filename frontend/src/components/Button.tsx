
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant =
    | 'default'
    | 'primary'
    | 'secondary'
    | 'outline'
    | 'ghost'
    | 'danger'

type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant
    size?: ButtonSize
    loading?: boolean
    fullWidth?: boolean
    children: ReactNode
}

const baseStyles = [
    'inline-flex items-center justify-center gap-2',
    'rounded-md font-medium',
    'transition-colors duration-200',
    'focus-visible:outline-none focus-visible:ring-2',
    'focus-visible:ring-slate-400 focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
].join(' ')

const variants: Record<ButtonVariant, string> = {
    default:
        'bg-blue-300 text-slate-800 border border-slate-200 ' +
        'hover:bg-blue-400 active:bg-slate-200',

    primary:
        'bg-slate-900 text-white border border-slate-900 ' +
        'hover:bg-slate-800 active:bg-slate-950',

    secondary:
        'bg-slate-200 text-slate-800 border border-transparent ' +
        'hover:bg-slate-300 active:bg-slate-400',

    outline:
        'bg-transparent text-slate-700 border border-slate-300 ' +
        'hover:bg-slate-50 active:bg-slate-100',

    ghost:
        'bg-transparent text-slate-700 border border-transparent ' +
        'hover:bg-slate-100 active:bg-slate-200',

    danger:
        'bg-red-50 text-red-700 border border-red-200 ' +
        'hover:bg-red-100 active:bg-red-200',
}

const sizes: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
}

export default function Button({
    variant = 'default',
    size = 'md',
    loading = false,
    fullWidth = false,
    className = '',
    disabled,
    children,
    type = 'button',
    ...props
}: ButtonProps) {
    return (
        <button
            type={type}
            disabled={disabled || loading}
            className={[
                baseStyles,
                variants[variant],
                sizes[size],
                fullWidth ? 'w-full' : '',
                className,
            ]
                .filter(Boolean)
                .join(' ')}
            {...props}
        >
            {loading && (
                <span
                    aria-hidden="true"
                    className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                />
            )}

            {children}
        </button>
    )
}
