import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";

// Interfaces para coincidir
interface Alumno { nombre: string; comuna: string; direccion: string; lat?: number; lng?: number; }
interface ColegioSede { nombre: string; comuna: string; direccion: string; lat?: number; lng?: number; }
interface Data { buses: any[]; conductores: any[]; alumnos: Alumno[]; colegios: ColegioSede[]; }

export default function AgrupacionRutaScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ data: string }>();
  
  // Parsear datos incluyendo colegios
  const parsedData: Data = params.data
    ? JSON.parse(params.data)
    : { buses: [], conductores: [], alumnos: [], colegios: [] };

  const [grupos, setGrupos] = useState<Record<string, Alumno[]>>({});
  const [rutaSeleccionada, setRutaSeleccionada] = useState<string | null>(null);
  
  // Esta variable contendrá Alumnos + Colegio al final
  const [puntosMapa, setPuntosMapa] = useState<(Alumno | ColegioSede)[]>([]);

  useEffect(() => {
    const agrupado: Record<string, Alumno[]> = {};
    parsedData.alumnos.forEach((a) => {
      if (!agrupado[a.comuna]) agrupado[a.comuna] = [];
      agrupado[a.comuna].push(a);
    });
    setGrupos(agrupado);
  }, [parsedData.alumnos]);

  // Generador de coordenadas falsas (simulación)
  const generarCoordenadas = (item: any, isColegio: boolean) => {
    // Si es colegio, lo ponemos un poco más lejos (simulando destino)
    const baseLat = isColegio ? -33.43 : -33.45; 
    const baseLng = isColegio ? -70.63 : -70.65;
    
    return {
      ...item,
      lat: item.lat ?? baseLat + Math.random() * 0.04,
      lng: item.lng ?? baseLng + Math.random() * 0.04,
      tipo: isColegio ? 'COLEGIO' : 'ALUMNO' // Marcador para identificar
    };
  };

  if (rutaSeleccionada) {
    const alumnosRuta = grupos[rutaSeleccionada];

    // LÓGICA CLAVE: Obtener el colegio (usamos el primero de la lista o uno genérico)
    let colegioDestino = parsedData.colegios.length > 0 ? parsedData.colegios[0] : null;

    if (!colegioDestino) {
      Alert.alert("Error", "No hay colegios registrados para finalizar la ruta.");
      setRutaSeleccionada(null);
      return null;
    }

    // Si aún no hemos generado los puntos del mapa...
    if (puntosMapa.length === 0) {
      // 1. Asignar coordenadas a los alumnos
      const alumnosConCoords = alumnosRuta.map(a => generarCoordenadas(a, false));
      
      // 2. Asignar coordenadas al colegio
      const colegioConCoords = generarCoordenadas(colegioDestino, true);

      // 3. COMBINAR: Alumnos primero, Colegio AL FINAL
      setPuntosMapa([...alumnosConCoords, colegioConCoords]);
    }

    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Ruta: {rutaSeleccionada}</Text>
        <Text style={styles.subtitle}>Destino: {colegioDestino.nombre}</Text>

        <MapView
          style={{ width: "100%", height: 350, marginBottom: 16, borderRadius: 12 }}
          initialRegion={{
            latitude: -33.44, // Centro aprox
            longitude: -70.64,
            latitudeDelta: 0.08,
            longitudeDelta: 0.08,
          }}
        >
          {puntosMapa.map((p: any, i) => (
            <Marker
              key={i}
              coordinate={{ latitude: p.lat, longitude: p.lng }}
              title={p.tipo === 'COLEGIO' ? `🏫 ${p.nombre}` : `🧒 ${p.nombre}`}
              description={p.direccion}
              pinColor={p.tipo === 'COLEGIO' ? 'blue' : 'red'} // Colegio azul, alumnos rojos
            />
          ))}
          
          <Polyline
            coordinates={puntosMapa.map((p: any) => ({ latitude: p.lat, longitude: p.lng }))}
            strokeColor="#4CAF50"
            strokeWidth={4}
            lineDashPattern={[1]}
          />
        </MapView>

        <Text style={styles.sectionTitle}>Pasajeros:</Text>
        {alumnosRuta.map((a, i) => (
          <View key={i} style={styles.card}>
            <Text>🧒 {a.nombre}</Text>
            <Text style={{color: '#666'}}>📍 {a.direccion}</Text>
          </View>
        ))}

        <Text style={[styles.sectionTitle, {marginTop: 15, color: '#3f51b5'}]}>Destino Final:</Text>
        <View style={[styles.card, {borderColor: '#3f51b5', backgroundColor: '#e8eaf6'}]}>
            <Text style={{fontWeight: 'bold', color: '#3f51b5'}}>🏫 {colegioDestino.nombre}</Text>
            <Text>📍 {colegioDestino.direccion}, {colegioDestino.comuna}</Text>
        </View>

        <TouchableOpacity
          style={styles.volverBtn}
          onPress={() => {
            setRutaSeleccionada(null);
            setPuntosMapa([]); // Limpiar para regenerar si entra a otra ruta
          }}
        >
          <Text style={styles.volverText}>← Volver a selección</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Selecciona Comuna de Origen</Text>
      <Text style={{textAlign: 'center', marginBottom: 20, color: '#666'}}>
        El destino final será: {parsedData.colegios[0]?.nombre || "Sin Colegio Asignado"}
      </Text>
      
      {Object.keys(grupos).map((comuna, i) => (
        <TouchableOpacity
          key={i}
          style={styles.rutaBtn}
          onPress={() => setRutaSeleccionada(comuna)}
        >
          <Text style={styles.rutaText}>Ruta {comuna}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 5, textAlign: "center" },
  subtitle: { fontSize: 18, fontWeight: "bold", marginBottom: 12, textAlign: "center", color: '#555' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginTop: 10, marginBottom: 5 },
  card: { padding: 12, borderWidth: 1, borderColor: "#ccc", borderRadius: 8, marginBottom: 8, backgroundColor: '#fff' },
  rutaBtn: { backgroundColor: "#4CAF50", padding: 15, borderRadius: 8, marginBottom: 10 },
  rutaText: { color: "#fff", fontSize: 18, textAlign: "center", fontWeight: "bold" },
  volverBtn: { marginTop: 20, padding: 10, marginBottom: 30 },
  volverText: { fontSize: 16, color: "#4CAF50", textAlign: "center", fontWeight: "bold" },
});