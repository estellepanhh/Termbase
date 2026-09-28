import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import './login.css'

type LocationState = {
  from?: { pathname?: string }
}

export default function LoginPage() {
  const { login, register, status, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [adminLogin, setAdminLogin] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
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
      if (mode === 'register') {
        await register(username, password, displayName)
      } else {
        await login(adminLogin ? 'admin' : username, password)
      }
      navigate(from, { replace: true })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : mode === 'register' ? '注册失败' : '登录失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="login-page" aria-labelledby="login-title">
      <div className="login-panel">
        <p className="login-panel__eyebrow">ACCOUNT ACCESS</p>
        <h1 id="login-title">{mode === 'register' ? '注册文脉账号' : '登录文脉平台'}</h1>
        <p>{mode === 'register' ? '注册后将以普通用户身份参与术语共建，管理员账号不开放自助注册。' : adminLogin ? '管理员入口暂时只开放固定管理账号，请输入管理员密码。' : '请输入普通用户账号和密码登录，也可以注册新账号参与术语共建。'}</p>
        <div className="login-panel__tabs" role="tablist" aria-label="账号入口">
          <button aria-selected={mode === 'login'} onClick={() => { setMode('login'); setAdminLogin(false); setError('') }} role="tab" type="button">登录</button>
          <button aria-selected={mode === 'register'} onClick={() => { setMode('register'); setAdminLogin(false); setError('') }} role="tab" type="button">注册</button>
        </div>
        <form onSubmit={(event) => void submit(event)}>
          {mode === 'register' ? (
            <>
              <label htmlFor="login-display-name">昵称</label>
              <input id="login-display-name" autoComplete="name" onChange={(event) => setDisplayName(event.target.value)} placeholder="例如：术语研究者" value={displayName} />
            </>
          ) : null}
          {mode === 'login' && adminLogin ? (
            <>
              <label htmlFor="login-admin-username">管理员账号</label>
              <input id="login-admin-username" autoComplete="username" readOnly value="admin" />
              <label htmlFor="login-password">密码</label>
              <input id="login-password" autoComplete="current-password" onChange={(event) => setPassword(event.target.value)} type="password" value={password} />
            </>
          ) : null}
          {mode === 'login' && !adminLogin ? (
            <>
              <label htmlFor="login-username">账号</label>
              <input id="login-username" autoComplete="username" onChange={(event) => setUsername(event.target.value)} placeholder="请输入普通用户账号" value={username} />
              <label htmlFor="login-password">密码</label>
              <input id="login-password" autoComplete="current-password" onChange={(event) => setPassword(event.target.value)} type="password" value={password} />
            </>
          ) : null}
          {mode === 'register' ? (
            <>
              <label htmlFor="login-username">账号</label>
              <input id="login-username" autoComplete="username" onChange={(event) => setUsername(event.target.value)} placeholder="3-30 位字母、数字、_ 或 -" value={username} />
              <label htmlFor="login-password">密码</label>
              <input id="login-password" autoComplete="new-password" onChange={(event) => setPassword(event.target.value)} type="password" value={password} />
            </>
          ) : null}
          {error ? <p role="alert">{error}</p> : null}
          <button disabled={submitting} type="submit">
            {submitting ? (mode === 'register' ? '注册中…' : '登录中…') : (mode === 'register' ? '注册并进入' : adminLogin ? '管理员登录' : '普通用户登录')}
          </button>
        </form>
        {mode === 'login' && !adminLogin ? <button className="login-panel__admin-link" onClick={() => { setAdminLogin(true); setUsername('admin'); setPassword('') }} type="button">管理员登录</button> : null}
        {user ? <span className="login-panel__current">{user.display_name}</span> : null}
      </div>
    </section>
  )
}
