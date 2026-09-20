export type ProfileSection={id:string;label:string}
export default function ProfileSectionNav({sections}:{sections:ProfileSection[]}){return <nav aria-label="术语档案章节" className="profile-section-nav">{sections.map(s=><a href={`#${s.id}`} key={s.id}>{s.label}</a>)}</nav>}
