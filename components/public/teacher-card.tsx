import Image from "next/image";

export type TeacherProfile = {
  name: string;
  subject: string;
  experience: string;
  result: string;
  photo?: string;
};

type TeacherCriterion = {
  index: string;
  initials: string;
  title: string;
  description: string;
  tag: string;
};

export function TeacherCriterionCard({ criterion }: { criterion: TeacherCriterion }) {
  return (
    <article role="listitem" data-reveal>
      <span>{criterion.index}</span>
      <div className="v9-teacher-avatar" aria-hidden="true">{criterion.initials}</div>
      <h3>{criterion.title}</h3>
      <p>{criterion.description}</p>
      <b>{criterion.tag}</b>
    </article>
  );
}

// Компонент готов для проверенных профилей. До получения данных он не рендерится на лендинге.
export function TeacherProfileCard({ profile }: { profile: TeacherProfile }) {
  const initials = profile.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <article className="v9-teacher-profile" role="listitem">
      {profile.photo ? (
        <Image src={profile.photo} alt={profile.name} width={88} height={88} />
      ) : (
        <div className="v9-teacher-avatar" aria-hidden="true">{initials}</div>
      )}
      <h3>{profile.name}</h3>
      <p>{profile.subject} · {profile.experience}</p>
      <b>{profile.result}</b>
    </article>
  );
}
