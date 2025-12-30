import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

// Custom logo icon for the AI Foresight Platform
export function ForesightLogo({ className = '', size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer circle representing horizon */}
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />

      {/* Inner connected nodes representing AI network */}
      <circle cx="12" cy="6" r="1.5" fill="currentColor" />
      <circle cx="17" cy="10" r="1.5" fill="currentColor" />
      <circle cx="17" cy="14" r="1.5" fill="currentColor" />
      <circle cx="12" cy="18" r="1.5" fill="currentColor" />
      <circle cx="7" cy="14" r="1.5" fill="currentColor" />
      <circle cx="7" cy="10" r="1.5" fill="currentColor" />

      {/* Central node */}
      <circle cx="12" cy="12" r="2" fill="currentColor" />

      {/* Connecting lines */}
      <path
        d="M12 6 L12 10 M12 14 L12 18 M12 10 L7 10 M12 10 L17 10 M12 14 L7 14 M12 14 L17 14"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.5"
      />

      {/* Foresight beam */}
      <path
        d="M12 2 L12 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.8"
      />
      <path
        d="M10 3 L12 6 L14 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.6"
      />
    </svg>
  );
}

// Custom icon for scenario generation
export function ScenarioIcon({ className = '', size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Three branching paths representing multiple scenarios */}
      <path
        d="M3 12 L8 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="8" cy="12" r="2" fill="currentColor" />

      {/* Branching paths */}
      <path
        d="M8 12 L14 6 M8 12 L14 12 M8 12 L14 18"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* End nodes */}
      <circle cx="14" cy="6" r="1.5" fill="currentColor" opacity="0.8" />
      <circle cx="14" cy="12" r="1.5" fill="currentColor" opacity="0.8" />
      <circle cx="14" cy="18" r="1.5" fill="currentColor" opacity="0.8" />

      {/* Extended paths to show futures */}
      <path
        d="M14 6 L21 3 M14 12 L21 12 M14 18 L21 21"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.4"
        strokeDasharray="2 2"
      />
    </svg>
  );
}

// Custom icon for analytics/insights
export function InsightsIcon({ className = '', size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Base chart area */}
      <path
        d="M3 3 L3 21 L21 21"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Rising trend line with emphasis */}
      <path
        d="M3 18 L7 14 L11 16 L15 10 L19 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Data points */}
      <circle cx="7" cy="14" r="1.5" fill="currentColor" />
      <circle cx="11" cy="16" r="1.5" fill="currentColor" />
      <circle cx="15" cy="10" r="1.5" fill="currentColor" />
      <circle cx="19" cy="6" r="1.5" fill="currentColor" />

      {/* Insight spark */}
      <path
        d="M20 4 L21 2 M22 5 L24 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Custom icon for strategic planning
export function StrategyIcon({ className = '', size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Chess knight piece representing strategy */}
      <path
        d="M6 20 L18 20 L18 18 L6 18 Z"
        fill="currentColor"
        opacity="0.8"
      />
      <path
        d="M7 18 L7 14 L9 12 L9 8 L11 6 L13 6 L15 8 L15 10 L17 12 L17 18"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="13" cy="8" r="1" fill="currentColor" />

      {/* Strategic grid overlay */}
      <path
        d="M3 3 L21 3 L21 15 L3 15 Z"
        stroke="currentColor"
        strokeWidth="0.5"
        opacity="0.2"
      />
      <path
        d="M3 9 L21 9 M12 3 L12 15"
        stroke="currentColor"
        strokeWidth="0.5"
        opacity="0.2"
      />
    </svg>
  );
}

// Custom icon for AI processing
export function AIProcessingIcon({ className = '', size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Neural network representation */}
      <circle cx="6" cy="6" r="2" fill="currentColor" opacity="0.6" />
      <circle cx="18" cy="6" r="2" fill="currentColor" opacity="0.6" />
      <circle cx="6" cy="18" r="2" fill="currentColor" opacity="0.6" />
      <circle cx="18" cy="18" r="2" fill="currentColor" opacity="0.6" />

      {/* Central processing unit */}
      <rect
        x="9"
        y="9"
        width="6"
        height="6"
        fill="currentColor"
        opacity="0.8"
        rx="1"
      />

      {/* Connections */}
      <path
        d="M6 6 L9 9 M18 6 L15 9 M6 18 L9 15 M18 18 L15 15"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.4"
      />

      {/* Processing indicator */}
      <circle cx="12" cy="12" r="1.5" fill="white" opacity="0.9" />
    </svg>
  );
}

// Custom icon for document/report
export function DocumentIcon({ className = '', size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Document outline */}
      <path
        d="M6 2 L6 22 L18 22 L18 7 L13 2 Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Folded corner */}
      <path
        d="M13 2 L13 7 L18 7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Content lines */}
      <path
        d="M9 12 L15 12 M9 15 L15 15 M9 18 L12 18"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Important indicator */}
      <circle cx="10" cy="9" r="0.5" fill="currentColor" />
    </svg>
  );
}

// Custom icon for timeline/horizon
export function TimelineIcon({ className = '', size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Timeline arrow */}
      <path
        d="M2 12 L22 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M18 8 L22 12 L18 16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Time markers */}
      <circle cx="6" cy="12" r="2" fill="currentColor" opacity="0.8" />
      <circle cx="12" cy="12" r="2" fill="currentColor" opacity="0.6" />
      <circle cx="18" cy="12" r="2" fill="currentColor" opacity="0.4" />

      {/* Vertical markers */}
      <path
        d="M6 8 L6 16 M12 10 L12 14 M18 10 L18 14"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  );
}
