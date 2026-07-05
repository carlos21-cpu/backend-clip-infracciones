import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware CORS y JSON
app.use(
    cors({
        origin: "*", // luego lo puedes limitar al dominio de tu frontend
        methods: ["GET", "POST"],
    }),
);
app.use(express.json());

// Ruta de prueba
app.get("/", (_req, res) => {
    res.json({ ok: true, message: "Backend Clip nuevo funcionando" });
});

// Ruta que llama a la API de Pagos de Clip (Checkout Transparente)
app.post("/pago", async(req, res) => {
    try {
        const { token, amount, placa } = req.body;

        if (!token || !amount) {
            return res
                .status(400)
                .json({ ok: false, message: "Faltan datos de pago (token o amount)." });
        }

        const response = await fetch(`${process.env.CLIP_BASE_URL}/payments`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                // Aquí va tu token de autenticación de Clip, ya con el prefijo Bearer
                // Ejemplo en .env: CLIP_API_KEY=Bearer test_6e1079...
                Authorization: process.env.CLIP_API_KEY,
            },
            body: JSON.stringify({
                token,
                amount,
                // Aquí agregas los demás campos que Clip pide:
                // description: `Pago infracciones placa ${placa}`,
                // currency: "MXN",
                // reference: "XXXXXX",
                // etc. según tu contrato y documentación.
            }),
        });

        const data = await response.json();

        // Si Clip responde con error, lo propagamos
        if (!response.ok) {
            console.error("Error desde Clip:", data);
            return res
                .status(response.status)
                .json({
                    ok: false,
                    message: data.message ?? "Error en pago Clip",
                    data,
                });
        }

        // Si todo sale bien, devolvemos la respuesta
        return res.status(200).json({ ok: true, data });
    } catch (error) {
        console.error("Error en pago Clip:", error);
        res.status(500).json({ ok: false, message: "Error procesando pago" });
    }
});

// Importante para Render: escuchar en process.env.PORT y host 0.0.0.0
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor Clip nuevo escuchando en puerto ${PORT}`);
});