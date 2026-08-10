"use client";

import { Check, ChevronDown } from "lucide-react";
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuPosition, setMenuPosition] = useState<CSSProperties>({});
  const compact = className.split(/\s+/).includes("compact");
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const selected = options[selectedIndex];

  useEffect(() => {
    function closeFromOutside(event: PointerEvent) {
      const target = event.target as Node;
      if (
        !rootRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeFromOutside);
    return () => document.removeEventListener("pointerdown", closeFromOutside);
  }, []);

  const positionCompactMenu = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const viewportGap = 8;
    const menuGap = 7;
    const preferredHeight = Math.min(280, options.length * 39 + 12);
    const roomBelow = window.innerHeight - rect.bottom - menuGap - viewportGap;
    const roomAbove = rect.top - menuGap - viewportGap;
    const opensAbove =
      roomBelow < Math.min(preferredHeight, 120) && roomAbove > roomBelow;
    const availableHeight = opensAbove ? roomAbove : roomBelow;
    const alignRight = rect.left + rect.width / 2 > window.innerWidth / 2;

    setMenuPosition({
      left: alignRight ? undefined : Math.max(viewportGap, rect.left),
      right: alignRight
        ? Math.max(viewportGap, window.innerWidth - rect.right)
        : undefined,
      maxHeight: Math.max(48, Math.min(280, availableHeight)),
      minWidth: Math.min(
        Math.max(180, rect.width),
        window.innerWidth - viewportGap * 2,
      ),
      top: opensAbove ? rect.top - menuGap : rect.bottom + menuGap,
      transform: opensAbove ? "translateY(-100%)" : undefined,
    });
  }, [options.length]);

  useEffect(() => {
    if (!open || !compact) return;
    positionCompactMenu();
    window.addEventListener("resize", positionCompactMenu);
    window.addEventListener("scroll", positionCompactMenu, true);
    return () => {
      window.removeEventListener("resize", positionCompactMenu);
      window.removeEventListener("scroll", positionCompactMenu, true);
    };
  }, [compact, open, positionCompactMenu]);

  function openMenu() {
    if (options.length === 0) return;
    if (compact) positionCompactMenu();
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

  const menu = (
    <div
      className={`custom-select-menu ${compact ? "compact portal" : ""}`}
      id={menuId}
      ref={menuRef}
      role="listbox"
      aria-label={ariaLabel}
      style={compact ? menuPosition : undefined}
    >
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
  );

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
        ref={triggerRef}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        disabled={options.length === 0}
        onClick={() => (open ? setOpen(false) : openMenu())}
      >
        <span>{selected?.label ?? "Selecione"}</span>
        <ChevronDown size={16} />
      </button>
      {open &&
        (compact && typeof document !== "undefined"
          ? createPortal(menu, document.body)
          : menu)}
    </div>
  );
}
