import type { ReactNode } from 'react'
import './editorial.css'
export default function PageIntro({eyebrow,title,description,actions}: {eyebrow:string;title:string;description:string;actions?:ReactNode}) {
  return <header className="page-intro"><div><p>{eyebrow}</p><h1>{title}</h1><span>{description}</span></div>{actions&&<aside>{actions}</aside>}</header>
}
