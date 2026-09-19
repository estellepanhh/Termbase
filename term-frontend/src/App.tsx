import { BrowserRouter } from 'react-router-dom'
import AppRoutes from './app/routes'
import { ChildModeProvider } from './context/ChildModeContext'

export default function App() {
  return (
    <ChildModeProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ChildModeProvider>
  )
}
