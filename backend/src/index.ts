import "dotenv/config";
import express from "express";
import cors from "cors";
import faturasRouter from "./routes/faturas";

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: process.env.FRONTEND_URL ?? "http://localhost:5173" }));
app.use(express.json({ limit: "20mb" }));

app.use("/api/faturas", faturasRouter);
app.get("/api/cadastros", async (req, res) => {
  // Atalho para o frontend carregar os cadastros sem prefixo /faturas
  faturasRouter(req, res, () => {});
});

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`Caltech Faturas API rodando na porta ${PORT}`);
});
