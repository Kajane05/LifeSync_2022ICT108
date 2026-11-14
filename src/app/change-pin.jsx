import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { Action, Field, Label, Muted, Page } from '../components/ui';
import { useAuth } from '../context/AuthContext';
export default function ChangePin() {
    const { changePin, verifyPin } = useAuth();
    const router = useRouter();
    const [oldPin, setOld] = useState(''), [pin, setPin] = useState(''), [confirm, setConfirm] = useState('');
    const save = async () => { if (!/^\d{4}$/.test(pin) || pin !== confirm) {
        Alert.alert('Check PIN', 'Enter matching 4-digit PINs.');
        return;
    } if (!(await verifyPin(oldPin))) {
        Alert.alert('Incorrect PIN', 'Your current PIN is incorrect.');
        return;
    } try {
        await changePin(pin);
        Alert.alert('Success', 'Your PIN has been changed.');
        router.back();
    }
    catch (e) {
        Alert.alert('Error', e.message);
    } };
    return <Page><ScrollView><Label>Change PIN</Label><Muted>Choose a new 4-digit app PIN.</Muted><Field label="Current PIN" value={oldPin} onChangeText={setOld} keyboardType="number-pad" placeholder="••••"/><Field label="New PIN" value={pin} onChangeText={setPin} keyboardType="number-pad" placeholder="••••"/><Field label="Confirm new PIN" value={confirm} onChangeText={setConfirm} keyboardType="number-pad" placeholder="••••"/><Action title="Save new PIN" onPress={save}/><Action title="Cancel" secondary onPress={() => router.back()}/>
    </ScrollView></Page>;
}
