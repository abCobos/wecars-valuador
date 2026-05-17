const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();

app.use(cors());

const SUPABASE_URL = "https://iyctkpzjrswlbjqmddoc.supabase.co";
const SUPABASE_KEY = "sb_publishable_UfGrL_jp_J73MXH7Olu-JQ_AGyRbKNB";

app.get("/", (req, res) => {
  res.send("API WeCars funcionando");
});

app.get("/valuar", async (req, res) => {
  try {

    const { marca, modelo, anio } = req.query;

    let url = `${SUPABASE_URL}/rest/v1/autos?marca=ilike.${marca}&modelo=ilike.${modelo}&anio=eq.${anio}`;

if (version) {
  url += `&version=ilike.*${version}*`;
}

url += `&precio_venta=lt.1500000&precio_compra=lt.1400000`;

    const response = await axios.get(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`
      }
    });

    const autos = response.data;

    if (!autos.length) {
      return res.json({
        encontrado: false,
        mensaje: "No se encontraron vehículos"
      });
    }

    const promedioCompra =
      autos.reduce((a, b) => a + Number(b.precio_compra), 0) / autos.length;

    const promedioVenta =
      autos.reduce((a, b) => a + Number(b.precio_venta), 0) / autos.length;

    res.json({
      encontrado: true,
      total: autos.length,
      precio_compra_promedio: Math.round(promedioCompra),
      precio_venta_promedio: Math.round(promedioVenta),
      resultados: autos.slice(0, 10)
    });

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Servidor funcionando");
});