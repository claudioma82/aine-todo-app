import { useState, type FormEvent } from 'react'

interface AddTodoFormProps {
  isCreating: boolean
  onAdd: (text: string) => Promise<void>
}

export function AddTodoForm({ isCreating, onAdd }: AddTodoFormProps) {
  const [text, setText] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (text.trim().length === 0) return
    try {
      await onAdd(text.trim())
      setText('') // only clear on success — preserves input on failure
    } catch {
      // error is surfaced by useTodos, input is preserved
    }
  }

  return (
    <form className="add-todo-form" onSubmit={handleSubmit}>
      <label htmlFor="new-todo">New todo</label>
      <div className="add-todo-form__row">
        <input
          id="new-todo"
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What needs to be done?"
          disabled={isCreating}
        />
        <button type="submit" disabled={isCreating || text.trim().length === 0}>
          Add
        </button>
      </div>
    </form>
  )
}
