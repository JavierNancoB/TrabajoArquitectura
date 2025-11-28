import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import MapView, { Marker, Polyline } from 'react-native-maps';

export default function ConductorScreen() {
  // Datos del conductor y ruta
  const [conductor, setConductor] = useState<any>(null);
  const [patente, setPatente] = useState('');
  const [ruta, setRuta] = useState('');

  // Estados del viaje
  const [viajeIniciado, setViajeIniciado] = useState(false);
  const [tiempo, setTiempo] = useState(0);
  const [detalleReporte, setDetalleReporte] = useState('');
  const [reportes, setReportes] = useState<any[]>([]);
  const [inicioViaje, setInicioViaje] = useState<number | null>(null);

  // ---------------------------
  // 👉 Cargar conductor según correo de login
  // ---------------------------
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const json = await AsyncStorage.getItem('colegioData');
        const correoLogin = await AsyncStorage.getItem('usuario');

        if (!json || !correoLogin) return;
        const data = JSON.parse(json);

        // Filtramos el conductor según correo
        const conductorData = data.conductores.find((c: any) => c.correo === correoLogin);
        if (conductorData) setConductor(conductorData);

        // Patente → primer bus registrado
        if (data.buses.length > 0) setPatente(data.buses[0]);

        // Ruta → generar según alumnos
        if (data.alumnos.length > 0) setRuta(`Recorrido con ${data.alumnos.length} alumnos`);
        else setRuta("Ruta no definida");

      } catch (e) {
        console.log("Error cargando colegioData:", e);
      }
    };
    cargarDatos();
  }, []);

  // ---------------------------
  // Cargar viaje activo (timer)
  // ---------------------------
  useEffect(() => {
    const cargarViaje = async () => {
      const inicio = await AsyncStorage.getItem('inicioViaje');
      if (inicio) {
        const inicioNum = JSON.parse(inicio);
        setInicioViaje(inicioNum);
        setViajeIniciado(true);
        setTiempo(Math.floor((Date.now() - inicioNum) / 1000));
      }
    };
    cargarViaje();
  }, []);

  // Temporizador en vivo
  useEffect(() => {
    let interval: any;
    if (viajeIniciado && inicioViaje) {
      interval = setInterval(() => {
        setTiempo(Math.floor((Date.now() - inicioViaje) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [viajeIniciado, inicioViaje]);

  // ---------------------------
  // Cargar reportes del conductor actual
  // ---------------------------
  useEffect(() => {
    const cargarReportes = async () => {
      try {
        const json = await AsyncStorage.getItem('reportes');
        const data = json ? JSON.parse(json) : [];
        if (conductor) {
          setReportes(data.filter((r: any) => r.conductor === conductor.nombre));
        }
      } catch (error) {
        console.log('Error leyendo reportes:', error);
      }
    };
    cargarReportes();
  }, [conductor]);

  const formatTiempo = (sec: number) => {
    const h = Math.floor(sec / 3600).toString().padStart(2, '0');
    const m = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const iniciarViaje = async () => {
    if (viajeIniciado) return;
    const ahora = Date.now();
    setInicioViaje(ahora);
    setViajeIniciado(true);
    await AsyncStorage.setItem('inicioViaje', JSON.stringify(ahora));
  };

  const finalizarViaje = async () => {
    if (!viajeIniciado) return;
    Alert.alert('Finalizar viaje', '¿Estás seguro que quieres finalizar el viaje?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Finalizar',
        style: 'destructive',
        onPress: async () => {
          setViajeIniciado(false);
          setTiempo(0);
          setDetalleReporte('');
          setInicioViaje(null);
          await AsyncStorage.removeItem('inicioViaje');
        },
      },
    ]);
  };

  const guardarReporte = async (reporte: any) => {
    try {
      const json = await AsyncStorage.getItem('reportes');
      const all = json ? JSON.parse(json) : [];
      const nuevos = [...all, reporte];
      setReportes(prev => [...prev, reporte]);
      await AsyncStorage.setItem('reportes', JSON.stringify(nuevos));
    } catch (error) {
      console.log('Error guardando reporte:', error);
    }
  };

  const reportarEvento = (evento: string) => {
    if (!viajeIniciado) {
      Alert.alert('Viaje no iniciado', 'Debes iniciar el viaje antes de reportar.');
      return;
    }

    Alert.alert(`Reportar ${evento}`, '¿Confirmar reporte?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar',
        onPress: () => {
          const hora = formatTiempo(tiempo);
          const reporte = {
            conductor: conductor?.nombre || "Desconocido",
            ruta,
            evento,
            detalle: detalleReporte || 'Ninguno',
            tiempo: hora,
            patente,
          };
          guardarReporte(reporte);
          setDetalleReporte('');
        },
      },
    ]);
  };

  const eliminarReporte = (index: number) => {
    Alert.alert('Eliminar reporte', '¿Seguro que quieres eliminarlo?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          const json = await AsyncStorage.getItem('reportes');
          const all = json ? JSON.parse(json) : [];
          all.splice(index, 1);
          await AsyncStorage.setItem('reportes', JSON.stringify(all));
          setReportes(all.filter((r: any) => r.conductor === conductor?.nombre));
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f4f6fc' }}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.container}
        enableOnAndroid
        extraScrollHeight={200}
        enableAutomaticScroll
      >
        {/* Info conductor */}
        <View style={styles.card}>
          <Text style={styles.titulo}>Conductor</Text>
          <Text style={styles.subtitulo}>{conductor ? conductor.nombre : "Cargando..."}</Text>
          <Text style={styles.subtitulo}>Ruta: {ruta}</Text>
          <Text style={styles.subtitulo}>Patente: {patente || "Sin asignar"}</Text>

          <TouchableOpacity
            style={[styles.button, viajeIniciado && styles.buttonDisabled]}
            onPress={iniciarViaje}
            disabled={viajeIniciado}
          >
            <Text style={styles.buttonText}>
              {viajeIniciado ? 'Viaje en curso' : 'Iniciar viaje'}
            </Text>
          </TouchableOpacity>

          {viajeIniciado && (
            <TouchableOpacity
              style={[styles.button, { backgroundColor: '#e11d48' }]}
              onPress={finalizarViaje}
            >
              <Text style={styles.buttonText}>Finalizar viaje</Text>
            </TouchableOpacity>
          )}

          {viajeIniciado && <Text style={styles.temporizador}>Tiempo: {formatTiempo(tiempo)}</Text>}
        </View>
        
      {ruta && (
        <View style={{ marginVertical: 16, borderRadius: 16, overflow: 'hidden', height: 250 }}>
          <MapView
            style={{ flex: 1 }}
            initialRegion={{
              latitude: -33.45,
              longitude: -70.65,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
          >
            {/* Marcadores de ejemplo */}
            <Marker coordinate={{ latitude: -33.45, longitude: -70.65 }} title="Inicio" />
            <Marker coordinate={{ latitude: -33.44, longitude: -70.66 }} title="Punto intermedio" />
            <Marker coordinate={{ latitude: -33.43, longitude: -70.67 }} title="Destino" />

            {/* Polyline conectando los puntos */}
            <Polyline
              coordinates={[
                { latitude: -33.45, longitude: -70.65 },
                { latitude: -33.44, longitude: -70.66 },
                { latitude: -33.43, longitude: -70.67 },
              ]}
              strokeColor="#4CAF50"
              strokeWidth={4}
            />
          </MapView>
        </View>
      )}

        {/* Detalle reporte */}
        <View style={styles.card}>
          <TextInput
            placeholder="Detalle opcional..."
            value={detalleReporte}
            onChangeText={setDetalleReporte}
            style={styles.input}
            placeholderTextColor="#777"
          />

          <View style={styles.rowBotones}>
            <TouchableOpacity
              style={[styles.buttonEvento, { backgroundColor: '#FFA500' }]}
              onPress={() => reportarEvento('Retraso')}
            >
              <Text style={styles.buttonText}>Retraso</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.buttonEvento, { backgroundColor: '#FF4500' }]}
              onPress={() => reportarEvento('Ausencia')}
            >
              <Text style={styles.buttonText}>Ausencia</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.buttonEvento, { backgroundColor: '#FF0000' }]}
              onPress={() => reportarEvento('Accidente')}
            >
              <Text style={styles.buttonText}>Accidente</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Reportes */}
        <View style={styles.card}>
          <Text style={styles.titulo}>Reportes guardados</Text>
          {reportes.length === 0 ? (
            <Text style={{ textAlign: 'center', color: '#666' }}>No hay reportes todavía</Text>
          ) : (
            reportes.map((r, i) => (
              <View key={i} style={styles.reporteCard}>
                <Text style={styles.reporteText}>{r.tiempo} - {r.evento}</Text>
                <Text style={styles.reporteDetalle}>Detalle: {r.detalle}</Text>
                <Text style={styles.reporteDetalle}>Patente: {r.patente}</Text>
                <TouchableOpacity onPress={() => eliminarReporte(i)}>
                  <Text style={styles.eliminar}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 8 },
  titulo: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, textAlign: 'center', color: '#333' },
  subtitulo: { fontSize: 16, marginBottom: 4, textAlign: 'center', color: '#555' },
  temporizador: { fontSize: 18, marginTop: 12, textAlign: 'center', fontWeight: 'bold', color: '#333' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 14, fontSize: 16, backgroundColor: '#f9f9f9', marginBottom: 12 },
  button: { width: '100%', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 12, backgroundColor: '#4f46e5' },
  buttonDisabled: { backgroundColor: '#999' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  rowBotones: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 12 },
  buttonEvento: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  reporteCard: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 12, marginTop: 12, backgroundColor: '#f9f9f9' },
  reporteText: { fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
  reporteDetalle: { fontSize: 14, color: '#555' },
  eliminar: { color: '#e60000', fontWeight: 'bold', marginTop: 6, textAlign: 'right' },
});
