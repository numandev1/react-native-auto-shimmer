/**
 * Dev-only button that triggers skeleton re-capture.
 * Rendered as null in production builds.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

interface Props {
  label?: string;
  onPress: () => void;
  disabled?: boolean;
}

export function CaptureButton({ label = 'Recapture Skeleton', onPress, disabled }: Props) {
  if (!__DEV__) return null;
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.pill, disabled && styles.busy]}
      disabled={disabled}
    >
      <Text style={styles.text}>{disabled ? 'Capturing…' : `⬡  ${label}`}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    backgroundColor: '#5b21b6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  busy: { opacity: 0.6 },
  text: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
