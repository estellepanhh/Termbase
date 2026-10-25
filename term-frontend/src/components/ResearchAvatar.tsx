type ResearchAvatarProps = {
  thinking?: boolean
  className?: string
  stage?: boolean
}

export default function ResearchAvatar({ thinking = false, className = '', stage = false }: ResearchAvatarProps) {
  if (stage) {
    return (
      <svg aria-label={thinking ? '文脉数字研究员正在思考' : '文脉数字研究员'} className={`research-avatar research-avatar--stage${thinking ? ' is-thinking' : ''}${className ? ` ${className}` : ''}`} role="img" viewBox="0 0 300 420" xmlns="http://www.w3.org/2000/svg">
        <defs><linearGradient id="research-robe" x1="0" x2="1"><stop stopColor="#f9f2df" /><stop offset="1" stopColor="#c9ddd3" /></linearGradient></defs>
        <ellipse cx="150" cy="402" rx="103" ry="14" fill="rgba(3,35,42,.18)" />
        <g className="research-avatar__figure">
          <path d="M42 409c8-112 41-158 108-158s100 46 108 158" fill="url(#research-robe)" />
          <path d="M116 252h68l-12 157h-44z" fill="#aa513f" opacity=".92" />
          <path d="M77 188c0-81 28-132 76-132 51 0 78 48 72 135-12-18-17-40-15-61-25 18-72 31-129 23" fill="#163f43" />
          <ellipse cx="151" cy="174" rx="65" ry="77" fill="#f2cfae" />
          <path d="M88 157c8-70 30-100 69-100 44 0 70 35 68 97-24-4-40-25-46-48-17 30-48 47-91 51" fill="#173f43" />
          <g className="research-avatar__eyes" fill="#18383b"><ellipse cx="128" cy="177" rx="5" ry="7" /><ellipse cx="177" cy="177" rx="5" ry="7" /></g>
          <path d="M138 211q14 12 30 0" fill="none" stroke="#a65f51" strokeLinecap="round" strokeWidth="4" />
          <path d="M91 291q59 48 119 0" fill="none" opacity=".8" stroke="#d0a85f" strokeWidth="5" />
          <circle cx="151" cy="327" r="20" fill="#f5e7c6" stroke="#d0a85f" strokeWidth="3" /><text x="151" y="335" textAnchor="middle" fontSize="21" fill="#245e60">文</text>
        </g>
      </svg>
    )
  }
  return (
    <svg
      aria-label={thinking ? '文脉数字研究员正在思考' : '文脉数字研究员'}
      className={`research-avatar${thinking ? ' is-thinking' : ''}${className ? ` ${className}` : ''}`}
      role="img"
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle className="research-avatar__halo" cx="32" cy="32" r="29" />
      <path className="research-avatar__spark research-avatar__spark--one" d="M9 18h5M11.5 15.5v5" />
      <path className="research-avatar__spark research-avatar__spark--two" d="M49 12h5M51.5 9.5v5" />
      <g className="research-avatar__figure">
        <path className="research-avatar__shoulders" d="M14 58c1.6-10 8.1-15 18-15s16.4 5 18 15H14Z" />
        <path className="research-avatar__robe" d="M25 43h14l-2 15H27l-2-15Z" />
        <circle className="research-avatar__face" cx="32" cy="29" r="13" />
        <path className="research-avatar__hair" d="M20 29c0-9.3 4.4-15 12.2-15 7.4 0 12 4.8 12 13.2-2.6-.6-5.3-2.7-7-5.4-3.5 3.6-8.8 5.6-17.2 5.7V29Z" />
        <path className="research-avatar__hairpin" d="M25 14.6h14M32 10.5v6" />
        <g className="research-avatar__eyes">
          <path d="M25.4 30.2h3.2M35.4 30.2h3.2" />
        </g>
        <path className="research-avatar__smile" d="M29 35.2c1.8 1.5 4.2 1.5 6 0" />
        <path className="research-avatar__collar" d="m26 44 6 6 6-6" />
        <circle className="research-avatar__badge" cx="32" cy="53" r="2.2" />
      </g>
    </svg>
  )
}
