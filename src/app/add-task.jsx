import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View, } from 'react-native';
import { Action, Card, Field, Label, Muted, Page, } from '../components/ui';
import { useDatabase } from '../context/DatabaseContext';
import { useTheme } from '../context/ThemeContext';
import { addAttachment, deleteAttachment, getAttachments, } from '../database/attachmentRepository';
import { getAllCategories } from '../database/categoryRepository';
import { addTask, getTaskById, updateTask, } from '../database/taskRepository';
export default function AddTask() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const { db } = useDatabase();
    const { colors } = useTheme();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [priority, setPriority] = useState('Medium');
    const [status, setStatus] = useState('Pending');
    const [categoryId, setCategoryId] = useState(null);
    const [categories, setCategories] = useState([]);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [existingFiles, setExistingFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    // Load task information
    useEffect(() => {
        const loadData = async () => {
            if (!db)
                return;
            try {
                setCategories(await getAllCategories(db));
                if (id) {
                    const task = await getTaskById(db, Number(id));
                    if (task) {
                        setTitle(task.title);
                        setDescription(task.description || '');
                        setDueDate(task.dueDate || '');
                        setPriority(task.priority);
                        setStatus(task.status);
                        setCategoryId(task.categoryId);
                        setExistingFiles(await getAttachments(db, Number(id)));
                    }
                }
            }
            catch (error) {
                console.error(error);
                Alert.alert('Error', 'Could not load task information.');
            }
        };
        loadData();
    }, [db, id]);
    // Select files
    const pickFiles = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                multiple: true,
                copyToCacheDirectory: true,
            });
            if (result.canceled)
                return;
            const newFiles = result.assets.map(file => ({
                name: file.name,
                uri: file.uri,
                mimeType: file.mimeType ?? null,
                size: file.size ?? 0,
            }));
            setSelectedFiles(previous => [
                ...previous,
                ...newFiles,
            ]);
        }
        catch (error) {
            console.error(error);
            Alert.alert('Error', 'Unable to select files.');
        }
    };
    // Remove newly selected file
    const removeSelectedFile = (index) => {
        setSelectedFiles(previous => previous.filter((_, i) => i !== index));
    };
    // Remove existing attachment
    const removeExistingFile = (file) => {
        Alert.alert('Remove attachment', `Remove ${file.name}?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Remove',
                style: 'destructive',
                onPress: async () => {
                    if (!db)
                        return;
                    try {
                        await deleteAttachment(db, file.id);
                        await FileSystem.deleteAsync(file.uri, {
                            idempotent: true,
                        });
                        setExistingFiles(previous => previous.filter(item => item.id !== file.id));
                    }
                    catch (error) {
                        Alert.alert('Error', 'Could not remove attachment.');
                    }
                },
            },
        ]);
    };
    // Save task and attachments
    const save = async () => {
        if (!db || loading)
            return;
        if (title.trim().length < 3) {
            Alert.alert('Check task title', 'Enter at least 3 characters.');
            return;
        }
        if (dueDate &&
            !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
            Alert.alert('Invalid date', 'Use YYYY-MM-DD format.');
            return;
        }
        const data = {
            title: title.trim(),
            description,
            categoryId,
            priority,
            status,
            dueDate: dueDate || null,
        };
        setLoading(true);
        try {
            let taskId;
            if (id) {
                taskId = Number(id);
                await updateTask(db, taskId, data);
            }
            else {
                taskId = await addTask(db, data);
            }
            // Save selected attachments
            const folder = FileSystem.documentDirectory +
                'lifesync-attachments/';
            await FileSystem.makeDirectoryAsync(folder, {
                intermediates: true,
            });
            for (const file of selectedFiles) {
                const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
                const destination = folder +
                    Date.now() +
                    '_' +
                    Math.random().toString(36).slice(2) +
                    '_' +
                    safeName;
                await FileSystem.copyAsync({
                    from: file.uri,
                    to: destination,
                });
                await addAttachment(db, taskId, file.name, destination, file.mimeType, file.size);
            }
            Alert.alert('Success', id
                ? 'Task updated successfully!'
                : 'Task created successfully!');
            router.back();
        }
        catch (error) {
            console.error('Saving task failed:', error);
            Alert.alert('Error', 'Could not save the task. Please try again.');
        }
        finally {
            setLoading(false);
        }
    };
    return (<Page>

      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        <Label>
          {id ? 'Edit task' : 'Create task'}
        </Label>

        <Muted>
          Add the details and keep your day organised.
        </Muted>

        <Field label="Task title *" value={title} onChangeText={setTitle} placeholder="e.g. Complete assignment"/>

        <Field label="Description" value={description} onChangeText={setDescription} placeholder="Add more details" multiline/>

        <Field label="Due date (YYYY-MM-DD)" value={dueDate} onChangeText={setDueDate} placeholder="2026-11-05"/>

        {/* Priority */}

        <Text style={{
            fontWeight: '700',
            color: colors.text,
            marginTop: 18,
        }}>
          Priority
        </Text>

        <View style={{
            flexDirection: 'row',
            gap: 8,
            marginTop: 8,
        }}>

          {['Low', 'Medium', 'High'].map(p => (<Pressable key={p} onPress={() => setPriority(p)} style={{
                padding: 11,
                borderRadius: 12,
                backgroundColor: priority === p
                    ? '#2563EB'
                    : colors.inputBackground,
            }}>

              <Text style={{
                color: priority === p
                    ? 'white'
                    : colors.text,
            }}>
                {p}
              </Text>

            </Pressable>))}

        </View>

        {/* Category */}

        <Text style={{
            fontWeight: '700',
            color: colors.text,
            marginTop: 18,
        }}>
          Category
        </Text>

        <View style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
            marginTop: 8,
        }}>

          {categories.map(c => (<Pressable key={c.id} onPress={() => setCategoryId(categoryId === c.id ? null : c.id)} style={{
                padding: 10,
                borderRadius: 12,
                backgroundColor: categoryId === c.id
                    ? '#2563EB'
                    : colors.inputBackground,
            }}>

              <Text style={{
                color: categoryId === c.id
                    ? 'white'
                    : colors.text,
            }}>
                {c.name}
              </Text>

            </Pressable>))}

        </View>

        {/* Status */}

        {id && (<>
            <Text style={{
                fontWeight: '700',
                color: colors.text,
                marginTop: 18,
            }}>
              Status
            </Text>

            <View style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 8,
                marginTop: 8,
            }}>

              {['Pending', 'In Progress', 'Completed'].map(s => (<Pressable key={s} onPress={() => setStatus(s)} style={{
                    padding: 10,
                    borderRadius: 12,
                    backgroundColor: status === s
                        ? '#2563EB'
                        : colors.inputBackground,
                }}>

                  <Text style={{
                    color: status === s
                        ? 'white'
                        : colors.text,
                }}>
                    {s}
                  </Text>

                </Pressable>))}

            </View>
          </>)}

        {/* FILE ATTACHMENTS */}

        <Card>

          <Text style={{
            fontSize: 18,
            fontWeight: '800',
            color: colors.text,
        }}>
            📎 Attachments
          </Text>

          <Muted>
            Attach documents, images and other files to this task.
          </Muted>

          {/* Existing attachments */}

          {existingFiles.map(file => (<View key={file.id} style={{
                backgroundColor: colors.inputBackground,
                padding: 12,
                borderRadius: 12,
                marginTop: 10,
            }}>

              <Text style={{
                color: colors.text,
                fontWeight: '600',
            }}>
                📄 {file.name}
              </Text>

              <Pressable onPress={() => removeExistingFile(file)} style={{ marginTop: 8 }}>

                <Text style={{ color: '#EF4444' }}>
                  Remove attachment
                </Text>

              </Pressable>

            </View>))}

          {/* Newly selected attachments */}

          {selectedFiles.map((file, index) => (<View key={`${file.name}-${index}`} style={{
                backgroundColor: colors.inputBackground,
                padding: 12,
                borderRadius: 12,
                marginTop: 10,
            }}>

              <Text style={{
                color: colors.text,
                fontWeight: '600',
            }}>
                📄 {file.name}
              </Text>

              <Pressable onPress={() => removeSelectedFile(index)} style={{ marginTop: 8 }}>

                <Text style={{ color: '#EF4444' }}>
                  Remove
                </Text>

              </Pressable>

            </View>))}

          {selectedFiles.length === 0 &&
            existingFiles.length === 0 && (<Muted>
                No files attached yet.
              </Muted>)}

          <View style={{ marginTop: 14 }}>

            <Action title="+ Upload File" onPress={pickFiles} secondary/>

          </View>

        </Card>

        {/* Save */}

        <Action title={loading
            ? 'Saving...'
            : id
                ? 'Save Changes'
                : 'Create Task'} onPress={save}/>

        <Action title="Cancel" secondary onPress={() => router.back()}/>

      </ScrollView>

    </Page>);
}
