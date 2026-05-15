import { createClient } from "@supabase/supabase-js";
import ws from "ws";

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { realtime: { transport: ws } }
);

export async function salvarPdfStorage(buffer: Buffer, nomeArquivo: string): Promise<string> {
  const caminho = `faturas/${Date.now()}_${nomeArquivo}`;
  const { error } = await supabase.storage.from("documentos").upload(caminho, buffer, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (error) throw new Error(`Erro ao salvar PDF: ${error.message}`);
  const { data } = supabase.storage.from("documentos").getPublicUrl(caminho);
  return data.publicUrl;
}

export async function registrarLancamento(dados: {
  pdf_url: string;
  dados_extraidos: object;
  versat_id: number | null;
  status: "rascunho" | "confirmado" | "erro";
  operador?: string;
}): Promise<void> {
  const { error } = await supabase.from("lancamentos").insert({
    pdf_url: dados.pdf_url,
    dados_extraidos: dados.dados_extraidos,
    versat_id: dados.versat_id,
    status: dados.status,
    operador: dados.operador ?? null,
    criado_em: new Date().toISOString(),
  });
  if (error) throw new Error(`Erro ao registrar lançamento: ${error.message}`);
}

export async function listarLancamentos(limite = 50) {
  const { data, error } = await supabase
    .from("lancamentos")
    .select("*")
    .order("criado_em", { ascending: false })
    .limit(limite);
  if (error) throw new Error(`Erro ao listar lançamentos: ${error.message}`);
  return data;
}
