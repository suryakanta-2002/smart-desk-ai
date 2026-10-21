
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export async function loginUser(username, password) {
  const response = await fetch(`${API_BASE_URL}/api/auth/token/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message =
      data.detail ||
      data.non_field_errors?.[0] ||
      'Login failed. Please check your credentials.'

    throw new Error(message)
  }

  return data
}

export async function getUserProfile(accessToken) {
  const response = await fetch(
    `${API_BASE_URL}/api/auth/profile/`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    },
  )

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message =
      data.detail || 'Unable to load your profile. Please log in again.'

    throw new Error(message)
  }

  return data
}

export async function getTasks(accessToken) {
  const response = await fetch(`${API_BASE_URL}/api/tasks/`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.detail || 'Unable to load tasks.')
  }

  return data
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

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message =
      data.detail ||
      Object.values(data).flat().join(' ') ||
      'Unable to create task.'

    throw new Error(message)
  }

  return data
}

export async function updateTask(accessToken, taskId, updates) {
  const response = await fetch(
    `${API_BASE_URL}/api/tasks/${taskId}/`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    },
  )

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.detail || 'Unable to update task.')
  }

  return data
}

export async function deleteTask(accessToken, taskId) {
  const response = await fetch(
    `${API_BASE_URL}/api/tasks/${taskId}/delete/`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  )

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.detail || 'Unable to delete task.')
  }
}

export async function getConversations(accessToken) {
  const response = await fetch(
    `${API_BASE_URL}/api/ai/conversations/`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    },
  )

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(
      data.detail || 'Unable to load conversations.',
    )
  }

  return data
}

export async function createConversation(accessToken, title = 'New conversation') {
  const response = await fetch(
    `${API_BASE_URL}/api/ai/conversations/`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title }),
    },
  )

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(
      data.detail || 'Unable to create a conversation.',
    )
  }

  return data
}

export async function sendAIMessage(accessToken, conversationId, message) {
  const response = await fetch(
    `${API_BASE_URL}/api/ai/chat/`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversation_id: conversationId,
        message,
      }),
    },
  )

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(
      data.detail || 'Unable to get a response from AI Assistant.',
    )
  }

  return data
}

export async function deleteConversation(accessToken, conversationId) {
  const response = await fetch(
    `${API_BASE_URL}/api/ai/conversations/${conversationId}/`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      data.detail || "Unable to delete conversation."
    );
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

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message =
      data.detail ||
      Object.values(data).flat().join(' ') ||
      'Unable to rename conversation.'

    throw new Error(message)
  }

  return data
}

export const updateUserProfile = async (accessToken, profileData) => {
  const response = await fetch(
    `${API_BASE_URL}/api/auth/profile/`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(profileData),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      Object.values(data).flat().join(" ")
    );
  }

  return data;
};

export async function getUsers(accessToken) {
  const response = await fetch(
    `${API_BASE_URL}/api/auth/users/`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    },
  )

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(
      data.detail || 'Unable to load team members.',
    )
  }

  return data
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

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.detail || 'Unable to update user role.')
  }

  return data
}

export async function getTeamReports(accessToken) {
  const response = await fetch(
    `${API_BASE_URL}/api/tasks/team-reports/`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    },
  )

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(
      data.detail || 'Unable to load team reports.',
    )
  }

  return data
}
