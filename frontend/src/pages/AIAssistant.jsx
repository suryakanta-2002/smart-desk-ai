
import { useEffect, useState } from 'react'
import {
  getConversations,
  createConversation,
  sendAIMessage,
  deleteConversation,
  renameConversation,
} from '../api/client.js'

function AIAssistant({ accessToken, onBack }) {
  const [conversations, setConversations] = useState([])
  const [activeConversationId, setActiveConversationId] = useState(null)
  const [message, setMessage] = useState('')
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [sending, setSending] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [deletingConversationId, setDeletingConversationId] =
    useState(null)

  const [editingConversationId, setEditingConversationId] = useState(null)
  const [editedTitle, setEditedTitle] = useState('')
  const [renaming, setRenaming] = useState(false)

  const activeConversation = conversations.find(
    (conversation) => conversation.id === activeConversationId,
  )

  useEffect(() => {
    let cancelled = false

    async function loadConversations() {
      try {
        setError('')
        const data = await getConversations(accessToken)
        const list = Array.isArray(data) ? data : data.results || []

        if (cancelled) return

        setConversations(list)

        if (list.length > 0) {
          setActiveConversationId(list[0].id)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Unable to load conversations.')
        }
      } finally {
        if (!cancelled) {
          setLoadingConversations(false)
        }
      }
    }

    loadConversations()

    return () => {
      cancelled = true
    }
  }, [accessToken])

  async function handleNewConversation() {
    setCreating(true)
    setError('')

    try {
      const conversation = await createConversation(
        accessToken,
        'New conversation',
      )

      setConversations((previous) => [conversation, ...previous])
      setActiveConversationId(conversation.id)
    } catch (err) {
      setError(err.message || 'Unable to create a conversation.')
    } finally {
      setCreating(false)
    }
  }

  async function handleDeleteConversation(conversationId) {
    const confirmed = window.confirm(
      'Delete this conversation and its messages? This action cannot be undone.',
    )

    if (!confirmed) return

    setDeletingConversationId(conversationId)
    setError('')

    try {
      await deleteConversation(accessToken, conversationId)

      const remaining = conversations.filter(
        (conversation) => conversation.id !== conversationId,
      )

      setConversations(remaining)

      if (activeConversationId === conversationId) {
        setActiveConversationId(remaining[0]?.id ?? null)
      }

      if (editingConversationId === conversationId) {
        setEditingConversationId(null)
        setEditedTitle('')
      }
    } catch (err) {
      setError(err.message || 'Unable to delete conversation.')
    } finally {
      setDeletingConversationId(null)
    }
  }

  function handleStartRename(conversation) {
    setError('')
    setEditingConversationId(conversation.id)
    setEditedTitle(conversation.title || '')
  }

  function handleCancelRename() {
    setEditingConversationId(null)
    setEditedTitle('')
    setError('')
  }

  async function handleRenameConversation(conversationId) {
    const title = editedTitle.trim()

    if (!title) {
      setError('Conversation title cannot be empty.')
      return
    }

    if (title.length > 200) {
      setError('Conversation title cannot exceed 200 characters.')
      return
    }

    setRenaming(true)
    setError('')

    try {
      const updatedConversation = await renameConversation(
        accessToken,
        conversationId,
        title,
      )

      setConversations((previous) =>
        previous.map((conversation) =>
          conversation.id === conversationId
            ? { ...conversation, ...updatedConversation }
            : conversation,
        ),
      )

      setEditingConversationId(null)
      setEditedTitle('')
    } catch (err) {
      setError(err.message || 'Unable to rename conversation.')
    } finally {
      setRenaming(false)
    }
  }

  async function handleSendMessage(event) {
    event.preventDefault()

    const text = message.trim()

    if (!text || sending) return

    setError('')
    setSending(true)

    try {
      let conversationId = activeConversationId

      if (!conversationId) {
        const conversation = await createConversation(
          accessToken,
          'New conversation',
        )

        setConversations((previous) => [conversation, ...previous])
        setActiveConversationId(conversation.id)
        conversationId = conversation.id
      }

      const temporaryUserMessage = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content: text,
        created_at: new Date().toISOString(),
      }

      setConversations((previous) =>
        previous.map((item) =>
          item.id === conversationId
            ? {
                ...item,
                messages: [
                  ...(item.messages || []),
                  temporaryUserMessage,
                ],
              }
            : item,
        ),
      )

      setMessage('')

      const result = await sendAIMessage(
        accessToken,
        conversationId,
        text,
      )

      setConversations((previous) =>
        previous.map((item) =>
          item.id === conversationId
            ? {
                ...item,
                messages: [
                  ...(item.messages || []).filter(
                    (msg) => msg.id !== temporaryUserMessage.id,
                  ),
                  {
                    id: `user-${Date.now()}`,
                    role: 'user',
                    content: text,
                    created_at: new Date().toISOString(),
                  },
                  {
                    id: `assistant-${Date.now()}`,
                    role: 'assistant',
                    content: result.answer,
                    created_at: new Date().toISOString(),
                  },
                ],
              }
            : item,
        ),
      )
    } catch (err) {
      setError(err.message || 'Unable to send your message.')
      setMessage(text)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">✧ AI Assistant</h2>
          <p className="text-secondary mb-0">
            Your AI-powered workspace assistant
          </p>
        </div>

        {onBack && (
          <button className="btn btn-outline-secondary" onClick={onBack}>
            Back to Dashboard
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <div className="row g-3">
        <div className="col-12 col-md-4 col-lg-3">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <button
                className="btn btn-primary w-100 mb-3"
                onClick={handleNewConversation}
                disabled={creating || renaming}
              >
                {creating ? 'Creating...' : '+ New Conversation'}
              </button>

              <h6 className="fw-bold">Recent Conversations</h6>

              {loadingConversations ? (
                <p className="text-secondary small">Loading...</p>
              ) : conversations.length === 0 ? (
                <p className="text-secondary small">
                  No conversations yet. Start a new one.
                </p>
              ) : (
                <div className="d-grid gap-2">
                  {conversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      className="d-flex align-items-center gap-2"
                    >
                      {editingConversationId === conversation.id ? (
                        <input
                          type="text"
                          className="form-control form-control-sm flex-grow-1"
                          style={{ minWidth: 0 }}
                          value={editedTitle}
                          onChange={(event) =>
                            setEditedTitle(event.target.value)
                          }
                          maxLength={200}
                          aria-label="New conversation title"
                          autoFocus
                          disabled={renaming}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault()
                              handleRenameConversation(conversation.id)
                            }

                            if (event.key === 'Escape') {
                              handleCancelRename()
                            }
                          }}
                        />
                      ) : (
                        <button
                          type="button"
                          className={`btn text-start flex-grow-1 ${
                            activeConversationId === conversation.id
                              ? 'btn-primary'
                              : 'btn-outline-secondary'
                          }`}
                          style={{ minWidth: 0 }}
                          onClick={() =>
                            setActiveConversationId(conversation.id)
                          }
                          disabled={renaming}
                        >
                          <span className="d-block text-truncate">
                            {conversation.title || 'Conversation'}
                          </span>
                        </button>
                      )}

                      {editingConversationId === conversation.id ? (
                        <>
                          <button
                            type="button"
                            className="btn btn-success btn-sm"
                            title="Save title"
                            aria-label="Save conversation title"
                            disabled={renaming || !editedTitle.trim()}
                            onClick={() =>
                              handleRenameConversation(conversation.id)
                            }
                          >
                            {renaming ? '...' : 'Save'}
                          </button>

                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            title="Cancel rename"
                            aria-label="Cancel rename"
                            disabled={renaming}
                            onClick={handleCancelRename}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="btn btn-outline-primary btn-sm"
                            title="Rename conversation"
                            aria-label={`Rename ${conversation.title || 'conversation'}`}
                            disabled={
                              renaming ||
                              sending ||
                              deletingConversationId !== null
                            }
                            onClick={() => handleStartRename(conversation)}
                          >
                            Rename
                          </button>

                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm"
                            title="Delete conversation"
                            aria-label={`Delete ${conversation.title || 'conversation'}`}
                            disabled={
                              deletingConversationId !== null ||
                              sending ||
                              renaming
                            }
                            onClick={() =>
                              handleDeleteConversation(conversation.id)
                            }
                          >
                            {deletingConversationId === conversation.id
                              ? '...'
                              : 'Delete'}
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-12 col-md-8 col-lg-9">
          <div
            className="card shadow-sm border-0"
            style={{ minHeight: '600px' }}
          >
            <div className="card-header bg-white py-3">
              <strong>
                {activeConversation?.title || 'AI Chat'}
              </strong>
            </div>

            <div
              className="card-body d-flex flex-column gap-3"
              style={{
                minHeight: '430px',
                maxHeight: '520px',
                overflowY: 'auto',
              }}
            >
              {!activeConversation ? (
                <div className="text-center text-secondary m-auto">
                  <div className="display-4">✧</div>
                  <h5>How can I help you?</h5>
                  <p>
                    Start a new conversation to chat with your AI assistant.
                  </p>
                </div>
              ) : (activeConversation.messages || []).length === 0 ? (
                <div className="text-center text-secondary m-auto">
                  <h5>Start chatting</h5>
                  <p>Ask a question about your work or tasks.</p>
                </div>
              ) : (
                activeConversation.messages.map((chatMessage) => (
                  <div
                    key={chatMessage.id}
                    className={`p-3 rounded-3 ${
                      chatMessage.role === 'assistant'
                        ? 'bg-light align-self-start'
                        : 'bg-primary text-white align-self-end'
                    }`}
                    style={{
                      maxWidth: '85%',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    <div className="small fw-bold mb-1">
                      {chatMessage.role === 'assistant'
                        ? 'AI Assistant'
                        : 'You'}
                    </div>
                    {chatMessage.content}
                  </div>
                ))
              )}

              {sending && (
                <div className="text-secondary small">
                  AI Assistant is thinking...
                </div>
              )}
            </div>

            <div className="card-footer bg-white p-3">
              <form onSubmit={handleSendMessage} className="d-flex gap-2">
                <input
                  className="form-control"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Ask your AI assistant..."
                  maxLength={4000}
                  disabled={sending || renaming}
                  aria-label="Message"
                />

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={sending || renaming || !message.trim()}
                >
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </form>

              <small className="text-secondary">
                Do not share passwords or API keys in chat.
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AIAssistant
