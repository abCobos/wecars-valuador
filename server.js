const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

const SUPABASE_URL = "https://iyctkpzjrswlbjqmddoc.supabase.co";
const SUPABASE_KEY = "sb_publishable_UfGrL_jp_J73MXH7Olu-JQ_AGyRbKNB";

app.get("/", (req, res) => {
  res.send("API WeCars Valuador funcionando");
});

function normalizarTexto(texto = "") {
  return texto
    .toString()
    .trim()
    .toUpperCase()
    .replace(/-/g, "")
    .replace(/\s/g, "");
}

app.get("/valuar", async (req, res) => {
  try {
    const { marca, modelo, anio, version } = req.query;

    if (!marca || !modelo || !anio) {
      return res.status(400).json({
        error: "Faltan datos: marca, modelo y anio son obligatorios"
      });
    }

    const url = `${SUPABASE_URL}/rest/v1/autos?select=*&marca=ilike.${encodeURIComponent(marca)}&anio=eq.${encodeURIComponent(anio)}&precio_venta=gte.50000&precio_venta=lte.1500000`;

    const response = await axios.get(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`
      }
    });

    let autos = response.data || [];

    const modeloBuscado = normalizarTexto(modelo);
    const versionBuscada = normalizarTexto(version || "");

    autos = autos.filter(auto => {
      const modeloBase = normalizarTexto(auto.modelo);
      const versionBase = normalizarTexto(auto.version);

      const coincideModelo =
        modeloBase.includes(modeloBuscado) ||
        modeloBuscado.includes(modeloBase);

      const coincideVersion = versionBuscada
        ? versionBase.includes(versionBuscada) || versionBuscada.includes(versionBase)
        : true;

      return coincideModelo && coincideVersion;
    });

    if (!autos.length) {
      return res.json({
        encontrado: false,
        mensaje: "No se encontraron vehículos con esos filtros",
        sugerencia: "Prueba dejando versión vacía o escribe el modelo de otra forma, por ejemplo F150, F-150 o F 150."
      });
    }

    const preciosVenta = autos.map(a => Number(a.precio_venta)).sort((a, b) => a - b);
    const preciosCompra = autos.map(a => Number(a.precio_compra)).sort((a, b) => a - b);

    function mediana(arr) {
      const mitad = Math.floor(arr.length / 2);
      return arr.length % 2 === 0
        ? Math.round((arr[mitad - 1] + arr[mitad]) / 2)
        : Math.round(arr[mitad]);
    }

    res.json({
      encontrado: true,
      total: autos.length,
      precio_mercado_estimado: mediana(preciosVenta),
      precio_compra_estimado: mediana(preciosCompra),
      rango_venta: {
        minimo: preciosVenta[0],
        maximo: preciosVenta[preciosVenta.length - 1]
      },
      resultados: autos.slice(0, 15)
    });

  } catch (error) {
    res.status(500).json({
      error: "Error al consultar Supabase",
      detalle: error.message
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor funcionando en puerto ${PORT}`);
});