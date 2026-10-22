import { useEffect, useState } from 'react'
import {getTasks,createTask,updateTask,deleteTask,getUsers,getAssignableUsers,assignUserRole,updateUserStatus,getTeamReports, getUnreadNotificationCount,} from '../api/client.js'
import AIAssistant from './AIAssistant.jsx'
import Profile from './Profile'
import Notifications from './Notifications.jsx'
function Dashboard({ user, accessToken, onLogout, onProfileUpdated }) {
  const [activeMenu, setActiveMenu] = useState('Dashboard')
  const [tasks, setTasks] = useState([])
  const [highlightedTaskId, setHighlightedTaskId] = useState(null)
  const [teamMembers, setTeamMembers] = useState([])
  const [memberSearch, setMemberSearch] = useState('')
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [membersError, setMembersError] = useState('')
  const [updatingRoleId, setUpdatingRoleId] = useState(null)
  const [roleUpdateError, setRoleUpdateError] = useState('')
  const [roleUpdateSuccess, setRoleUpdateSuccess] = useState('')
  const [updatingStatusId, setUpdatingStatusId] = useState(null)
  const [statusUpdateError, setStatusUpdateError] = useState('')
  const [statusUpdateSuccess, setStatusUpdateSuccess] = useState('')
  const [teamReportData, setTeamReportData] = useState(null)
  const [loadingReports, setLoadingReports] = useState(false)
  const [reportsError, setReportsError] = useState('')
  const [reportRefresh, setReportRefresh] = useState(0)

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
  const [taskDueDate, setTaskDueDate] = useState('')
  const [savingTask, setSavingTask] = useState(false)

  const [assignableUsers, setAssignableUsers] = useState([])
  const [assignedTo, setAssignedTo] = useState('')
  const [loadingAssignableUsers, setLoadingAssignableUsers] =
    useState(false)

  const [editingTaskId, setEditingTaskId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editPriority, setEditPriority] = useState('medium')
  const [updatingTask, setUpdatingTask] = useState(false)
  const [statusUpdatingTaskId, setStatusUpdatingTaskId] = useState(null)
  const [deletingTaskId, setDeletingTaskId] = useState(null)

  const [showAIAssistant, setShowAIAssistant] = useState(false)
  const [unreadNotificationCount, setUnreadNotificationCount] =
  useState(0)
  const displayName =
    [user?.first_name, user?.last_name].filter(Boolean).join(' ') ||
    user?.username ||
    'User'

  const role = user?.role?.trim()?.toLowerCase()
  const canManageTasks = ['admin', 'manager'].includes(role)

  const allMenuItems = [
    {
      name: 'Dashboard',
      icon: '�',
      roles: ['admin', 'manager', 'employee'],
    },
    {
      name: 'My Tasks',
      icon: '?',
      roles: ['admin', 'manager', 'employee'],
    },
    {
      name: 'Create Task',
      icon: '+',
      roles: ['admin', 'manager'],
    },
    {
      name: 'Team Reports',
      icon: '?',
      roles: ['admin', 'manager'],
    },
    {
      name: 'AI Assistant',
      icon: '?',
      roles: ['admin', 'manager', 'employee'],
    },
    {
      name: 'Team Members',
      icon: '?',
      roles: ['admin', 'manager'],
    },
    {
      name: 'Notifications',
      icon: '??',
      roles: ['admin', 'manager', 'employee'],
    },
    {
      name: 'Settings',
      icon: '?',
      roles: ['admin', 'manager', 'employee'],
    },
  ]
  const filteredTeamMembers = teamMembers.filter((member) => {
    const search = memberSearch.toLowerCase().trim()
    const fullName = `${member.first_name || ''} ${member.last_name || ''}`

    return (
      (member.username || '').toLowerCase().includes(search) ||
      fullName.toLowerCase().includes(search) ||
      (member.email || '').toLowerCase().includes(search)
    )
  })
  const menuItems = allMenuItems.filter((item) =>
    item.roles.includes(role),
  )

  // Load tasks assigned to the current user.
  useEffect(() => {
    let cancelled = false

    async function loadTasks() {
      try {
        setLoadingTasks(true)
        setTaskError('')

        const data = await getTasks(accessToken)

        if (!cancelled) {
          setTasks(Array.isArray(data) ? data : [])
        }
      } catch (error) {
        if (!cancelled) {
          setTaskError(error.message || 'Unable to load tasks.')
        }
      } finally {
        if (!cancelled) {
          setLoadingTasks(false)
        }
      }
    }

    loadTasks()

    return () => {
      cancelled = true
    }
  }, [accessToken])

  // Load Team Reports.
  useEffect(() => {
    if (activeMenu !== 'Team Reports' || !canManageTasks) {
      return
    }

    let cancelled = false

    async function loadReports() {
      try {
        setLoadingReports(true)
        setReportsError('')

        const data = await getTeamReports(accessToken)

        if (!cancelled) {
          setTeamReportData(data)
        }
      } catch (error) {
        if (!cancelled) {
          setReportsError(
            error.message || 'Unable to load team reports.',
          )
        }
      } finally {
        if (!cancelled) {
          setLoadingReports(false)
        }
      }
    }

    loadReports()

    return () => {
      cancelled = true
    }
  }, [activeMenu, accessToken, canManageTasks, reportRefresh])

  // Load employees available for task assignment.
  useEffect(() => {
    if (!canManageTasks) {
      setAssignableUsers([])
      return
    }

    let cancelled = false

    async function loadAssignableUsers() {
      try {
        setLoadingAssignableUsers(true)

        const data = await getAssignableUsers(accessToken)

        if (!cancelled) {
          setAssignableUsers(Array.isArray(data) ? data : [])
        }
      } catch (error) {
        if (!cancelled) {
          setTaskError(
            error.message || 'Unable to load assignable employees.',
          )
        }
      } finally {
        if (!cancelled) {
          setLoadingAssignableUsers(false)
        }
      }
    }

    loadAssignableUsers()

    return () => {
      cancelled = true
    }
  }, [accessToken, canManageTasks])

  // Load Team Members for Admin.
  useEffect(() => {
    if (
      activeMenu !== 'Team Members' ||
      !['admin', 'manager'].includes(role)
    ) {
      return
    }

    let cancelled = false

    async function loadTeamMembers() {
      try {
        setLoadingMembers(true)
        setMembersError('')
        setRoleUpdateError('')
        setRoleUpdateSuccess('')

        const data = await getUsers(accessToken)

        if (!cancelled) {
          setTeamMembers(Array.isArray(data) ? data : [])
        }
      } catch (error) {
        if (!cancelled) {
          setMembersError(
            error.message || 'Unable to load team members.',
          )
        }
      } finally {
        if (!cancelled) {
          setLoadingMembers(false)
        }
      }
    }

    loadTeamMembers()

    return () => {
      cancelled = true
    }
  }, [activeMenu, accessToken, role])

  // Update a team member's role.
  async function handleRoleChange(memberId, newRole) {
    setRoleUpdateError('')
    setRoleUpdateSuccess('')
    setUpdatingRoleId(memberId)

    try {
      await assignUserRole(accessToken, memberId, newRole)

      setTeamMembers((currentMembers) =>
        currentMembers.map((member) =>
          member.id === memberId
            ? { ...member, role: newRole }
            : member,
        ),
      )

      setRoleUpdateSuccess('User role updated successfully.')
    } catch (error) {
      setRoleUpdateError(
        error.message || 'Unable to update user role.',
      )
    } finally {
      setUpdatingRoleId(null)
    }
  }
  async function handleUserStatusChange(member) {
  const nextIsActive = !member.is_active

  const action = nextIsActive ? 'reactivate' : 'deactivate'

  const confirmed = window.confirm(
    `Are you sure you want to ${action} ${member.username}?`,
  )

  if (!confirmed) return

  setStatusUpdateError('')
  setStatusUpdateSuccess('')
  setUpdatingStatusId(member.id)

  try {
    await updateUserStatus(
      accessToken,
      member.id,
      nextIsActive,
    )

    setTeamMembers((currentMembers) =>
      currentMembers.map((item) =>
        item.id === member.id
          ? { ...item, is_active: nextIsActive }
          : item,
      ),
    )

    setStatusUpdateSuccess(
      `${member.username} has been ${
        nextIsActive ? 'reactivated' : 'deactivated'
      } successfully.`,
    )
  } catch (error) {
    setStatusUpdateError(
      error.message || 'Unable to update user status.',
    )
  } finally {
    setUpdatingStatusId(null)
  }
}
  // Create a task.
  async function handleCreateTask(event) {
    event.preventDefault()
    setTaskError('')

    if (!canManageTasks) {
      setTaskError('You do not have permission to create tasks.')
      return
    }

    if (!taskTitle.trim()) {
      setTaskError('Please enter a task title.')
      return
    }

    if (!assignedTo) {
      setTaskError('Please select an employee to assign this task.')
      return
    }

    setSavingTask(true)

    try {
      const newTask = await createTask(accessToken, {
        title: taskTitle.trim(),
        description: taskDescription.trim(),
        priority: taskPriority,
        status: 'pending',
        assigned_to: Number(assignedTo),
        due_date: taskDueDate
          ? new Date(taskDueDate).toISOString()
          : null,
      })

      // The task list is for the current user's assigned tasks.
      if (Number(newTask.assigned_to) === Number(user?.id)) {
        setTasks((previousTasks) => [newTask, ...previousTasks])
      }

      setTaskTitle('')
      setTaskDescription('')
      setTaskPriority('medium')
      setTaskDueDate('')
      setAssignedTo('')
      setShowTaskForm(false)
      setActiveMenu('Dashboard')

      // Refresh Team Reports when new tasks are created.
      setTeamReportData(null)
      setReportRefresh((current) => current + 1)
    } catch (error) {
      setTaskError(error.message || 'Unable to create task.')
    } finally {
      setSavingTask(false)
    }
  }

  // Start editing a task.
  function startEditingTask(task) {
    if (!canManageTasks) return

    setEditingTaskId(task.id)
    setEditTitle(task.title || '')
    setEditPriority(task.priority || 'medium')
    setTaskError('')
  }

  // Update a task's title and priority.
  async function handleUpdateTask(event, taskId) {
    event.preventDefault()

    if (!canManageTasks) {
      setTaskError('You do not have permission to edit tasks.')
      return
    }

    setTaskError('')
    setUpdatingTask(true)

    try {
      const updatedTask = await updateTask(accessToken, taskId, {
        title: editTitle.trim(),
        priority: editPriority,
      })

      setTasks((previousTasks) =>
        previousTasks.map((task) =>
          task.id === taskId ? { ...task, ...updatedTask } : task,
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

  // Update a task's status.
  async function handleStatusChange(taskId, newStatus) {
    setTaskError('')
    setStatusUpdatingTaskId(taskId)

    try {
      const updatedTask = await updateTask(accessToken, taskId, {
        status: newStatus,
      })

      setTasks((previousTasks) =>
        previousTasks.map((task) =>
          task.id === taskId ? { ...task, ...updatedTask } : task,
        ),
      )

      setTeamReportData(null)
      setReportRefresh((current) => current + 1)
    } catch (error) {
      setTaskError(
        error.message || 'Unable to update task status.',
      )
    } finally {
      setStatusUpdatingTaskId(null)
    }
  }

  // Delete a task.
  async function handleDeleteTask(taskId) {
    if (!canManageTasks) {
      setTaskError('You do not have permission to delete tasks.')
      return
    }

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

      setTeamReportData(null)
      setReportRefresh((current) => current + 1)
    } catch (error) {
      setTaskError(error.message || 'Unable to delete task.')
    } finally {
      setDeletingTaskId(null)
    }
  }

  const completedTasks = tasks.filter(
    (task) => task.status === 'completed',
  ).length

  const progress =
    tasks.length > 0
      ? Math.round((completedTasks / tasks.length) * 100)
      : 0

  // Search, filter and sort tasks.
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
        return (
          new Date(b.created_at || 0) -
          new Date(a.created_at || 0)
        )
      }

      if (sortBy === 'oldest') {
        return (
          new Date(a.created_at || 0) -
          new Date(b.created_at || 0)
        )
      }

      if (sortBy === 'priority') {
        const priorityOrder = { high: 3, medium: 2, low: 1 }

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

  // AI Assistant page.
  if (showAIAssistant) {
    return (
      <AIAssistant
        accessToken={accessToken}
        onBack={() => setShowAIAssistant(false)}
      />
    )
  }

  // Team Members page � Admin and manager.
  if (
    activeMenu === 'Team Members' &&
    ['admin', 'manager'].includes(role)
  ) {
    return (
      <div className="container-fluid p-4">
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
          <div>
            <h1 className="fw-bold">Team Members</h1>
            <p className="text-secondary mb-0">
              View registered users, their roles, and account status.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => setActiveMenu('Dashboard')}
          >
            Back to Dashboard
          </button>
        </div>

        {loadingMembers && (
          <p className="text-secondary">Loading team members...</p>
        )}

        {membersError && (
          <div className="alert alert-danger" role="alert">
            {membersError}
          </div>
        )}

        {roleUpdateError && (
          <div className="alert alert-danger" role="alert">
            {roleUpdateError}
          </div>
        )}

        {roleUpdateSuccess && (
          <div className="alert alert-success" role="status">
            {roleUpdateSuccess}
          </div>
        )}

        {statusUpdateError && (
          <div className="alert alert-danger py-2" role="alert">
            {statusUpdateError}
          </div>
        )}

        {statusUpdateSuccess && (
          <div className="alert alert-success py-2" role="status">
            {statusUpdateSuccess}
          </div>
        )}

        {!loadingMembers && !membersError && (
        <div>
          <div className="mb-3">
            <input
              type="text"
              className="form-control"
              placeholder="Search by username, name, or email..."
              value={memberSearch}
              onChange={(event) => setMemberSearch(event.target.value)}
            />
          </div>

          <div className="card border-0 shadow-sm">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Username</th>
                    <th>Full Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredTeamMembers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-4">
                        No team members found.
                      </td>
                    </tr>
                  ) : (
                    filteredTeamMembers.map((member) => (
                      <tr key={member.id}>
                        <td>{member.username}</td>
                        <td>
                          {[member.first_name, member.last_name]
                            .filter(Boolean)
                            .join(' ') || '�'}
                        </td>
                        <td>{member.email || '�'}</td>
                        <td>
                          {role === 'admin' && (
                            <select
                              className="form-select form-select-sm"
                              aria-label={`Role for ${member.username}`}
                              value={member.role || ''}
                              disabled={updatingRoleId === member.id}
                              onChange={(event) =>
                                handleRoleChange(
                                  member.id,
                                  event.target.value,
                                )
                              }
                            >
                              <option value="" disabled>
                                Select role
                              </option>
                              <option value="Admin">Admin</option>
                              <option value="Manager">Manager</option>
                              <option value="Employee">Employee</option>
                            </select>
                          )}
                          {updatingRoleId === member.id && (
                            <small className="text-secondary">
                              Updating...
                            </small>
                          )}
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2 flex-wrap">
                            <span
                              className={`badge ${
                                member.is_active
                                  ? 'text-bg-success'
                                  : 'text-bg-secondary'
                              }`}
                            >
                              {member.is_active ? 'Active' : 'Inactive'}
                            </span>

                            {role === 'admin' && member.id !== user?.id && (
                              <button
                                type="button"
                                className={`btn btn-sm ${
                                  member.is_active
                                    ? 'btn-outline-danger'
                                    : 'btn-outline-success'
                                }`}
                                disabled={updatingStatusId === member.id}
                                onClick={() => handleUserStatusChange(member)}
                              >
                                {updatingStatusId === member.id
                                  ? 'Updating...'
                                  : member.is_active
                                    ? 'Deactivate'
                                    : 'Reactivate'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        )}
      </div>
    )
  }

  // Team Reports page � Admin and Manager only.
  if (
    activeMenu === 'Team Reports' &&
    canManageTasks
  ) {
    const totalTasks = teamReportData?.total_tasks ?? 0
    const completedCount = teamReportData?.completed_tasks ?? 0
    const pendingCount = teamReportData?.pending_tasks ?? 0
    const inProgressCount = teamReportData?.in_progress_tasks ?? 0
    const highPriorityCount = teamReportData?.high_priority_tasks ?? 0
    const completionRate = teamReportData?.completion_rate ?? 0
    const overdueCount = teamReportData?.overdue_tasks ?? 0
    const lowPriorityCount = teamReportData?.low_priority_tasks ?? 0
    const mediumPriorityCount =
      teamReportData?.medium_priority_tasks ?? 0

    const reportCards = [
      { title: 'Total Tasks', count: totalTasks, color: 'primary' },
      {
        title: 'Completed Tasks',
        count: completedCount,
        color: 'success',
      },
      {
        title: 'Pending Tasks',
        count: pendingCount,
        color: 'secondary',
      },
      {
        title: 'In Progress',
        count: inProgressCount,
        color: 'info',
      },
      {
        title: 'High Priority',
        count: highPriorityCount,
        color: 'danger',
      },
            {
        title: 'Completion Rate',
        count: `${completionRate}%`,
        color: 'success',
      },
      {
        title: 'Overdue Tasks',
        count: overdueCount,
        color: 'danger',
      },
    ]

    const memberReports = Array.isArray(
      teamReportData?.member_reports,
    )
      ? teamReportData.member_reports
      : []

    return (
      <div className="container-fluid p-4">
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
          <div>
            <h1 className="fw-bold">Team Reports</h1>
            <p className="text-secondary mb-0">
              Task progress and team workload overview.
            </p>
          </div>

          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-outline-primary"
              onClick={() => {
                setTeamReportData(null)
                setReportRefresh((current) => current + 1)
              }}
            >
              Refresh Reports
            </button>

            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => setActiveMenu('Dashboard')}
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {loadingReports && (
          <p className="text-secondary">Loading task reports...</p>
        )}

        {reportsError && (
          <div className="alert alert-danger" role="alert">
            {reportsError}
            <button
              type="button"
              className="btn btn-sm btn-outline-danger ms-3"
              onClick={() =>
                setReportRefresh((current) => current + 1)
              }
            >
              Try Again
            </button>
          </div>
        )}

        {!loadingReports && !reportsError && teamReportData && (
          <>
            <div className="row g-4 mb-4">
              {reportCards.map((card) => (
                <div
                  className="col-12 col-sm-6 col-xl-4"
                  key={card.title}
                >
                  <div className="card border-0 shadow-sm h-100">
                    <div className="card-body p-4">
                      <p className="text-secondary mb-2">
                        {card.title}
                      </p>
                      <h2 className={`fw-bold text-${card.color} mb-0`}>
                        {card.count}
                      </h2>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="card border-0 shadow-sm">
              <div className="card-body p-4">
                <h5 className="fw-bold mb-4">
                  Task Status Summary
                </h5>

                {[
                  {
                    label: 'Completed',
                    count: completedCount,
                    color: 'success',
                  },
                  {
                    label: 'Pending',
                    count: pendingCount,
                    color: 'secondary',
                  },
                  {
                    label: 'In Progress',
                    count: inProgressCount,
                    color: 'info',
                  },
                ].map((item) => {
                  const percentage =
                    totalTasks > 0
                      ? Math.round((item.count / totalTasks) * 100)
                      : 0

                  return (
                    <div className="mb-4" key={item.label}>
                      <div className="d-flex justify-content-between mb-2">
                        <span>{item.label}</span>
                        <span className="fw-semibold">
                          {item.count} ({percentage}%)
                        </span>
                      </div>

                      <div
                        className="progress"
                        role="progressbar"
                        aria-label={`${item.label} tasks`}
                        aria-valuenow={percentage}
                        aria-valuemin="0"
                        aria-valuemax="100"
                      >
                        <div
                          className={`progress-bar bg-${item.color}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
                
            <div className="card border-0 shadow-sm mt-4">
              <div className="card-body p-4">
                <h5 className="fw-bold mb-4">
                  Priority Breakdown
                </h5>

                {[
                  {
                    label: 'Low Priority',
                    count: lowPriorityCount,
                    color: 'success',
                  },
                  {
                    label: 'Medium Priority',
                    count: mediumPriorityCount,
                    color: 'warning',
                  },
                  {
                    label: 'High Priority',
                    count: highPriorityCount,
                    color: 'danger',
                  },
                ].map((item) => {
                  const percentage =
                    totalTasks > 0
                      ? Math.round((item.count / totalTasks) * 100)
                      : 0

                  return (
                    <div className="mb-4" key={item.label}>
                      <div className="d-flex justify-content-between mb-2">
                        <span>{item.label}</span>
                        <span className="fw-semibold">
                          {item.count} ({percentage}%)
                        </span>
                      </div>

                      <div
                        className="progress"
                        role="progressbar"
                        aria-label={item.label}
                        aria-valuenow={percentage}
                        aria-valuemin="0"
                        aria-valuemax="100"
                      >
                        <div
                          className={`progress-bar bg-${item.color}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

                {totalTasks === 0 && (
                  <p className="text-secondary mb-0">
                    No tasks are available to report yet.
                  </p>
                )}
              </div>
            </div>

            <div className="card border-0 shadow-sm mt-4">
              <div className="card-body p-4">
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
                  <div>
                    <h5 className="fw-bold mb-1">
                      Team Member Breakdown
                    </h5>
                    <p className="text-secondary mb-0">
                      Task workload and progress for each team member.
                    </p>
                  </div>

                  <span className="badge text-bg-primary">
                    {memberReports.length} Members
                  </span>
                </div>

                {memberReports.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Team Member</th>
                          <th>Email</th>
                          <th>Total Tasks</th>
                          <th>Completed</th>
                          <th>Pending</th>
                          <th>In Progress</th>
                          <th>Completion Rate</th>
                          <th>Overdue Tasks</th>
                        </tr>
                      </thead>

                      <tbody>
                        {memberReports.map((member) => (
                          <tr key={member.user_id}>
                            <td>
                              <div className="fw-semibold">
                                {[
                                  member.first_name,
                                  member.last_name,
                                ]
                                  .filter(Boolean)
                                  .join(' ') ||
                                  member.username ||
                                  '�'}
                              </div>

                              {member.username && (
                                <small className="text-secondary">
                                  @{member.username}
                                </small>
                              )}
                            </td>

                            <td>{member.email || '�'}</td>
                            <td>
                              <span className="badge text-bg-primary">
                                {member.total_tasks ?? 0}
                              </span>
                            </td>
                            <td>
                              <span className="badge text-bg-success">
                                {member.completed_tasks ?? 0}
                              </span>
                            </td>
                            <td>
                              <span className="badge text-bg-secondary">
                                {member.pending_tasks ?? 0}
                              </span>
                            </td>
                            <td>
                              <span className="badge text-bg-info">
                                {member.in_progress_tasks ?? 0}
                              </span>
                            </td>
                            
                            <td>
                              <div className="d-flex align-items-center gap-2">
                                <span className="small fw-semibold">
                                  {member.completion_rate ?? 0}%
                                </span>
                                <div
                                  className="progress flex-grow-1"
                                  style={{ minWidth: '60px', height: '8px' }}
                                  role="progressbar"
                                  aria-label="Member completion rate"
                                  aria-valuenow={member.completion_rate ?? 0}
                                  aria-valuemin="0"
                                  aria-valuemax="100"
                                >
                                  <div
                                    className="progress-bar bg-success"
                                    style={{
                                      width: `${member.completion_rate ?? 0}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className="badge text-bg-danger">
                                {member.overdue_tasks ?? 0}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center border rounded-3 p-4">
                    <h6 className="fw-bold">
                      No member report data available
                    </h6>
                    <p className="text-secondary mb-0">
                      Member task statistics will appear here when
                      tasks are assigned to team members.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  // Settings / Profile page.
  if (activeMenu === 'Settings') {
    return (
      <Profile
        user={user}
        accessToken={accessToken}
        onProfileUpdated={onProfileUpdated}
        onBack={() => setActiveMenu('Dashboard')}
      />
    )
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
                  setTaskError('')
                  setShowTaskForm(false)
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
              <span
                className="fs-5 position-relative"
                style={{ width: 24, display: 'inline-block' }}
              >
                {item.icon}

                {item.name === 'Notifications' &&
                  unreadNotificationCount > 0 && (
                  <span
                    className="position-absolute top-0 start-100 translate-middle badge rounded-pill text-bg-danger"
                    style={{ fontSize: '10px' }}
                  >
                    {unreadNotificationCount > 99
                      ? '99+'
                      : unreadNotificationCount}
                  </span>
                )}
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
          <div className="fw-bold">? Smart Desk AI</div>
          <small className="text-white-50">
            Work Smarter, Together
          </small>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-grow-1 p-4">
        {/* Header */}
        <div className="d-flex justify-content-end align-items-center gap-3">
          <div className="text-end">
            <div className="fw-semibold">{displayName}</div>
            <small className="text-secondary">
              {user?.role || 'Workspace Member'}
            </small>
          </div>

          <button
            type="button"
            className="btn btn-outline-danger"
            onClick={onLogout}
          >
            Logout
          </button>
        </div>
        {activeMenu === 'Notifications' && (
          <Notifications
            accessToken={accessToken}
            onUnreadCountChange={setUnreadNotificationCount}
            onOpenTask={(taskId) => {
              setHighlightedTaskId(Number(taskId))
              setActiveMenu('My Tasks')
              setTaskError('')
            }}
          />
        )}
        {/* Dashboard overview */}
        {activeMenu === 'Dashboard' && (
          <>
            <div className="mt-5">
              <p className="text-primary fw-semibold mb-1">
                WELCOME BACK
              </p>
              <h1 className="fw-bold">Hello, {displayName}! ??</h1>
              <p className="text-secondary">
                Here�s what�s happening with your work today.
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
                    <p className="text-success fw-semibold">
                      TEAM MEMBERS
                    </p>
                    <h2 className="fw-bold">
                      {teamMembers.length}
                    </h2>
                    <p className="text-secondary mb-0">
                      Members loaded in your workspace
                    </p>
                  </div>
                </div>
              </div>

              <div className="col-12 col-md-6 col-xl-3">
                <div className="card h-100 border-0 shadow-sm">
                  <div className="card-body p-4">
                    <p
                      className="fw-semibold"
                      style={{ color: '#7952f6' }}
                    >
                      MY PROGRESS
                    </p>
                    <h2 className="fw-bold">{progress}%</h2>
                    <p className="text-secondary mb-0">
                      Your tasks completed
                    </p>
                  </div>
                </div>
              </div>

              <div className="col-12 col-md-6 col-xl-3">
                <div className="card h-100 border-0 shadow-sm">
                  <div className="card-body p-4">
                    <p
                      className="fw-semibold"
                      style={{ color: '#d97706' }}
                    >
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
                {canManageTasks && (
                  <div className="col-12 col-md-4">
                    <div className="card border-0 shadow-sm h-100">
                      <div className="card-body p-4">
                        <div className="fs-2 text-primary">+</div>
                        <h5 className="fw-bold mt-2">Create Task</h5>
                        <p className="text-secondary">
                          Create and assign work to an employee.
                        </p>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => {
                            setTaskError('')
                            setShowTaskForm(true)
                            setActiveMenu('Create Task')
                          }}
                        >
                          + Create Task
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="col-12 col-md-4">
                  <div className="card border-0 shadow-sm h-100">
                    <div className="card-body p-4">
                      <div className="fs-2 text-success">?</div>
                      <h5 className="fw-bold mt-2">My Tasks</h5>
                      <p className="text-secondary">
                        View and update your assigned tasks.
                      </p>
                      <button
                        type="button"
                        className="btn btn-outline-success"
                        onClick={() => setActiveMenu('My Tasks')}
                      >
                        Open My Tasks
                      </button>
                    </div>
                  </div>
                </div>

                {canManageTasks && (
                  <div className="col-12 col-md-4">
                    <div className="card border-0 shadow-sm h-100">
                      <div className="card-body p-4">
                        <div className="fs-2 text-info">?</div>
                        <h5 className="fw-bold mt-2">Team Reports</h5>
                        <p className="text-secondary">
                          Review employee task progress.
                        </p>
                        <button
                          type="button"
                          className="btn btn-outline-info"
                          onClick={() => setActiveMenu('Team Reports')}
                        >
                          Open Team Reports
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="col-12 col-md-4">
                  <div className="card border-0 shadow-sm h-100">
                    <div className="card-body p-4">
                      <div
                        className="fs-2"
                        style={{ color: '#7952f6' }}
                      >
                        ?
                      </div>
                      <h5 className="fw-bold mt-2">AI Assistant</h5>
                      <p className="text-secondary">
                        Get help with your work.
                      </p>
                      <button
                        type="button"
                        className="btn btn-outline-primary"
                        onClick={() => setShowAIAssistant(true)}
                      >
                        Open AI Assistant
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* My Tasks page */}
        {activeMenu === 'My Tasks' && (
          <div className="mt-5">
            <h1 className="fw-bold">My Tasks</h1>
            <p className="text-secondary">
              View and update tasks assigned to you.
            </p>

            <div className="row g-3 mt-2">
              <div className="col-12 col-md-4">
                <div className="card border-0 shadow-sm">
                  <div className="card-body p-3">
                    <p className="text-secondary mb-1">Total Tasks</p>
                    <h3 className="fw-bold mb-0">{tasks.length}</h3>
                  </div>
                </div>
              </div>

              <div className="col-12 col-md-4">
                <div className="card border-0 shadow-sm">
                  <div className="card-body p-3">
                    <p className="text-secondary mb-1">In Progress</p>
                    <h3 className="fw-bold mb-0">
                      {
                        tasks.filter(
                          (task) => task.status === 'in_progress',
                        ).length
                      }
                    </h3>
                  </div>
                </div>
              </div>

              <div className="col-12 col-md-4">
                <div className="card border-0 shadow-sm">
                  <div className="card-body p-3">
                    <p className="text-secondary mb-1">Completed</p>
                    <h3 className="fw-bold mb-0">
                      {completedTasks}
                    </h3>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create task form: Admin and Manager only */}
        {activeMenu === 'Create Task' && canManageTasks && (
          <div className="card border-0 shadow-sm mt-4">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                <h4 className="fw-bold mb-0">Create New Task</h4>
                <span className="badge text-bg-primary">
                  Admin / Manager
                </span>
              </div>

              {taskError && (
                <div className="alert alert-danger" role="alert">
                  {taskError}
                </div>
              )}

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
                    onChange={(event) =>
                      setTaskTitle(event.target.value)
                    }
                    placeholder="Enter task title"
                    required
                  />
                </div>

                <div className="mb-3">
                  <label
                    htmlFor="taskDescription"
                    className="form-label"
                  >
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
                    onChange={(event) =>
                      setTaskPriority(event.target.value)
                    }
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label htmlFor="taskDueDate" className="form-label">
                    Deadline (Optional)
                  </label>

                  <input
                    id="taskDueDate"
                    type="datetime-local"
                    className="form-control"
                    value={taskDueDate}
                    onChange={(event) => setTaskDueDate(event.target.value)}
                    disabled={savingTask}
                  />

                  <small className="text-secondary">
                    Select the date and time by which this task should be completed.
                  </small>
                </div>
                <div className="mb-3">
                  <label htmlFor="assignedTo" className="form-label">
                    Assign to Employee
                  </label>

                  <select
                    id="assignedTo"
                    className="form-select"
                    value={assignedTo}
                    onChange={(event) =>
                      setAssignedTo(event.target.value)
                    }
                    required
                    disabled={loadingAssignableUsers || savingTask}
                  >
                    <option value="">
                      {loadingAssignableUsers
                        ? 'Loading employees...'
                        : 'Select an employee'}
                    </option>

                    {assignableUsers.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.first_name || employee.last_name
                          ? `${employee.first_name || ''} ${employee.last_name || ''}`.trim()
                          : employee.username}{' '}
                        ({employee.username})
                      </option>
                    ))}
                  </select>

                  {!loadingAssignableUsers &&
                    assignableUsers.length === 0 && (
                      <small className="text-danger">
                        No active employees available for assignment.
                      </small>
                    )}
                </div>

                <button
                  type="submit"
                  className="btn btn-primary me-2"
                  disabled={savingTask || loadingAssignableUsers}
                >
                  {savingTask ? 'Saving...' : 'Save Task'}
                </button>

                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setShowTaskForm(false)
                    setTaskError('')
                    setActiveMenu('Dashboard')
                  }}
                  disabled={savingTask}
                >
                  Cancel
                </button>
              </form>
            </div>
          </div>
        )}

        {/* My Tasks list: only shown in My Tasks */}
        {activeMenu === 'My Tasks' && (
          <div className="card border-0 shadow-sm mt-4">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div>
                  <h4 className="fw-bold">Your Assigned Tasks</h4>
                  <p className="text-secondary mb-0">
                    Track your work and update task status.
                  </p>
                </div>

                {canManageTasks && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      setTaskError('')
                      setShowTaskForm(true)
                    }}
                  >
                    + Add Task
                  </button>
                )}
              </div>

              {/* Search, filters and sorting */}
              <div className="row g-3 mt-3">
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
                    onChange={(event) =>
                      setSearchText(event.target.value)
                    }
                  />
                </div>

                <div className="col-12 col-md-6 col-lg-3">
                  <label
                    htmlFor="task-status-filter"
                    className="form-label"
                  >
                    Filter by Status
                  </label>
                  <select
                    id="task-status-filter"
                    className="form-select"
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(event.target.value)
                    }
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div className="col-12 col-md-6 col-lg-3">
                  <label
                    htmlFor="task-priority-filter"
                    className="form-label"
                  >
                    Filter by Priority
                  </label>
                  <select
                    id="task-priority-filter"
                    className="form-select"
                    value={priorityFilter}
                    onChange={(event) =>
                      setPriorityFilter(event.target.value)
                    }
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
                    <option value="priority">
                      Priority: High to Low
                    </option>
                    <option value="title">Title: A�Z</option>
                  </select>
                </div>
              </div>

              {taskError && (
                <div className="alert alert-danger mt-3" role="alert">
                  {taskError}
                </div>
              )}

              {loadingTasks ? (
                <p className="text-secondary mt-4">
                  Loading tasks...
                </p>
              ) : filteredTasks.length === 0 ? (
                <div className="mt-4 p-4 border rounded-3 text-center">
                  <h6 className="fw-bold">
                    {tasks.length === 0
                      ? 'No tasks assigned to you yet'
                      : 'No matching tasks'}
                  </h6>
                  <p className="text-secondary mb-0">
                    {tasks.length === 0
                      ? 'Tasks assigned to your account will appear here.'
                      : 'Try changing your search or filters.'}
                  </p>
                </div>
              ) : (
                <div className="row g-3 mt-2">
                  {filteredTasks.map((task) => (
                    <div className="col-12 col-lg-6" key={task.id}>
                      <div
                        id={`task-${task.id}`}
                        className={`p-3 border rounded-3 h-100 ${
                          highlightedTaskId === Number(task.id)
                            ? 'border-primary border-3 bg-light'
                            : ''
                        }`}
                      >
                        {editingTaskId === task.id && canManageTasks ? (
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
                              {updatingTask
                                ? 'Saving...'
                                : 'Save Changes'}
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
                            <div className="d-flex justify-content-between align-items-start gap-2">
                              <h6 className="fw-bold">{task.title}</h6>
                              <span
                                className={`badge ${
                                  task.status === 'completed'
                                    ? 'text-bg-success'
                                    : task.status === 'in_progress'
                                      ? 'text-bg-primary'
                                      : 'text-bg-secondary'
                                }`}
                              >
                                {(task.status || 'pending').replace(
                                  '_',
                                  ' ',
                                )}
                              </span>
                            </div>

                            <p className="text-secondary mb-3">
                              {task.description ||
                                'No description provided.'}
                            </p>

                            <span
                              className={`badge ${
                                task.priority === 'high'
                                  ? 'text-bg-danger'
                                  : task.priority === 'medium'
                                    ? 'text-bg-warning'
                                    : 'text-bg-success'
                              }`}
                            >
                              {task.priority || 'medium'} priority
                            </span>

                            <div className="mt-3">
                              <label
                                htmlFor={`task-status-${task.id}`}
                                className="form-label small fw-semibold"
                              >
                                Update Task Status
                              </label>

                              <select
                                id={`task-status-${task.id}`}
                                className="form-select form-select-sm"
                                value={task.status || 'pending'}
                                onChange={(event) =>
                                  handleStatusChange(
                                    task.id,
                                    event.target.value,
                                  )
                                }
                                disabled={
                                  statusUpdatingTaskId === task.id ||
                                  deletingTaskId === task.id
                                }
                              >
                                <option value="pending">Pending</option>
                                <option value="in_progress">
                                  In Progress
                                </option>
                                <option value="completed">
                                  Completed
                                </option>
                              </select>

                              {statusUpdatingTaskId === task.id && (
                                <small className="text-secondary">
                                  Updating status...
                                </small>
                              )}
                            </div>

                            {canManageTasks && (
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
                                  onClick={() =>
                                    handleDeleteTask(task.id)
                                  }
                                  disabled={deletingTaskId !== null}
                                >
                                  {deletingTaskId === task.id
                                    ? 'Deleting...'
                                    : 'Delete'}
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default Dashboard
