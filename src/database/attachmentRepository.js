export async function addAttachment(db, taskId, name, uri, mimeType, size) {
    await db.runAsync(`INSERT INTO task_attachments
    (taskId, name, uri, mimeType, size, createdAt)
    VALUES (?, ?, ?, ?, ?, ?)`, taskId, name, uri, mimeType, size, new Date().toISOString());
}
export async function getAttachments(db, taskId) {
    return db.getAllAsync(`SELECT * FROM task_attachments
     WHERE taskId = ?
     ORDER BY createdAt DESC`, taskId);
}
export async function deleteAttachment(db, id) {
    await db.runAsync('DELETE FROM task_attachments WHERE id = ?', id);
}
