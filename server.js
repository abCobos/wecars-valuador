const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

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

    const busqueda = `${marca} ${modelo} ${version || ""} ${anio}`.trim();

    const url = `https://api.mercadolibre.com/sites/MLM/search?q=${encodeURIComponent(busqueda)}&category=MLM1744&limit=20`;

    const response = await axios.get(url, {
  headers: {
    "User-Agent": "Mozilla/5.0",
    "Accept": "application/json"
  }
});
    const resultados = response.data.results || [];

    const publicaciones = resultados
      .filter(item => item.price && item.price > 50000)
      .map(item => ({
        titulo: item.title,
        precio: item.price,
        link: item.permalink,
        thumbnail: item.thumbnail
      }));

    if (publicaciones.length === 0) {
      return res.json({
        busqueda,
        mensaje: "No se encontraron publicaciones suficientes",
        publicaciones: []
      });
    }

    const precios = publicaciones.map(p => p.precio).sort((a, b) => a - b);
    const minimo = precios[0];
    const maximo = precios[precios.length - 1];

    const preciosAjustados = precios.length > 4 ? precios.slice(1, -1) : precios;
    const promedio = preciosAjustados.reduce((a, b) => a + b, 0) / preciosAjustados.length;

    res.json({
      busqueda,
      precio_estimado: Math.round(promedio),
      precio_minimo: minimo,
      precio_maximo: maximo,
      publicaciones_usadas: publicaciones.length,
      publicaciones
    });

  } catch (error) {
    res.status(500).json({
      error: "Error al consultar Mercado Libre",
      detalle: error.message
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});