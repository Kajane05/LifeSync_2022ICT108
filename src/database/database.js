import { plusDays, today } from '../constants/app';
export async function initializeDatabase(db) {
    await db.execAsync(`
    PRAGMA journal_mode=WAL;
    PRAGMA foreign_keys=ON;

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT,
      priority TEXT,
      status TEXT,
      dueDate TEXT,
      createdAt TEXT
    );

    CREATE TABLE IF NOT EXISTS task_attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      taskId INTEGER NOT NULL,
      name TEXT NOT NULL,
      uri TEXT NOT NULL,
      mimeType TEXT,
      size INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (taskId)
        REFERENCES tasks(id)
        ON DELETE CASCADE
    );
  `);
    const result = await db.getFirstAsync('SELECT COUNT(*) n FROM tasks');
    if (!result?.n) {
        const sampleTasks = [
            ['Plan weekly goals', 'Review priorities', 'Personal', 'High', 'In Progress', plusDays(1)],
            ['Prepare project report', 'Finish the report', 'Work', 'Medium', 'Pending', plusDays(2)],
            ['Buy groceries', 'Household essentials', 'Personal', 'Low', 'Pending', plusDays(3)],
            ['Review presentation', 'Check final slides', 'Education', 'High', 'Completed', plusDays(-1)],
        ];
        for (const task of sampleTasks) {
            await db.runAsync(`INSERT INTO tasks
        (title, description, category, priority, status, dueDate, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)`, [...task, today()]);
        }
    }
}
