import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(
  cors({
    origin: "*", // luego puedes limitar al dominio de tu frontend
    methods: ["GET", "POST"],
  }),
);
app.use(express.json());

// Ruta de prueba
app.get("/", (_req, res) => {
  res.json({ ok: true, message: "Backend Clip funcionando" });
});

// Construir header de autenticación Basic a partir de API Key + Secret
function getClipAuthHeader() {
  const apiKey = process.env.CLIP_API_KEY;
  const apiSecret = process.env.CLIP_API_SECRET;

  if (!apiKey || !apiSecret) {
    console.error("Faltan CLIP_API_KEY o CLIP_API_SECRET en las variables de entorno");
    return null;
  }

  const raw = `${apiKey}:${apiSecret}`;
  const base64 = Buffer.from(raw, "utf8").toString("base64");
  return `Basic ${base64}`;
}

// Ruta para crear el enlace de Checkout Redireccionado
app.post("/api/clip/create-checkout", async (req, res) => {
  try {
    const { amount, placa, folio, estado, description } = req.body;

    if (!amount || !placa || !folio) {
      return res.status(400).json({
        success: false,
        error: "Datos incompletos para crear la orden (amount, placa, folio).",
      });
    }

    const clipBaseUrl = process.env.CLIP_BASE_URL;
    const authHeader = getClipAuthHeader();

    if (!clipBaseUrl || !authHeader) {
      console.error("Falta CLIP_BASE_URL o token de autenticación");
      return res.status(500).json({
        success: false,
        error: "Configuración incompleta de Clip.",
      });
    }

    // Cuerpo que envías a Clip; ajusta los campos según tu doc oficial
    const body = {
      amount: Number(amount),
      currency: "MXN",
      purchase_description:
        description || `Pago control vehicular ${placa} - folio ${folio}`,
      redirection_url: {
        success: `https://tu-dominio.com/pago-exitoso?placa=${placa}&folio=${folio}`,
        error: `https://tu-dominio.com/pago-error?placa=${placa}&folio=${folio}`,
        default: `https://tu-dominio.com/pago-default`,
      },
      // agrega aquí cualquier otro campo que la doc de Clip pida para v2/checkout
    };

    const clipRes = await fetch(`${clipBaseUrl}/v2/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
        accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    console.log("Respuesta Clip status:", clipRes.status);

    if (!clipRes.ok) {
      const text = await clipRes.text();
      console.error("Error Clip:", clipRes.status, text);
      return res.status(502).json({
        success: false,
        error: "Error al comunicarse con Clip.",
      });
    }

    const clipData = await clipRes.json();
    console.log("Respuesta Clip JSON:", clipData);

    // Ajusta estos nombres según lo que diga la doc de Clip para v2/checkout
    const checkoutUrl =
      clipData.checkout_url ||
      clipData.payment_request_url ||
      clipData.url;

    if (!checkoutUrl) {
      console.error("Clip no devolvió URL de checkout");
      return res.status(500).json({
        success: false,
        error: "Clip no devolvió una URL de checkout.",
      });
    }

    return res.json({
      success: true,
      checkout_url: checkoutUrl,
    });
  } catch (err) {
    console.error("Error create-checkout:", err);
    return res.status(500).json({
      success: false,
      error: "Error interno al crear el enlace de pago.",
    });
  }
});

// Importante para Render: escuchar en process.env.PORT y host 0.0.0.0
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});