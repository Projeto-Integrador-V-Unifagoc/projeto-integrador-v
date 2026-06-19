import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { CssBaseline, ThemeProvider } from '@mui/material'

import { theme } from './theme.ts'
import App from './App.tsx'
// Provider global de notificações: disponibiliza o useNotificacao() em todo o app.
import { NotificationProvider } from './components/Notificacao/NotificationProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <NotificationProvider>
        <App />
      </NotificationProvider>
    </ThemeProvider>
  </StrictMode>,
)
