import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('App render error:', error, info)
  }

  resetApp = () => {
    try {
      window.sessionStorage.clear()
    } catch {
      // ignore
    }
    window.location.replace('/')
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          background: 'linear-gradient(180deg, #0a0a0f, #11111a)',
          color: '#fff',
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif'
        }}>
          <div style={{
            width: 'min(420px, 100%)',
            padding: 22,
            borderRadius: 24,
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.1)',
            textAlign: 'center'
          }}>
            <h1 style={{ margin: '0 0 8px', fontSize: 22 }}>Не удалось открыть экран</h1>
            <p style={{ margin: '0 0 16px', color: 'rgba(255,255,255,0.72)', lineHeight: 1.45 }}>
              Мы сбросим временное состояние и откроем главную.
            </p>
            <button
              type="button"
              onClick={this.resetApp}
              style={{
                width: '100%',
                minHeight: 48,
                border: 0,
                borderRadius: 16,
                background: 'linear-gradient(135deg, #74ffd0, #60ecff)',
                color: '#071014',
                fontWeight: 800,
                fontSize: 15
              }}
            >
              Открыть главную
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
)
