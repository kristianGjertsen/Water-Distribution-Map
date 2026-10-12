
import * as RadixSelect from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import { twMerge } from 'tailwind-merge'

type SelectVariant = 'default' | 'outline' | 'ghost'
type SelectSize = 'sm' | 'md' | 'lg'

type SelectOption = {
  value: string
  label: string
  disabled?: boolean
}

type SelectProps = {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  variant?: SelectVariant
  size?: SelectSize
  className?: string
  disabled?: boolean
  name?: string
}

const variants = {
  default: 'bg-slate-50 border-slate-200 hover:bg-slate-100',
  outline: 'bg-white border-slate-300 hover:bg-slate-50',
  ghost: 'bg-transparent border-transparent hover:bg-slate-100',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
}

export default function Select({
  value,
  defaultValue,
  onValueChange,
  options,
  placeholder = 'Velg alternativ',
  variant = 'default',
  size = 'md',
  className,
  disabled,
  name,
}: SelectProps) {
  return (
    <RadixSelect.Root
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      disabled={disabled}
      name={name}
    >
      <RadixSelect.Trigger
        className={twMerge(
          'inline-flex w-full items-center justify-between gap-3',
          'rounded-xl border font-medium text-slate-800',
          'transition-colors duration-200',
          'outline-none focus-visible:ring-2 focus-visible:ring-slate-400',
          'disabled:cursor-not-allowed disabled:opacity-50',
          variants[variant],
          sizes[size],
          className,
        )}
      >
        <RadixSelect.Value placeholder={placeholder} />

        <RadixSelect.Icon>
          <ChevronDown className="size-4 text-slate-500" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>

      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={6}
          className={twMerge(
            'z-50 overflow-hidden rounded-xl',
            'border border-slate-200 bg-white p-1',
            'shadow-lg shadow-slate-900/10',
            'w-[var(--radix-select-trigger-width)]',
            'max-h-[var(--radix-select-content-available-height)]',
          )}
        >
          <RadixSelect.Viewport>
            {options.map((option) => (
              <RadixSelect.Item
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className={twMerge(
                  'relative flex cursor-pointer select-none',
                  'items-center rounded-lg px-3 py-2 pr-8',
                  'text-sm text-slate-700 outline-none',
                  'data-[highlighted]:bg-slate-100',
                  'data-[highlighted]:text-slate-900',
                  'data-[disabled]:opacity-40',
                  'data-[disabled]:cursor-not-allowed',
                )}
              >
                <RadixSelect.ItemText>
                  {option.label}
                </RadixSelect.ItemText>

                <RadixSelect.ItemIndicator
                  className="absolute right-2"
                >
                  <Check className="size-4" />
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  )
}
