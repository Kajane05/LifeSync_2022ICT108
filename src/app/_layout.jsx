import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/context/AuthContext';
import { DatabaseProvider } from '@/context/DatabaseContext';
import { ThemeProvider } from '@/context/ThemeContext';
export default function RootLayout() {
    return <ThemeProvider><DatabaseProvider><AuthProvider><StatusBar style="auto"/><Stack screenOptions={{ headerShown: false }}/></AuthProvider></DatabaseProvider></ThemeProvider>;
}
