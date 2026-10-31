// components/Select.tsx
"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronDown, Check } from "lucide-react"

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  value: string
  options: (string | SelectOption)[]
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  /** "default" = themed input look; "colored" = solid chip look (uses triggerClassName). */
  variant?: "default" | "colored"
  triggerClassName?: string
  className?: string
  size?: "sm" | "md"
}

function normalize(options: (string | SelectOption)[]): SelectOption[] {
  return options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o
  )
}

export default function Select({
  value,
  options,
  onChange,
  disabled = false,
  placeholder,
  variant = "default",
  triggerClassName = "",
  className = "",
  size = "md",
}: SelectProps) {
  const opts = normalize(options)
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState<number>(-1)
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const selected = opts.find((o) => o.value === value)
  const selectedLabel = selected ? selected.label : placeholder ?? value

  // Close on outside click / ESC
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onClick)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  // Reset highlight when opening
  useEffect(() => {
    if (open) {
      const idx = opts.findIndex((o) => o.value === value)
      setHighlight(idx >= 0 ? idx : 0)
    }
  }, [open, opts, value])

  // Scroll highlighted option into view
  useEffect(() => {
    if (!open || highlight < 0 || !listRef.current) return
    const el = listRef.current.children[highlight] as HTMLElement | undefined
    el?.scrollIntoView({ block: "nearest" })
  }, [highlight, open])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
      e.preventDefault()
      if (!open) setOpen(true)
      else if (e.key === "ArrowDown") {
        setHighlight((h) => Math.min(opts.length - 1, h + 1))
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      if (open) setHighlight((h) => Math.max(0, h - 1))
    } else if (e.key === "Enter" && open && highlight >= 0) {
      e.preventDefault()
      onChange(opts[highlight].value)
      setOpen(false)
    }
  }

  const sizeClasses =
    size === "sm"
      ? "h-8 px-2.5 text-xs! max-sm:text-[12px]!"
      : "h-10 px-3 text-sm! max-sm:text-[13px]!"

  const triggerBase =
    variant === "colored"
      ? `relative flex w-full items-center justify-between gap-2 rounded-lg font-semibold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-white/40 ${sizeClasses} ${triggerClassName}`
      : `app-select relative flex w-full items-center justify-between gap-2 font-semibold ${sizeClasses} ${triggerClassName}`

  return (
    <div ref={rootRef} className={`relative block w-full min-w-0 ${className}`}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={handleKeyDown}
        className={`${triggerBase} ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown
          size={size === "sm" ? 14 : 16}
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border shadow-xl" style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)", color: "var(--foreground)" }}>
          <ul
            ref={listRef}
            role="listbox"
            className="max-h-60 overflow-y-auto py-1"
          >
            {opts.map((opt, idx) => {
              const isSelected = opt.value === value
              const isHighlighted = idx === highlight
              return (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setHighlight(idx)}
                  onClick={() => {
                    onChange(opt.value)
                    setOpen(false)
                  }}
                  className={`flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm transition-colors ${
                    isHighlighted ? "bg-[var(--surface-raised)]" : ""
                  } ${isSelected ? "font-semibold text-[var(--primary)]" : "text-[var(--foreground)]"}`}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <Check size={14} className="shrink-0" />}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}