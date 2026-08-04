"use client";

import { useId, useState } from "react";

type FaqAccordionProps = {
  items: ReadonlyArray<readonly [string, string]>;
};

function FaqItem({ answer, index, question }: { answer: string; index: number; question: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const answerId = `${useId()}-answer`;

  return (
    <div className="v2-faq-item" data-open={isOpen}>
      <button
        type="button"
        aria-controls={answerId}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span>{String(index + 1).padStart(2, "0")}</span>
        <b>{question}</b>
        <i aria-hidden="true">+</i>
      </button>
      <div className="v2-faq-answer" id={answerId} aria-hidden={!isOpen}>
        <div><p>{answer}</p></div>
      </div>
    </div>
  );
}

export function FaqAccordion({ items }: FaqAccordionProps) {
  return (
    <div className="v2-faq-list">
      {items.map(([question, answer], index) => (
        <FaqItem answer={answer} index={index} key={question} question={question} />
      ))}
    </div>
  );
}
