"use client";
import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
export default function SubmitButton({ children, pendingText, className = "btn", disabled = false }: { children: ReactNode; pendingText: string; className?: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return <button className={className} type="submit" disabled={pending || disabled}>{pending ? pendingText : children}</button>;
}
