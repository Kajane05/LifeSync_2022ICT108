import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, BackHandler, Linking, PanResponder, Pressable, ScrollView, StatusBar, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BLUE, cats, today } from '../constants/app';
import { addAttachment, deleteAttachment, getAttachments } from '../database/attachmentRepository';
import { createStyles } from '../theme/styles';

const emptyForm = () => ({
    title: '',
    description: '',
    category: 'Personal',
    priority: 'Medium',
    dueDate: today(),
});

export default function MainScreen() {
    const db = useSQLiteContext();
    const [theme, setTheme] = useState('light');
    const [ready, setReady] = useState(false);
    const [hasPin, setHasPin] = useState(false);
    const [unlocked, setUnlocked] = useState(false);
    const [pin, setPin] = useState('');
    const [confirm, setConfirm] = useState('');
    const [stored, setStored] = useState('');
    const [salt, setSalt] = useState('');
    const [tab, setTab] = useState('Home');
    const [page, setPage] = useState('main');
    const [previousPage, setPreviousPage] = useState('main');
    const [tasks, setTasks] = useState([]);
    const [selected, setSelected] = useState(null);
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState('All');
    const [categoryFilter, setCategoryFilter] = useState(null);
    const [form, setForm] = useState(emptyForm());

    // Dropdown states
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);

    const [editing, setEditing] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [existingFiles, setExistingFiles] = useState([]);
    const [detailFiles, setDetailFiles] = useState([]);
    const [saving, setSaving] = useState(false);
    const [newPin, setNewPin] = useState('');
    const [newConfirm, setNewConfirm] = useState('');

    const dark = theme === 'dark';

    const c = useMemo(() => ({
        bg: dark ? '#0B1220' : '#F4F8FF',
        card: dark ? '#142139' : '#FFFFFF',
        text: dark ? '#F1F5F9' : '#172554',
        muted: dark ? '#A7B4C8' : '#64748B',
        line: dark ? '#26364F' : '#E2EAF5',
        soft: dark ? '#1A2D4A' : '#EAF2FF',
        input: dark ? '#101C30' : '#FFFFFF',
    }), [dark]);

    const s = useMemo(() => createStyles(c), [c]);

    const refresh = useCallback(async () => {
        setTasks(await db.getAllAsync('SELECT * FROM tasks ORDER BY dueDate ASC,id DESC'));
    }, [db]);

    useEffect(() => {
        (async () => {
            try {
                const t = await AsyncStorage.getItem('ls-theme');

                if (t === 'dark' || t === 'light') {
                    setTheme(t);
                }

                const h = await SecureStore.getItemAsync('ls-hash');
                const sa = await SecureStore.getItemAsync('ls-salt');

                setStored(h || '');
                setSalt(sa || '');
                setHasPin(!!h);

                await refresh();
            }
            finally {
                setReady(true);
            }
        })();
    }, [refresh]);

    const hash = (v, sa) =>
        Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            sa + ':' + v
        );

    const createPin = async () => {
        if (!/^\d{4}$/.test(pin) || pin !== confirm) {
            return Alert.alert('PIN check', 'Enter matching 4-digit PINs.');
        }

        const sa = Crypto.randomUUID();
        const h = await hash(pin, sa);

        await SecureStore.setItemAsync('ls-salt', sa);
        await SecureStore.setItemAsync('ls-hash', h);

        setStored(h);
        setSalt(sa);
        setHasPin(true);
        setUnlocked(true);
        setPin('');
        setConfirm('');
    };

    const unlock = async () => {
        if (await hash(pin, salt) === stored) {
            setUnlocked(true);
            setPin('');
        }
        else {
            setPin('');
            Alert.alert('Incorrect PIN', 'Please try again.');
        }
    };

    const updatePin = async () => {
        if (!/^\d{4}$/.test(newPin) || newPin !== newConfirm) {
            return Alert.alert('PIN check', 'Enter matching 4-digit PINs.');
        }

        const sa = Crypto.randomUUID();
        const h = await hash(newPin, sa);

        await SecureStore.setItemAsync('ls-salt', sa);
        await SecureStore.setItemAsync('ls-hash', h);

        setSalt(sa);
        setStored(h);
        setNewPin('');
        setNewConfirm('');
        setPage('settings');

        Alert.alert('Updated', 'Your PIN has been changed.');
    };

    const changeTheme = async (t) => {
        setTheme(t);
        await AsyncStorage.setItem('ls-theme', t);
    };

    const go = (next) => {
        setPreviousPage(page);
        setPage(next);
    };

    const back = () => {
        if (page !== 'main') {
            setPage(previousPage);
            return true;
        }

        if (tab === 'Tasks' && categoryFilter) {
            setTab('Categories');
            setCategoryFilter(null);
            setQuery('');
            setFilter('All');
            return true;
        }

        if (page === 'main' && tab !== 'Home') {
            setTab('Home');
            return true;
        }

        return false;
    };

    useEffect(() => {
        const sub = BackHandler.addEventListener('hardwareBackPress', () => {
            if (!unlocked) return false;
            return back();
        });

        return () => sub.remove();
    }, [page, previousPage, unlocked, tab, categoryFilter]);

    const swipe = PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
            (page !== 'main' || (tab === 'Tasks' && !!categoryFilter)) &&
            Math.abs(g.dx) > 18 &&
            Math.abs(g.dx) > Math.abs(g.dy) * 1.25,

        onPanResponderRelease: (_, g) => {
            if (g.dx < -75) back();
        },
    });

    const add = () => {
        setEditing(false);
        setSelected(null);
        setForm(emptyForm());
        setSelectedFiles([]);
        setExistingFiles([]);

        setShowCategoryDropdown(false);
        setShowPriorityDropdown(false);

        go('add');
    };

    const openTask = async (task) => {
        setSelected(task);
        setDetailFiles([]);
        go('details');

        try {
            const files = await getAttachments(db, task.id);
            setDetailFiles(files || []);
        }
        catch (error) {
            console.error('Could not load task attachments:', error);
            Alert.alert('Attachments', 'Could not load this task’s attachments.');
        }
    };

    const pickFiles = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                multiple: true,
                copyToCacheDirectory: true,
            });

            if (result.canceled) return;

            const files = result.assets.map(file => ({
                name: file.name,
                uri: file.uri,
                mimeType: file.mimeType || null,
                size: file.size || 0,
            }));

            setSelectedFiles(previous => [...previous, ...files]);
        }
        catch (error) {
            console.error('File selection failed:', error);
            Alert.alert('Attachment error', 'Unable to select files.');
        }
    };

    const removeSelectedFile = (index) => {
        setSelectedFiles(previous => previous.filter((_, i) => i !== index));
    };

    const removeExistingFile = (file, fromDetails = false) => {
        Alert.alert('Remove attachment?', `Remove “${file.name}” from this task?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Remove',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await deleteAttachment(db, file.id);

                        if (file.uri) {
                            await FileSystem.deleteAsync(file.uri, { idempotent: true }).catch(() => {});
                        }

                        setExistingFiles(previous =>
                            previous.filter(item => item.id !== file.id)
                        );

                        setDetailFiles(previous =>
                            previous.filter(item => item.id !== file.id)
                        );
                    }
                    catch (error) {
                        console.error('Attachment removal failed:', error);
                        Alert.alert('Attachment error', 'Could not remove this attachment.');
                    }
                },
            },
        ]);
    };

    const openAttachment = async (file) => {
        try {
            let uri = file.uri;

            if (uri && uri.startsWith('file://') && FileSystem.getContentUriAsync) {
                uri = await FileSystem.getContentUriAsync(uri);
            }

            await Linking.openURL(uri);
        }
        catch (error) {
            console.error('Could not open attachment:', error);
            Alert.alert('Cannot open file', 'This file may not have a compatible app installed.');
        }
    };

    const attachmentList = (files, onRemove) => files.map((file, index) => (
        <View
            key={`${file.id || file.uri || file.name}-${index}`}
            style={{
                backgroundColor: c.soft,
                borderColor: c.line,
                borderWidth: 1,
                borderRadius: 12,
                padding: 12,
                marginTop: 8,
            }}
        >
            <Pressable onPress={() => openAttachment(file)}>
                <Text style={{ color: c.text, fontWeight: '700' }}>
                    📎 {file.name}
                </Text>

                <Text style={{ color: c.muted, fontSize: 11, marginTop: 3 }}>
                    Tap to open
                </Text>
            </Pressable>

            {onRemove && (
                <Pressable
                    onPress={() => onRemove(file)}
                    style={{ alignSelf: 'flex-start', marginTop: 8 }}
                >
                    <Text style={{ color: '#DC2626', fontWeight: '700' }}>
                        Remove
                    </Text>
                </Pressable>
            )}
        </View>
    ));

    const save = async () => {
        if (saving) return;

        if (!form.title.trim()) {
            return Alert.alert('Title required', 'Enter a task title.');
        }

        setSaving(true);

        try {
            let taskId;

            if (editing && selected) {
                taskId = selected.id;

                await db.runAsync(
                    'UPDATE tasks SET title=?,description=?,category=?,priority=?,dueDate=? WHERE id=?',
                    [
                        form.title.trim(),
                        form.description,
                        form.category,
                        form.priority,
                        form.dueDate,
                        selected.id,
                    ]
                );
            }
            else {
                const result = await db.runAsync(
                    'INSERT INTO tasks(title,description,category,priority,status,dueDate,createdAt) VALUES(?,?,?,?,?,?,?)',
                    [
                        form.title.trim(),
                        form.description,
                        form.category,
                        form.priority,
                        'Pending',
                        form.dueDate,
                        today(),
                    ]
                );

                taskId = result.lastInsertRowId;
            }

            if (selectedFiles.length) {
                const folder = `${FileSystem.documentDirectory}lifesync-attachments/`;

                await FileSystem.makeDirectoryAsync(folder, { intermediates: true });

                for (const file of selectedFiles) {
                    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');

                    const destination =
                        `${folder}${Date.now()}_${Math.random().toString(36).slice(2)}_${safeName}`;

                    await FileSystem.copyAsync({
                        from: file.uri,
                        to: destination,
                    });

                    await addAttachment(
                        db,
                        taskId,
                        file.name,
                        destination,
                        file.mimeType,
                        file.size
                    );
                }
            }

            await refresh();

            setSelectedFiles([]);
            setExistingFiles([]);
            setShowCategoryDropdown(false);
            setShowPriorityDropdown(false);

            setPage('main');
            setTab('Tasks');
            setCategoryFilter(null);

            Alert.alert(
                'Saved',
                editing ? 'Task updated successfully.' : 'Task created successfully.'
            );
        }
        catch (error) {
            console.error('Saving task failed:', error);
            Alert.alert('Save failed', 'The task could not be saved. Please try again.');
        }
        finally {
            setSaving(false);
        }
    };

    const changeStatus = async (t) => {
        const next = t.status === 'Completed' ? 'Pending' : 'Completed';

        await db.runAsync(
            'UPDATE tasks SET status=? WHERE id=?',
            [next, t.id]
        );

        await refresh();
        setSelected({ ...t, status: next });
    };

    const del = (t) => Alert.alert('Delete task?', 'This cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
                await db.runAsync('DELETE FROM tasks WHERE id=?', [t.id]);
                await refresh();
                setSelected(null);
                setPage('main');
            },
        },
    ]);

    const field = (label, val, on, placeholder = '') => (
        <View style={{ marginBottom: 10 }}>
            <Text style={s.label}>{label}</Text>

            <TextInput
                value={val}
                onChangeText={on}
                placeholder={placeholder}
                placeholderTextColor={c.muted}
                style={s.input}
            />
        </View>
    );

    const pinField = (label, val, on, placeholder = '') => (
        <View style={{ marginBottom: 10 }}>
            <Text style={s.label}>{label}</Text>

            <TextInput
                value={val}
                onChangeText={value =>
                    on(value.replace(/[^0-9]/g, '').slice(0, 4))
                }
                placeholder={placeholder}
                placeholderTextColor={c.muted}
                style={s.input}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={4}
            />
        </View>
    );

    const chip = (v, active, fn) => (
        <Pressable
            key={v}
            onPress={fn}
            style={[s.chip, active && s.active]}
        >
            <Text
                style={{
                    color: active ? 'white' : c.muted,
                    fontWeight: '700',
                    fontSize: 12,
                }}
            >
                {v}
            </Text>
        </Pressable>
    );

    const btn = (v, fn, secondary = false, danger = false) => (
        <Pressable
            onPress={fn}
            style={[
                s.btn,
                secondary && {
                    backgroundColor: c.soft,
                    borderWidth: 1,
                    borderColor: c.line,
                },
                danger && { backgroundColor: '#DC2626' },
            ]}
        >
            <Text
                style={{
                    color: secondary ? c.text : 'white',
                    fontWeight: '800',
                }}
            >
                {v}
            </Text>
        </Pressable>
    );

    const card = (t) => (
        <Pressable
            key={t.id}
            onPress={() => openTask(t)}
            style={s.card}
        >
            <View style={{ flex: 1 }}>
                <Text style={s.task}>{t.title}</Text>

                <Text style={s.small}>
                    {t.category} · {t.dueDate}
                </Text>

                <Text style={s.small}>
                    {t.status} · {t.priority}
                </Text>
            </View>

            <Text style={{ color: BLUE, fontSize: 25 }}>›</Text>
        </Pressable>
    );

    if (!ready) {
        return (
            <SafeAreaView
                style={[
                    s.safe,
                    { backgroundColor: c.bg, justifyContent: 'center' },
                ]}
            >
                <Text style={s.heading}>Preparing LifeSync…</Text>
            </SafeAreaView>
        );
    }

    if (!unlocked) {
        return (
            <SafeAreaView
                style={[
                    s.safe,
                    {
                        backgroundColor: c.bg,
                        justifyContent: 'center',
                        padding: 24,
                    },
                ]}
            >
                <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />

                <Text style={s.brand}>LifeSync</Text>

                <Text style={s.heading}>
                    {hasPin ? 'Welcome back' : 'Protect your LifeSync'}
                </Text>

                <Text style={s.sub}>
                    {hasPin
                        ? 'Enter your 4-digit PIN'
                        : 'Create an offline 4-digit PIN'}
                </Text>

                {pinField('PIN', pin, setPin, '4 digits')}

                {!hasPin &&
                    pinField('Confirm PIN', confirm, setConfirm, 'Repeat PIN')}

                {btn(
                    hasPin ? 'Unlock' : 'Create PIN',
                    hasPin ? unlock : createPin
                )}

                <Text style={s.small}>
                    Your PIN is stored securely on this device. No account or
                    internet required.
                </Text>
            </SafeAreaView>
        );
    }

    const overdue = tasks.filter(
        t => t.status !== 'Completed' && t.dueDate < today()
    );

    const upcoming = tasks
        .filter(t => t.status !== 'Completed' && t.dueDate >= today())
        .slice(0, 5);

    const filtered = tasks.filter(t =>
        (t.title + ' ' + (t.description || ''))
            .toLowerCase()
            .includes(query.toLowerCase()) &&
        (filter === 'All' || t.status === filter) &&
        (!categoryFilter || t.category === categoryFilter)
    );

    let body;

    if (page === 'add') {
        body = (
            <>
                <Text style={s.heading}>
                    {editing ? 'Edit task' : 'Add a task'}
                </Text>

                {field(
                    'Title',
                    form.title,
                    v => setForm({ ...form, title: v }),
                    'Task title'
                )}

                {field(
                    'Description',
                    form.description,
                    v => setForm({ ...form, description: v }),
                    'Details'
                )}

                {/* CATEGORY DROPDOWN */}
                <Text style={s.label}>Category</Text>

                <Pressable
                    onPress={() => {
                        setShowCategoryDropdown(!showCategoryDropdown);
                        setShowPriorityDropdown(false);
                    }}
                    style={[
                        s.input,
                        {
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        },
                    ]}
                >
                    <Text style={{ color: c.text, fontWeight: '600' }}>
                        {form.category}
                    </Text>

                    <Text style={{ color: c.muted }}>▼</Text>
                </Pressable>

                {showCategoryDropdown && (
                    <View
                        style={{
                            backgroundColor: c.card,
                            borderColor: c.line,
                            borderWidth: 1,
                            borderRadius: 12,
                            marginBottom: 12,
                            overflow: 'hidden',
                        }}
                    >
                        {cats.map(item => (
                            <Pressable
                                key={item}
                                onPress={() => {
                                    setForm({ ...form, category: item });
                                    setShowCategoryDropdown(false);
                                }}
                                style={{
                                    padding: 14,
                                    borderBottomWidth: 1,
                                    borderBottomColor: c.line,
                                    backgroundColor:
                                        form.category === item ? c.soft : c.card,
                                }}
                            >
                                <Text style={{ color: c.text, fontWeight: '600' }}>
                                    {item}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                )}

                {/* PRIORITY DROPDOWN */}
                <Text style={s.label}>Priority</Text>

                <Pressable
                    onPress={() => {
                        setShowPriorityDropdown(!showPriorityDropdown);
                        setShowCategoryDropdown(false);
                    }}
                    style={[
                        s.input,
                        {
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        },
                    ]}
                >
                    <Text style={{ color: c.text, fontWeight: '600' }}>
                        {form.priority}
                    </Text>

                    <Text style={{ color: c.muted }}>▼</Text>
                </Pressable>

                {showPriorityDropdown && (
                    <View
                        style={{
                            backgroundColor: c.card,
                            borderColor: c.line,
                            borderWidth: 1,
                            borderRadius: 12,
                            marginBottom: 12,
                            overflow: 'hidden',
                        }}
                    >
                        {['Low', 'Medium', 'High'].map(item => (
                            <Pressable
                                key={item}
                                onPress={() => {
                                    setForm({ ...form, priority: item });
                                    setShowPriorityDropdown(false);
                                }}
                                style={{
                                    padding: 14,
                                    borderBottomWidth: 1,
                                    borderBottomColor: c.line,
                                    backgroundColor:
                                        form.priority === item ? c.soft : c.card,
                                }}
                            >
                                <Text style={{ color: c.text, fontWeight: '600' }}>
                                    {item}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                )}

                {field(
                    'Due date (YYYY-MM-DD)',
                    form.dueDate,
                    v => setForm({ ...form, dueDate: v }),
                    '2026-11-10'
                )}

                <View
                    style={{
                        backgroundColor: c.card,
                        borderColor: c.line,
                        borderWidth: 1,
                        borderRadius: 16,
                        padding: 14,
                        marginBottom: 16,
                    }}
                >
                    <Text style={s.label}>📎 Attachments</Text>

                    <Text style={s.small}>
                        Add documents, images or other files to this task.
                    </Text>

                    {existingFiles.length > 0 &&
                        attachmentList(
                            existingFiles,
                            file => removeExistingFile(file)
                        )}

                    {selectedFiles.length > 0 &&
                        attachmentList(
                            selectedFiles,
                            file => removeSelectedFile(selectedFiles.indexOf(file))
                        )}

                    {!existingFiles.length && !selectedFiles.length && (
                        <Text style={[s.small, { marginTop: 8 }]}>
                            No files attached yet.
                        </Text>
                    )}

                    {btn('+  Add attachment', pickFiles, true)}
                </View>

                {btn(saving ? 'Saving…' : 'Save task', save)}
            </>
        );
    }
    else if (page === 'changePin') {
        body = (
            <>
                <Text style={s.heading}>Change PIN</Text>

                <Text style={s.sub}>
                    Choose a new 4-digit PIN for your offline app lock.
                </Text>

                {pinField(
                    'New PIN',
                    newPin,
                    setNewPin,
                    'Enter new 4-digit PIN'
                )}

                {field(
                    'Confirm PIN',
                    newConfirm,
                    setNewConfirm,
                    'Confirm new PIN'
                )}

                {btn('Save new PIN', updatePin)}
            </>
        );
    }
    else if (page === 'details' && selected) {
        body = (
            <>
                <Text style={s.heading}>{selected.title}</Text>

                <Text style={s.sub}>
                    {selected.category} · {selected.dueDate}
                </Text>

                <View style={s.panel}>
                    <Text style={s.label}>Description</Text>

                    <Text style={s.text}>
                        {selected.description || 'No description added.'}
                    </Text>

                    <Text style={s.label}>
                        Priority · {selected.priority}
                    </Text>

                    <Text style={s.label}>
                        Status · {selected.status}
                    </Text>
                </View>

                <View
                    style={{
                        backgroundColor: c.card,
                        borderColor: c.line,
                        borderWidth: 1,
                        borderRadius: 16,
                        padding: 14,
                        marginBottom: 14,
                    }}
                >
                    <Text style={s.label}>
                        📎 Attachments ({detailFiles.length})
                    </Text>

                    {detailFiles.length
                        ? attachmentList(
                            detailFiles,
                            file => removeExistingFile(file, true)
                        )
                        : <Text style={s.small}>No attachments for this task.</Text>}
                </View>

                {btn(
                    selected.status === 'Completed'
                        ? 'Reopen task'
                        : 'Mark completed',
                    () => changeStatus(selected)
                )}

                {btn('Edit task', () => {
                    setEditing(true);

                    setForm({
                        title: selected.title,
                        description: selected.description || '',
                        category: selected.category,
                        priority: selected.priority,
                        dueDate: selected.dueDate,
                    });

                    setShowCategoryDropdown(false);
                    setShowPriorityDropdown(false);

                    setSelectedFiles([]);
                    setExistingFiles(detailFiles);

                    go('add');
                }, true)}

                {btn('Delete task', () => del(selected), true, true)}
            </>
        );
    }
    else if (page === 'settings') {
        body = (
            <>
                <Text style={s.heading}>Settings</Text>

                <Text style={s.sub}>
                    Make LifeSync feel like yours.
                </Text>

                <View style={s.card}>
                    <View style={{ flex: 1 }}>
                        <Text style={s.task}>Appearance</Text>

                        <Text style={s.small}>
                            Choose light or dark theme
                        </Text>

                        <View style={[s.wrap, { marginTop: 10, marginBottom: 0 }]}>
                            {chip(
                                'Light',
                                theme === 'light',
                                () => changeTheme('light')
                            )}

                            {chip(
                                'Dark',
                                theme === 'dark',
                                () => changeTheme('dark')
                            )}
                        </View>
                    </View>
                </View>

                <Pressable
                    style={s.card}
                    onPress={() => go('changePin')}
                >
                    <View style={{ flex: 1 }}>
                        <Text style={s.task}>Change PIN</Text>

                        <Text style={s.small}>
                            Update your offline app lock PIN
                        </Text>
                    </View>

                    <Text style={{ color: BLUE, fontSize: 25 }}>›</Text>
                </Pressable>

                <View style={s.panel}>
                    <Text style={s.label}>Offline storage</Text>

                    <Text style={s.small}>
                        Your tasks are saved locally on this device.
                        LifeSync does not require an account or internet connection.
                    </Text>
                </View>
            </>
        );
    }
    else if (tab === 'Home') {
        body = (
            <>
                <Text style={s.kicker}>YOUR SPACE</Text>

                <Text style={s.heading}>Good day 👋</Text>

                <Text style={s.sub}>
                    A little progress adds up. What matters today?
                </Text>

                <View style={s.stats}>
                    {[
                        ['Total', tasks.length],
                        ['Pending', tasks.filter(t => t.status === 'Pending').length],
                        ['Done', tasks.filter(t => t.status === 'Completed').length],
                        ['Overdue', overdue.length],
                    ].map(([label, value]) => (
                        <Pressable
                            key={String(label)}
                            style={s.stat}
                            onPress={() => {
                                setFilter(
                                    label === 'Total'
                                        ? 'All'
                                        : label === 'Done'
                                            ? 'Completed'
                                            : 'Pending'
                                );

                                setCategoryFilter(null);
                                setTab('Tasks');
                            }}
                        >
                            <Text style={s.num}>{value}</Text>

                            <Text style={s.small}>
                                {label} tasks ›
                            </Text>
                        </Pressable>
                    ))}
                </View>

                {btn('+  Add a task', add)}

                <Text style={s.section}>Upcoming</Text>

                {upcoming.map(card)}

                <Text style={s.section}>Overdue</Text>

                {overdue.map(card)}
            </>
        );
    }
    else if (tab === 'Tasks') {
        body = (
            <>
                <Text style={s.heading}>
                    {categoryFilter ? `${categoryFilter} tasks` : 'All tasks'}
                </Text>

                {field(
                    'Search',
                    query,
                    setQuery,
                    'Search by title or description'
                )}

                <View style={s.wrap}>
                    {['All', 'Pending', 'In Progress', 'Completed'].map(x =>
                        chip(x, filter === x, () => setFilter(x))
                    )}
                </View>

                {categoryFilter &&
                    btn('Clear category', () => setCategoryFilter(null), true)}

                {btn('+  Add a task', add)}

                {filtered.map(card)}

                {!filtered.length && (
                    <Text style={s.small}>No matching tasks.</Text>
                )}
            </>
        );
    }
    else if (tab === 'Calendar') {
        body = (
            <>
                <Text style={s.heading}>Calendar</Text>

                <Text style={s.sub}>
                    Tasks grouped by due date
                </Text>

                {[...new Set(tasks.map(t => t.dueDate))]
                    .sort()
                    .map(d => (
                        <View key={d}>
                            <Text style={s.section}>{d}</Text>

                            {tasks
                                .filter(t => t.dueDate === d)
                                .map(card)}
                        </View>
                    ))}
            </>
        );
    }
    else if (tab === 'Categories') {
        body = (
            <>
                <Text style={s.heading}>Categories</Text>

                <Text style={s.sub}>
                    Choose a category to view its tasks.
                </Text>

                {cats.map(cat => (
                    <Pressable
                        key={cat}
                        onPress={() => {
                            setCategoryFilter(cat);
                            setFilter('All');
                            setQuery('');
                            setTab('Tasks');
                        }}
                        style={s.card}
                    >
                        <View style={{ flex: 1 }}>
                            <Text style={s.task}>{cat}</Text>

                            <Text style={s.small}>
                                {tasks.filter(t => t.category === cat).length} tasks
                            </Text>
                        </View>

                        <Text style={{ color: BLUE, fontSize: 25 }}>›</Text>
                    </Pressable>
                ))}
            </>
        );
    }

    return (
        <SafeAreaView
            edges={['top', 'left', 'right']}
            style={[s.safe, { backgroundColor: c.bg }]}
        >
            <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />

            {/* HEADER */}
            <View style={s.header}>
                <Text style={s.brand}>LifeSync</Text>
            </View>

            {/* MAIN CONTENT */}
            <View
                style={{ flex: 1 }}
                {...(
                    page !== 'main' ||
                    (tab === 'Tasks' && !!categoryFilter)
                        ? swipe.panHandlers
                        : {}
                )}
            >
                <ScrollView
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={s.content}
                >
                    {body}
                </ScrollView>
            </View>

            {/* BOTTOM NAVIGATION */}
            {(page === 'main' || page === 'settings') && (
                <View style={s.nav}>
                    {[
                        ['Home', '⌂'],
                        ['Tasks', '☷'],
                        ['Calendar', '▦'],
                        ['Categories', '◇'],
                        ['Settings', '⚙'],
                    ].map(([name, icon]) => {
                        const active = name === 'Settings'
                            ? page === 'settings'
                            : page === 'main' && tab === name;

                        return (
                            <Pressable
                                key={name}
                                onPress={() => {
                                    if (name === 'Settings') {
                                        setPreviousPage(page);
                                        setPage('settings');
                                    }
                                    else {
                                        setPage('main');
                                        setTab(name);
                                        setCategoryFilter(null);
                                        setQuery('');
                                        setFilter('All');
                                    }
                                }}
                                style={s.navitem}
                            >
                                <Text
                                    style={{
                                        fontSize: 20,
                                        color: active ? BLUE : c.muted,
                                    }}
                                >
                                    {icon}
                                </Text>

                                <Text
                                    style={{
                                        fontSize: 10,
                                        color: active ? BLUE : c.muted,
                                        fontWeight: '700',
                                    }}
                                >
                                    {name}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
            )}
        </SafeAreaView>
    );
}