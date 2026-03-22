import { StyleSheet, Text, TextInput, View, Linking, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { colors, radius, spacing, commonStyles } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export const LoginScreen = ({ navigation }: Props) => {
  const OAUTH_API = "https://api.platform.wizards.com/auth/oauth/token"

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [failedAuth, setFailedAuth] = useState(false);

  // Are we already logged in?
  useEffect(() => {
    setFailedAuth(false);
    async function loadAccessToken() {
      try {
        const value = await AsyncStorage.getItem("@access_token");
        if (value !== null) {
          // Value previously stored
          setAccessToken(value);
          navigation.navigate("Events")
        }
      }
      catch (e) {
        console.log(e);
      }
    }
    loadAccessToken();
  }, []);

  async function onLoginPress(_event: unknown, username: string, password: string, navigator: Props['navigation']) {
    const formdata = new URLSearchParams({
      "grant_type": "password",
      "username": username,
      "password": password,
    });
    const response = await fetch(OAUTH_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": "Basic V0pSWURITkdST0laSEw4QjpWNVZYSzZGTEcxWUkwR0QyWFkzSA=="
      },
      body: formdata.toString(),
    });
    const json = await response.json();
    if (response.status === 200) {
      setFailedAuth(false)
      await AsyncStorage.setItem("@access_token", json["access_token"]);
      await AsyncStorage.setItem("@refresh_token", json["refresh_token"]);
      await AsyncStorage.setItem("@ourPersonaId", json["persona_id"]);
      await AsyncStorage.setItem("@displayName", json["display_name"]);
      navigator.navigate("Events")
    } else {
      setFailedAuth(true)
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.headerArea}>
            <Text style={styles.titleLabel}>Omniscience</Text>
            <Text style={styles.subtitle}>Enter your Companion App credentials</Text>
          </View>

          <View style={styles.card}>
            {failedAuth && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>Login failed. Please check your credentials.</Text>
              </View>
            )}

            <Text style={styles.inputLabel}>Username</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your username"
              placeholderTextColor={colors.textMuted}
              onChangeText={(username) => setUsername(username)}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry={true}
              onChangeText={(password) => setPassword(password)}
            />

            <TouchableOpacity
              style={styles.loginButton}
              onPress={(e) => onLoginPress(e, username, password, navigation)}
              activeOpacity={0.8}
            >
              <Text style={styles.loginButtonText}>Login</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Math is for blockers, not top 8 competitors</Text>
            <Text style={styles.footerText}>
              Source code available on{' '}
              <Text style={styles.footerLink} onPress={() => Linking.openURL('https://github.com/altf4/omniscience')}>
                GitHub
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xxxl,
  },
  headerArea: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  titleLabel: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.textPrimary,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  card: {
    ...commonStyles.card,
    marginBottom: spacing.xxxl,
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: radius.input,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.lg,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    ...commonStyles.input,
    marginBottom: spacing.sm,
  },
  loginButton: {
    ...commonStyles.primaryButton,
    marginTop: spacing.xxl,
    paddingVertical: spacing.lg,
  },
  loginButtonText: {
    ...commonStyles.primaryButtonText,
    fontSize: 17,
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  footerLink: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
});
