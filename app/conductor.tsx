import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ConductorScreen() {
  // Datos del conductor y ruta
  const [conductor, setConductor] = useState<any>(null);
  const [patente, setPatente] = useState('');
  const [ruta, setRuta] = useState('');
  
  // Puntos del Mapa (Alumnos + Colegio final)
  const [puntosMapa, setPuntosMapa] = useState<any[]>([]);
  const [destinoFinal, setDestinoFinal] = useState<string>('');

  // Estados del viaje
  const [viajeIniciado, setViajeIniciado] = useState(false);
  const [tiempo, setTiempo] = useState(0);
  const [detalleReporte, setDetalleReporte] = useState('');
  const [reportes, setReportes] = useState<any[]>([]);
  const [inicioViaje, setInicioViaje] = useState<number | null>(null);

  // ---------------------------
  // 1. Cargar Datos (Lógica Robusta)
  // ---------------------------
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const json = await AsyncStorage.getItem('colegioData');
        const correoLogin = await AsyncStorage.getItem('usuario');

        if (!json || !correoLogin) {
            console.log("Faltan datos de login o base de datos");
            return;
        }

        const data = JSON.parse(json);
        const todosLosAlumnos = data.alumnos || [];
        const colegios = data.colegios || [];

        // A. Identificar Conductor (Comparación segura de strings)
        const conductorData = data.conductores.find(
            (c: any) => c.correo.trim().toLowerCase() === correoLogin.trim().toLowerCase()
        );

        if (conductorData) {
            setConductor(conductorData);
        } else {
            setRuta("Error: Conductor no encontrado");
            return;
        }

        // B. Asignar Patente
        if (data.buses.length > 0) setPatente(data.buses[0]);

        // C. FILTRADO INTELIGENTE DE RUTA
        const comunaAsignada = conductorData?.comunaAsignada || ""; // Puede venir vacío si es dato antiguo
        let alumnosFiltrados: any[] = [];

        if (comunaAsignada && comunaAsignada.length > 0) {
            // Caso 1: Tiene comuna asignada -> Filtramos
            alumnosFiltrados = todosLosAlumnos.filter((a: any) => 
                a.comuna && a.comuna.trim().toLowerCase() === comunaAsignada.trim().toLowerCase()
            );
        } else {
            // Caso 2: NO tiene comuna asignada -> Mostramos TODOS (Fallback)
            console.log("⚠️ Conductor sin comuna específica. Cargando ruta general.");
            alumnosFiltrados = todosLosAlumnos;
        }

        // D. Generar Puntos del Mapa
        if (alumnosFiltrados.length > 0) {
          const nombreRuta = comunaAsignada 
            ? `Ruta ${comunaAsignada}` 
            : "Ruta General (Todas las comunas)";
            
          setRuta(`${nombreRuta} - ${alumnosFiltrados.length} alumnos`);
          
          // Generar coordenadas (Simuladas si no existen)
          const alumnosConCoords = alumnosFiltrados.map((a: any) => ({
            ...a,
            // Si ya tiene lat/lng las usa, si no, genera un random cerca de stgo centro
            lat: a.lat ?? (-33.45 + Math.random() * 0.06), 
            lng: a.lng ?? (-70.65 + Math.random() * 0.06),
            tipo: 'ALUMNO'
          }));

          let rutaCompleta = [...alumnosConCoords];

          // Agregar Colegio al Final
          if (colegios.length > 0) {
            const sede = colegios[0];
            setDestinoFinal(sede.nombre);
            
            const colegioConCoords = {
              ...sede,
              lat: sede.lat ?? -33.43,
              lng: sede.lng ?? -70.63,
              tipo: 'COLEGIO'
            };
            rutaCompleta.push(colegioConCoords);
          }

          setPuntosMapa(rutaCompleta);

        } else {
            // Caso 3: Tiene comuna asignada pero 0 alumnos en ella
            setRuta(`Sin alumnos registrados en ${comunaAsignada}`);
            setPuntosMapa([]); 
        }

      } catch (e) {
        console.log("Error cargando colegioData:", e);
      }
    };
    cargarDatos();
  }, []);

  // ---------------------------
  // Cargar y gestionar Timer
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
  // Cargar Reportes
  // ---------------------------
  useEffect(() => {
    const cargarReportes = async () => {
      try {
        const json = await AsyncStorage.getItem('reportes');
        const data = json ? JSON.parse(json) : [];
        if (conductor) {
          setReportes(data.filter((r: any) => r.conductor === conductor.nombre));
        }
      } catch (error) { console.log(error); }
    };
    cargarReportes();
  }, [conductor]);

  const formatTiempo = (sec: number) => {
    const h = Math.floor(sec / 3600).toString().padStart(2, '0');
    const m = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  // Funciones de Viaje y Reporte
  const iniciarViaje = async () => {
    if (viajeIniciado) return;
    const ahora = Date.now();
    setInicioViaje(ahora);
    setViajeIniciado(true);
    await AsyncStorage.setItem('inicioViaje', JSON.stringify(ahora));
  };

  const finalizarViaje = async () => {
    if (!viajeIniciado) return;
    Alert.alert('Finalizar viaje', '¿Has llegado al colegio y finalizado la ruta?', [
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
    } catch (error) { console.log(error); }
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

  const eliminarReporte = async (index: number) => {
      const json = await AsyncStorage.getItem('reportes');
      const all = json ? JSON.parse(json) : [];
      all.splice(index, 1);
      await AsyncStorage.setItem('reportes', JSON.stringify(all));
      setReportes(all.filter((r: any) => r.conductor === conductor?.nombre));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f4f6fc' }}>
      <ScrollView contentContainerStyle={styles.container}>
        
        {/* Tarjeta Info Conductor */}
        <View style={styles.card}>
          <Text style={styles.titulo}>Panel Conductor</Text>
          <Text style={styles.subtitulo}>Hola, {conductor ? conductor.nombre : "Cargando..."}</Text>
          
          <Text style={[styles.subtitulo, { color: '#555', fontStyle: 'italic' }]}>
             {conductor?.comunaAsignada 
                ? `Zona Asignada: ${conductor.comunaAsignada}` 
                : "Zona: General (Sin asignar)"}
          </Text>

          <Text style={styles.subtitulo}>Patente: {patente || "Sin asignar"}</Text>
          {destinoFinal ? <Text style={[styles.subtitulo, {color: '#4f46e5', fontWeight:'bold'}]}>Destino: {destinoFinal}</Text> : null}

          <TouchableOpacity
            style={[styles.button, (viajeIniciado || puntosMapa.length === 0) && styles.buttonDisabled]}
            onPress={iniciarViaje}
            disabled={viajeIniciado || puntosMapa.length === 0}
          >
            <Text style={styles.buttonText}>
                {puntosMapa.length === 0 ? 'Cargando Ruta...' : (viajeIniciado ? 'Ruta en Curso' : 'Iniciar Ruta al Colegio')}
            </Text>
          </TouchableOpacity>

          {viajeIniciado && (
            <View>
              <Text style={styles.temporizador}>Tiempo: {formatTiempo(tiempo)}</Text>
              <TouchableOpacity style={[styles.button, { backgroundColor: '#e11d48', marginTop: 10 }]} onPress={finalizarViaje}>
                <Text style={styles.buttonText}>Llegada al Colegio (Finalizar)</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        
        {/* MAPA DINÁMICO */}
        {puntosMapa.length > 0 ? (
          <View style={styles.mapCard}>
            <Text style={styles.mapTitle}>{ruta}</Text>
            <MapView
              style={{ flex: 1, width: '100%', height: 300 }}
              initialRegion={{
                latitude: -33.44, 
                longitude: -70.64,
                latitudeDelta: 0.08,
                longitudeDelta: 0.08,
              }}
            >
              {puntosMapa.map((punto, index) => (
                <Marker
                  key={index}
                  coordinate={{ latitude: punto.lat, longitude: punto.lng }}
                  title={punto.tipo === 'COLEGIO' ? `🏫 ${punto.nombre}` : `🧒 ${punto.nombre}`}
                  description={punto.direccion}
                  pinColor={punto.tipo === 'COLEGIO' ? 'blue' : 'red'} 
                />
              ))}

              <Polyline
                coordinates={puntosMapa.map(p => ({ latitude: p.lat, longitude: p.lng }))}
                strokeColor="#4CAF50"
                strokeWidth={4}
              />
            </MapView>
            <Text style={{textAlign:'center', fontSize: 12, color: '#666', marginTop: 5}}>
              🔴 Alumnos  ➔  🔵 Colegio
            </Text>
          </View>
        ) : (
            <View style={[styles.card, { alignItems: 'center', padding: 30 }]}>
                <Text style={{ color: '#888' }}>No hay ruta disponible.</Text>
                <Text style={{ color: '#aaa', fontSize: 12, textAlign: 'center', marginTop: 5 }}>
                    Verifica que existan alumnos en tu comuna asignada.
                </Text>
            </View>
        )}

        {/* Panel de Reportes */}
        <View style={styles.card}>
          <Text style={styles.titulo}>Reportar Incidencia</Text>
          <TextInput
            placeholder="Detalle opcional (ej: tráfico pesado)"
            value={detalleReporte}
            onChangeText={setDetalleReporte}
            style={styles.input}
            placeholderTextColor="#777"
          />

          <View style={styles.rowBotones}>
            <TouchableOpacity style={[styles.buttonEvento, { backgroundColor: '#FFA500' }]} onPress={() => reportarEvento('Retraso')}>
              <Text style={styles.buttonText}>Retraso</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.buttonEvento, { backgroundColor: '#FF4500' }]} onPress={() => reportarEvento('Ausencia')}>
              <Text style={styles.buttonText}>Ausencia</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.buttonEvento, { backgroundColor: '#FF0000' }]} onPress={() => reportarEvento('Accidente')}>
              <Text style={styles.buttonText}>Accidente</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Historial de Reportes */}
        <View style={styles.card}>
          <Text style={styles.titulo}>Historial del Viaje</Text>
          {reportes.length === 0 ? (
            <Text style={{ textAlign: 'center', color: '#666' }}>Sin incidentes reportados.</Text>
          ) : (
            reportes.map((r, i) => (
              <View key={i} style={styles.reporteCard}>
                <View style={{flexDirection:'row', justifyContent:'space-between'}}>
                    <Text style={styles.reporteText}>{r.evento}</Text>
                    <Text style={{color:'#666'}}>{r.tiempo}</Text>
                </View>
                <Text style={styles.reporteDetalle}>{r.detalle}</Text>
                <TouchableOpacity onPress={() => eliminarReporte(i)}>
                  <Text style={styles.eliminar}>Deshacer</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
  titulo: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, textAlign: 'center', color: '#333' },
  subtitulo: { fontSize: 16, marginBottom: 4, textAlign: 'center', color: '#555' },
  temporizador: { fontSize: 24, marginTop: 12, textAlign: 'center', fontWeight: 'bold', color: '#333' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 14, fontSize: 16, backgroundColor: '#f9f9f9', marginBottom: 12 },
  button: { width: '100%', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 12, backgroundColor: '#4f46e5' },
  buttonDisabled: { backgroundColor: '#999' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  rowBotones: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 12 },
  buttonEvento: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  reporteCard: { borderLeftWidth: 4, borderLeftColor: '#4f46e5', borderRadius: 8, padding: 12, marginTop: 10, backgroundColor: '#f4f4f5' },
  reporteText: { fontWeight: 'bold', fontSize: 16 },
  reporteDetalle: { fontSize: 14, color: '#555', marginTop: 4 },
  eliminar: { color: '#e60000', fontWeight: 'bold', marginTop: 8, textAlign: 'right', fontSize: 12 },
  
  // Estilos del Mapa
  mapCard: { height: 350, borderRadius: 16, overflow: 'hidden', marginBottom: 20, elevation: 5, backgroundColor: '#fff' },
  mapTitle: { textAlign: 'center', fontWeight: 'bold', padding: 8, backgroundColor: '#fff' }
});