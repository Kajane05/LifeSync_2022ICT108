import React, { useCallback, useState } from 'react';
import { ScrollView, Text, Alert, Pressable } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Page, Label, Muted, Card, Field, Action } from '@/components/ui';
import { useDatabase } from '@/context/DatabaseContext';
import { useTheme } from '@/context/ThemeContext';
import { addCategory, deleteCategory, getAllCategories } from '@/database/categoryRepository';
export default function Categories() { const { db } = useDatabase(); const { colors } = useTheme(); const router = useRouter(); const [items, setItems] = useState([]); const [name, setName] = useState(''); const load = async () => { if (db)
    setItems(await getAllCategories(db)); }; useFocusEffect(useCallback(() => { load(); }, [db])); const add = async () => { if (!db || !name.trim())
    return; try {
    await addCategory(db, { name: name.trim(), color: '#2563EB', icon: 'folder-outline' });
    setName('');
    load();
}
catch {
    Alert.alert('Error', 'Could not add category.');
} }; return <Page><Label>Categories</Label><Muted>Organise tasks by area of life.</Muted><Field label="New category" value={name} onChangeText={setName} placeholder="e.g. University"/><Action title="＋ Add category" onPress={add}/><ScrollView>{items.map(c => <Card key={c.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={{ color: colors.text, fontWeight: '700' }}>{c.name}</Text><Pressable onPress={() => Alert.alert('Delete category', `Delete ${c.name}? Tasks will remain without a category.`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { if (db)
            await deleteCategory(db, c.id); load(); } }])}><Text style={{ color: '#EF4444' }}>Delete</Text></Pressable></Card>)}</ScrollView><Action title="Back" secondary onPress={() => router.back()}/></Page>; }
