
import { useEffect, useState } from 'react'
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
} from '../api/client.js'
import AIAssistant from './AIAssistant.jsx'
import Profile from "./Profile";
function Dashboard({ user, accessToken, onLogout,onProfileUpdated,}) {
  const [activeMenu, setActiveMenu] = useState('Dashboard')
  const [tasks, setTasks] = useState([])

  // Search, filter and sorting states
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')

  const [loadingTasks, setLoadingTasks] = useState(true)
  const [taskError, setTaskError] = useState('')

  const [showTaskForm, setShowTaskForm] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [taskPriority, setTaskPriority] = useState('medium')
  const [savingTask, setSavingTask] = useState(false)

  const [editingTaskId, setEditingTaskId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editPriority, setEditPriority] = useState('medium')
  const [updatingTask, setUpdatingTask] = useState(false)
  const [statusUpdatingTaskId, setStatusUpdatingTaskId] = useState(null)
  const [deletingTaskId, setDeletingTaskId] = useState(null)

  const displayName =
    [user?.first_name, user?.last_name].filter(Boolean).join(' ') ||
    user?.username ||
    'User'
  const [showAIAssistant, setShowAIAssistant] = useState(false)
  // Load tasks from the backend.
  useEffect(() => {
    async function loadTasks() {
      try {
        setLoadingTasks(true)
        setTaskError('')

        const data = await getTasks(accessToken)
        setTasks(data)
      } catch (error) {
        setTaskError(error.message || 'Unable to load tasks.')
      } finally {
        setLoadingTasks(false)
      }
    }

    loadTasks()
  }, [accessToken])

  // Create a new task.
  async function handleCreateTask(event) {
    event.preventDefault()
    setTaskError('')
    setSavingTask(true)

    try {
      const newTask = await createTask(accessToken, {
        title: taskTitle,
        description: taskDescription,
        priority: taskPriority,
        status: 'pending',
      })

      setTasks((previousTasks) => [newTask, ...previousTasks])
      setTaskTitle('')
      setTaskDescription('')
      setTaskPriority('medium')
      setShowTaskForm(false)
    } catch (error) {
      setTaskError(error.message || 'Unable to create task.')
    } finally {
      setSavingTask(false)
    }
  }

  // Open the edit form for a selected task.
  function startEditingTask(task) {
    setEditingTaskId(task.id)
    setEditTitle(task.title)
    setEditPriority(task.priority)
    setTaskError('')
  }

  // Update an existing task's title and priority.
  async function handleUpdateTask(event, taskId) {
    event.preventDefault()
    setTaskError('')
    setUpdatingTask(true)

    try {
      const updatedTask = await updateTask(accessToken, taskId, {
        title: editTitle,
        priority: editPriority,
      })

      setTasks((previousTasks) =>
        previousTasks.map((task) =>
          task.id === taskId ? updatedTask : task,
        ),
      )

      setEditingTaskId(null)
      setEditTitle('')
      setEditPriority('medium')
    } catch (error) {
      setTaskError(error.message || 'Unable to update task.')
    } finally {
      setUpdatingTask(false)
    }
  }

  // Update the status of a task.
  async function handleStatusChange(taskId, newStatus) {
    setTaskError('')
    setStatusUpdatingTaskId(taskId)

    try {
      const updatedTask = await updateTask(accessToken, taskId, {
        status: newStatus,
      })

      setTasks((previousTasks) =>
        previousTasks.map((task) =>
          task.id === taskId ? updatedTask : task,
        ),
      )
    } catch (error) {
      setTaskError(error.message || 'Unable to update task status.')
    } finally {
      setStatusUpdatingTaskId(null)
    }
  }

  // Delete a task after confirmation.
  async function handleDeleteTask(taskId) {
    const confirmed = window.confirm(
      'Are you sure you want to delete this task?',
    )

    if (!confirmed) return

    setTaskError('')
    setDeletingTaskId(taskId)

    try {
      await deleteTask(accessToken, taskId)

      setTasks((previousTasks) =>
        previousTasks.filter((task) => task.id !== taskId),
      )

      if (editingTaskId === taskId) {
        setEditingTaskId(null)
      }
    } catch (error) {
      setTaskError(error.message || 'Unable to delete task.')
    } finally {
      setDeletingTaskId(null)
    }
  }

  const menuItems = [
    { name: 'Dashboard', icon: '⌂' },
    { name: 'My Tasks', icon: '✓' },
    { name: 'Team Reports', icon: '▥' },
    { name: 'AI Assistant', icon: '✧' },
    { name: 'Team Members', icon: '♙' },
    { name: 'Settings', icon: '⚙' },
  ]

  const completedTasks = tasks.filter(
    (task) => task.status === 'completed',
  ).length

  const progress =
    tasks.length > 0
      ? Math.round((completedTasks / tasks.length) * 100)
      : 0

  // Filter and sort tasks without changing the original tasks array.
  const filteredTasks = tasks
    .filter((task) => {
      const matchesSearch = (task.title || '')
        .toLowerCase()
        .includes(searchText.toLowerCase())

      const matchesStatus =
        statusFilter === 'all' || task.status === statusFilter

      const matchesPriority =
        priorityFilter === 'all' || task.priority === priorityFilter

      return matchesSearch && matchesStatus && matchesPriority
    })
    .sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0)
      }

      if (sortBy === 'oldest') {
        return new Date(a.created_at || 0) - new Date(b.created_at || 0)
      }

      if (sortBy === 'priority') {
        const priorityOrder = {
          high: 3,
          medium: 2,
          low: 1,
        }

        return (
          (priorityOrder[b.priority] || 0) -
          (priorityOrder[a.priority] || 0)
        )
      }

      if (sortBy === 'title') {
        return (a.title || '').localeCompare(b.title || '')
      }

      return 0
    })
  if (showAIAssistant) {
    return (
      <AIAssistant
        accessToken={accessToken}
        onBack={() => setShowAIAssistant(false)}
      />
    )
  }  
  if (activeMenu === "Settings") {
    return (
      <Profile
        user={user}
        accessToken={accessToken}
        onProfileUpdated={onProfileUpdated}
        onBack={() => setActiveMenu("Dashboard")}
      />
    );
  }
  return (
    <div className="d-flex min-vh-100">
      {/* Sidebar */}
      <aside
        className="text-white d-flex flex-column p-3"
        style={{
          width: '265px',
          minWidth: '265px',
          background: '#172746',
        }}
      >
        <div className="d-flex align-items-center gap-2 mb-5 mt-2">
          <div
            className="rounded-3 bg-primary d-flex align-items-center justify-content-center fw-bold"
            style={{ width: 48, height: 48, fontSize: 20 }}
          >
            SD
          </div>
          <span className="fw-bold fs-5">Smart Desk AI</span>
        </div>

        <nav className="d-grid gap-2">
          {menuItems.map((item) => (
            <button
              key={item.name}
              type="button"
              onClick={() => {
                if (item.name === 'AI Assistant') {
                  setShowAIAssistant(true)
                } else {
                  setActiveMenu(item.name)
                }
              }}

              className="btn text-start d-flex align-items-center gap-3 p-3"
              style={{
                color: '#e2eaff',
                background:
                  activeMenu === item.name ? '#2b4779' : 'transparent',
                border:
                  activeMenu === item.name
                    ? '1px solid #3d5c95'
                    : '1px solid transparent',
              }}
            >
              <span className="fs-5" style={{ width: 24 }}>
                {item.icon}
              </span>
              {item.name}
            </button>
          ))}
        </nav>

        <div
          className="mt-auto rounded-4 p-3"
          style={{
            background: '#203659',
            border: '1px solid #344c73',
          }}
        >
          <div className="fw-bold">✧ Smart Desk AI</div>
          <small className="text-white-50">
            Work Smarter, Together
          </small>
        </div>
      </aside>

      {/* Main dashboard */}
      <main className="flex-grow-1 p-4">
        <div className="d-flex justify-content-end align-items-center gap-3">
          <div className="text-end">
            <div className="fw-semibold">{displayName}</div>
            <small className="text-secondary">Workspace Member</small>
          </div>

          <button
            type="button"
            className="btn btn-outline-danger"
            onClick={onLogout}
          >
            Logout
          </button>
        </div>

        <div className="mt-5">
          <p className="text-primary fw-semibold mb-1">WELCOME BACK</p>
          <h1 className="fw-bold">Hello, {displayName}! 👋</h1>
          <p className="text-secondary">
            Here’s what’s happening with your work today.
          </p>
        </div>

        {/* Summary cards */}
        <div className="row g-3 mt-3">
          <div className="col-12 col-md-6 col-xl-3">
            <div className="card h-100 border-0 shadow-sm">
              <div className="card-body p-4">
                <p className="text-primary fw-semibold">MY TASKS</p>
                <h2 className="fw-bold">{tasks.length}</h2>
                <p className="text-secondary mb-0">
                  Tasks assigned to you
                </p>
              </div>
            </div>
          </div>

          <div className="col-12 col-md-6 col-xl-3">
            <div className="card h-100 border-0 shadow-sm">
              <div className="card-body p-4">
                <p className="text-success fw-semibold">TEAM MEMBERS</p>
                <h2 className="fw-bold">0</h2>
                <p className="text-secondary mb-0">
                  Members in your team
                </p>
              </div>
            </div>
          </div>

          <div className="col-12 col-md-6 col-xl-3">
            <div className="card h-100 border-0 shadow-sm">
              <div className="card-body p-4">
                <p className="fw-semibold" style={{ color: '#7952f6' }}>
                  PROJECT PROGRESS
                </p>
                <h2 className="fw-bold">{progress}%</h2>
                <p className="text-secondary mb-0">Tasks completed</p>
              </div>
            </div>
          </div>

          <div className="col-12 col-md-6 col-xl-3">
            <div className="card h-100 border-0 shadow-sm">
              <div className="card-body p-4">
                <p className="fw-semibold" style={{ color: '#d97706' }}>
                  AI ASSISTANT
                </p>
                <h2 className="fw-bold">Ready</h2>
                <p className="text-secondary mb-0">
                  Your AI workspace
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Access */}
        <div className="mt-4">
          <h4 className="fw-bold mb-3">Quick Access</h4>
          <p className="text-secondary">
            Shortcuts to your workspace tools.
          </p>

          <div className="row g-3 mt-2">
            <div className="col-12 col-md-4">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body p-4">
                  <div className="fs-2 text-primary">＋</div>
                  <h5 className="fw-bold mt-2">Create Task</h5>
                  <p className="text-secondary">
                    Create and organize your work.
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setShowTaskForm(true)}
                  >
                    + Create Task
                  </button>
                </div>
              </div>
            </div>

            <div className="col-12 col-md-4">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body p-4">
                  <div className="fs-2 text-success">▤</div>
                  <h5 className="fw-bold mt-2">View Reports</h5>
                  <p className="text-secondary mb-0">
                    Review team progress and reports.
                  </p>
                </div>
              </div>
            </div>

            <div className="col-12 col-md-4">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body p-4">
                  <div className="fs-2" style={{ color: '#7952f6' }}>
                    ✧
                  </div>
                  <h5 className="fw-bold mt-2">AI Assistant</h5>
                  <p className="text-secondary mb-0">
                    Get help with your work.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Create task form */}
        {showTaskForm && (
          <div className="card border-0 shadow-sm mt-4">
            <div className="card-body p-4">
              <h4 className="fw-bold mb-3">Create New Task</h4>

              <form onSubmit={handleCreateTask}>
                <div className="mb-3">
                  <label htmlFor="taskTitle" className="form-label">
                    Task Title
                  </label>
                  <input
                    id="taskTitle"
                    type="text"
                    className="form-control"
                    value={taskTitle}
                    onChange={(event) => setTaskTitle(event.target.value)}
                    placeholder="Enter task title"
                    required
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="taskDescription" className="form-label">
                    Description
                  </label>
                  <textarea
                    id="taskDescription"
                    className="form-control"
                    value={taskDescription}
                    onChange={(event) =>
                      setTaskDescription(event.target.value)
                    }
                    placeholder="Enter task description"
                    rows={3}
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="taskPriority" className="form-label">
                    Priority
                  </label>
                  <select
                    id="taskPriority"
                    className="form-select"
                    value={taskPriority}
                    onChange={(event) => setTaskPriority(event.target.value)}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary me-2"
                  disabled={savingTask}
                >
                  {savingTask ? 'Saving...' : 'Save Task'}
                </button>

                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowTaskForm(false)}
                  disabled={savingTask}
                >
                  Cancel
                </button>
              </form>
            </div>
          </div>
        )}

        {/* My Tasks */}
        <div className="card border-0 shadow-sm mt-4">
          <div className="card-body p-4">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div>
                <h4 className="fw-bold">My Tasks</h4>
                <p className="text-secondary mb-0">
                  Track your work and progress.
                </p>
              </div>

              <button
                type="button"
                className="btn btn-outline-primary"
                onClick={() => setShowTaskForm(true)}
              >
                + Add Task
              </button>
            </div>

            {/* Search, filters and sorting */}
            <div className="row g-3 mt-4">
              <div className="col-12 col-lg-3">
                <label htmlFor="task-search" className="form-label">
                  Search Tasks
                </label>
                <input
                  id="task-search"
                  type="search"
                  className="form-control"
                  placeholder="Search by task title..."
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                />
              </div>

              <div className="col-12 col-md-6 col-lg-3">
                <label htmlFor="task-status-filter" className="form-label">
                  Filter by Status
                </label>
                <select
                  id="task-status-filter"
                  className="form-select"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div className="col-12 col-md-6 col-lg-3">
                <label htmlFor="task-priority-filter" className="form-label">
                  Filter by Priority
                </label>
                <select
                  id="task-priority-filter"
                  className="form-select"
                  value={priorityFilter}
                  onChange={(event) => setPriorityFilter(event.target.value)}
                >
                  <option value="all">All Priorities</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div className="col-12 col-md-6 col-lg-3">
                <label htmlFor="task-sort" className="form-label">
                  Sort Tasks
                </label>
                <select
                  id="task-sort"
                  className="form-select"
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="priority">Priority: High to Low</option>
                  <option value="title">Title: A–Z</option>
                </select>
              </div>
            </div>

            {taskError && (
              <div className="alert alert-danger mt-3" role="alert">
                {taskError}
              </div>
            )}

            {loadingTasks ? (
              <p className="text-secondary mt-4">Loading tasks...</p>
            ) : filteredTasks.length === 0 ? (
              <div className="mt-4 p-4 border rounded-3 text-center">
                <h6 className="fw-bold">
                  {tasks.length === 0 ? 'No tasks yet' : 'No matching tasks'}
                </h6>

                <p className="text-secondary mb-0">
                  {tasks.length === 0
                    ? 'Create your first task to get started.'
                    : 'Try changing your search or filters.'}
                </p>
              </div>
            ) : (
              <div className="row g-3 mt-2">
                {filteredTasks.map((task) => (
                  <div className="col-12 col-lg-6" key={task.id}>
                    <div className="p-3 border rounded-3 h-100">
                      {editingTaskId === task.id ? (
                        <form
                          onSubmit={(event) =>
                            handleUpdateTask(event, task.id)
                          }
                        >
                          <h6 className="fw-bold mb-3">Edit Task</h6>

                          <div className="mb-3">
                            <label
                              htmlFor={`edit-title-${task.id}`}
                              className="form-label"
                            >
                              Task Title
                            </label>
                            <input
                              id={`edit-title-${task.id}`}
                              className="form-control"
                              value={editTitle}
                              onChange={(event) =>
                                setEditTitle(event.target.value)
                              }
                              required
                            />
                          </div>

                          <div className="mb-3">
                            <label
                              htmlFor={`edit-priority-${task.id}`}
                              className="form-label"
                            >
                              Priority
                            </label>
                            <select
                              id={`edit-priority-${task.id}`}
                              className="form-select"
                              value={editPriority}
                              onChange={(event) =>
                                setEditPriority(event.target.value)
                              }
                            >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                            </select>
                          </div>

                          <button
                            type="submit"
                            className="btn btn-primary btn-sm me-2"
                            disabled={updatingTask}
                          >
                            {updatingTask ? 'Saving...' : 'Save Changes'}
                          </button>

                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => setEditingTaskId(null)}
                            disabled={updatingTask}
                          >
                            Cancel
                          </button>
                        </form>
                      ) : (
                        <>
                          <h6 className="fw-bold">{task.title}</h6>

                          <p className="text-secondary mb-3">
                            {task.description || 'No description provided.'}
                          </p>

                          <span
                            className={`badge ${
                              task.status === 'completed'
                                ? 'text-bg-success'
                                : task.status === 'in_progress'
                                  ? 'text-bg-primary'
                                  : 'text-bg-secondary'
                            }`}
                          >
                            {task.status.replace('_', ' ')}
                          </span>

                          <span
                            className={`badge ms-2 ${
                              task.priority === 'high'
                                ? 'text-bg-danger'
                                : task.priority === 'medium'
                                  ? 'text-bg-warning'
                                  : 'text-bg-success'
                            }`}
                          >
                            {task.priority} priority
                          </span>

                          <div className="mt-3">
                            <label
                              htmlFor={`task-status-${task.id}`}
                              className="form-label small fw-semibold"
                            >
                              Task Status
                            </label>
                            <select
                              id={`task-status-${task.id}`}
                              className="form-select form-select-sm"
                              value={task.status}
                              onChange={(event) =>
                                handleStatusChange(task.id, event.target.value)
                              }
                              disabled={
                                statusUpdatingTaskId === task.id ||
                                deletingTaskId === task.id
                              }
                            >
                              <option value="pending">Pending</option>
                              <option value="in_progress">In Progress</option>
                              <option value="completed">Completed</option>
                            </select>

                            {statusUpdatingTaskId === task.id && (
                              <small className="text-secondary">
                                Updating status...
                              </small>
                            )}
                          </div>

                          <div className="mt-3">
                            <button
                              type="button"
                              className="btn btn-outline-primary btn-sm me-2"
                              onClick={() => startEditingTask(task)}
                              disabled={deletingTaskId !== null}
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              className="btn btn-outline-danger btn-sm"
                              onClick={() => handleDeleteTask(task.id)}
                              disabled={deletingTaskId !== null}
                            >
                              {deletingTaskId === task.id
                                ? 'Deleting...'
                                : 'Delete'}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default Dashboard