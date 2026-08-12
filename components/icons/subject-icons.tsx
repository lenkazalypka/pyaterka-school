import type { DiagnosticSubjectSlug } from "@/lib/diagnostic-tests";

type SubjectIconProps = {
  subject: DiagnosticSubjectSlug;
};

const sharedProps = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  strokeWidth: 1.8,
};

export function SubjectIcon({ subject }: SubjectIconProps) {
  return (
    <svg className="v9-subject-icon" viewBox="0 0 64 64" aria-hidden="true" {...sharedProps}>
      {subject === "math" && (
        <>
          <path d="M12 49h40M16 52V14" />
          <path d="M20 43c7-3 8-20 17-20 6 0 7 11 15 13" />
          <circle cx="37" cy="23" r="3.5" fill="var(--icon-fill)" stroke="none" />
        </>
      )}
      {subject === "russian" && (
        <>
          <path d="M13 18c9-4 16-2 19 4v28c-4-6-11-8-19-4V18Z" />
          <path d="M51 18c-9-4-16-2-19 4v28c4-6 11-8 19-4V18Z" />
          <path d="M19 27h7M19 34h8M38 27h7M38 34h6" />
        </>
      )}
      {subject === "social" && (
        <>
          <path d="M32 14v36M19 19h26M24 50h16" />
          <path d="m18 22-7 15h14L18 22Zm28 0-7 15h14L46 22Z" />
          <path d="M11 37c1.8 5 12.2 5 14 0M39 37c1.8 5 12.2 5 14 0" />
        </>
      )}
      {subject === "history" && (
        <>
          <path d="M13 48h38M17 44V24h30v20M22 24v-7h20v7" />
          <path d="M24 31v8M32 31v8M40 31v8" />
          <path d="M17 17h30" />
          <circle cx="47" cy="17" r="4" fill="var(--icon-fill)" stroke="none" />
        </>
      )}
      {subject === "informatics" && (
        <>
          <rect x="13" y="14" width="38" height="30" rx="5" />
          <path d="m24 25-6 5 6 5M40 25l6 5-6 5M35 21l-6 18M25 51h14" />
          <circle cx="48" cy="17" r="5" fill="var(--icon-fill)" stroke="none" />
        </>
      )}
      {subject === "biology" && (
        <>
          <path d="M19 13c25 7 30 24 22 38M45 13c-25 7-30 24-22 38" />
          <path d="M21 20h22M18 29h28M18 39h28M22 48h20" />
          <circle cx="18" cy="29" r="3.5" fill="var(--icon-fill)" stroke="none" />
          <circle cx="46" cy="39" r="3.5" fill="var(--icon-fill)" stroke="none" />
        </>
      )}
      {subject === "chemistry" && (
        <>
          <path d="M25 13h14M28 13v14L17 47c-1 2 0 4 3 4h24c3 0 4-2 3-4L36 27V13" />
          <path d="M22 40h20" />
          <circle cx="28" cy="44" r="2.5" fill="var(--icon-fill)" stroke="none" />
          <circle cx="37" cy="37" r="3.5" fill="var(--icon-fill)" stroke="none" />
        </>
      )}
      {subject === "english" && (
        <>
          <path d="M12 17h30a6 6 0 0 1 6 6v13a6 6 0 0 1-6 6H29L18 50v-8h-6V17Z" />
          <path d="M20 26h20M20 33h14" />
          <circle cx="48" cy="18" r="6" fill="var(--icon-fill)" stroke="none" />
        </>
      )}
    </svg>
  );
}
