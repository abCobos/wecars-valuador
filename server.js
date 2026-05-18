const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

const app = express();

app.use(cors());
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.get("/", (req, res) => {
  res.send("API WeCars valuador web funcionando");
});

app.get("/valuar", async (req, res) => {
  try {
    const { marca, modelo, anio, version, kilometraje, cp } = req.query;

    if (!marca || !modelo || !anio) {
      return res.status(400).json({
        error: "Faltan datos: marca, modelo y anio son obligatorios"
      });
    }

    const busqueda = `${marca} ${modelo} ${version || ""} ${anio} usado precio México Mercado Libre Kavak Seminuevos`;

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      tools: [
        {
          type: "web_search_preview"
        }
      ],
      input: `
Busca en internet precios reales actuales en México para este auto:

Marca: ${marca}
Modelo: ${modelo}
Versión: ${version || "No especificada"}
Año: ${anio}
Kilometraje: ${kilometraje || "No especificado"}
Código postal: ${cp || "No especificado"}

Consulta referencias públicas como Mercado Libre, Kavak, Seminuevos, SoloAutos u otras páginas mexicanas.

IMPORTANTE:
- No uses Supabase.
- No inventes precios.
- Descarta precios absurdos o publicaciones que no correspondan.
- Si no hay datos suficientes, dilo claramente.
- Devuelve SOLO JSON válido, sin markdown.

Formato exacto:
{
  "encontrado": true,
  "vehiculo": "",
  "precio_mercado_estimado": 0,
  "rango_mercado": {
    "minimo": 0,
    "maximo": 0
  },
  "precio_compra_sugerido": {
    "minimo": 0,
    "maximo": 0
  },
  "fuentes_consultadas": [],
  "comentario": ""
}

Búsqueda sugerida: ${busqueda}
`
    });

    let texto = response.output_text || "";

    texto = texto
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    let data;

    try {
      data = JSON.parse(texto);
    } catch (e) {
      data = {
        encontrado: false,
        error: "La IA no devolvió JSON válido",
        respuesta: texto
      };
    }

    res.json(data);

  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Servidor WeCars valuador web funcionando");
});