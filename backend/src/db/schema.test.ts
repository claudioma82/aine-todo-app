import { describe, it, expect } from 'vitest';
import type { Todo } from './schema';

describe('Todo interface', () => {
  it('has the correct shape', () => {
    const todo: Todo = {
      id: 'abc',
      text: 'test',
      isComplete: 0,
      createdAt: new Date().toISOString(),
    };
    expect(todo).toHaveProperty('id');
    expect(todo).toHaveProperty('text');
    expect(todo).toHaveProperty('isComplete');
    expect(todo).toHaveProperty('createdAt');
  });
});
