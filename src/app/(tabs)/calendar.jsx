import React, { useCallback, useState } from 'react';
import { ScrollView, Text, Pressable } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Page, Label, Muted, Card } from '@/components/ui';
import { useDatabase } from '@/context/DatabaseContext';
import { useTheme } from '@/context/ThemeContext';
import { getAllTasks } from '@/database/taskRepository';
export default function Calendar() { const { db } = useDatabase(); const { colors } = useTheme(); const router = useRouter(); const [tasks, setTasks] = useState([]); useFocusEffect(useCallback(() => { (async () => { if (db)
    setTasks(await getAllTasks(db)); })(); }, [db])); const dates = [...new Set(tasks.filter(t => t.dueDate).map(t => t.dueDate))].sort(); return <Page><Label>Calendar</Label><Muted>Tasks grouped by their due dates.</Muted><ScrollView>{dates.map(d => <React.Fragment key={d}><Text style={{ color: '#2563EB', fontWeight: '800', marginTop: 22 }}>{new Date(`${d}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</Text>{tasks.filter(t => t.dueDate === d).map(t => <Pressable key={t.id} onPress={() => router.push(`/(tabs)/task/${t.id}`)}><Card><Text style={{ fontWeight: '700', color: colors.text }}>{t.title}</Text><Muted>{t.status} · {t.priority}</Muted></Card></Pressable>)}</React.Fragment>)}{dates.length === 0 && <Card><Muted>No dated tasks yet. Add a due date to a task and it will appear here.</Muted></Card>}</ScrollView></Page>; }
