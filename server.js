const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

const SUPABASE_URL = "https://iyctkpzjrswlbjqmddoc.supabase.co";
const SUPABASE_KEY = "sb_publishable_UfGrL_jp_J73MXH7Olu-JQ_AGyRbKNB";

function normalizarTexto(texto = "") {
  return texto
    .toString()
    .trim()
    .toUpperCase()
    .replace(/-/g, "")
    .replace(/\s/g, "");
}

function mediana(arr) {
  if (!arr.length) return 0;
  const mitad = Math.floor(arr.length / 2);
  return arr.length % 2 === 0
    ? Math.round((arr[mitad - 1] + arr[mitad]) / 2)
    : Math.round(arr[mitad]);
}

app.get("/", (req, res) => {
  res.send("API WeCars Valuador funcionando");
});

app.get("/buscar-modelos", async (req, res) => {
  try {
    const { marca, anio } = req.query;

    if (!marca || !anio) {
      return res.status(400).json({
        error: "Faltan datos: marca y anio son obligatorios"
      });
    }

    const url = `${SUPABASE_URL}/rest/v1/autos?select=marca,modelo,anio,version,precio_compra,precio_venta&marca=ilike.${encodeURIComponent(marca)}&anio=eq.${encodeURIComponent(anio)}`;

    const response = await axios.get(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`
      }
    });

    const autos = response.data || [];

    res.json({
      total: autos.length,
      modelos_unicos: [...new Set(autos.map(a => a.modelo))],
      resultados: autos.slice(0, 1000)
    });

  } catch (error) {
    res.status(500).json({
      error: "Error al consultar modelos",
      detalle: error.message
    });
  }
});

app.get("/valuar", async (req, res) => {
  try {
    const { marca, modelo, anio, version } = req.query;

    if (!marca || !modelo || !anio) {
      return res.status(400).json({
        error: "Faltan datos: marca, modelo y anio son obligatorios"
      });
    }

    const url = `${SUPABASE_URL}/rest/v1/autos?select=*&marca=ilike.${encodeURIComponent(marca)}&anio=eq.${encodeURIComponent(anio)}&precio_venta=gte.50000&precio_venta=lte.5000000&precio_compra=gte.30000&precio_compra=lte.4500000`;

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
        sugerencia: "Prueba otra versión o consulta /buscar-modelos?marca=FORD&anio=2024"
      });
    }

    const preciosVenta = autos
      .map(a => Number(a.precio_venta))
      .filter(n => !isNaN(n) && n > 0)
      .sort((a, b) => a - b);

    const preciosCompra = autos
      .map(a => Number(a.precio_compra))
      .filter(n => !isNaN(n) && n > 0)
      .sort((a, b) => a - b);

    res.json({
      encontrado: true,
      total: autos.length,
      busqueda: {
        marca,
        modelo,
        anio,
        version: version || null
      },
      precio_mercado_estimado: mediana(preciosVenta),
      precio_compra_estimado: mediana(preciosCompra),
      rango_venta: {
        minimo: preciosVenta[0],
        maximo: preciosVenta[preciosVenta.length - 1]
      },
      rango_compra: {
        minimo: preciosCompra[0],
        maximo: preciosCompra[preciosCompra.length - 1]
      },
      resultados: autos.slice(0, 20)
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