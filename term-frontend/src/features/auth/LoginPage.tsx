import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import './login.css'

type LocationState = {
  from?: { pathname?: string }
}

export default function LoginPage() {
  const { login, status, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const from = (location.state as LocationState | null)?.from?.pathname || '/'

  if (status === 'authenticated') {
    return <Navigate replace to={from} />
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(username, password)
      navigate(from, { replace: true })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '登录失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="login-page" aria-labelledby="login-title">
      <div className="login-panel">
        <p className="login-panel__eyebrow">ACCOUNT ACCESS</p>
        <h1 id="login-title">登录文脉平台</h1>
        <p>普通用户进入研究体验，管理员进入术语管理台。</p>
        <form onSubmit={(event) => void submit(event)}>
          <label htmlFor="login-username">账号</label>
          <input id="login-username" autoComplete="username" onChange={(event) => setUsername(event.target.value)} value={username} />
          <label htmlFor="login-password">密码</label>
          <input id="login-password" autoComplete="current-password" onChange={(event) => setPassword(event.target.value)} type="password" value={password} />
          {error ? <p role="alert">{error}</p> : null}
          <button disabled={submitting} type="submit">{submitting ? '登录中…' : '登录'}</button>
        </form>
        <aside>
          <strong>演示账号</strong>
          <span>普通用户：user / 123456</span>
          <span>管理员：admin / 123456</span>
          {user ? <span>{user.display_name}</span> : null}
        </aside>
      </div>
    </section>
  )
}
