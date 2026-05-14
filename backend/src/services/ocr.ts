import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import { DadosFatura } from "../types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PROMPT_EXTRACAO = `Você é um especialista em leitura de faturas paraguaias e brasileiras.
Analise a imagem desta fatura e extraia os dados no formato JSON abaixo.
Se um campo não estiver visível ou legível, retorne null para ele.
Avalie também a qualidade da imagem.

Retorne APENAS o JSON, sem explicações:

{
  "fecha_movimiento": "DD/MM/YYYY ou null",
  "fecha_documento": "DD/MM/YYYY ou null",
  "numero_documento": "número da fatura ou null",
  "timbrado": "número do timbrado ou null",
  "cdc": "código de controle CDC se houver ou null",
  "entidad_ruc": "RUC/CNPJ do fornecedor ou null",
  "entidad_nombre": "razão social do fornecedor ou null",
  "moneda": "GUARANIES ou DOLAR ou null",
  "total": número total em valor numérico ou null,
  "tasa_cambio": número da taxa de câmbio se houver ou null,
  "observacion": "breve descrição do que é a fatura ou null",
  "qualidade_imagem": "boa ou media ou baixa"
}`;

export async function extrairDadosFatura(imagemPath: string): Promise<DadosFatura> {
  const imagemBuffer = fs.readFileSync(imagemPath);
  const base64 = imagemBuffer.toString("base64");
  const mediaType = imagemPath.endsWith(".png") ? "image/png" : "image/jpeg";

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64 },
          },
          {
            type: "text",
            text: PROMPT_EXTRACAO,
          },
        ],
      },
    ],
  });

  const texto = response.content[0].type === "text" ? response.content[0].text : "";

  try {
    const jsonLimpo = texto.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(jsonLimpo) as DadosFatura;
  } catch {
    throw new Error(`Claude retornou resposta inválida: ${texto}`);
  }
}

export async function extrairDadosMultiplasPaginas(imagensPaths: string[]): Promise<DadosFatura> {
  // Para faturas com múltiplas páginas, usa só a primeira (capa da fatura)
  return extrairDadosFatura(imagensPaths[0]);
}
