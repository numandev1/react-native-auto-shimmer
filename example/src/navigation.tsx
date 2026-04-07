import React, { createContext, useContext, useState, type ReactNode } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// ── Route names ───────────────────────────────────────────────────────────────

export type RouteName =
  | 'Home'
  | 'Card'
  | 'Feed'
  | 'Profile'
  | 'ProductGrid'
  | 'Notifications'
  | 'KitchenSink';

// ── Navigation context ────────────────────────────────────────────────────────

interface NavContextValue {
  navigate: (screen: RouteName) => void;
  goBack: () => void;
  currentScreen: RouteName;
}

const NavContext = createContext<NavContextValue>({
  navigate: () => {},
  goBack: () => {},
  currentScreen: 'Home',
});

export function useNavigation() {
  return useContext(NavContext);
}

// ── Navigator (stack-based using a simple array) ──────────────────────────────

interface NavigatorProps {
  children: (screen: RouteName) => ReactNode;
}

export function Navigator({ children }: NavigatorProps) {
  const [stack, setStack] = useState<RouteName[]>(['Home']);
  const currentScreen = stack[stack.length - 1]!;

  const navigate = (screen: RouteName) => setStack((s) => [...s, screen]);
  const goBack = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));

  return (
    <NavContext.Provider value={{ navigate, goBack, currentScreen }}>
      {children(currentScreen)}
    </NavContext.Provider>
  );
}

// ── Shared screen shell (header + safe area) ──────────────────────────────────

interface ScreenShellProps {
  title: string;
  children: ReactNode;
}

export function ScreenShell({ title, children }: ScreenShellProps) {
  const { goBack, currentScreen } = useNavigation();
  const isHome = currentScreen === 'Home';

  return (
    <View style={shell.root}>
      <View style={shell.header}>
        {!isHome && (
          <TouchableOpacity onPress={goBack} style={shell.backBtn} hitSlop={12}>
            <Text style={shell.backArrow}>‹</Text>
          </TouchableOpacity>
        )}
        <Text style={shell.title} numberOfLines={1}>{title}</Text>
        {!isHome && <View style={shell.backBtn} />}
      </View>
      {children}
    </View>
  );
}

const shell = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  backBtn: { width: 36 },
  backArrow: { fontSize: 32, color: '#111', lineHeight: 36 },
  title: { flex: 1, fontSize: 17, fontWeight: '600', color: '#111', textAlign: 'center' },
});
