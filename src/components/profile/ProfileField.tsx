import React from 'react';
import { View, TextInput, StyleSheet, KeyboardTypeOptions } from 'react-native';
import { AppText } from '../ui/AppText';

interface ProfileFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  keyboardType?: KeyboardTypeOptions;
  editable?: boolean;
  multiline?: boolean;
  error?: string | null;
}

export const ProfileField: React.FC<ProfileFieldProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  editable = true,
  multiline = false,
  error = null,
}) => {
  return (
    <View style={styles.container} id={`profile-field-${label.replace(/\s+/g, '-').toLowerCase()}`}>
      <AppText variant="caption" color={error ? '#ef4444' : '#4b5563'} weight="bold" style={styles.label}>
        {label}
      </AppText>
      
      <TextInput
        style={[
          styles.input,
          multiline && styles.textArea,
          !editable && styles.disabledInput,
          error !== null && error !== undefined && error !== '' && styles.errorInput,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        keyboardType={keyboardType}
        editable={editable}
        multiline={multiline}
        id={`input-${label.replace(/\s+/g, '-').toLowerCase()}`}
      />
      
      {error !== null && error !== undefined && error !== '' && (
        <AppText variant="caption" color="#ef4444" style={styles.errorText}>
          {error}
        </AppText>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    marginBottom: 6,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0f172a',
  },
  textArea: {
    textAlignVertical: 'top',
    minHeight: 80,
  },
  disabledInput: {
    backgroundColor: '#f1f5f9',
    color: '#64748b',
    borderColor: '#e2e8f0',
  },
  errorInput: {
    borderColor: '#fca5a5',
    backgroundColor: '#fffdfd',
  },
  errorText: {
    marginTop: 4,
    fontSize: 11,
  },
});

export default ProfileField;
