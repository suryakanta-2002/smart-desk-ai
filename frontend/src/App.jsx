
import { useState } from 'react'
import ReCAPTCHA from 'react-google-recaptcha'
import {
  loginUser,
  getUserProfile,
  requestPasswordReset,
  confirmPasswordReset,
} from './api/client.js'
import Dashboard from './pages/Dashboard.jsx'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/auth'
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY

function App() {
  const [page, setPage] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('page') === 'reset' ? 'reset' : 'login'
  })

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [captchaToken, setCaptchaToken] = useState(null)
  const [resetEmail, setResetEmail] = useState('')
  const [resetPassword, setResetPassword] = useState('')
  const [resetConfirmPassword, setResetConfirmPassword] = useState('')

  const [resetUid] = useState(
    () => new URLSearchParams(window.location.search).get('uid') || '',
  )
  const [resetToken] = useState(
    () => new URLSearchParams(window.location.search).get('token') || '',
  )
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [session, setSession] = useState(null)

  function changePage(nextPage) {
    setPage(nextPage)
    setError('')
    setSuccess('')
    setCaptchaToken(null)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')
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
      setError(err.message || 'Unable to sign in. Please try again.')
    } finally {
      setLoading(false)
    }
  }
  
async function handlePasswordResetRequest(event) {
  event.preventDefault()
  setError('')
  setSuccess('')
  setLoading(true)

  try {
    const data = await requestPasswordReset(resetEmail.trim())
    setSuccess(data.message)
  } catch (err) {
    setError(err.message || 'Unable to request password reset.')
  } finally {
    setLoading(false)
  }
}

async function handlePasswordReset(event) {
  event.preventDefault()
  setError('')
  setSuccess('')

  if (!resetUid || !resetToken) {
    setError('Reset link is invalid or missing. Please request a new link.')
    return
  }

  if (resetPassword !== resetConfirmPassword) {
    setError('Passwords do not match.')
    return
  }

  setLoading(true)

  try {
    const data = await confirmPasswordReset(
      resetUid,
      resetToken,
      resetPassword,
      resetConfirmPassword,
    )

    window.history.replaceState({}, '', window.location.pathname)
    setPage('login')
    setPassword('')
    setResetPassword('')
    setResetConfirmPassword('')
    setSuccess(data.message)
  } catch (err) {
    setError(err.message || 'Unable to reset password.')
  } finally {
    setLoading(false)
  }
}

  async function handleRegister(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (!captchaToken) {
      setError('Please complete the CAPTCHA verification.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`${API_BASE}/api/auth/register/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          password,
          confirm_password: confirmPassword,
          captcha_token: captchaToken,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        const message = Object.entries(data)
          .map(([key, value]) => {
            const details = Array.isArray(value)
              ? value.join(', ')
              : typeof value === 'object' && value !== null
                ? JSON.stringify(value)
                : String(value)

            return `${key}: ${details}`
          })
          .join(' | ')

        throw new Error(message || 'Registration failed.')
      }

      setSuccess('Account created successfully. Please sign in.')
      setPage('login')
      setPassword('')
      setConfirmPassword('')
      setCaptchaToken(null)
    } catch (err) {
      setError(err.message || 'Registration failed.')
      setCaptchaToken(null)
    } finally {
      setLoading(false)
    }
  }

  function handleLogout() {
    setSession(null)
    setUsername('')
    setPassword('')
    setError('')
    setSuccess('')
  }

  function handleProfileUpdated(updatedUser) {
    setSession((currentSession) => {
      if (!currentSession) return currentSession

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
        style={{ maxWidth: '480px' }}
      >
        <div className="card-body p-4 p-md-5">
          <div className="text-center mb-4">
            <div className="brand-icon mx-auto mb-3">SD</div>

            <h1 className="h3 fw-bold">Smart Desk AI</h1>

            <p className="text-secondary mb-0">
              {page === 'register'
                ? 'Create your workspace account'
                : page === 'forgot'
                  ? 'Recover your account'
                  : page === 'reset'
                    ? 'Create a new password'
                    : 'Sign in to your workspace'}
            </p>
          </div>

          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          {success && (
            <div className="alert alert-success" role="status">
              {success}
            </div>
          )}

          {page === 'login' && (
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
                <label htmlFor="login-password" className="form-label">
                  Password
                </label>

                <input
                  id="login-password"
                  type="password"
                  className="form-control form-control-lg"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>

              <div className="text-end mb-3">
                <button
                  type="button"
                  className="btn btn-link p-0 text-decoration-none"
                  onClick={() => changePage('forgot')}
                >
                  Forgot Password?
                </button>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg w-100"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>

              <p className="text-center mt-4 mb-0">
                Don't have an account?{' '}
                <button
                  type="button"
                  className="btn btn-link p-0"
                  onClick={() => changePage('register')}
                >
                  Create Account
                </button>
              </p>
            </form>
          )}

          {page === 'register' && (
            <form onSubmit={handleRegister}>
              <div className="mb-3">
                <label htmlFor="first-name" className="form-label">
                  First Name
                </label>
                <input
                  id="first-name"
                  type="text"
                  className="form-control form-control-lg"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  autoComplete="given-name"
                  required
                />
              </div>

              <div className="mb-3">
                <label htmlFor="last-name" className="form-label">
                  Last Name
                </label>
                <input
                  id="last-name"
                  type="text"
                  className="form-control form-control-lg"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  autoComplete="family-name"
                  required
                />
              </div>

              <div className="mb-3">
                <label htmlFor="register-email" className="form-label">
                  Email
                </label>
                <input
                  id="register-email"
                  type="email"
                  className="form-control form-control-lg"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              <div className="mb-3">
                <label htmlFor="register-username" className="form-label">
                  Username
                </label>
                <input
                  id="register-username"
                  type="text"
                  className="form-control form-control-lg"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="username"
                  required
                />
              </div>

              <div className="mb-3">
                <label htmlFor="register-password" className="form-label">
                  Password
                </label>
                <input
                  id="register-password"
                  type="password"
                  className="form-control form-control-lg"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>

              <div className="mb-3">
                <label htmlFor="confirm-password" className="form-label">
                  Confirm Password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  className="form-control form-control-lg"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>

              {!RECAPTCHA_SITE_KEY ? (
                <div className="alert alert-warning" role="alert">
                  CAPTCHA site key is missing. Check frontend/.env and restart
                  the frontend server.
                </div>
              ) : (
                <div className="mb-3">
                  <ReCAPTCHA
                    sitekey={RECAPTCHA_SITE_KEY}
                    onChange={(token) => {
                      setCaptchaToken(token)
                      setError('')
                    }}
                    onExpired={() => setCaptchaToken(null)}
                    onErrored={() => {
                      setCaptchaToken(null)
                      setError('CAPTCHA failed to load. Please try again.')
                    }}
                  />
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary btn-lg w-100"
                disabled={loading || !RECAPTCHA_SITE_KEY}
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </button>

              <p className="text-center mt-4 mb-0">
                Already have an account?{' '}
                <button
                  type="button"
                  className="btn btn-link p-0"
                  onClick={() => changePage('login')}
                >
                  Sign In
                </button>
              </p>
            </form>
          )}
          
          {page === 'forgot' && (
            <form onSubmit={handlePasswordResetRequest}>
              <p className="text-secondary">
                Enter your registered email address. We will send a reset link
                if an account exists.
              </p>

              <div className="mb-3">
                <label htmlFor="reset-email" className="form-label">
                  Email Address
                </label>

                <input
                  id="reset-email"
                  type="email"
                  className="form-control form-control-lg"
                  placeholder="Enter your registered email"
                  value={resetEmail}
                  onChange={(event) => setResetEmail(event.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg w-100"
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>

              <p className="text-center mt-3 mb-0">
                <button
                  type="button"
                  className="btn btn-link"
                  onClick={() => changePage('login')}
                >
                  Back to Sign In
                </button>
              </p>
            </form>
          )}
          
          {page === 'reset' && (
            <form onSubmit={handlePasswordReset}>
              <p className="text-secondary">
                Enter your new password below.
              </p>

              <div className="mb-3">
                <label htmlFor="new-password" className="form-label">
                  New Password
                </label>
                <input
                  id="new-password"
                  type="password"
                  className="form-control form-control-lg"
                  value={resetPassword}
                  onChange={(event) => setResetPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                />
                </div>

                <div className="mb-3">
                  <label htmlFor="reset-confirm-password" className="form-label">
                    Confirm New Password
                  </label>
                  <input
                    id="reset-confirm-password"
                    type="password"
                    className="form-control form-control-lg"
                    value={resetConfirmPassword}
                    onChange={(event) => setResetConfirmPassword(event.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-lg w-100"
                  disabled={loading}
                >
                  {loading ? 'Resetting Password...' : 'Reset Password'}
                </button>

                <p className="text-center mt-3 mb-0">
                  <button
                    type="button"
                    className="btn btn-link"
                    onClick={() => {
                    window.history.replaceState({}, '', window.location.pathname)
                    changePage('login')
                  }}
                >
                  Back to Sign In
                </button>
              </p>
            </form>
          )}

          <p className="text-secondary text-center small mt-4 mb-0">
            Smart Desk AI Workspace
          </p>
        </div>
      </div>
    </div>
  )
}

export default App
