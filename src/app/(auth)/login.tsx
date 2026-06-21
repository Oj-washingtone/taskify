import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { loginWithEmail } from '@/api/auth';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const { checkAuth } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Invalid email address');
      return;
    }

    setLoading(true);
    try {
      console.log('--- LOGIN ATTEMPT ---');
      console.log('URL:', process.env.EXPO_PUBLIC_API_URL);
      console.log('Payload:', { email: email.trim(), password: password.trim() });
      await loginWithEmail({ email: email.trim(), password: password.trim() });
      await checkAuth(); 
    } catch (e: any) {
      console.error('LOGIN ERROR:', e.response?.status, e.response?.data);
      const serverError = e.response?.data?.error || e.response?.data?.message;
      setError(serverError || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialMock = async (provider: string) => {
    Alert.alert('Social Auth Mock', `Mocking ${provider} authentication. Native keys not configured.`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#010F1C" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>Log in</Text>
          <Text style={styles.subtitle}>Enter your email and password to securely access your account and manage your services.</Text>
          
          {error ? <Text style={styles.error}>{error}</Text> : null}
          
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#646464" style={styles.inputIcon} />
            <TextInput 
              style={styles.input} 
              placeholder="Email address" 
              placeholderTextColor="#939393"
              value={email} 
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#646464" style={styles.inputIcon} />
            <TextInput 
              style={styles.input} 
              placeholder="Password" 
              placeholderTextColor="#939393"
              secureTextEntry={!showPassword} 
              value={password} 
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#646464" />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>Login</Text>
            )}
          </TouchableOpacity>
          
          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/signup' as any)}>
              <Text style={styles.signupLink}>Sign Up here</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>Or Continue With Account</Text>
            <View style={styles.divider} />
          </View>

          <View style={styles.socialContainer}>
            <TouchableOpacity style={styles.socialButton} onPress={() => handleSocialMock('Facebook')}>
              <Ionicons name="logo-facebook" size={24} color="#3b5998" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialButton} onPress={() => handleSocialMock('Google')}>
              <Ionicons name="logo-google" size={24} color="#DB4437" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialButton} onPress={() => handleSocialMock('Apple')}>
              <Ionicons name="logo-apple" size={24} color="#000" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  keyboardView: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 },
  backButton: { 
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', 
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 
  },
  content: { flex: 1, paddingHorizontal: 24, alignItems: 'center' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#010F1C', marginBottom: 12 },
  subtitle: { fontSize: 14, color: '#646464', textAlign: 'center', marginBottom: 32, lineHeight: 22, paddingHorizontal: 10 },
  error: { color: '#ff3b30', marginBottom: 16, textAlign: 'center', fontSize: 14 },
  
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 10, paddingHorizontal: 14, marginBottom: 16,
    height: 44, width: '100%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 14, color: '#010F1C' },
  eyeIcon: { padding: 4 },
  
  loginButton: {
    backgroundColor: '#3BB77E', borderRadius: 10, height: 44, width: '100%',
    justifyContent: 'center', alignItems: 'center', marginTop: 12,
    shadowColor: '#3BB77E', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5
  },
  loginButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  
  signupContainer: { flexDirection: 'row', marginTop: 24, marginBottom: 40 },
  signupText: { color: '#646464', fontSize: 14 },
  signupLink: { color: '#3BB77E', fontSize: 14, fontWeight: '600' },
  
  dividerContainer: { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 30 },
  divider: { flex: 1, height: 1, backgroundColor: '#E0E0E0' },
  dividerText: { color: '#646464', fontSize: 12, paddingHorizontal: 15 },
  
  socialContainer: { flexDirection: 'row', gap: 20 },
  socialButton: {
    width: 50, height: 50, borderRadius: 25, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2
  }
});
