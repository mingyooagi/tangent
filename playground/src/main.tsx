import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { TangentProvider } from 'tangent-core'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TangentProvider>
      <App />
    </TangentProvider>
  </StrictMode>
)
