
import { useState } from 'react'
import { loginUser, getUserProfile } from './api/client.js'
import Dashboard from './pages/Dashboard.jsx'

function App() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [session, setSession] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()

    setError('')
    setLoading(true)

    try {
      const tokenData = await loginUser(username, password)

      if (!tokenData.access) {
        throw new Error('Access token was not received.')
      }

      const user = await getUserProfile(tokenData.access)

      setSession({
        accessToken: tokenData.access,
        refreshToken: tokenData.refresh,
        user,
      })
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  function handleLogout() {
    setSession(null)
    setUsername('')
    setPassword('')
    setError('')
  }

  function handleProfileUpdated(updatedUser) {
    setSession((currentSession) => {
      if (!currentSession) {
        return currentSession
      }

      return {
        ...currentSession,
        user: {
          ...currentSession.user,
          ...updatedUser,
        },
      }
    })
  }

  if (session) {
    return (
      <Dashboard
        user={session.user}
        accessToken={session.accessToken}
        onLogout={handleLogout}
        onProfileUpdated={handleProfileUpdated}
      />
    )
  }

  return (
    <div className="login-page min-vh-100 d-flex align-items-center justify-content-center p-3">
      <div
        className="card border-0 shadow-lg w-100"
        style={{ maxWidth: '440px' }}
      >
        <div className="card-body p-4 p-md-5">
          <div className="text-center mb-4">
            <div className="brand-icon mx-auto mb-3">SD</div>

            <h1 className="h3 fw-bold">Smart Desk AI</h1>

            <p className="text-secondary mb-0">
              Sign in to your workspace
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="username" className="form-label">
                Username
              </label>

              <input
                id="username"
                type="text"
                className="form-control form-control-lg"
                placeholder="Enter your username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                required
              />
            </div>

            <div className="mb-3">
              <label htmlFor="password" className="form-label">
                Password
              </label>

              <input
                id="password"
                type="password"
                className="form-control form-control-lg"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-lg w-100"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-secondary text-center small mt-4 mb-0">
            Smart Desk AI Workspace
          </p>
        </div>
      </div>
    </div>
  )
}

export default App
