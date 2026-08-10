import Image from "next/image";
import { MessageCircle } from "lucide-react";

export type Testimonial = {
  name: string;
  subject: string;
  result: string;
  quote: string;
  avatar?: string;
};

// Добавляем сюда только проверенные отзывы с согласием на публикацию.
export const approvedTestimonials: Testimonial[] = [];

export function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  const initials = testimonial.name.trim().slice(0, 2).toUpperCase();

  return (
    <article role="listitem" data-reveal>
      <div className="v9-testimonial-person">
        {testimonial.avatar ? (
          <Image src={testimonial.avatar} alt="" width={56} height={56} />
        ) : (
          <span className="v9-testimonial-avatar" aria-hidden="true">{initials}</span>
        )}
        <div>
          <strong>{testimonial.name}</strong>
          <span>{testimonial.subject} · {testimonial.result}</span>
        </div>
      </div>
      <blockquote>«{testimonial.quote}»</blockquote>
    </article>
  );
}

export function TestimonialsSection() {
  return (
    <section className="v2-section v9-testimonials" aria-labelledby="reviews-title">
      <div className="public-container">
        {approvedTestimonials.length > 0 ? (
          <>
            <div className="v9-section-heading" data-reveal>
              <span className="v9-kicker">Результаты учеников</span>
              <h2 id="reviews-title">Не рекламные обещания.<br /><em>Личный опыт подготовки.</em></h2>
            </div>
            <div className="v9-testimonial-rail" role="list" aria-label="Отзывы учеников">
              {approvedTestimonials.map((testimonial) => (
                <TestimonialCard testimonial={testimonial} key={`${testimonial.name}-${testimonial.subject}`} />
              ))}
            </div>
          </>
        ) : (
          <div className="v9-testimonials-panel" data-reveal>
            <div>
              <span className="v9-kicker">Отзывы</span>
              <h2 id="reviews-title">Здесь будут<br /><em>проверенные истории.</em></h2>
            </div>
            <div className="v9-testimonial-empty">
              <MessageCircle aria-hidden="true" />
              <div>
                <h3>Не публикуем отзывы заранее</h3>
                <p>Добавим имя, предмет и подтверждённый результат после первых экзаменов и только с согласия ученика или родителя.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
