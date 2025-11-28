import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Button,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  UIManager,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

interface Alumno {
  nombre: string;
  comuna: string;
  direccion: string;
  correoApoderado: string;
}

interface Conductor {
  nombre: string;
  correo: string;
}

interface ColegioData {
  buses: string[];
  conductores: Conductor[];
  alumnos: Alumno[];
}

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function ColegioScreen() {
  const router = useRouter();

  const [buses, setBuses] = useState<string[]>([]);
  const [conductores, setConductores] = useState<Conductor[]>([]);
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);

  const [nuevoBus, setNuevoBus] = useState('');
  const [nuevoConductor, setNuevoConductor] = useState('');
  const [nuevoCorreoConductor, setNuevoCorreoConductor] = useState('');
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevaComuna, setNuevaComuna] = useState('');
  const [nuevaDireccion, setNuevaDireccion] = useState('');
  const [nuevoCorreo, setNuevoCorreo] = useState('');

  const [showBuses, setShowBuses] = useState(false);
  const [showConductores, setShowConductores] = useState(false);
  const [showAlumnos, setShowAlumnos] = useState(false);

  const refBus = useRef<TextInput>(null);
  const refConductor = useRef<TextInput>(null);
  const refCorreoConductor = useRef<TextInput>(null);
  const refNombre = useRef<TextInput>(null);
  const refComuna = useRef<TextInput>(null);
  const refDireccion = useRef<TextInput>(null);
  const refCorreo = useRef<TextInput>(null);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const json = await AsyncStorage.getItem('colegioData');
        if (json) {
          const data: ColegioData = JSON.parse(json);
          setBuses(data.buses);
          setConductores(data.conductores);
          setAlumnos(data.alumnos);
        }
      } catch (error) {
        console.log('Error cargando datos:', error);
      }
    };
    cargarDatos();
  }, []);

  const guardarDatos = async (data: ColegioData) => {
    try {
      await AsyncStorage.setItem('colegioData', JSON.stringify(data));
    } catch (error) {
      console.log('Error guardando datos:', error);
    }
  };

  const handleAgregarBus = () => {
    if (!nuevoBus.trim()) return;
    const nuevos = [...buses, nuevoBus.trim()];
    setBuses(nuevos);
    guardarDatos({ buses: nuevos, conductores, alumnos });
    setNuevoBus('');
    refConductor.current?.focus();
  };

  const handleEliminarBus = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const nuevos = buses.filter((_, i) => i !== index);
    setBuses(nuevos);
    guardarDatos({ buses: nuevos, conductores, alumnos });
  };

  const handleAgregarConductor = () => {
    if (!nuevoConductor.trim() || !nuevoCorreoConductor.trim()) {
      alert('Debes ingresar nombre y correo del conductor.');
      return;
    }

    const nuevos = [
      ...conductores,
      {
        nombre: nuevoConductor.trim(),
        correo: nuevoCorreoConductor.trim(),
      },
    ];

    setConductores(nuevos);
    guardarDatos({ buses, conductores: nuevos, alumnos });

    setNuevoConductor('');
    setNuevoCorreoConductor('');

    refNombre.current?.focus();
  };

  const handleEliminarConductor = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const nuevos = conductores.filter((_, i) => i !== index);
    setConductores(nuevos);
    guardarDatos({ buses, conductores: nuevos, alumnos });
  };

  const handleAgregarAlumno = () => {
    if (!nuevoNombre || !nuevaComuna || !nuevaDireccion || !nuevoCorreo) {
      alert('Completa todos los campos del alumno.');
      return;
    }
    const nuevos = [
      ...alumnos,
      {
        nombre: nuevoNombre,
        comuna: nuevaComuna,
        direccion: nuevaDireccion,
        correoApoderado: nuevoCorreo,
      },
    ];
    setAlumnos(nuevos);
    guardarDatos({ buses, conductores, alumnos: nuevos });

    setNuevoNombre('');
    setNuevaComuna('');
    setNuevaDireccion('');
    setNuevoCorreo('');

    refNombre.current?.focus();
  };

  const handleEliminarAlumno = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const nuevos = alumnos.filter((_, i) => i !== index);
    setAlumnos(nuevos);
    guardarDatos({ buses, conductores, alumnos: nuevos });
  };

  const calcularRuta = () => {
    if (buses.length === 0 || conductores.length === 0 || alumnos.length === 0) {
      alert('Agrega al menos un bus, un conductor y un alumno.');
      return;
    }
    const data: ColegioData = { buses, conductores, alumnos };
    router.push({
      pathname: '/agrupacion-ruta',
      params: { data: JSON.stringify(data) },
    });
  };

  const renderItem = (
    label: string,
    items: any[],
    eliminarFn: (index: number) => void,
    tipo?: "bus" | "conductor" | "alumno"
  ) => {
    return items.map((item, i) => {
      if (tipo === "alumno") {
        const alumno = item as Alumno;
        return (
          <View key={i} style={styles.card}>
            <View style={styles.cardContent}>
              <Text style={styles.nombre}>{alumno.nombre}</Text>
              <Text style={styles.detalle}>{`Comuna: ${alumno.comuna}`}</Text>
              <Text style={styles.detalle}>{`Dirección: ${alumno.direccion}`}</Text>
              <Text style={styles.detalle}>{`Correo apoderado: ${alumno.correoApoderado}`}</Text>
            </View>
            <TouchableOpacity style={styles.deleteButton} onPress={() => eliminarFn(i)}>
              <Text style={styles.deleteButtonText}>Eliminar</Text>
            </TouchableOpacity>
          </View>
        );
      }

      if (tipo === "conductor") {
        const conductor = item as Conductor;
        return (
          <View key={i} style={styles.card}>
            <View style={styles.cardContent}>
              <Text style={styles.nombre}>{conductor.nombre}</Text>
              <Text style={styles.detalle}>{conductor.correo}</Text>
            </View>
            <TouchableOpacity style={styles.deleteButton} onPress={() => eliminarFn(i)}>
              <Text style={styles.deleteButtonText}>Eliminar</Text>
            </TouchableOpacity>
          </View>
        );
      }

      if (tipo === "bus") {
        return (
          <View key={i} style={styles.card}>
            <Text style={styles.itemText}>{item}</Text>
            <TouchableOpacity style={styles.deleteButton} onPress={() => eliminarFn(i)}>
              <Text style={styles.deleteButtonText}>Eliminar</Text>
            </TouchableOpacity>
          </View>
        );
      }
    });
  };

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={{ ...styles.container, paddingBottom: 250 }}
      enableOnAndroid
      extraScrollHeight={200}
      enableAutomaticScroll
      keyboardOpeningTime={250}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Gestión de Rutas del Colegio</Text>

      {/* Buses */}
      <View style={styles.section}>
        <TouchableOpacity
          onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setShowBuses(!showBuses);
          }}
        >
          <Text style={styles.sectionTitle}>Buses {showBuses ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {showBuses && (
          <View style={styles.sectionContent}>
            <TextInput
              ref={refBus}
              placeholder="Nombre o patente del bus"
              value={nuevoBus}
              onChangeText={setNuevoBus}
              style={styles.input}
              returnKeyType="next"
              onSubmitEditing={() => refConductor.current?.focus()}
            />
            <Button title="Agregar Bus" onPress={handleAgregarBus} />
            {renderItem('Buses', buses, handleEliminarBus, "bus")}
          </View>
        )}
      </View>

      {/* Conductores */}
      <View style={styles.section}>
        <TouchableOpacity
          onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setShowConductores(!showConductores);
          }}
        >
          <Text style={styles.sectionTitle}>Conductores {showConductores ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {showConductores && (
          <View style={styles.sectionContent}>
            <TextInput
              ref={refConductor}
              placeholder="Nombre del conductor"
              value={nuevoConductor}
              onChangeText={setNuevoConductor}
              style={styles.input}
              returnKeyType="next"
              onSubmitEditing={() => refCorreoConductor.current?.focus()}
            />

            <TextInput
              ref={refCorreoConductor}
              placeholder="Correo del conductor"
              value={nuevoCorreoConductor}
              onChangeText={setNuevoCorreoConductor}
              style={styles.input}
              keyboardType="email-address"
              returnKeyType="done"
              onSubmitEditing={handleAgregarConductor}
            />

            <Button title="Agregar Conductor" onPress={handleAgregarConductor} />
            {renderItem('Conductores', conductores, handleEliminarConductor, "conductor")}
          </View>
        )}
      </View>

      {/* Alumnos */}
      <View style={styles.section}>
        <TouchableOpacity
          onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setShowAlumnos(!showAlumnos);
          }}
        >
          <Text style={styles.sectionTitle}>Alumnos {showAlumnos ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {showAlumnos && (
          <View style={styles.sectionContent}>
            <TextInput
              ref={refNombre}
              placeholder="Nombre"
              value={nuevoNombre}
              onChangeText={setNuevoNombre}
              style={styles.input}
              returnKeyType="next"
              onSubmitEditing={() => refComuna.current?.focus()}
            />
            <TextInput
              ref={refComuna}
              placeholder="Comuna"
              value={nuevaComuna}
              onChangeText={setNuevaComuna}
              style={styles.input}
              returnKeyType="next"
              onSubmitEditing={() => refDireccion.current?.focus()}
            />
            <TextInput
              ref={refDireccion}
              placeholder="Dirección"
              value={nuevaDireccion}
              onChangeText={setNuevaDireccion}
              style={styles.input}
              returnKeyType="next"
              onSubmitEditing={() => refCorreo.current?.focus()}
            />
            <TextInput
              ref={refCorreo}
              placeholder="Correo apoderado"
              value={nuevoCorreo}
              onChangeText={setNuevoCorreo}
              style={styles.input}
              keyboardType="email-address"
              returnKeyType="done"
              onSubmitEditing={handleAgregarAlumno}
            />
            <Button title="Agregar Alumno" onPress={handleAgregarAlumno} />
            {renderItem('Alumnos', alumnos, handleEliminarAlumno, "alumno")}
          </View>
        )}
      </View>

      <View style={{ marginTop: 20 }}>
        <Button title="Calcular Ruta" onPress={calcularRuta} color="#4CAF50" />
      </View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', backgroundColor: '#e0e0e0', padding: 8 },
  sectionContent: { marginTop: 8, paddingLeft: 8 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 8, marginBottom: 8 },
  card: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 12,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardContent: { flex: 1, marginRight: 10 },
  nombre: { fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
  detalle: { fontSize: 14, color: '#555', marginBottom: 2 },
  deleteButton: { backgroundColor: '#ff4d4d', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 5 },
  deleteButtonText: { color: '#fff', fontWeight: 'bold' },
  itemText: { fontSize: 16 },
});
