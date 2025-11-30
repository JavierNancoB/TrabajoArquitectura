import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Button,
  Dimensions,
  LayoutAnimation,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View
} from 'react-native';
import { BarChart, PieChart } from 'react-native-chart-kit';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

// ---------------------------
// Interfaces Actualizadas
// ---------------------------
interface Alumno { nombre: string; comuna: string; direccion: string; correoApoderado: string; }
// NUEVO: Agregamos comunaAsignada al conductor
interface Conductor { nombre: string; correo: string; comunaAsignada?: string; } 
interface ColegioSede { nombre: string; comuna: string; direccion: string; }

interface ColegioData {
  buses: string[];
  conductores: Conductor[];
  alumnos: Alumno[];
  colegios: ColegioSede[];
}

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function ColegioScreen() {
  const router = useRouter();
  const screenWidth = Dimensions.get('window').width - 32;

  // ---------------------------
  // ESTADOS: DATOS
  // ---------------------------
  const [buses, setBuses] = useState<string[]>([]);
  const [conductores, setConductores] = useState<Conductor[]>([]);
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [colegios, setColegios] = useState<ColegioSede[]>([]);

  // ---------------------------
  // ESTADOS: INPUTS
  // ---------------------------
  // Bus
  const [nuevoBus, setNuevoBus] = useState('');
  
  // Conductor (CON NUEVO CAMPO COMUNA)
  const [nuevoConductor, setNuevoConductor] = useState('');
  const [nuevoCorreoConductor, setNuevoCorreoConductor] = useState('');
  const [nuevoComunaConductor, setNuevoComunaConductor] = useState(''); 

  // Alumno
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevaComuna, setNuevaComuna] = useState('');
  const [nuevaDireccion, setNuevaDireccion] = useState('');
  const [nuevoCorreo, setNuevoCorreo] = useState('');
  
  // Colegio
  const [colNombre, setColNombre] = useState('');
  const [colComuna, setColComuna] = useState('');
  const [colDireccion, setColDireccion] = useState('');

  // ---------------------------
  // ESTADOS: EDICIÓN (Indices)
  // ---------------------------
  const [editIndexBus, setEditIndexBus] = useState(-1);
  const [editIndexConductor, setEditIndexConductor] = useState(-1);
  const [editIndexAlumno, setEditIndexAlumno] = useState(-1);
  const [editIndexColegio, setEditIndexColegio] = useState(-1);

  // ---------------------------
  // ESTADOS: VISIBILIDAD ACORDEONES
  // ---------------------------
  const [showBuses, setShowBuses] = useState(false);
  const [showConductores, setShowConductores] = useState(false);
  const [showAlumnos, setShowAlumnos] = useState(false);
  const [showColegios, setShowColegios] = useState(true);

  // ---------------------------
  // ESTADOS: DASHBOARD REAL
  // ---------------------------
  const [totalEventos, setTotalEventos] = useState(0);
  const [dataPastel, setDataPastel] = useState<any[]>([]);
  const [dataBarras, setDataBarras] = useState<any>(null);
  const [ultimosReportes, setUltimosReportes] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Referencias Inputs (Focus)
  const refBus = useRef<TextInput>(null);
  const refConductor = useRef<TextInput>(null);
  const refNombre = useRef<TextInput>(null);
  const refColegio = useRef<TextInput>(null);

  // ---------------------------
  // CARGA DE DATOS
  // ---------------------------
  const cargarDatosGestion = async () => {
    try {
      const json = await AsyncStorage.getItem('colegioData');
      if (json) {
        const data: ColegioData = JSON.parse(json);
        setBuses(data.buses || []);
        setConductores(data.conductores || []);
        setAlumnos(data.alumnos || []);
        setColegios(data.colegios || []);
      }
    } catch (error) { console.log(error); }
  };

  const cargarDatosDashboard = async () => {
    try {
      const jsonReportes = await AsyncStorage.getItem('reportes');
      const reportes = jsonReportes ? JSON.parse(jsonReportes) : [];
      
      setTotalEventos(reportes.length);
      setUltimosReportes(reportes.slice(-3).reverse());

      // Gráfico Torta
      const cantidadRetrasos = reportes.filter((r: any) => r.evento === 'Retraso').length;
      const cantidadOtros = reportes.length - cantidadRetrasos;
      const hayDatos = reportes.length > 0;

      setDataPastel([
        { name: 'Retrasos', population: hayDatos ? cantidadRetrasos : 0, color: '#FF6384', legendFontColor: '#333', legendFontSize: 13 },
        { name: 'Normal', population: hayDatos ? cantidadOtros : 1, color: '#36A2EB', legendFontColor: '#333', legendFontSize: 13 },
      ]);

      // Gráfico Barras
      const conteo = { Retraso: 0, Ausencia: 0, Accidente: 0 };
      reportes.forEach((r: any) => {
        if (conteo[r.evento as keyof typeof conteo] !== undefined) conteo[r.evento as keyof typeof conteo]++;
      });

      setDataBarras({
        labels: ['Retraso', 'Ausencia', 'Accidente'],
        datasets: [{ data: [conteo.Retraso, conteo.Ausencia, conteo.Accidente] }],
      });

    } catch (error) { console.log(error); }
  };

  useEffect(() => { cargarDatosGestion(); }, []);
  useFocusEffect(useCallback(() => { cargarDatosDashboard(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([cargarDatosGestion(), cargarDatosDashboard()]);
    setRefreshing(false);
  };

  const guardarDatos = async (data: ColegioData) => {
    await AsyncStorage.setItem('colegioData', JSON.stringify(data));
  };

  // ---------------------------
  // LÓGICA DE ACTUALIZACIÓN (CRUD)
  // ---------------------------

  // --- COLEGIOS ---
  const handleGuardarColegio = () => {
    if (!colNombre || !colComuna || !colDireccion) { alert('Completa todos los campos del colegio.'); return; }
    const nuevoObj = { nombre: colNombre, comuna: colComuna, direccion: colDireccion };
    let nuevos = [...colegios];
    if (editIndexColegio >= 0) { nuevos[editIndexColegio] = nuevoObj; setEditIndexColegio(-1); } 
    else { nuevos.push(nuevoObj); }
    setColegios(nuevos); guardarDatos({ buses, conductores, alumnos, colegios: nuevos });
    setColNombre(''); setColComuna(''); setColDireccion('');
  };
  const editarColegio = (i: number) => {
    const c = colegios[i]; setColNombre(c.nombre); setColComuna(c.comuna); setColDireccion(c.direccion); setEditIndexColegio(i); refColegio.current?.focus();
  };
  const eliminarColegio = (i: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const n = colegios.filter((_, x) => x !== i); setColegios(n); guardarDatos({ buses, conductores, alumnos, colegios: n });
  };

  // --- BUSES ---
  const handleGuardarBus = () => {
    if (!nuevoBus.trim()) return;
    let nuevos = [...buses];
    if (editIndexBus >= 0) { nuevos[editIndexBus] = nuevoBus.trim(); setEditIndexBus(-1); }
    else { nuevos.push(nuevoBus.trim()); }
    setBuses(nuevos); guardarDatos({ buses: nuevos, conductores, alumnos, colegios }); setNuevoBus('');
  };
  const editarBus = (i: number) => { setNuevoBus(buses[i]); setEditIndexBus(i); refBus.current?.focus(); };
  const eliminarBus = (i: number) => {
    const n = buses.filter((_, x) => x !== i); setBuses(n); guardarDatos({ buses: n, conductores, alumnos, colegios });
  };

  // --- CONDUCTORES (MODIFICADO PARA INCLUIR COMUNA) ---
  const handleGuardarConductor = () => {
    if (!nuevoConductor || !nuevoCorreoConductor) {
        alert("El nombre y el correo son obligatorios");
        return;
    }
    const obj = { 
        nombre: nuevoConductor, 
        correo: nuevoCorreoConductor,
        comunaAsignada: nuevoComunaConductor // Guardar Comuna
    };
    let nuevos = [...conductores];
    if (editIndexConductor >= 0) { nuevos[editIndexConductor] = obj; setEditIndexConductor(-1); }
    else { nuevos.push(obj); }
    setConductores(nuevos); guardarDatos({ buses, conductores: nuevos, alumnos, colegios }); 
    setNuevoConductor(''); setNuevoCorreoConductor(''); setNuevoComunaConductor('');
  };
  
  const editarConductor = (i: number) => {
    const c = conductores[i]; 
    setNuevoConductor(c.nombre); 
    setNuevoCorreoConductor(c.correo); 
    setNuevoComunaConductor(c.comunaAsignada || ''); // Cargar comuna al editar
    setEditIndexConductor(i); 
    refConductor.current?.focus();
  };
  
  const eliminarConductor = (i: number) => {
    const n = conductores.filter((_, x) => x !== i); setConductores(n); guardarDatos({ buses, conductores: n, alumnos, colegios });
  };

  // --- ALUMNOS ---
  const handleGuardarAlumno = () => {
    if (!nuevoNombre || !nuevaComuna || !nuevaDireccion || !nuevoCorreo) return;
    const obj = { nombre: nuevoNombre, comuna: nuevaComuna, direccion: nuevaDireccion, correoApoderado: nuevoCorreo };
    let nuevos = [...alumnos];
    if (editIndexAlumno >= 0) { nuevos[editIndexAlumno] = obj; setEditIndexAlumno(-1); }
    else { nuevos.push(obj); }
    setAlumnos(nuevos); guardarDatos({ buses, conductores, alumnos: nuevos, colegios }); 
    setNuevoNombre(''); setNuevaComuna(''); setNuevaDireccion(''); setNuevoCorreo('');
  };
  const editarAlumno = (i: number) => {
    const a = alumnos[i]; setNuevoNombre(a.nombre); setNuevaComuna(a.comuna); setNuevaDireccion(a.direccion); setNuevoCorreo(a.correoApoderado); setEditIndexAlumno(i); refNombre.current?.focus();
  };
  const eliminarAlumno = (i: number) => {
    const n = alumnos.filter((_, x) => x !== i); setAlumnos(n); guardarDatos({ buses, conductores, alumnos: n, colegios });
  };

  const calcularRuta = () => {
    if (colegios.length === 0) { alert('Registra al menos un colegio/sede como destino.'); return; }
    const data: ColegioData = { buses, conductores, alumnos, colegios };
    router.push({ pathname: '/agrupacion-ruta', params: { data: JSON.stringify(data) } });
  };

  // Render Genérico de Items
  const renderItem = (items: any[], eliminarFn: any, editarFn: any, tipo: string) => (
    items.map((item, i) => (
      <View key={i} style={styles.cardItem}>
        <View style={{ flex: 1 }}>
          <Text style={styles.itemTitle}>{item.nombre || item}</Text>
          {/* Detalles específicos según tipo */}
          {item.direccion && <Text style={styles.itemSubtitle}>{item.comuna} - {item.direccion}</Text>}
          {item.correo && <Text style={styles.itemSubtitle}>{item.correo}</Text>}
          {tipo === 'conductor' && (
            <Text style={[styles.itemSubtitle, { color: '#4CAF50', fontWeight: 'bold' }]}>
                Ruta Asignada: {item.comunaAsignada || "General"}
            </Text>
          )}
        </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity onPress={() => editarFn(i)} style={styles.editBtn}><Text style={styles.editText}>Editar</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => eliminarFn(i)} style={styles.deleteBtn}><Text style={styles.deleteText}>Eliminar</Text></TouchableOpacity>
        </View>
      </View>
    ))
  );

  return (
    <KeyboardAwareScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh}/>}>
      <Text style={styles.headerTitle}>Panel de Control Colegio</Text>
      
      {/* ======================= */}
      {/* DASHBOARD COMPLETO (RESTAURADO) */}
      {/* ======================= */}
      <View style={styles.dashboardContainer}>
        <Text style={styles.sectionHeader}>Resumen en Tiempo Real</Text>

        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}><Text style={styles.kpiNumber}>{totalEventos}</Text><Text style={styles.kpiLabel}>Reportes Totales</Text></View>
          <View style={styles.kpiCard}><Text style={styles.kpiNumber}>{alumnos.length}</Text><Text style={styles.kpiLabel}>Alumnos Inscritos</Text></View>
        </View>

        {dataPastel.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Estado de Viajes</Text>
            <PieChart
              data={dataPastel}
              width={screenWidth - 40}
              height={200}
              chartConfig={{ color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})` }}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          </View>
        )}

        {dataBarras && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Tipos de Incidentes</Text>
            <BarChart
              data={dataBarras}
              width={screenWidth - 40}
              height={220}
              fromZero
              yAxisLabel=""
              yAxisSuffix=""
              chartConfig={{
                backgroundGradientFrom: '#fff',
                backgroundGradientTo: '#fff',
                color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0,0,0,${opacity})`,
              }}
            />
          </View>
        )}
        
        {/* ÚLTIMOS REPORTES */}
        <Text style={styles.subHeader}>Última Actividad</Text>
        {ultimosReportes.length === 0 ? (
          <Text style={styles.emptyText}>No hay reportes recientes.</Text>
        ) : (
          ultimosReportes.map((r, i) => (
            <View key={i} style={styles.miniReporte}>
              <Text style={{ fontWeight: 'bold' }}>{r.evento} - {r.tiempo}</Text>
              <Text style={{ color: '#555', fontSize: 12 }}>{r.detalle} ({r.ruta})</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.divider} />

      {/* ======================= */}
      {/* GESTIÓN DE RECURSOS     */}
      {/* ======================= */}
      <Text style={styles.sectionHeader}>Gestión de Recursos</Text>

      {/* 1. COLEGIOS / SEDES */}
      <TouchableOpacity style={styles.accordionHeader} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setShowColegios(!showColegios); }}>
        <Text style={styles.accordionTitle}>🏫 Sedes / Colegios ({colegios.length})</Text>
        <Text>{showColegios ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {showColegios && (
        <View style={[styles.accordionContent, editIndexColegio >= 0 && styles.editingBackground]}>
          <Text style={{fontSize: 12, color: '#666', marginBottom: 8}}>La primera sede será el destino final predeterminado.</Text>
          <TextInput ref={refColegio} placeholder="Nombre Colegio" value={colNombre} onChangeText={setColNombre} style={styles.input} />
          <TextInput placeholder="Comuna" value={colComuna} onChangeText={setColComuna} style={styles.input} />
          <TextInput placeholder="Dirección" value={colDireccion} onChangeText={setColDireccion} style={styles.input} />
          <View style={styles.rowBotonesInput}>
            <Button title={editIndexColegio >= 0 ? "Actualizar Sede" : "Agregar Sede"} onPress={handleGuardarColegio} color={editIndexColegio >= 0 ? "#FFA500" : "#673AB7"} />
            {editIndexColegio >= 0 && <Button title="Cancelar" onPress={() => { setColNombre(''); setColComuna(''); setColDireccion(''); setEditIndexColegio(-1); }} color="#757575" />}
          </View>
          {renderItem(colegios, eliminarColegio, editarColegio, "colegio")}
        </View>
      )}

      {/* 2. BUSES */}
      <TouchableOpacity style={styles.accordionHeader} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setShowBuses(!showBuses); }}>
        <Text style={styles.accordionTitle}>🚌 Buses ({buses.length})</Text>
        <Text>{showBuses ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {showBuses && (
        <View style={[styles.accordionContent, editIndexBus >= 0 && styles.editingBackground]}>
          <TextInput ref={refBus} placeholder="Patente o Nombre" value={nuevoBus} onChangeText={setNuevoBus} style={styles.input} />
          <View style={styles.rowBotonesInput}>
            <Button title={editIndexBus >= 0 ? "Actualizar Bus" : "Agregar Bus"} onPress={handleGuardarBus} color={editIndexBus >= 0 ? "#FFA500" : "#2196F3"} />
            {editIndexBus >= 0 && <Button title="Cancelar" onPress={() => {setNuevoBus(''); setEditIndexBus(-1)}} color="#757575" />}
          </View>
          {renderItem(buses, eliminarBus, editarBus, "bus")}
        </View>
      )}

      {/* 3. CONDUCTORES (MODIFICADO) */}
      <TouchableOpacity style={styles.accordionHeader} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setShowConductores(!showConductores); }}>
        <Text style={styles.accordionTitle}>👨‍✈️ Conductores ({conductores.length})</Text>
        <Text>{showConductores ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {showConductores && (
        <View style={[styles.accordionContent, editIndexConductor >= 0 && styles.editingBackground]}>
          <TextInput ref={refConductor} placeholder="Nombre" value={nuevoConductor} onChangeText={setNuevoConductor} style={styles.input} />
          <TextInput placeholder="Correo Login" value={nuevoCorreoConductor} onChangeText={setNuevoCorreoConductor} style={styles.input} keyboardType="email-address" />
          
          {/* CAMPO DE COMUNA */}
          <TextInput 
            placeholder="Comuna Asignada (Ej: Las Condes)" 
            value={nuevoComunaConductor} 
            onChangeText={setNuevoComunaConductor} 
            style={[styles.input, { borderColor: '#4CAF50', borderWidth: 2 }]} 
          />
          
          <View style={styles.rowBotonesInput}>
            <Button title={editIndexConductor >= 0 ? "Actualizar" : "Agregar"} onPress={handleGuardarConductor} color={editIndexConductor >= 0 ? "#FFA500" : "#2196F3"} />
            {editIndexConductor >= 0 && <Button title="Cancelar" onPress={() => {setNuevoConductor(''); setNuevoCorreoConductor(''); setNuevoComunaConductor(''); setEditIndexConductor(-1)}} color="#757575" />}
          </View>
          {renderItem(conductores, eliminarConductor, editarConductor, "conductor")}
        </View>
      )}

      {/* 4. ALUMNOS */}
      <TouchableOpacity style={styles.accordionHeader} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setShowAlumnos(!showAlumnos); }}>
        <Text style={styles.accordionTitle}>🎓 Alumnos ({alumnos.length})</Text>
        <Text>{showAlumnos ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {showAlumnos && (
        <View style={[styles.accordionContent, editIndexAlumno >= 0 && styles.editingBackground]}>
          <TextInput ref={refNombre} placeholder="Nombre" value={nuevoNombre} onChangeText={setNuevoNombre} style={styles.input} />
          <TextInput placeholder="Comuna" value={nuevaComuna} onChangeText={setNuevaComuna} style={styles.input} />
          <TextInput placeholder="Dirección" value={nuevaDireccion} onChangeText={setNuevaDireccion} style={styles.input} />
          <TextInput placeholder="Correo" value={nuevoCorreo} onChangeText={setNuevoCorreo} style={styles.input} keyboardType="email-address" />
          <View style={styles.rowBotonesInput}>
            <Button title={editIndexAlumno >= 0 ? "Actualizar" : "Agregar"} onPress={handleGuardarAlumno} color={editIndexAlumno >= 0 ? "#FFA500" : "#2196F3"} />
            {editIndexAlumno >= 0 && <Button title="Cancelar" onPress={() => {setNuevoNombre(''); setNuevaComuna(''); setNuevaDireccion(''); setNuevoCorreo(''); setEditIndexAlumno(-1)}} color="#757575" />}
          </View>
          {renderItem(alumnos, eliminarAlumno, editarAlumno, "alumno")}
        </View>
      )}

      <View style={{ marginTop: 30, marginBottom: 50 }}>
        <Button title="Calcular y Ver Rutas" onPress={calcularRuta} color="#4CAF50" />
      </View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#f8f9fa' },
  headerTitle: { fontSize: 26, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: '#333' },
  sectionHeader: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, color: '#444' },
  subHeader: { fontSize: 16, fontWeight: 'bold', marginTop: 15, marginBottom: 8, color: '#666' },
  
  // Dashboard Styles
  dashboardContainer: { marginBottom: 10 },
  kpiRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  kpiCard: { flex: 1, backgroundColor: '#fff', padding: 15, borderRadius: 12, alignItems: 'center', marginHorizontal: 5, elevation: 3 },
  kpiNumber: { fontSize: 28, fontWeight: 'bold', color: '#4f46e5' },
  kpiLabel: { fontSize: 12, color: '#666' },
  chartCard: { backgroundColor: '#fff', borderRadius: 12, padding: 10, marginBottom: 15, alignItems: 'center', elevation: 2 },
  chartTitle: { fontWeight: 'bold', marginBottom: 5, fontSize: 16 },
  miniReporte: { backgroundColor: '#fff', padding: 10, borderRadius: 8, marginBottom: 6, borderLeftWidth: 4, borderLeftColor: '#FF6384' },
  emptyText: { fontStyle: 'italic', color: '#888', textAlign: 'center' },
  
  divider: { height: 2, backgroundColor: '#e5e7eb', marginVertical: 20 },

  // Management Styles
  accordionHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, backgroundColor: '#fff', borderRadius: 8, marginBottom: 8, elevation: 1 },
  accordionTitle: { fontSize: 16, fontWeight: 'bold' },
  accordionContent: { backgroundColor: '#f0f0f0', padding: 10, borderRadius: 8, marginBottom: 15 },
  editingBackground: { backgroundColor: '#e3f2fd', borderColor: '#2196F3', borderWidth: 1 },
  input: { backgroundColor: '#fff', padding: 10, borderRadius: 6, marginBottom: 8, borderWidth: 1, borderColor: '#ddd' },
  rowBotonesInput: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, gap: 10 },
  
  // List Item Styles
  cardItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 10, borderRadius: 6, marginTop: 6, borderBottomWidth: 1, borderBottomColor: '#eee' },
  itemTitle: { fontWeight: 'bold', fontSize: 14 },
  itemSubtitle: { fontSize: 12, color: '#666' },
  actionButtons: { flexDirection: 'row', alignItems: 'center' },
  editBtn: { marginRight: 15, padding: 5 },
  deleteBtn: { padding: 5 },
  editText: { color: '#FFA500', fontWeight: 'bold', fontSize: 13 },
  deleteText: { color: 'red', fontWeight: 'bold', fontSize: 13 },
});