// Add a new category
export const addCategory = async (db, category) => {
    const result = await db.runAsync(`INSERT INTO categories (
      name,
      color,
      icon,
      createdAt
    ) VALUES (?, ?, ?, ?);`, category.name.trim(), category.color, category.icon, new Date().toISOString());
    return result.lastInsertRowId;
};
// Get all categories
export const getAllCategories = async (db) => {
    return await db.getAllAsync("SELECT * FROM categories ORDER BY name ASC;");
};
// Get one category by ID
export const getCategoryById = async (db, id) => {
    return await db.getFirstAsync("SELECT * FROM categories WHERE id = ?;", id);
};
// Update a category
export const updateCategory = async (db, id, updates) => {
    const fields = [];
    const values = [];
    if (updates.name !== undefined) {
        fields.push("name = ?");
        values.push(updates.name);
    }
    if (updates.color !== undefined) {
        fields.push("color = ?");
        values.push(updates.color);
    }
    if (updates.icon !== undefined) {
        fields.push("icon = ?");
        values.push(updates.icon);
    }
    if (fields.length === 0) {
        return;
    }
    await db.runAsync(`UPDATE categories SET ${fields.join(", ")} WHERE id = ?;`, ...values, id);
};
// Delete a category
export const deleteCategory = async (db, id) => {
    await db.runAsync("DELETE FROM categories WHERE id = ?;", id);
};
