type ResearchAvatarProps = {
  thinking?: boolean
  className?: string
}

export default function ResearchAvatar({ thinking = false, className = '' }: ResearchAvatarProps) {
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
