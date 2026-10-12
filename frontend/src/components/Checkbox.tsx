
import type { InputHTMLAttributes, ReactNode } from 'react'
import { Check } from 'lucide-react'
import { twMerge } from 'tailwind-merge'

type CheckboxVariant = 'default' | 'primary' | 'outline' | 'ghost' | 'danger'
type CheckboxSize = 'sm' | 'md' | 'lg'

interface CheckboxProps
    extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
    children?: ReactNode
    variant?: CheckboxVariant
    size?: CheckboxSize
    className?: string
    indicatorClassName?: string
    hideIndicator?: boolean
}

// Each variant owns the row, checked background, border and checkmark color.
const variants: Record<CheckboxVariant, { label: string; indicator: string }> = {
    default: {
        label: 'text-slate-700 hover:bg-blue-50 has-[:checked]:bg-blue-50',
        indicator: 'peer-checked:border-blue-400 peer-checked:bg-blue-300 peer-checked:text-slate-900',
    },
    primary: {
        label: 'text-slate-700 hover:bg-slate-50 has-[:checked]:bg-slate-100',
        indicator: 'peer-checked:border-slate-900 peer-checked:bg-slate-900 peer-checked:text-white',
    },
    outline: {
        label: 'border border-slate-200 text-slate-700 hover:bg-slate-50',
        indicator: 'peer-checked:border-slate-700 peer-checked:bg-white peer-checked:text-slate-900',
    },
    ghost: {
        label: 'text-slate-700 hover:bg-slate-100',
        indicator: 'border-transparent bg-transparent peer-checked:border-transparent peer-checked:bg-slate-100 peer-checked:text-slate-900',
    },
    danger: {
        label: 'text-red-700 hover:bg-red-50 has-[:checked]:bg-red-50',
        indicator: 'peer-checked:border-red-600 peer-checked:bg-red-600 peer-checked:text-white',
    },
}

const sizes: Record<CheckboxSize, string> = {
    sm: 'gap-2 px-2 py-1 text-xs',
    md: 'gap-3 px-3 py-2 text-sm',
    lg: 'gap-3 px-4 py-3 text-base',
}

export default function Checkbox({
    children,
    variant = 'default',
    size = 'md',
    className,
    indicatorClassName,
    hideIndicator = false,
    disabled,
    checked,
    defaultChecked,
    onChange,
    ...props
}: CheckboxProps) {
    return (
        <label
            className={twMerge(
                'relative inline-flex cursor-pointer items-center rounded-lg',
                'transition-colors duration-150',
                'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-sky-400',
                'has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50',
                variants[variant].label,
                sizes[size],
                className,
            )}
        >
            <input
                type="checkbox"
                className="peer sr-only"
                disabled={disabled}
                checked={checked}
                defaultChecked={defaultChecked}
                onChange={onChange}
                {...props}
            />

            {!hideIndicator && (
                <span
                    aria-hidden="true"
                    className={twMerge(
                        'flex size-4 shrink-0 items-center justify-center',
                        'rounded border border-slate-300 bg-white text-transparent transition-colors',
                        variants[variant].indicator,
                        indicatorClassName,
                    )}
                >
                    <Check
                        className="size-3"
                        strokeWidth={3}
                    />
                </span>
            )}

            {children && (
                <span className="inline-flex min-w-0 items-center gap-3">
                    {children}
                </span>
            )}
        </label>
    )
}
