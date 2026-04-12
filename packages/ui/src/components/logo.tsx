interface RavenLogoProps {
  readonly className?: string;
}

export const RavenLogo = ({ className }: RavenLogoProps) => (
  <svg
    aria-hidden="true"
    className={className}
    fill="none"
    viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect fill="currentColor" height="32" rx="8" width="32" />
    <path
      d="M8 12L16 6L24 12V20L16 26L8 20V12Z"
      fill="currentColor"
      opacity="0.9"
    />
    <path d="M16 6L24 12L16 18L8 12L16 6Z" fill="currentColor" />
  </svg>
);
