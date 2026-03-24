import type { Todo } from '../types/todo'

interface TodoItemProps {
  todo: Todo
  isUpdating: boolean
  isDeleting: boolean
  onToggle: (id: string, isComplete: boolean) => void
  onDelete: (id: string) => void
}

export function TodoItem({ todo, isUpdating, isDeleting, onToggle, onDelete }: TodoItemProps) {
  return (
    <li className={`todo-item${todo.isComplete ? ' todo-item--complete' : ''}`}>
      <input
        type="checkbox"
        checked={todo.isComplete}
        disabled={isUpdating}
        onChange={() => onToggle(todo.id, !todo.isComplete)}
        aria-label={`Mark "${todo.text}" as ${todo.isComplete ? 'incomplete' : 'complete'}`}
      />
      <span className="todo-item__text">{todo.text}</span>
      <button
        className="todo-item__delete"
        disabled={isDeleting}
        onClick={() => onDelete(todo.id)}
        aria-label="Delete todo"
      >
        ✕
      </button>
    </li>
  )
}
