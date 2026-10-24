import './editorial.css'
export default function SectionHeading({index,title,description}: {index?:string;title:string;description?:string}) {
  return <header className="section-heading">{index&&<span aria-hidden="true">{index}</span>}<div><h2>{title}</h2>{description&&<p>{description}</p>}</div></header>
}
