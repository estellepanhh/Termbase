import type { ReactNode } from 'react'
import './editorial.css'
export default function PageIntro({eyebrow,title,description,actions}: {eyebrow:string;title:string;description:string;actions?:ReactNode}) {
  return <header className="page-intro"><div className="page-intro__copy"><p>{eyebrow}</p><h1>{title}</h1><span>{description}</span></div>{actions&&<aside className="page-intro__actions">{actions}</aside>}</header>
}
