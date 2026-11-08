import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
export default function TabLayout() {
    return (<Tabs screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: '#2563EB',
            tabBarInactiveTintColor: '#64748B',
        }}>
    <Tabs.Screen name="index" options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => (<Ionicons name="home" color={String(color)} size={size}/>),
        }}/>


  <Tabs.Screen name="tasks" options={{
            title: 'Tasks',
            tabBarIcon: ({ color, size }) => (<Ionicons name="checkbox" color={String(color)} size={size}/>),
        }}/>

  <Tabs.Screen name="calendar" options={{
            title: 'Calendar',
            tabBarIcon: ({ color, size }) => (<Ionicons name="calendar" color={String(color)} size={size}/>),
        }}/>

  <Tabs.Screen name="settings" options={{
            title: 'Settings',
            tabBarIcon: ({ color, size }) => (<Ionicons name="settings" color={String(color)} size={size}/>),
        }}/>

  {/* Hidden routes remain inside the tab navigator, keeping the tab bar visible. */}
  <Tabs.Screen name="add-task" options={{ href: null }} />
  <Tabs.Screen name="task/[id]" options={{ href: null }} />
    </Tabs>);
}
