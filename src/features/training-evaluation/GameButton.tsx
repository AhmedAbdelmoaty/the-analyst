import type { ButtonHTMLAttributes } from "react";

export function GameButton({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className={`g-btn ${className}`} {...props} />;
}
