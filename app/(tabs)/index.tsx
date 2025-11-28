import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    const correoLower = email.toLowerCase();

    // Cargar datos del colegio
    const json = await AsyncStorage.getItem('colegioData');
    const data = json ? JSON.parse(json) : null;

    if (data) {
      // Buscar si el correo es de algún alumno/apoderado
      const alumno = data.alumnos.find((a: any) => a.correoApoderado.toLowerCase() === correoLower);
      if (alumno) {
        await AsyncStorage.setItem('usuario', correoLower);
        router.push('/apoderado');
        return;
      }

      // Buscar si el correo es de algún conductor
      const conductor = data.conductores.find((c: any) => c.correo.toLowerCase() === correoLower);
      if (conductor) {
        await AsyncStorage.setItem('usuario', correoLower);
        router.push('/conductor');
        return;
      }
    }

    // Casos fijos
    switch (correoLower) {
      case 'colegio@demo.com':
        await AsyncStorage.setItem('usuario', correoLower);
        router.push('/colegio');
        break;
      case 'admin@demo.com':
        await AsyncStorage.setItem('usuario', correoLower);
        router.push('/admin');
        break;
      default:
        Alert.alert('Correo no válido', 'Ingresa un correo registrado.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Gestión de Buses Escolares</Text>

        <TextInput
          placeholder="Correo electrónico"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholderTextColor="#888"
        />

        <TextInput
          placeholder="Contraseña"
          value={password}
          onChangeText={setPassword}
          style={styles.input}
          secureTextEntry
          placeholderTextColor="#888"
        />

        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Ingresar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6fc',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
    color: '#333',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 14,
    marginBottom: 16,
    borderRadius: 10,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  button: {
    backgroundColor: '#4f46e5',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
