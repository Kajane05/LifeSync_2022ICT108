// Add a new task
export const addTask = async (db, task) => {
    const now = new Date().toISOString();
    const result = await db.runAsync(`INSERT INTO tasks (
      title,
      description,
      categoryId,
      priority,
      status,
      dueDate,
      createdAt,
      updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`, task.title.trim(), task.description, task.categoryId, task.priority, task.status, task.dueDate, now, now);
    return result.lastInsertRowId;
};
// Get all tasks
export const getAllTasks = async (db) => {
    return await db.getAllAsync("SELECT * FROM tasks ORDER BY createdAt DESC;");
};
// Get one task by ID
export const getTaskById = async (db, id) => {
    return await db.getFirstAsync("SELECT * FROM tasks WHERE id = ?;", id);
};
// Update a task
export const updateTask = async (db, id, updates) => {
    const fields = [];
    const values = [];
    if (updates.title !== undefined) {
        fields.push("title = ?");
        values.push(updates.title);
    }
    if (updates.description !== undefined) {
        fields.push("description = ?");
        values.push(updates.description);
    }
    if (updates.categoryId !== undefined) {
        fields.push("categoryId = ?");
        values.push(updates.categoryId);
    }
    if (updates.priority !== undefined) {
        fields.push("priority = ?");
        values.push(updates.priority);
    }
    if (updates.status !== undefined) {
        fields.push("status = ?");
        values.push(updates.status);
    }
    if (updates.dueDate !== undefined) {
        fields.push("dueDate = ?");
        values.push(updates.dueDate);
    }
    if (fields.length === 0) {
        return;
    }
    fields.push("updatedAt = ?");
    values.push(new Date().toISOString());
    await db.runAsync(`UPDATE tasks SET ${fields.join(", ")} WHERE id = ?;`, ...values, id);
};
// Delete a task
export const deleteTask = async (db, id) => {
    await db.runAsync("DELETE FROM tasks WHERE id = ?;", id);
};
// Change task status
export const updateTaskStatus = async (db, id, status) => {
    await db.runAsync(`UPDATE tasks
     SET status = ?, updatedAt = ?
     WHERE id = ?;`, status, new Date().toISOString(), id);
};
// Search tasks
export const searchTasks = async (db, query) => {
    const searchValue = `%${query.trim()}%`;
    return await db.getAllAsync(`SELECT * FROM tasks
     WHERE title LIKE ? OR description LIKE ?
     ORDER BY createdAt DESC;`, searchValue, searchValue);
};
