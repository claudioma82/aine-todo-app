export interface Todo {
  id: string;
  text: string;
  isComplete: number; // stored as 0 (false) or 1 (true) in SQLite
  createdAt: string;
}
