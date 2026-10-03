"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import {
  CigaretteOff,
  Smartphone,
  Moon,
  Coffee,
  Heart,
  Leaf,
  X,
} from "lucide-react";
import type { HabitIcon } from "@/lib/habits";

const icons = {
  cigarette: CigaretteOff,
  phone: Smartphone,
  moon: Moon,
  coffee: Coffee,
  heart: Heart,
  leaf: Leaf,
};
export function HabitSymbol({
  name,
  size = 23,
}: {
  name: HabitIcon;
  size?: number;
}) {
  const Icon = icons[name];
  return <Icon size={size} strokeWidth={1.6} aria-hidden="true" />;
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? "compact" : ""}`}>
      <span className="brand-mark">
        <svg
          width="30"
          height="30"
          viewBox="0 0 40 40"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M20 32V18"
            stroke="currentColor"
            strokeWidth="2.3"
            strokeLinecap="round"
          />
          <path
            d="M19 23C11 24 7 19 8 12c8-1 13 3 11 11Z"
            fill="currentColor"
            opacity=".65"
          />
          <path
            d="M21 18c-1-7 3-12 11-11 1 7-4 12-11 11Z"
            fill="currentColor"
          />
          <path
            d="m10 28 5 5 15-15"
            stroke="currentColor"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <div>
        <strong>
          هبیت<span className="brand-dot">.</span>
        </strong>
        {!compact && <small>هر روز، یک قدم</small>}
      </div>
    </div>
  );
}

export function GrowingPlant() {
  return (
    <svg
      className="growing-plant"
      viewBox="0 0 270 215"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="139" cy="102" r="84" fill="#dbeadd" />
      <circle cx="139" cy="102" r="64" stroke="#c5dac9" strokeDasharray="3 8" />
      <path
        d="M40 181h190"
        stroke="#aec8b5"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M133 179v-70c0-29 10-52 33-67"
        stroke="#51765b"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="M135 143c-34 2-59-19-56-48 35-3 57 17 56 48Z" fill="#89b498" />
      <path d="M140 108c28 4 52-13 53-40-29-6-51 10-53 40Z" fill="#517b5c" />
      <path d="M150 65c-23-5-30-25-23-43 23 4 33 25 23 43Z" fill="#accbb1" />
      <path
        d="m135 142-38-31m45-5 34-21"
        stroke="#e9f3ea"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M112 159h46l-5 22h-36l-5-22Z"
        fill="#f7faf5"
        stroke="#b8cfbd"
        strokeWidth="1.5"
      />
      <circle cx="54" cy="97" r="16" fill="#f6faf5" />
      <path
        d="m48 97 4 4 8-9"
        stroke="#628768"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="214" cy="131" r="12" fill="#edf5eb" />
      <path
        d="m210 131 3 3 6-7"
        stroke="#628768"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M206 45v10m-5-5h10"
        stroke="#8bab90"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M64 152v7m-3.5-3.5h7"
        stroke="#8bab90"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <ellipse cx="135" cy="185" rx="30" ry="3" fill="#c6dbca" opacity=".5" />
    </svg>
  );
}

export function Dialog({
  title,
  subtitle,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    dialog?.querySelector<HTMLInputElement>("[data-autofocus]")?.focus();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`dialog ${wide ? "dialog-wide" : ""}`}
      aria-labelledby={id}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="dialog-body">
        <div className="dialog-heading">
          <div>
            <h2 id={id}>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="icon-button" aria-label="بستن" onClick={onClose}>
            <X size={21} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
