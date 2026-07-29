import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import { TRPCProvider } from "@/providers/trpc"
import { Toaster } from "@/components/ui/sonner"
import { I18nProvider } from "@/i18n"
import { LightboxProvider } from "@/components/ImageLib"
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <TRPCProvider>
        <I18nProvider>
          <LightboxProvider>
            <App />
            <Toaster richColors position="top-center" />
          </LightboxProvider>
        </I18nProvider>
      </TRPCProvider>
    </BrowserRouter>
  </StrictMode>,
)
