import { Redirect } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import { Muted, Page } from '../components/ui';
import { useAuth } from '../context/AuthContext';
export default function PinScreen() {
    const { hasPin, isLocked, isLoading, setupPin, verifyPin } = useAuth();
    const [pin, setPin] = useState('');
    const [confirm, setConfirm] = useState('');
    if (isLoading)
        return <Page><Muted>Loading LifeSync…</Muted></Page>;
    if (hasPin && !isLocked)
        return <Redirect href="/(tabs)"/>;
    const submit = async () => { try {
        if (!/^\d{4}$/.test(pin))
            throw new Error('Enter a 4-digit PIN.');
        if (hasPin) {
            const ok = await verifyPin(pin);
            if (!ok)
                throw new Error('Incorrect PIN. Try again.');
        }
        else {
            if (pin !== confirm)
                throw new Error('PINs do not match.');
            await setupPin(pin);
        }
    }
    catch (e) {
        Alert.alert('LifeSync', e.message);
    } };
    return;
}
