const express = require("express");
const cors = require("cors");
const axios = require("axios");
const OpenAI = require("openai");

const app = express();

app.use(cors());
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const SUPABASE_URL = "https://iyctkpzjrswlbjqmddoc.supabase.co";
const SUPABASE_KEY = "TU_SUPABASE_KEY";

app.get("/", (req, res) => {
  res.send("API WeCars IA funcionando");
});

app.get("/valuar", async (req, res) => {

  try {

    const {
      marca,
      modelo,
      anio,
      version,
      kilometraje,
      cp
    } = req.query;

    const url =
      `${SUPABASE_URL}/rest/v1/autos` +
      `?marca=ilike.*${marca}*` +
      `&modelo=ilike.*${modelo}*` +
      `&anio=eq.${anio}`;

    const response = await axios.get(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`
      }
    });

    const autos = response.data || [];

    if (!autos.length) {

      return res.json({
        encontrado: false,
        mensaje: "No se encontraron registros"
      });

    }

    const promedioVenta =
      autos.reduce((acc, a) => acc + Number(a.precio_venta || 0), 0)
      / autos.length;

    const promedioCompra =
      autos.reduce((acc, a) => acc + Number(a.precio_compra || 0), 0)
      / autos.length;

    const prompt = `
Analiza este vehículo en México.

Marca: ${marca}
Modelo: ${modelo}
Versión: ${version || "No especificada"}
Año: ${anio}
Kilometraje: ${kilometraje || "No especificado"}
Código postal: ${cp || "No especificado"}

Promedio de mercado detectado:
${Math.round(promedioVenta)} MXN

Promedio de compra:
${Math.round(promedioCompra)} MXN

Genera:
- precio mercado estimado
- rango compra recomendado
- breve comentario comercial
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });

    const respuestaIA =
      completion.choices[0].message.content;

    res.json({
      encontrado: true,
      precio_venta_promedio: Math.round(promedioVenta),
      precio_compra_promedio: Math.round(promedioCompra),
      analisis_ia: respuestaIA
    });

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Servidor IA funcionando");
});