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
        <div className="app-error-fallback">
          <div className="app-error-card">
            <h1>Не удалось открыть экран</h1>
            <p>Мы сбросим временное состояние и откроем главную страницу.</p>
            <button type="button" onClick={this.resetApp}>Открыть главную</button>
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
