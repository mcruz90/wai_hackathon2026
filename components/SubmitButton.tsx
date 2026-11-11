"use client";
import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
export default function SubmitButton({ children, pendingText, className = "btn" }: { children: ReactNode; pendingText: string; className?: string }) {
  const { pending } = useFormStatus();
  return <button className={className} type="submit" disabled={pending}>{pending ? pendingText : children}</button>;
}
