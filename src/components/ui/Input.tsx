import { forwardRef } from 'react'
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const fieldBase =
  'w-full rounded-token border bg-wisdom px-4 py-3 text-neft placeholder:text-ink-40 transition-colors duration-200 focus:border-ocean focus:outline-none'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, className, id, ...rest },
  ref,
) {
  const fieldId = id || rest.name
  return (
    <label className="block" htmlFor={fieldId}>
      {label && (
        <span className="mb-2 block text-[0.72rem] uppercase tracking-wide text-ink-60">{label}</span>
      )}
      <input
        ref={ref}
        id={fieldId}
        className={cn(fieldBase, error ? 'border-ocean' : 'border-ink-20', className)}
        aria-invalid={Boolean(error)}
        {...rest}
      />
      {error ? (
        <span className="mt-1.5 block text-[0.75rem] text-ocean">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-[0.75rem] text-ink-60">{hint}</span>
      ) : null}
    </label>
  )
})

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, className, id, ...rest },
  ref,
) {
  const fieldId = id || rest.name
  return (
    <label className="block" htmlFor={fieldId}>
      {label && (
        <span className="mb-2 block text-[0.72rem] uppercase tracking-wide text-ink-60">{label}</span>
      )}
      <textarea
        ref={ref}
        id={fieldId}
        className={cn(fieldBase, 'min-h-[120px] resize-y', error ? 'border-ocean' : 'border-ink-20', className)}
        {...rest}
      />
      {error && <span className="mt-1.5 block text-[0.75rem] text-ocean">{error}</span>}
    </label>
  )
})
