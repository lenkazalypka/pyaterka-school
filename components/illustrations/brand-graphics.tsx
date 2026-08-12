type MetricGraphicProps = {
  kind: "subjects" | "onboarding" | "exams" | "access";
};

export function MetricGraphic({ kind }: MetricGraphicProps) {
  if (kind === "subjects") {
    return (
      <svg className="v9-metric-graphic" viewBox="0 0 92 54" aria-hidden="true">
        <path d="M9 37C24 15 44 11 81 17" />
        {[15, 35, 55, 77].map((cx, index) => <circle cx={cx} cy={index % 2 ? 24 : 33} r="5" key={cx} />)}
      </svg>
    );
  }

  if (kind === "onboarding") {
    return (
      <svg className="v9-metric-graphic v9-metric-path" viewBox="0 0 92 54" aria-hidden="true">
        <path d="M8 39c13-20 25 8 39-10s21 7 37-12" />
        {[8, 19, 30, 42, 54, 65, 75, 84].map((cx, index) => <circle cx={cx} cy={index % 3 === 0 ? 39 : index % 2 ? 31 : 25} r="3.4" key={cx} />)}
      </svg>
    );
  }

  if (kind === "exams") {
    return (
      <svg className="v9-metric-graphic" viewBox="0 0 92 54" aria-hidden="true">
        <path d="M15 12h48l14 14v20H15V12Z" />
        <path d="M63 12v14h14M25 27h25M25 36h17" />
        <circle cx="70" cy="41" r="7" />
        <path d="m67 41 2 2 4-5" />
      </svg>
    );
  }

  return (
    <svg className="v9-metric-graphic" viewBox="0 0 92 54" aria-hidden="true">
      <circle cx="46" cy="27" r="19" />
      <path d="M46 13v14l10 6M11 27h7M74 27h7" />
      <circle cx="46" cy="27" r="3.5" />
    </svg>
  );
}

export function HeroMarkerNote() {
  return (
    <div className="v9-hero-marker" aria-hidden="true">
      <span>не зубрить всё</span>
      <strong>идти по плану</strong>
      <svg viewBox="0 0 150 72">
        <path d="M8 10c24 6 51 14 71 29 13 10 22 18 50 15" />
        <path d="m116 43 14 11-17 6" />
      </svg>
    </div>
  );
}

export function VerificationSeal() {
  return (
    <svg className="v9-verification-seal" viewBox="0 0 210 210" aria-hidden="true">
      <circle cx="105" cy="105" r="88" />
      <circle cx="105" cy="105" r="69" />
      <path d="m66 106 25 25 54-61" />
      <path d="M105 17v16M105 177v16M17 105h16M177 105h16" />
      <text x="105" y="58" textAnchor="middle">ПРОВЕРЕНО</text>
      <text x="105" y="166" textAnchor="middle">БЕЗ ПРИПИСОК</text>
    </svg>
  );
}

type TeacherIllustrationProps = {
  kind: "expert" | "clarity" | "support" | "progress";
};

export function TeacherIllustration({ kind }: TeacherIllustrationProps) {
  return (
    <svg className={`v9-teacher-illustration is-${kind}`} viewBox="0 0 180 140" aria-hidden="true">
      <path className="backdrop" d="M21 115c-6-46 9-86 52-94 45-9 92 19 88 70-3 38-34 42-76 41-30-1-59 4-64-17Z" />
      {kind === "expert" && (
        <>
          <circle cx="76" cy="54" r="17" />
          <path d="M50 121c2-32 9-48 26-48s25 17 27 48M104 41h43v52h-38M115 53h21M115 63h16M115 73h19" />
          <path className="accent" d="m128 93 9 15 19-31" />
        </>
      )}
      {kind === "clarity" && (
        <>
          <circle cx="65" cy="61" r="17" />
          <path d="M40 122c2-30 9-45 25-45 17 0 24 15 26 45M88 37h57v39h-27l-13 11V76H88V37Z" />
          <path d="M100 50h32M100 61h22" />
          <circle className="accent-fill" cx="142" cy="37" r="9" />
        </>
      )}
      {kind === "support" && (
        <>
          <circle cx="57" cy="58" r="15" />
          <circle cx="119" cy="54" r="17" />
          <path d="M34 122c2-30 8-45 23-45s22 15 24 45M91 122c2-34 10-51 28-51s26 17 28 51" />
          <path className="accent" d="M75 89c12 10 21 11 32 0" />
          <path className="accent-fill" d="M85 43c-9-9-21 2-5 16l5 5 5-5c16-14 4-25-5-16Z" />
        </>
      )}
      {kind === "progress" && (
        <>
          <circle cx="53" cy="61" r="16" />
          <path d="M29 122c3-31 9-46 24-46 17 0 24 15 27 46M93 111h18V94h18V76h18V58h18" />
          <path className="accent" d="m95 75 21-20 13 10 27-29" />
          <path className="accent" d="m145 36 11 0 0 11" />
        </>
      )}
    </svg>
  );
}
