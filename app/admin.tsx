import React from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { PieChart, BarChart } from 'react-native-chart-kit';

export default function AdminDashboardFake() {
  const screenWidth = Dimensions.get('window').width - 32;

  const totalReportes = 50;
  const atrasos = 20;

  const accidentesPorMes = {
    'Ene 2025': 2,
    'Feb 2025': 1,
    'Mar 2025': 3,
    'Abr 2025': 2,
    'May 2025': 4,
    'Jun 2025': 3,
    'Jul 2025': 1,
    'Ago 2025': 2,
    'Sep 2025': 3,
    'Oct 2025': 2,
    'Nov 2025': 1,
  };

  // Ajustar ancho según la cantidad de meses (80 px por mes)
  const chartWidth = Object.keys(accidentesPorMes).length * 80;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Dashboard Colegio</Text>

      <Text style={styles.subtitle}>Retrasos de alumnos</Text>
      <PieChart
        data={[
          { name: 'Retraso', population: atrasos, color: '#FF6384', legendFontColor: '#333', legendFontSize: 14 },
          { name: 'A tiempo', population: totalReportes - atrasos, color: '#36A2EB', legendFontColor: '#333', legendFontSize: 14 },
        ]}
        width={screenWidth}
        height={220}
        chartConfig={{
          backgroundColor: '#fff',
          backgroundGradientFrom: '#fff',
          backgroundGradientTo: '#fff',
          color: (opacity = 1) => `rgba(54, 162, 235, ${opacity})`,
        }}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft="15"
        absolute
      />

      <Text style={styles.subtitle}>Accidentes por mes</Text>
      <ScrollView horizontal>
        <BarChart
          data={{
            labels: Object.keys(accidentesPorMes),
            datasets: [{ data: Object.values(accidentesPorMes) }],
          }}
          width={chartWidth} // ancho mayor que la pantalla
          height={220}
          fromZero
          yAxisLabel=""
          yAxisSuffix=""
          chartConfig={{
            backgroundColor: '#fff',
            backgroundGradientFrom: '#fff',
            backgroundGradientTo: '#fff',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(255, 99, 132, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0,0,0,${opacity})`,
          }}
          style={{ marginVertical: 8 }}
        />
      </ScrollView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  subtitle: { fontSize: 18, fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
});
