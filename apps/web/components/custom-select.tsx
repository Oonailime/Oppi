"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export interface CustomSelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  options: CustomSelectOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  className?: string;
}

export function CustomSelect({
  value,
  options,
  onChange,
  ariaLabel,
  className = "",
}: CustomSelectProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const selected = options[selectedIndex];

  useEffect(() => {
    function closeFromOutside(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeFromOutside);
    return () => document.removeEventListener("pointerdown", closeFromOutside);
  }, []);

  function openMenu() {
    if (options.length === 0) return;
    setActiveIndex(selectedIndex);
    setOpen(true);
  }

  function focusOption(index: number) {
    if (options.length === 0) return;
    const nextIndex = (index + options.length) % options.length;
    setActiveIndex(nextIndex);
    window.requestAnimationFrame(() => optionRefs.current[nextIndex]?.focus());
  }

  function choose(option: CustomSelectOption) {
    onChange(option.value);
    setOpen(false);
    rootRef.current?.querySelector<HTMLButtonElement>(
      ".custom-select-trigger",
    )?.focus();
  }

  return (
    <div
      className={`custom-select ${open ? "is-open" : ""} ${className}`}
      ref={rootRef}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setOpen(false);
          return;
        }
        if (event.key === "ArrowDown") {
          event.preventDefault();
          if (!open) {
            openMenu();
            window.requestAnimationFrame(() =>
              optionRefs.current[selectedIndex]?.focus(),
            );
          } else {
            focusOption(activeIndex + 1);
          }
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          if (!open) {
            openMenu();
            window.requestAnimationFrame(() =>
              optionRefs.current[selectedIndex]?.focus(),
            );
          } else {
            focusOption(activeIndex - 1);
          }
        }
      }}
    >
      <button
        type="button"
        className="custom-select-trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={options.length === 0}
        onClick={() => (open ? setOpen(false) : openMenu())}
      >
        <span>{selected?.label ?? "Selecione"}</span>
        <ChevronDown size={16} />
      </button>
      {open && (
        <div className="custom-select-menu" role="listbox" aria-label={ariaLabel}>
          {options.map((option, index) => (
            <button
              type="button"
              role="option"
              aria-selected={option.value === value}
              className={[
                option.value === value ? "selected" : "",
                index === activeIndex ? "active" : "",
              ].join(" ")}
              key={option.value}
              ref={(element) => {
                optionRefs.current[index] = element;
              }}
              onFocus={() => setActiveIndex(index)}
              onClick={() => choose(option)}
            >
              <span>{option.label}</span>
              {option.value === value && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
