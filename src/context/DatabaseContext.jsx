import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SQLite from 'expo-sqlite';
import { DATABASE_NAME, initializeDatabase } from '@/database/database';
import { addCategory } from '@/database/categoryRepository';
import { DEFAULT_CATEGORIES } from '@/constants/defaultCategories';
const DatabaseContext = createContext(undefined);
export function DatabaseProvider({ children }) { const [db, setDb] = useState(null); const [isLoading, setLoading] = useState(true); const [error, setError] = useState(null); useEffect(() => { let active = true; let database = null; (async () => { try {
    database = await SQLite.openDatabaseAsync(DATABASE_NAME);
    await initializeDatabase(database);
    const rows = await database.getAllAsync('SELECT id FROM categories LIMIT 1');
    if (rows.length === 0) {
        for (const category of DEFAULT_CATEGORIES)
            await addCategory(database, category);
    }
    if (active)
        setDb(database);
}
catch (e) {
    console.error('Database setup failed', e);
    if (active)
        setError(e instanceof Error ? e.message : 'Database could not be opened');
}
finally {
    if (active)
        setLoading(false);
} })(); return () => { active = false; if (database)
    void database.closeAsync(); }; }, []); return <DatabaseContext.Provider value={{ db, isLoading, error }}>{children}</DatabaseContext.Provider>; }
export function useDatabase() { const value = useContext(DatabaseContext); if (!value)
    throw new Error('useDatabase must be used inside DatabaseProvider'); return value; }
