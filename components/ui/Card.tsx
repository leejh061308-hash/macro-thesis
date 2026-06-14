import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  padding?: "sm" | "md" | "lg";
}

const PADDING = {
  sm: "p-3",
  md: "p-4",
  lg: "p-5",
};

export default function Card({
  children,
  className = "",
  interactive = false,
  padding = "md",
}: CardProps) {
  return (
    <div
      className={`${interactive ? "card-interactive" : "card"} ${PADDING[padding]} ${className}`}
    >
      {children}
    </div>
  );
}
