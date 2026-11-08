import React from 'react';
import { Text } from 'react-native';
const glyphs = { 'home': '⌂', 'checkbox': '☑', 'calendar': '▦', 'settings': '⚙', 'person': '●', 'add': '+', 'chevron-forward': '›', 'albums-outline': '▤', 'person-circle-outline': '◉', 'lock-closed-outline': '▣', 'lock-closed': '▣', 'radio-button-on': '◉', 'radio-button-off': '○' };
export function Ionicons({ name, size = 22, color = '#2563EB' }) { return <Text style={{ fontSize: size, color, fontWeight: '700', lineHeight: size + 3 }}>{glyphs[name] || '•'}</Text>; }
