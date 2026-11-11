type ResearchAvatarProps = {
  thinking?: boolean
  className?: string
  stage?: boolean
}

function avatarClassName(thinking: boolean, stage: boolean, className: string) {
  return `research-avatar${stage ? ' research-avatar--stage' : ''}${thinking ? ' is-thinking' : ''}${className ? ` ${className}` : ''}`
}

export default function ResearchAvatar({ thinking = false, className = '', stage = false }: ResearchAvatarProps) {
  const label = thinking ? '文脉数字研究员正在思考' : '文脉数字研究员'

  if (stage) {
    return (
      <svg aria-label={label} className={avatarClassName(thinking, true, className)} role="img" viewBox="0 0 300 420" xmlns="http://www.w3.org/2000/svg">
        <ellipse className="research-avatar__ground-shadow" cx="150" cy="401" rx="101" ry="13" />
        <g className="research-avatar__figure">
          <path className="research-avatar__shoulders" d="M38 410c7-100 45-154 112-154s105 54 112 154H38Z" />
          <path className="research-avatar__robe" d="M75 410c5-78 29-127 75-147 46 20 70 69 75 147H75Z" />
          <path className="research-avatar__robe-panel" d="M128 272h44l15 138h-74l15-138Z" />
          <path className="research-avatar__neck" d="M130 229h40v48c-5 12-35 12-40 0v-48Z" />
          <path className="research-avatar__hair-back" d="M75 181c0-86 28-134 77-134 53 0 82 50 75 144l-19 61-113-4-20-67Z" />
          <ellipse className="research-avatar__ear" cx="91" cy="177" rx="12" ry="20" />
          <ellipse className="research-avatar__ear" cx="210" cy="177" rx="12" ry="20" />
          <ellipse className="research-avatar__face" cx="150" cy="169" rx="59" ry="73" />
          <path className="research-avatar__face-light" d="M111 145c5-27 21-46 44-54-30 4-50 28-56 62-4 29 4 57 21 72-12-25-15-52-9-80Z" />
          <path className="research-avatar__hair" d="M90 150c4-67 26-99 66-99 45 0 72 36 69 101-25-5-43-24-49-48-17 27-47 43-86 46Z" />
          <path className="research-avatar__hair-soft" d="M106 112c15-28 35-44 61-47-15 9-28 24-36 43" />
          <path className="research-avatar__hairpin" d="M121 65c19-8 38-9 57-2M149 48v23" />
          <path className="research-avatar__brow" d="M111 155c10-6 21-7 31-2" />
          <path className="research-avatar__brow" d="M159 153c11-5 22-4 31 2" />
          <g className="research-avatar__eyes">
            <g className="research-avatar__eye research-avatar__eye--left">
              <path className="research-avatar__eye-white" d="M111 174c8-10 22-11 31 0-8 10-23 10-31 0Z" />
              <circle className="research-avatar__iris" cx="127" cy="174" r="6.4" />
              <circle className="research-avatar__pupil" cx="127" cy="174" r="3.1" />
              <circle className="research-avatar__eye-highlight" cx="129.2" cy="171.5" r="1.55" />
              <path className="research-avatar__eyelid" d="M111 174c8-10 22-11 31 0" />
            </g>
            <g className="research-avatar__eye research-avatar__eye--right">
              <path className="research-avatar__eye-white" d="M159 174c8-10 22-10 31 0-8 10-23 10-31 0Z" />
              <circle className="research-avatar__iris" cx="175" cy="174" r="6.4" />
              <circle className="research-avatar__pupil" cx="175" cy="174" r="3.1" />
              <circle className="research-avatar__eye-highlight" cx="177.2" cy="171.5" r="1.55" />
              <path className="research-avatar__eyelid" d="M159 174c8-10 22-10 31 0" />
            </g>
          </g>
          <path className="research-avatar__nose" d="M151 177c-2 9-3 15 3 18" />
          <ellipse className="research-avatar__blush" cx="112" cy="194" rx="11" ry="5" />
          <ellipse className="research-avatar__blush" cx="190" cy="194" rx="11" ry="5" />
          <path className="research-avatar__smile" d="M137 208c9 8 19 8 28 0" />
          <path className="research-avatar__collar research-avatar__collar--left" d="M126 267 150 292l-27 36-38-44" />
          <path className="research-avatar__collar research-avatar__collar--right" d="M174 267 150 292l27 36 38-44" />
          <path className="research-avatar__collar-line" d="M150 292v118" />
          <g className="research-avatar__badge">
            <circle cx="150" cy="337" r="22" />
            <circle cx="150" cy="337" r="16" />
            <path d="M139 339c8-1 13-5 18-13-1 9 1 14 7 18-10-3-17-2-25 3" />
          </g>
        </g>
      </svg>
    )
  }

  return (
    <svg aria-label={label} className={avatarClassName(thinking, false, className)} role="img" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <circle className="research-avatar__halo" cx="32" cy="32" r="29" />
      <path className="research-avatar__spark research-avatar__spark--one" d="M8.5 18h5m-2.5-2.5v5" />
      <path className="research-avatar__spark research-avatar__spark--two" d="M50 13h5m-2.5-2.5v5" />
      <g className="research-avatar__figure">
        <path className="research-avatar__shoulders" d="M13 59c1.3-10.2 8.2-15.3 19-15.3S49.7 48.8 51 59H13Z" />
        <path className="research-avatar__robe" d="M22 59c1-8.5 4.4-13.2 10-15.3 5.6 2.1 9 6.8 10 15.3H22Z" />
        <path className="research-avatar__hair-back" d="M19 29c0-10.8 4.6-17 13-17 8.8 0 13.4 6.4 12.8 18l-3 12H22l-3-13Z" />
        <circle className="research-avatar__face" cx="32" cy="29" r="12.5" />
        <path className="research-avatar__hair" d="M19.8 27.5c.6-9.4 4.6-14.6 12.5-14.6 7.8 0 12.2 5 12 14.1-4.5-.7-7.7-3.8-9-7.2-3 4.4-8 7-15.5 7.7Z" />
        <path className="research-avatar__hairpin" d="M25.5 14.2c4.5-1.5 8.8-1.7 13-.3M32 10.8v4.6" />
        <path className="research-avatar__brow" d="M24.1 28.1c1.7-1.2 3.6-1.3 5.2-.4" />
        <path className="research-avatar__brow" d="M34.7 27.7c1.8-.9 3.6-.8 5.2.4" />
        <g className="research-avatar__eyes">
          <g className="research-avatar__eye research-avatar__eye--left">
            <path className="research-avatar__eye-white" d="M24 30.6c1.5-2 4.3-2.1 5.8 0-1.5 1.8-4.3 1.8-5.8 0Z" />
            <circle className="research-avatar__iris" cx="27" cy="30.5" r="1.25" />
            <circle className="research-avatar__pupil" cx="27" cy="30.5" r=".62" />
            <circle className="research-avatar__eye-highlight" cx="27.45" cy="30" r=".3" />
            <path className="research-avatar__eyelid" d="M24 30.6c1.5-2 4.3-2.1 5.8 0" />
          </g>
          <g className="research-avatar__eye research-avatar__eye--right">
            <path className="research-avatar__eye-white" d="M34.2 30.6c1.5-2 4.3-2 5.8 0-1.5 1.8-4.3 1.8-5.8 0Z" />
            <circle className="research-avatar__iris" cx="37" cy="30.5" r="1.25" />
            <circle className="research-avatar__pupil" cx="37" cy="30.5" r=".62" />
            <circle className="research-avatar__eye-highlight" cx="37.45" cy="30" r=".3" />
            <path className="research-avatar__eyelid" d="M34.2 30.6c1.5-2 4.3-2 5.8 0" />
          </g>
        </g>
        <path className="research-avatar__nose" d="M32.2 31.8c-.3 1.4-.2 2.2.7 2.5" />
        <path className="research-avatar__smile" d="M29.3 36c1.8 1.4 3.7 1.4 5.5 0" />
        <path className="research-avatar__collar research-avatar__collar--left" d="m25.5 44.8 6.5 6.3-5.2 6.2-6-8" />
        <path className="research-avatar__collar research-avatar__collar--right" d="m38.5 44.8-6.5 6.3 5.2 6.2 6-8" />
        <g className="research-avatar__badge">
          <circle cx="32" cy="55" r="2.5" />
          <path d="M30.5 55.4c1.4-.2 2.1-.9 2.8-2-.1 1.4.2 2.2 1.1 2.8-1.4-.4-2.5-.2-3.9.5" />
        </g>
      </g>
    </svg>
  )
}
