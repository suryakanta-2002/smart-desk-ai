
import { useEffect, useState } from 'react'
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  deleteNotification,
} from '../api/client.js'

function Notifications({ accessToken, onUnreadCountChange, onOpenTask,}) {
  const [filter, setFilter] = useState('all')
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionId, setActionId] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function loadNotifications() {
      setLoading(true)
      setError('')

      try {
        const [items, count] = await Promise.all([
          getNotifications(accessToken, filter),
          getUnreadNotificationCount(accessToken),
        ])

        if (!cancelled) {
          setNotifications(items)
          onUnreadCountChange(count)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Unable to load notifications.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadNotifications()

    return () => {
      cancelled = true
    }
  }, [accessToken, filter, onUnreadCountChange])

  async function refreshUnreadCount() {
    const count = await getUnreadNotificationCount(accessToken)
    onUnreadCountChange(count)
  }

  async function handleMarkRead(notificationId) {
    setActionId(notificationId)
    setError('')

    try {
      await markNotificationRead(accessToken, notificationId)

      setNotifications((items) =>
        items.map((item) =>
          item.id === notificationId
            ? { ...item, is_read: true }
            : item,
        ),
      )

      await refreshUnreadCount()

      if (filter === 'unread') {
        setNotifications((items) =>
          items.filter((item) => item.id !== notificationId),
        )
      }
    } catch (err) {
      setError(err.message || 'Unable to update notification.')
    } finally {
      setActionId(null)
    }
  }

  async function handleOpenTask(notification) {
    if (!notification.task) {
      setError('This notification is not linked to a task.')
      return
    }

    setActionId(notification.id)
    setError('')

    try {
      if (!notification.is_read) {
        await markNotificationRead(accessToken, notification.id)

        setNotifications((items) =>
          items.map((item) =>
            item.id === notification.id
              ? { ...item, is_read: true }
              : item,
          ),
        )

        await refreshUnreadCount()
      }

      onOpenTask(notification.task)
    } catch (err) {
      setError(err.message || 'Unable to open this task.')
    } finally {
      setActionId(null)
    }
  }

  async function handleDelete(notificationId) {
    setActionId(notificationId)
    setError('')

    try {
      await deleteNotification(accessToken, notificationId)

      setNotifications((items) =>
        items.filter((item) => item.id !== notificationId),
      )

      await refreshUnreadCount()
    } catch (err) {
      setError(err.message || 'Unable to delete notification.')
    } finally {
      setActionId(null)
    }
  }

  return (
    <div className="container-fluid p-4">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">Notifications</h2>
          <p className="text-secondary mb-0">
            View updates related to your tasks and workspace.
          </p>
        </div>

        <div className="btn-group" role="group" aria-label="Notification filter">
          {[
            { label: 'All', value: 'all' },
            { label: 'Unread', value: 'unread' },
            { label: 'Read', value: 'read' },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              className={`btn ${
                filter === option.value
                  ? 'btn-primary'
                  : 'btn-outline-primary'
              }`}
              onClick={() => setFilter(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-secondary py-4">
          Loading notifications...
        </div>
      ) : notifications.length === 0 ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5">
            <div className="fs-1 mb-2">ðŸ””</div>
            <h5 className="fw-bold">No notifications</h5>
            <p className="text-secondary mb-0">
              There are no notifications in this filter.
            </p>
          </div>
        </div>
      ) : (
        <div className="d-grid gap-3">
          {notifications.map((notification) => (
            <div
                key={notification.id}
                className="card border-0 shadow-sm"
                role={notification.task ? 'button' : undefined}
                onClick={
                    notification.task
                        ? () => handleOpenTask(notification)
                        : undefined
                }
                style={{
                    cursor: notification.task ? 'pointer' : 'default',
                    borderLeft: notification.is_read
                        ? '4px solid #dee2e6'
                        : '4px solid #0d6efd',
                }}
            >

              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
                  <div className="flex-grow-1">
                    <div className="d-flex align-items-center gap-2 flex-wrap mb-2">
                      <h5 className="fw-bold mb-0">
                        {notification.title}
                      </h5>

                      {!notification.is_read && (
                        <span className="badge text-bg-primary">
                          New
                        </span>
                      )}
                    </div>

                    <p className="mb-2">{notification.message}</p>

                    {notification.task_title && (
                      <p className="small text-secondary mb-2">
                        Task: {notification.task_title}
                      </p>
                    )}

                    <small className="text-secondary">
                      {new Date(notification.created_at).toLocaleString()}
                    </small>
                  </div>

                  <div className="d-flex gap-2 flex-wrap">
                    {!notification.is_read && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        disabled={actionId === notification.id}
                        onClick={() => handleMarkRead(notification.id)}
                      >
                        Mark as read
                      </button>
                    )}

                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      disabled={actionId === notification.id}
                      onClick={() => handleDelete(notification.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Notifications
