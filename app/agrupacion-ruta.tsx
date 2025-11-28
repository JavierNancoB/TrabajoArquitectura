import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { useLocalSearchParams } from "expo-router";

interface Alumno {
  nombre: string;
  comuna: string;
  direccion: string;
  lat?: number;
  lng?: number;
}

type BusType = string | { nombre?: string; id?: string; [key: string]: any };
type ConductorType =
  | string
  | { nombre?: string; id?: string; [key: string]: any };

interface Data {
  buses: BusType[];
  conductores: ConductorType[];
  alumnos: Alumno[];
}

export default function AgrupacionRutaScreen() {
  const params = useLocalSearchParams<{ data: string }>();
  const parsedData: Data = params.data
    ? JSON.parse(params.data)
    : { buses: [], conductores: [], alumnos: [] };

  const [grupos, setGrupos] = useState<Record<string, Alumno[]>>({});
  const [rutaSeleccionada, setRutaSeleccionada] = useState<string | null>(null);
  const [rutaRandom, setRutaRandom] = useState<Alumno[]>([]);

  useEffect(() => {
    const agrupado: Record<string, Alumno[]> = {};
    parsedData.alumnos.forEach((a) => {
      if (!agrupado[a.comuna]) agrupado[a.comuna] = [];
      agrupado[a.comuna].push(a);
    });
    setGrupos(agrupado);
  }, [parsedData.alumnos]);

  const renderId = (obj: BusType | ConductorType) => {
    if (typeof obj === "string") return obj;
    if (typeof obj === "object") return obj.nombre ?? obj.id ?? "Sin datos";
    return "Sin datos";
  };

  const getConductorYBus = (rutaIndex: number): {
    bus: BusType;
    conductor: ConductorType;
  } => {
    const bus = parsedData.buses[rutaIndex];
    const conductor = parsedData.conductores[rutaIndex];
    if (!bus || !conductor) {
      Alert.alert(
        "Atención",
        "No hay suficientes buses o conductores para esta ruta."
      );
      return { bus: "No disponible", conductor: "No disponible" };
    }
    return { bus, conductor };
  };

  const generarRutaRandom = (alumnos: Alumno[]) => {
    return alumnos.map((a) => ({
      ...a,
      lat: a.lat ?? -33.45 + Math.random() * 0.1,
      lng: a.lng ?? -70.65 + Math.random() * 0.1,
    }));
  };

  if (rutaSeleccionada) {
    const comunasOrdenadas = Array.from(
      new Set(parsedData.alumnos.map((a) => a.comuna))
    );
    const rutaIndex = comunasOrdenadas.indexOf(rutaSeleccionada);
    const { bus, conductor } = getConductorYBus(rutaIndex);
    const alumnosRuta = grupos[rutaSeleccionada];
    const rutaMapa = rutaRandom.length ? rutaRandom : generarRutaRandom(alumnosRuta);

    if (!rutaRandom.length) setRutaRandom(rutaMapa);

    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Ruta: {rutaSeleccionada}</Text>
        <Text style={styles.subtitle}>
          🚌 Bus: {renderId(bus)}
          {"\n"}
          👨‍✈️ Conductor: {renderId(conductor)}
        </Text>

        <MapView
          style={{ width: "100%", height: 300, marginBottom: 16 }}
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
            coordinates={rutaMapa.map((a) => ({ latitude: a.lat!, longitude: a.lng! }))}
            strokeColor="#4CAF50"
            strokeWidth={4}
          />
        </MapView>

        {alumnosRuta.map((a, i) => (
          <View key={i} style={styles.card}>
            <Text>🧒 {a.nombre}</Text>
            <Text>
              📍 {a.comuna} - {a.direccion}
            </Text>
          </View>
        ))}

        <TouchableOpacity
          style={styles.volverBtn}
          onPress={() => {
            setRutaSeleccionada(null);
            setRutaRandom([]);
          }}
        >
          <Text style={styles.volverText}>← Volver a rutas</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Selecciona la ruta</Text>
      {Object.keys(grupos).map((comuna, i) => (
        <TouchableOpacity
          key={i}
          style={styles.rutaBtn}
          onPress={() => setRutaSeleccionada(comuna)}
        >
          <Text style={styles.rutaText}>{comuna}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  card: {
    padding: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    marginBottom: 8,
  },
  rutaBtn: {
    backgroundColor: "#4CAF50",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  rutaText: {
    color: "#fff",
    fontSize: 18,
    textAlign: "center",
    fontWeight: "bold",
  },
  volverBtn: { marginTop: 16, padding: 10 },
  volverText: {
    fontSize: 16,
    color: "#4CAF50",
    textAlign: "center",
    fontWeight: "bold",
  },
});
