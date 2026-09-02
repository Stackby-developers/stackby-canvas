interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 26, className }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth="1.5"
      strokeLinejoin="round"
      className={className}
      style={{ opacity: 0.9 }}
      aria-label="Stackby Studio"
    >
      <path d="M12 3 3 7l9 4 9-4-9-4Z" />
      <path d="m3 12 9 4 9-4" />
    </svg>
  );
}
