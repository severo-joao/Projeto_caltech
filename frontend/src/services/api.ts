import axios from "axios";
import { CamposVersat, DadosFatura, LancamentoPayload } from "../types";

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:3001/api" });

export async function carregarCadastros(): Promise<CamposVersat> {
  const { data } = await api.get("/faturas/cadastros");
  return data;
}

export async function uploadFatura(arquivo: File): Promise<{
  dados_extraidos: DadosFatura;
  matches: { entidade: any; timbrado: any };
  pdf_url: string;
  cadastros: CamposVersat;
}> {
  const form = new FormData();
  form.append("arquivo", arquivo);
  const { data } = await api.post("/faturas/upload", form);
  return data;
}

export async function lancarFatura(payload: LancamentoPayload & { pdf_url: string }): Promise<{ versat_id: number }> {
  const { data } = await api.post("/faturas/lancar", payload);
  return data;
}

export async function listarHistorico() {
  const { data } = await api.get("/faturas/historico");
  return data;
}
