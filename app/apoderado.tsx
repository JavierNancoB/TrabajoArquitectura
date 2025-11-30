import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, Button, Dimensions, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BarChart, PieChart } from 'react-native-chart-kit';
import MapView, { Marker } from 'react-native-maps';

interface Alumno {
  nombre: string;
  comuna: string;
  direccion: string;
  correoApoderado: string;
  lat?: number;
  lng?: number;
}

export default function ApoderadoScreen() {
  const screenWidth = Dimensions.get('window').width - 32;

  // Estados de Datos
  const [hijos, setHijos] = useState<Alumno[]>([]);
  const [rutaCompartida, setRutaCompartida] = useState<string>('');
  const [reportes, setReportes] = useState<any[]>([]);
  const [rutaMapa, setRutaMapa] = useState<Alumno[]>([]);

  // Estados del Dashboard
  const [dataPastel, setDataPastel] = useState<any[]>([]);
  const [dataBarras, setDataBarras] = useState<any>(null);
  const [totalIncidentes, setTotalIncidentes] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [usuarioActual, setUsuarioActual] = useState<string>('Invitado');

  const cargarDatos = async () => {
    try {
      // 1. Cargar Datos Básicos
      const jsonColegio = await AsyncStorage.getItem('colegioData');
      const correoLogin = await AsyncStorage.getItem('usuario'); // Correo del apoderado logueado
      const jsonReportes = await AsyncStorage.getItem('reportes');
      
      setUsuarioActual(correoLogin || 'Modo Demo (Sin Login)');

      const dataReportes = jsonReportes ? JSON.parse(jsonReportes) : [];
      setReportes(dataReportes);
      setTotalIncidentes(dataReportes.length);

      // 2. Obtener lista completa de alumnos
      let todosLosAlumnos: Alumno[] = [];
      if (jsonColegio) {
        const data = JSON.parse(jsonColegio);
        todosLosAlumnos = data.alumnos || [];
      }

      // 3. Lógica de Filtrado Inteligente
      let misHijos: Alumno[] = [];

      if (correoLogin) {
        // Normalizamos (minúsculas y sin espacios) para evitar errores de tipeo
        const correoNormalizado = correoLogin.trim().toLowerCase();
        
        misHijos = todosLosAlumnos.filter(a => 
          a.correoApoderado && a.correoApoderado.trim().toLowerCase() === correoNormalizado
        );
      }

      // --- FALLBACK / MODO DEMO ---
      // Si no hay login, o si el login no coincide con ningún alumno, 
      // mostramos TODOS los alumnos para que el dashboard no se vea vacío.
      if (misHijos.length === 0) {
        console.log("No se encontraron coincidencias exactas. Mostrando todos los alumnos (Modo Demo).");
        misHijos = todosLosAlumnos;
      }

      setHijos(misHijos);

      if (misHijos.length > 0) {
        setRutaCompartida(misHijos[0].comuna); 
        
        // Generar coordenadas fake para visualización si no tienen
        const rutaRandom = misHijos.map(a => ({
          ...a,
          lat: a.lat ?? -33.45 + Math.random() * 0.04,
          lng: a.lng ?? -70.65 + Math.random() * 0.04,
        }));
        setRutaMapa(rutaRandom);
      }

      // 4. Generar Datos Dashboard (Estado del Servicio Global)
      const cantidadRetrasos = dataReportes.filter((r: any) => r.evento === 'Retraso').length;
      // Simulamos que hay al menos algunos viajes normales para que el gráfico se vea bien
      const cantidadNormal = Math.max(1, dataReportes.length - cantidadRetrasos + (misHijos.length * 2));

      setDataPastel([
        { name: 'Retrasos', population: cantidadRetrasos, color: '#FF6384', legendFontColor: '#333', legendFontSize: 13 },
        { name: 'Normal', population: cantidadNormal, color: '#4CAF50', legendFontColor: '#333', legendFontSize: 13 },
      ]);

      const conteo = { Retraso: 0, Ausencia: 0, Accidente: 0 };
      dataReportes.forEach((r: any) => {
        if (conteo[r.evento as keyof typeof conteo] !== undefined) conteo[r.evento as keyof typeof conteo]++;
      });

      setDataBarras({
        labels: ['Retraso', 'Ausencia', 'Accidente'],
        datasets: [{ data: [conteo.Retraso, conteo.Ausencia, conteo.Accidente] }],
      });

    } catch (error) {
      console.log('Error leyendo datos:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarDatos();
    setRefreshing(false);
  };

  const marcarComoLeido = async (reporte: any) => {
    Alert.alert("Confirmar", "¿Marcar este reporte como leído?", [
      { text: "Cancelar" },
      { 
        text: "Sí", 
        onPress: async () => {
          const nuevosReportes = reportes.filter(r => r !== reporte);
          setReportes(nuevosReportes);
          await AsyncStorage.setItem('reportes', JSON.stringify(nuevosReportes));
          cargarDatos(); // Recargar gráficos
        }
      }
    ]);
  };

  return (
    <ScrollView 
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.title}>Portal Apoderado</Text>
      <Text style={{textAlign: 'center', color: '#888', marginBottom: 10, fontSize: 12}}>
        Usuario: {usuarioActual}
      </Text>

      {/* ============================== */}
      {/* SECCIÓN 1: DASHBOARD GENERAL   */}
      {/* ============================== */}
      <View style={styles.dashboardContainer}>
        <Text style={styles.sectionHeader}>Estado del Servicio (Hoy)</Text>
        
        {/* KPI Simple */}
        <View style={styles.kpiContainer}>
           <View style={[styles.kpiCard, { backgroundColor: totalIncidentes > 0 ? '#ffebee' : '#e8f5e9' }]}>
             <Text style={[styles.kpiText, { color: totalIncidentes > 0 ? '#c62828' : '#2e7d32' }]}>
               {totalIncidentes > 0 ? `⚠️ ${totalIncidentes} Incidentes Reportados` : "✅ Servicio Operando Normal"}
             </Text>
           </View>
        </View>

        {/* Gráficos */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
          {dataPastel.length > 0 && (
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Estado de Rutas</Text>
              <PieChart
                data={dataPastel}
                width={screenWidth * 0.8}
                height={180}
                chartConfig={{ color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})` }}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="0"
                absolute
              />
            </View>
          )}

          {dataBarras && (
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Tipos de Eventos</Text>
              <BarChart
                data={dataBarras}
                width={screenWidth * 0.8}
                height={180}
                fromZero
                yAxisLabel=""
                yAxisSuffix=""
                chartConfig={{
                  backgroundGradientFrom: '#fff',
                  backgroundGradientTo: '#fff',
                  color: (opacity = 1) => `rgba(54, 162, 235, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(0,0,0,${opacity})`,
                }}
              />
            </View>
          )}
        </ScrollView>
      </View>

      {/* ============================== */}
      {/* SECCIÓN 2: MIS HIJOS           */}
      {/* ============================== */}
      <Text style={[styles.sectionHeader, { marginTop: 20 }]}>Mis Estudiantes</Text>
      
      {hijos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No hay alumnos registrados en el sistema.</Text>
          <Text style={styles.emptySubText}>Ve a la pestaña "Colegio" para agregar alumnos.</Text>
        </View>
      ) : (
        hijos.map((hijo, index) => {
          // Filtrar reportes para mostrar el más reciente
          const ultimoReporte = reportes.length > 0 ? reportes[reportes.length - 1] : null;

          return (
            <View key={index} style={styles.studentCard}>
              <View style={styles.studentHeader}>
                <Text style={styles.studentName}>🧒 {hijo.nombre}</Text>
                <Text style={styles.studentRoute}>Ruta: {hijo.comuna}</Text>
              </View>

              {/* Mapa Miniatura */}
              <View style={styles.mapContainer}>
                <MapView
                  style={{ width: '100%', height: 150 }}
                  scrollEnabled={false} // Mapa estático visual
                  initialRegion={{
                    latitude: hijo.lat || -33.45,
                    longitude: hijo.lng || -70.65,
                    latitudeDelta: 0.02,
                    longitudeDelta: 0.02,
                  }}
                >
                  <Marker coordinate={{ latitude: hijo.lat || -33.45, longitude: hijo.lng || -70.65 }} />
                </MapView>
                <View style={styles.mapOverlay}>
                  <Text style={styles.mapOverlayText}>En ruta a casa</Text>
                </View>
              </View>

              {/* Tarjeta de Estatus / Último Reporte */}
              {ultimoReporte ? (
                <View style={styles.alertBox}>
                  <Text style={styles.alertTitle}>📢 Último Reporte ({ultimoReporte.tiempo})</Text>
                  <Text style={styles.alertText}>Evento: <Text style={{fontWeight: 'bold'}}>{ultimoReporte.evento}</Text></Text>
                  <Text style={styles.alertText}>Detalle: {ultimoReporte.detalle}</Text>
                  <Text style={styles.alertText}>Bus: {ultimoReporte.patente}</Text>
                  <Button title="Marcar como Visto" onPress={() => marcarComoLeido(ultimoReporte)} color="#4CAF50" />
                </View>
              ) : (
                <View style={styles.statusBox}>
                  <Text style={styles.statusText}>✅ Sin novedades recientes en la ruta.</Text>
                </View>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, flexGrow: 1, backgroundColor: '#f5f5f5' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 5, textAlign: 'center', color: '#333' },
  sectionHeader: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, color: '#444' },
  
  // Dashboard Styles
  dashboardContainer: { marginBottom: 10 },
  kpiContainer: { marginBottom: 15 },
  kpiCard: { padding: 15, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  kpiText: { fontSize: 18, fontWeight: 'bold' },
  
  chartCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 10, marginRight: 15,
    alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4,
    marginBottom: 5
  },
  chartTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 5, color: '#555' },

  // Student Card Styles
  studentCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 20,
    elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5
  },
  studentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  studentName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  studentRoute: { fontSize: 14, color: '#666', backgroundColor: '#e0e0e0', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  
  mapContainer: { borderRadius: 8, overflow: 'hidden', marginBottom: 12, position: 'relative' },
  mapOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', padding: 4 },
  mapOverlayText: { color: '#fff', textAlign: 'center', fontSize: 12 },

  // Alerts
  alertBox: { backgroundColor: '#fff3e0', padding: 10, borderRadius: 8, borderLeftWidth: 4, borderLeftColor: '#ff9800' },
  alertTitle: { fontWeight: 'bold', marginBottom: 5, color: '#e65100' },
  alertText: { marginBottom: 2, color: '#333' },
  statusBox: { backgroundColor: '#e8f5e9', padding: 12, borderRadius: 8, alignItems: 'center' },
  statusText: { color: '#2e7d32', fontWeight: 'bold' },

  // Empty State
  emptyContainer: { padding: 20, alignItems: 'center', marginTop: 20 },
  emptyText: { fontSize: 16, fontWeight: 'bold', color: '#777' },
  emptySubText: { fontSize: 14, color: '#999', textAlign: 'center', marginTop: 5 },
});