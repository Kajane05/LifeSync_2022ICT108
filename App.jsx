import React from 'react';
import { SQLiteProvider } from 'expo-sqlite';
import MainScreen from './src/screens/MainScreen';
import { initializeDatabase } from './src/database/database';
export default function App() {
    return (<SQLiteProvider databaseName="lifesync.db" onInit={initializeDatabase}>
      <MainScreen />
    </SQLiteProvider>);
}
