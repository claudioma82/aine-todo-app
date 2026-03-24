import './App.css'
import { AddTodoForm } from './components/AddTodoForm'
import { EmptyState } from './components/EmptyState'
import { ErrorState } from './components/ErrorState'
import { LoadingState } from './components/LoadingState'
import { TodoItem } from './components/TodoItem'
import { useTodos } from './hooks/useTodos'

function App() {
  const {
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
    retryLoad,
  } = useTodos()

  return (
    <main className="app">
      <h1>Todo App</h1>

      {isLoading ? (
        <LoadingState />
      ) : !loaded ? (
        // Initial load failed — show full error state with retry
        <ErrorState message={error ?? 'Could not load todos.'} onRetry={retryLoad} />
      ) : (
        <>
          <AddTodoForm isCreating={isCreating} onAdd={createTodo} />

          {/* Inline error banner for mutation failures (aria-live so screen readers announce it) */}
          {error && (
            <div className="error-banner" role="status" aria-live="polite">
              {error}
            </div>
          )}

          {todos.length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="todo-list">
              {todos.map((todo) => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  isUpdating={isUpdating === todo.id}
                  isDeleting={isDeleting === todo.id}
                  onToggle={toggleTodo}
                  onDelete={deleteTodo}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  )
}

export default App
