import type { JSX } from "preact";

type IconProps = { size?: number; className?: string };

export function IconFeedback({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path
        d="M6 5.5H16.5C18.4 5.5 20 7.1 20 9V12.5C20 14.4 18.4 16 16.5 16H11.5L8 19V16H6C4.1 16 2.5 14.4 2.5 12.5V9C2.5 7.1 4.1 5.5 6 5.5Z"
        strokeLinejoin="round"
      />
      <path d="M12 8.25V13" strokeLinecap="round" />
      <path d="M9.5 10.75H14.5" strokeLinecap="round" />
    </svg>
  );
}

/** @deprecated use IconFeedback */
export function IconSparkle({ size = 24 }: IconProps) {
  return <IconFeedback size={size} />;
}

export function IconPause({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 6V18M16 6V18" strokeLinecap="round" />
    </svg>
  );
}

export function IconPlay({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 5V19L19 12L8 5Z" strokeLinejoin="round" />
    </svg>
  );
}

export function IconEye({ size = 24, open = true }: IconProps & { open?: boolean }) {
  if (!open) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 3L21 21M10.5 10.7A3 3 0 0013.3 13.5M7.4 7.5C5.6 8.8 4.2 10.4 3 12C5.4 16.1 8.5 18.5 12 18.5C13.6 18.5 15.1 18.1 16.5 17.3M9.9 5.1C10.6 5 11.3 5 12 5C18.5 5 21 12 21 12C20.3 13.2 19.4 14.3 18.3 15.2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3.9 12.8C5.4 9.6 8.5 6.2 12 6.2C15.5 6.2 18.6 9.6 20.1 12.8C18.6 16 15.5 19.4 12 19.4C8.5 19.4 5.4 16 3.9 12.8Z" strokeLinejoin="round" />
      <circle cx="12" cy="12.8" r="2.8" />
    </svg>
  );
}

export function IconCopy({ size = 24, copied = false }: IconProps & { copied?: boolean }) {
  if (copied) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 20C7.6 20 4 16.4 4 12C4 7.6 7.6 4 12 4C16.4 4 20 7.6 20 12C20 16.4 16.4 20 12 20Z" />
        <path d="M15 10L11 14.25L9.25 12.25" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4.75 11.25V17.75C4.75 18.6 5.42 19.25 6.25 19.25H12.75C13.58 19.25 14.25 18.6 14.25 17.75V11.25H4.75Z" />
      <path d="M17.25 14.25H17.75C18.58 14.25 19.25 13.58 19.25 12.75V6.25C19.25 5.42 18.58 4.75 17.75 4.75H11.25C10.42 4.75 9.75 5.42 9.75 6.25V6.75" strokeLinecap="round" />
    </svg>
  );
}

export function IconTrash({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M10 11.5V15.5M14 11.5V15.5M9 7.5V6.25C9 5.42 9.67 4.75 10.5 4.75H13.5C14.33 4.75 15 5.42 15 6.25V7.5M5.5 7.75H18.5M6.75 7.75L7.12 16.19C7.16 17.26 7.19 17.8 7.41 18.21C7.61 18.57 7.91 18.86 8.28 19.04C8.7 19.25 9.24 19.25 10.31 19.25H13.69C14.76 19.25 15.3 19.25 15.72 19.04C16.09 18.86 16.39 18.57 16.59 18.21C16.81 17.8 16.84 17.26 16.88 16.19L17.25 7.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconGear({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M10.65 5.81C10.99 4.4 13.01 4.4 13.35 5.81C13.57 6.73 14.62 7.16 15.42 6.67C16.67 5.91 18.09 7.33 17.33 8.58C16.84 9.38 17.27 10.43 18.19 10.65C19.6 10.99 19.6 13.01 18.19 13.35C17.27 13.57 16.84 14.62 17.33 15.42C18.09 16.67 16.67 18.09 15.42 17.33C14.62 16.84 13.57 17.27 13.35 18.19C13.01 19.6 10.99 19.6 10.65 18.19C10.43 17.27 9.38 16.84 8.58 17.33C7.33 18.09 5.91 16.67 6.67 15.42C7.16 14.62 6.73 13.57 5.81 13.35C4.4 13.01 4.4 10.99 5.81 10.65C6.73 10.43 7.16 9.38 6.67 8.58C5.91 7.33 7.33 5.91 8.58 6.67C9.38 7.16 10.43 6.73 10.65 5.81Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

export function IconX({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 6L18 18M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}

export function IconPlus({ size = 12 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 2V10M2 6H10" strokeLinecap="round" />
    </svg>
  );
}

export function IconEdit({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 20H8L18.5 9.5C19.3 8.7 19.3 7.3 18.5 6.5L17.5 5.5C16.7 4.7 15.3 4.7 14.5 5.5L4 16V20Z" strokeLinejoin="round" />
    </svg>
  );
}

export function IconSun({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2V4M12 20V22M4.93 4.93L6.34 6.34M17.66 17.66L19.07 19.07M2 12H4M20 12H22M4.93 19.07L6.34 17.66M17.66 6.34L19.07 4.93" strokeLinecap="round" />
    </svg>
  );
}

export function IconMoon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M21 14.5A8.5 8.5 0 1112.5 3A7 7 0 0021 14.5Z" strokeLinejoin="round" />
    </svg>
  );
}

export function IconSpinner({ size = 16 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="ctf-icon-spinner"
    >
      <path d="M12 3V6" strokeLinecap="round" />
      <path d="M12 18V21" strokeLinecap="round" opacity="0.4" />
      <path d="M3 12H6" strokeLinecap="round" opacity="0.7" />
      <path d="M18 12H21" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

export function IconList({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 6H20M8 12H20M8 18H20" strokeLinecap="round" />
      <circle cx="4" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="4" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="4" cy="18" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconEyeReady({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#30D158" strokeWidth="1.5">
      <path d="M3.9 12.8C5.4 9.6 8.5 6.2 12 6.2C15.5 6.2 18.6 9.6 20.1 12.8C18.6 16 15.5 19.4 12 19.4C8.5 19.4 5.4 16 3.9 12.8Z" strokeLinejoin="round" />
      <circle cx="12" cy="12.8" r="2.8" />
    </svg>
  );
}
