import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View, } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter, } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Action, Card, Label, Muted, Page, } from '../../components/ui';
import { useDatabase } from '../../context/DatabaseContext';
import { useTheme } from '../../context/ThemeContext';
import { deleteTask, getTaskById, updateTaskStatus, } from '../../database/taskRepository';
import { addAttachment, deleteAttachment, getAttachments, } from '../../database/attachmentRepository';
export default function TaskDetails() {
    const { id } = useLocalSearchParams();
    const { db } = useDatabase();
    const router = useRouter();
    const { colors } = useTheme();
    const [task, setTask] = useState(null);
    const [attachments, setAttachments] = useState([]);
    const [uploading, setUploading] = useState(false);
    // Load task and attachments
    const load = async () => {
        if (!db || !id)
            return;
        const taskId = Number(id);
        try {
            const taskData = await getTaskById(db, taskId);
            const attachmentData = await getAttachments(db, taskId);
            setTask(taskData);
            setAttachments(attachmentData);
        }
        catch (error) {
            console.error('Loading task failed:', error);
            Alert.alert('Error', 'Could not load task details.');
        }
    };
    useFocusEffect(useCallback(() => {
        load();
    }, [db, id]));
    // Add attachments
    const pickFiles = async () => {
        if (!db || !task || uploading)
            return;
        try {
            setUploading(true);
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                multiple: true,
                copyToCacheDirectory: true,
            });
            if (result.canceled)
                return;
            const folder = FileSystem.documentDirectory + 'lifesync-attachments/';
            await FileSystem.makeDirectoryAsync(folder, {
                intermediates: true,
            });
            for (const file of result.assets) {
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
                await addAttachment(db, task.id, file.name, destination, file.mimeType ?? null, file.size ?? 0);
            }
            await load();
            Alert.alert('Success', 'Files attached successfully!');
        }
        catch (error) {
            console.error('Attachment error:', error);
            Alert.alert('Error', 'Could not attach the selected files.');
        }
        finally {
            setUploading(false);
        }
    };
    // Open or share attachment
    const openFile = async (file) => {
        try {
            const available = await Sharing.isAvailableAsync();
            if (!available) {
                Alert.alert('Unavailable', 'File sharing is not available on this device.');
                return;
            }
            await Sharing.shareAsync(file.uri, {
                mimeType: file.mimeType ?? undefined,
                dialogTitle: file.name,
            });
        }
        catch (error) {
            console.error('Opening attachment failed:', error);
            Alert.alert('Error', 'Could not open this attachment.');
        }
    };
    // Remove attachment
    const removeAttachment = (file) => {
        Alert.alert('Remove attachment', `Do you want to remove ${file.name}?`, [
            {
                text: 'Cancel',
                style: 'cancel',
            },
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
                        await load();
                    }
                    catch (error) {
                        console.error('Removing attachment failed:', error);
                        Alert.alert('Error', 'Could not remove attachment.');
                    }
                },
            },
        ]);
    };
    // Delete task and attachments
    const remove = () => {
        if (!task || !db)
            return;
        Alert.alert('Delete task', 'This task and its attachments will be deleted.', [
            {
                text: 'Cancel',
                style: 'cancel',
            },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        for (const file of attachments) {
                            await FileSystem.deleteAsync(file.uri, {
                                idempotent: true,
                            });
                        }
                        await deleteTask(db, task.id);
                        router.back();
                    }
                    catch (error) {
                        console.error('Deleting task failed:', error);
                        Alert.alert('Error', 'Could not delete this task.');
                    }
                },
            },
        ]);
    };
    // Change task status
    const cycle = async () => {
        if (!db || !task)
            return;
        const next = task.status === 'Pending'
            ? 'In Progress'
            : task.status === 'In Progress'
                ? 'Completed'
                : 'Pending';
        try {
            await updateTaskStatus(db, task.id, next);
            await load();
        }
        catch (error) {
            Alert.alert('Error', 'Could not update task status.');
        }
    };
    if (!task) {
        return (<Page>
        <Muted>Loading task details...</Muted>
      </Page>);
    }
    return (<Page>
      <ScrollView showsVerticalScrollIndicator={false}>

        <Label>{task.title}</Label>

        <Muted>
          {task.dueDate || 'No due date'} · {task.priority} priority
        </Muted>

        {/* Description */}
        <Card>
          <Text style={{ fontWeight: '700', color: colors.text }}>
            Description
          </Text>

          <Text style={{ color: colors.text, marginTop: 8 }}>
            {task.description || 'No description added.'}
          </Text>
        </Card>

        {/* Status */}
        <Card>
          <Text style={{ color: colors.text }}>
            Status: {task.status}
          </Text>

          <Text style={{ color: colors.text, marginTop: 8 }}>
            Created: {task.createdAt}
          </Text>
        </Card>

        {/* Attachments */}
        <Card>
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
        }}>
            <Text style={{
            fontSize: 18,
            fontWeight: '800',
            color: colors.text,
        }}>
              📎 Attachments
            </Text>

            <Text style={{ color: colors.secondaryText }}>
              {attachments.length} files
            </Text>
          </View>

          <Text style={{
            color: colors.secondaryText,
            marginTop: 6,
            marginBottom: 14,
        }}>
            Attach documents, images and other files to this task.
          </Text>

          {attachments.length === 0 ? (<Text style={{
                color: colors.secondaryText,
                marginBottom: 14,
            }}>
              No attachments yet.
            </Text>) : (attachments.map((file) => (<View key={file.id} style={{
                padding: 12,
                borderRadius: 12,
                backgroundColor: colors.inputBackground,
                marginBottom: 10,
            }}>
                <Pressable onPress={() => openFile(file)}>
                  <Text style={{
                color: colors.text,
                fontWeight: '700',
            }}>
                    📄 {file.name}
                  </Text>

                  <Text style={{
                color: colors.secondaryText,
                fontSize: 12,
                marginTop: 5,
            }}>
                    {file.size
                ? `${(file.size / 1024).toFixed(1)} KB`
                : 'File size unavailable'}
                  </Text>

                  <Text style={{
                color: '#2563EB',
                marginTop: 5,
            }}>
                    Open / Share
                  </Text>
                </Pressable>

                <Pressable onPress={() => removeAttachment(file)} style={{ marginTop: 10 }}>
                  <Text style={{
                color: '#EF4444',
                fontWeight: '700',
            }}>
                    Remove attachment
                  </Text>
                </Pressable>
              </View>)))}

          <Action title={uploading ? 'Adding files...' : '+ Add Attachments'} onPress={pickFiles}/>
        </Card>

        {/* Task actions */}
        <Action title="Update status" onPress={cycle}/>

        <Action title="Edit task" onPress={() => router.push(`/(tabs)/add-task?id=${task.id}`)}/>

        <Action title="Delete task" secondary onPress={remove}/>

        <Action title="Back" secondary onPress={() => router.back()}/>

      </ScrollView>
    </Page>);
}
