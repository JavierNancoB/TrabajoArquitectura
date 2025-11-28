import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { Alert, Button, ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

interface Alumno {
  nombre: string;
  comuna: string;
  direccion: string;
  correoApoderado: string;
  lat?: number;
  lng?: number;
}

export default function ApoderadoScreen() {
  const [hijos, setHijos] = useState<Alumno[]>([]);
  const [rutaCompartida, setRutaCompartida] = useState<string>('');
  const [reportes, setReportes] = useState<any[]>([]);
  const [rutaMapa, setRutaMapa] = useState<Alumno[]>([]);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const json = await AsyncStorage.getItem('colegioData');
        const correo = await AsyncStorage.getItem('usuario');

        let alumnos: Alumno[] = [];
        if (json) {
          const data = JSON.parse(json);
          alumnos = data.alumnos || [];
        }

        const misHijos = alumnos.filter(a => a.correoApoderado === correo);
        setHijos(misHijos);

        if (misHijos.length > 0) {
          setRutaCompartida(`${misHijos[0].comuna} a Puente Alto`);
          // Generar coordenadas aleatorias para demo si no existen
          const rutaRandom = misHijos.map(a => ({
            ...a,
            lat: a.lat ?? -33.45 + Math.random() * 0.1,
            lng: a.lng ?? -70.65 + Math.random() * 0.1,
          }));
          setRutaMapa(rutaRandom);
        }

        const reportesJson = await AsyncStorage.getItem('reportes');
        const dataReportes = reportesJson ? JSON.parse(reportesJson) : [];
        setReportes(dataReportes);

        const retrasos = dataReportes.filter(
          (r: any) => r.evento === 'Retraso' && r.ruta === `${misHijos[0]?.comuna} a Puente Alto`
        );
        if (retrasos.length > 0) {
          Alert.alert(
            'Notificación de retraso',
            `Hay ${retrasos.length} retraso(s) reportado(s) en la ruta de tus hijos.`
          );
        }
      } catch (error) {
        console.log('Error leyendo datos:', error);
      }
    };

    cargarDatos();
  }, []);

  const marcarComoLeido = async (reporte: any) => {
    const nuevosReportes = reportes.filter(r => r !== reporte);
    setReportes(nuevosReportes);
    await AsyncStorage.setItem('reportes', JSON.stringify(nuevosReportes));
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Ruta de tus hijos</Text>

      {hijos.map((hijo, index) => {
        const reportesRuta = reportes.filter((r: any) => r.ruta === rutaCompartida);
        const ultimoReporte = reportesRuta.length > 0 ? reportesRuta[reportesRuta.length - 1] : null;

        return (
          <View key={index} style={styles.card}>
            <Text style={styles.hijo}>{hijo.nombre}</Text>
            <Text style={styles.ruta}>Ruta: {rutaCompartida}</Text>

            {/* Mapa de la ruta */}
            {rutaMapa.length > 0 && (
              <MapView
                style={{ width: '100%', height: 200, marginVertical: 10 }}
                initialRegion={{
                  latitude: rutaMapa[0].lat!,
                  longitude: rutaMapa[0].lng!,
                  latitudeDelta: 0.05,
                  longitudeDelta: 0.05,
                }}
              >
                {rutaMapa.map((a, i) => (
                  <Marker
                    key={i}
                    coordinate={{ latitude: a.lat!, longitude: a.lng! }}
                    title={a.nombre}
                    description={`${a.comuna} - ${a.direccion}`}
                  />
                ))}
                <Polyline
                  coordinates={rutaMapa.map(a => ({ latitude: a.lat!, longitude: a.lng! }))}
                  strokeColor="#4CAF50"
                  strokeWidth={4}
                />
              </MapView>
            )}

            {ultimoReporte ? (
              <>
                <Text style={styles.estado}>Evento: {ultimoReporte.evento}</Text>
                <Text style={styles.estado}>Patente: {ultimoReporte.patente || 'ABC-123'}</Text>
                <Text style={styles.estado}>Tiempo: {ultimoReporte.tiempo}</Text>
                <Text style={styles.estado}>Detalle: {ultimoReporte.detalle}</Text>
                <Button
                  title="Ya leído"
                  onPress={() => marcarComoLeido(ultimoReporte)}
                  color="#4CAF50"
                />
              </>
            ) : (
              <Text style={styles.estado}>Sin reportes</Text>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, flexGrow: 1 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  card: { padding: 12, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginBottom: 12 },
  hijo: { fontSize: 18, fontWeight: 'bold' },
  ruta: { fontSize: 16, marginTop: 4 },
  estado: { fontSize: 14, marginTop: 4, color: '#555' },
});
