
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

async function readResponse(response, fallbackMessage) {
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message =
      data.detail ||
      data.message ||
      data.non_field_errors?.[0] ||
      Object.values(data)
        .flat()
        .find((value) => typeof value === 'string') ||
      fallbackMessage

    throw new Error(message)
  }

  return data
}

// LOGIN: Username and password send  OTP request.
export async function loginUser(username, password) {
  const response = await fetch(`${API_BASE_URL}/api/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })

  return readResponse(response, 'Login failed. Please check your credentials.')
}

// LOGIN OTP: OTP verify access and refresh tokens .
export async function verifyLoginOTP(username, otp) {
  const response = await fetch(
    `${API_BASE_URL}/api/auth/login/verify-otp/`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, otp }),
    },
  )

  return readResponse(response, 'Unable to verify login OTP.')
}

export async function getUserProfile(accessToken) {
  const response = await fetch(`${API_BASE_URL}/api/auth/profile/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  return readResponse(response, 'Unable to load your profile. Please log in again.')
}

export async function getTasks(accessToken) {
  const response = await fetch(`${API_BASE_URL}/api/tasks/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  return readResponse(response, 'Unable to load tasks.')
}

export async function createTask(accessToken, task) {
  const response = await fetch(`${API_BASE_URL}/api/tasks/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(task),
  })

  return readResponse(response, 'Unable to create task.')
}

export async function updateTask(accessToken, taskId, updates) {
  const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  })

  return readResponse(response, 'Unable to update task.')
}

export async function deleteTask(accessToken, taskId) {
  const response = await fetch(
    `${API_BASE_URL}/api/tasks/${taskId}/delete/`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  )

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.detail || 'Unable to delete task.')
  }
}

export async function getConversations(accessToken) {
  const response = await fetch(`${API_BASE_URL}/api/ai/conversations/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  return readResponse(response, 'Unable to load conversations.')
}

export async function createConversation(accessToken, title = 'New conversation') {
  const response = await fetch(`${API_BASE_URL}/api/ai/conversations/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title }),
  })

  return readResponse(response, 'Unable to create a conversation.')
}

export async function sendAIMessage(accessToken, conversationId, message) {
  const response = await fetch(`${API_BASE_URL}/api/ai/chat/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      conversation_id: conversationId,
      message,
    }),
  })

  return readResponse(response, 'Unable to get a response from AI Assistant.')
}

export async function sendGroqWorkRequest(accessToken, payload) {
  const response = await fetch(`${API_BASE_URL}/api/ai/work/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  return readResponse(response, 'Groq Work Assistant encountered an error.')
}

export async function deleteConversation(accessToken, conversationId) {
  const response = await fetch(
    `${API_BASE_URL}/api/ai/conversations/${conversationId}/`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  )

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.detail || 'Unable to delete conversation.')
  }
}

export async function renameConversation(accessToken, conversationId, title) {
  const response = await fetch(
    `${API_BASE_URL}/api/ai/conversations/${conversationId}/`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title }),
    },
  )

  return readResponse(response, 'Unable to rename conversation.')
}

export async function updateUserProfile(accessToken, profileData) {
  const response = await fetch(`${API_BASE_URL}/api/auth/profile/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(profileData),
  })

  return readResponse(response, 'Unable to update your profile.')
}

export async function getUsers(accessToken) {
  const response = await fetch(`${API_BASE_URL}/api/auth/users/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  return readResponse(response, 'Unable to load team members.')
}

export async function updateUserStatus(accessToken, userId, is_active) {
  const response = await fetch(
    `${API_BASE_URL}/api/auth/users/${userId}/status/`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ is_active }),
    },
  )

  return readResponse(response, 'Unable to update user status.')
}

export async function getAssignableUsers(accessToken) {
  const response = await fetch(
    `${API_BASE_URL}/api/tasks/assignable-users/`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    },
  )

  return readResponse(response, 'Unable to load assignable employees.')
}

export async function assignUserRole(accessToken, userId, role) {
  const response = await fetch(
    `${API_BASE_URL}/api/auth/users/${userId}/role/`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role }),
    },
  )

  return readResponse(response, 'Unable to update user role.')
}

export async function getTeamReports(accessToken) {
  const response = await fetch(`${API_BASE_URL}/api/tasks/team-reports/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  return readResponse(response, 'Unable to load team reports.')
}

// FORGOT PASSWORD: Email OTP request.
export async function requestPasswordReset(email) {
  const response = await fetch(`${API_BASE_URL}/api/auth/password-reset/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })

  return readResponse(response, 'Unable to request password reset.')
}

// FORGOT PASSWORD: Email + OTP + new password submit.
export async function confirmPasswordReset(
  email,
  otp,
  password,
  confirm_password,
) {
  const response = await fetch(
    `${API_BASE_URL}/api/auth/password-reset/confirm/`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        otp,
        password,
        confirm_password,
      }),
    },
  )

  return readResponse(response, 'Unable to reset password.')
}

export async function getNotifications(accessToken, filter = 'all') {
  const query =
    filter === 'all'
      ? ''
      : `?unread=${filter === 'unread' ? 'true' : 'false'}`

  const response = await fetch(
    `${API_BASE_URL}/api/notifications/${query}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    },
  )

  return readResponse(response, 'Failed to load notifications.')
}

export async function getUnreadNotificationCount(accessToken) {
  const response = await fetch(
    `${API_BASE_URL}/api/notifications/unread-count/`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  )

  const data = await readResponse(response, 'Failed to load unread count.')
  return data.unread_count
}

export async function markNotificationRead(accessToken, notificationId) {
  const response = await fetch(
    `${API_BASE_URL}/api/notifications/${notificationId}/read/`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    },
  )

  return readResponse(response, 'Failed to mark notification as read.')
}

export async function deleteNotification(accessToken, notificationId) {
  const response = await fetch(
    `${API_BASE_URL}/api/notifications/${notificationId}/delete/`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  )

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.detail || 'Failed to delete notification.')
  }
}
