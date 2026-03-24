import { useState, useEffect, useCallback } from 'react'
import type { Todo } from '../types/todo'

interface UseTodosResult {
  todos: Todo[]
  error: string | null
  isLoading: boolean
  loaded: boolean
  isCreating: boolean
  isUpdating: string | null
  isDeleting: string | null
  createTodo: (text: string) => Promise<void>
  toggleTodo: (id: string, isComplete: boolean) => Promise<void>
  deleteTodo: (id: string) => Promise<void>
  retryLoad: () => void
}

async function assertOk(res: Response): Promise<Response> {
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res
}

export function useTodos(): UseTodosResult {
  const [todos, setTodos] = useState<Todo[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  const loadTodos = useCallback(() => {
    setIsLoading(true)
    setError(null)
    fetch('/api/todos')
      .then(assertOk)
      .then((res) => res.json())
      .then((data: Todo[]) => {
        setTodos(data)
        setLoaded(true)
      })
      .catch(() => setError('Could not load todos. Please check your connection and try again.'))
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => { loadTodos() }, [loadTodos])

  const createTodo = useCallback(async (text: string) => {
    setIsCreating(true)
    setError(null)
    try {
      const res = await assertOk(
        await fetch('/api/todos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        }),
      )
      const created: Todo = await res.json()
      setTodos((prev) => [...prev, created])
    } catch (err) {
      setError('Could not create todo. Please try again.')
      throw err // re-throw so AddTodoForm knows to preserve the input
    } finally {
      setIsCreating(false)
    }
  }, [])

  const toggleTodo = useCallback(async (id: string, isComplete: boolean) => {
    setIsUpdating(id)
    setError(null)
    try {
      const res = await assertOk(
        await fetch(`/api/todos/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isComplete }),
        }),
      )
      const updated: Todo = await res.json()
      // Only update state after confirmed success — no partial corruption on failure
      setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)))
    } catch {
      setError('Could not update todo. Please try again.')
      // todos state is unchanged — no partial corruption
    } finally {
      setIsUpdating(null)
    }
  }, [])

  const deleteTodo = useCallback(async (id: string) => {
    setIsDeleting(id)
    setError(null)
    try {
      await assertOk(await fetch(`/api/todos/${id}`, { method: 'DELETE' }))
      // Only remove from state after confirmed success
      setTodos((prev) => prev.filter((t) => t.id !== id))
    } catch {
      setError('Could not delete todo. Please try again.')
      // todo remains in list — no partial corruption
    } finally {
      setIsDeleting(null)
    }
  }, [])

  return {
    todos,
    error,
    isLoading,
    loaded,
    isCreating,
    isUpdating,
    isDeleting,
    createTodo,
    toggleTodo,
    deleteTodo,
    retryLoad: loadTodos,
  }
}

