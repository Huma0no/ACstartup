export const howToGuides = [
  {
    id: "charge-daikin",
    title: "Carga de Refrigerante Daikin Fit",
    category: "Carga",
    steps: [
      "Asegurar que la unidad esté en modo de prueba de carga (Charge Mode).",
      {
        text: "Verificar subcooling objetivo en la placa (generalmente 10°F +/- 2).",
        image: "images/daikin_charge_chart.png", // Asegúrate de que esta imagen exista o reemplázala
      },
      "Ajustar carga lentamente esperando estabilización (10-15 min).",
    ],
  },
  {
    id: "reset-ecobee",
    title: "Resetear Termostato Ecobee",
    category: "Termostatos",
    steps: [
      "Ir a Menú Principal > Settings.",
      "Seleccionar Reset.",
      "Elegir 'Reset All Settings' para fábrica o 'Reset Registration' para desconectar cuenta.",
    ],
  },
];
