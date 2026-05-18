const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

const app = express();

app.use(cors());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

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

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      tools: [{ type: "web_search_preview" }],
      input: `
Actúa como valuador profesional de autos usados en México para WeCars.

Vehículo:
Marca: ${marca}
Modelo: ${modelo}
Versión: ${version || "No especificada"}
Año: ${anio}
Kilometraje: ${kilometraje || "No especificado"}
Código postal: ${cp || "No especificado"}

INSTRUCCIONES OBLIGATORIAS:
1. Busca precios reales actuales en internet.
2. Usa mínimo 3 referencias cuando sea posible:
   - Kavak México o referencia similar de compra/venta profesional
   - Mercado Libre Autos
   - Seminuevos / SoloAutos / agencias / Marketplace si aparece disponible
3. Separa precios por tipo:
   - precio_publicacion: precios anunciados al público
   - precio_retail_profesional: precio tipo Kavak/agencia
   - precio_compra_sugerido: precio recomendable para que WeCars compre o tome a cuenta
4. NO uses precios inflados.
5. Descarta publicaciones que no correspondan a la versión, año o modelo.
6. Si hay precios muy altos o muy bajos, descártalos como outliers.
7. Usa mediana o rango lógico, no promedio simple.
8. El precio de compra sugerido debe estar normalmente entre 15% y 25% debajo del precio real de mercado, dependiendo de rotación, kilometraje y riesgo.
9. Si no encuentras fuentes suficientes, responde encontrado:false.
10. Devuelve SOLO JSON válido, sin markdown.

Formato exacto:
{
  "encontrado": true,
  "vehiculo": "",
  "precio_mercado_real": 0,
  "rango_publicacion": {
    "minimo": 0,
    "maximo": 0
  },
  "precio_retail_profesional": {
    "minimo": 0,
    "maximo": 0
  },
  "precio_compra_sugerido": {
    "minimo": 0,
    "maximo": 0
  },
  "margen_estimado": {
    "minimo": 0,
    "maximo": 0
  },
  "fuentes_consultadas": [
    {
      "fuente": "",
      "precio_detectado": 0,
      "tipo": "",
      "url": ""
    }
  ],
  "comentario": ""
}

Búsqueda sugerida:
${marca} ${modelo} ${version || ""} ${anio} precio México usado Kavak Mercado Libre Seminuevos
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