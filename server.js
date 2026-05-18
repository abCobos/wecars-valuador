app.get("/buscar-modelos", async (req, res) => {
  try {
    const { marca, anio } = req.query;

    const url = `${SUPABASE_URL}/rest/v1/autos?select=marca,modelo,anio,version,precio_venta&marca=ilike.${encodeURIComponent(marca)}&anio=eq.${encodeURIComponent(anio)}`;

    const response = await axios.get(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`
      }
    });

    res.json({
      total: response.data.length,
      resultados: response.data.slice(0, 100)
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});