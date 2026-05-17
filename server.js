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

app.get("/valuar", async (req, res) => {
  try {
    const { marca, modelo, anio, version } = req.query;

    if (!marca || !modelo || !anio) {
      return res.status(400).json({
        error: "Faltan datos: marca, modelo y anio son obligatorios"
      });
    }

    let url = `${SUPABASE_URL}/rest/v1/autos?select=*&marca=ilike.${encodeURIComponent(marca)}&modelo=ilike.${encodeURIComponent(modelo)}&anio=eq.${encodeURIComponent(anio)}`;

    if (version && version.trim() !== "") {
      url += `&version=ilike.*${encodeURIComponent(version)}*`;
    }

    url += `&precio_venta=gte.50000&precio_venta=lte.1500000&precio_compra=gte.30000&precio_compra=lte.1400000`;

    const response = await axios.get(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`
      }
    });

    let autos = response.data || [];

    if (!autos.length && version) {
      const fallbackUrl = `${SUPABASE_URL}/rest/v1/autos?select=*&marca=ilike.${encodeURIComponent(marca)}&modelo=ilike.${encodeURIComponent(modelo)}&anio=eq.${encodeURIComponent(anio)}&precio_venta=gte.50000&precio_venta=lte.1500000&precio_compra=gte.30000&precio_compra=lte.1400000`;

      const fallbackResponse = await axios.get(fallbackUrl, {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`
        }
      });

      autos = fallbackResponse.data || [];
    }

    if (!autos.length) {
      return res.json({
        encontrado: false,
        mensaje: "No se encontraron vehículos con esos filtros"
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

    function mediana(arr) {
      const mitad = Math.floor(arr.length / 2);
      if (arr.length % 2 === 0) {
        return Math.round((arr[mitad - 1] + arr[mitad]) / 2);
      }
      return Math.round(arr[mitad]);
    }

    function promedioSinExtremos(arr) {
      if (arr.length > 4) {
        arr = arr.slice(1, -1);
      }
      return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
    }

    const precioVentaMediana = mediana(preciosVenta);
    const precioCompraMediana = mediana(preciosCompra);

    res.json({
      encontrado: true,
      total: autos.length,
      busqueda: {
        marca,
        modelo,
        anio,
        version: version || null
      },
      precio_mercado_estimado: precioVentaMediana,
      precio_compra_estimado: precioCompraMediana,
      precio_venta_promedio_ajustado: promedioSinExtremos(preciosVenta),
      precio_compra_promedio_ajustado: promedioSinExtremos(preciosCompra),
      rango_venta: {
        minimo: preciosVenta[0],
        maximo: preciosVenta[preciosVenta.length - 1]
      },
      rango_compra: {
        minimo: preciosCompra[0],
        maximo: preciosCompra[preciosCompra.length - 1]
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