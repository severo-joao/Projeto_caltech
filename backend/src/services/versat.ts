import { VersatEntidade, VersatItem, VersatTimbrado, CamposVersat, LancamentoPayload } from "../types";

const BASE = process.env.VERSAT_BASE_URL!;
const EMPRESA_ID = process.env.VERSAT_EMPRESA_ID!;

function authHeader(): string {
  const creds = Buffer.from(`${process.env.VERSAT_USER}:${process.env.VERSAT_PASSWORD}`).toString("base64");
  return `Basic ${creds}`;
}

async function versátGet<T>(recurso: string): Promise<T[]> {
  const url = `${BASE}/Data?recurso=${recurso}&empresa_id=${EMPRESA_ID}&pagina=1&registros_por_pagina=1000`;
  const res = await fetch(url, { headers: { Authorization: authHeader() } });
  if (!res.ok) throw new Error(`Versat GET ${recurso} falhou: ${res.status}`);
  const json = await res.json() as any;
  return Array.isArray(json) ? json : json.Items ?? [];
}

export async function carregarCadastros(): Promise<CamposVersat> {
  const [entidades, tipos_documento, operacoes, safras, timbrados, moedas, condicoes_pago, contas, projetos, unidades] =
    await Promise.all([
      versátGet<any>("BA31"),
      versátGet<any>("OX55"),
      versátGet<any>("OX56"),
      versátGet<any>("OA21"),
      versátGet<any>("OX12"),
      versátGet<any>("OX51"),
      versátGet<any>("OA57"),
      versátGet<any>("OX03"),
      versátGet<any>("OX08"),
      versátGet<any>("OX02"),
    ]);

  return {
    entidades: entidades.map((e: any) => ({ id: e.id, nombre: e.nombre ?? e.razon_social, ruc: e.ruc ?? "" })),
    tipos_documento: tipos_documento.map((e: any) => ({ id: e.id, nombre: e.nombre })),
    operacoes: operacoes.map((e: any) => ({ id: e.id, nombre: e.nombre })),
    safras: safras.map((e: any) => ({ id: e.id, nombre: e.nombre })),
    timbrados: timbrados.map((e: any) => ({ id: e.id, numero: e.numero ?? e.nombre, nombre: e.nombre })),
    moedas: moedas.map((e: any) => ({ id: e.id, nombre: e.nombre })),
    condicoes_pago: condicoes_pago.map((e: any) => ({ id: e.id, nombre: e.nombre })),
    contas: contas.map((e: any) => ({ id: e.id, nombre: e.nombre })),
    projetos: projetos.map((e: any) => ({ id: e.id, nombre: e.nombre })),
    unidades: unidades.map((e: any) => ({ id: e.id, nombre: e.nombre })),
  };
}

export function matchEntidadePorRuc(ruc: string, entidades: VersatEntidade[]): VersatEntidade | null {
  const rucLimpo = ruc.replace(/[^0-9]/g, "");
  return entidades.find((e) => e.ruc.replace(/[^0-9]/g, "") === rucLimpo) ?? null;
}

export function matchTimbradoPorPrefixo(numero: string, timbrados: VersatTimbrado[]): VersatTimbrado | null {
  const prefixo = numero.slice(0, 3);
  return timbrados.find((t) => t.numero.startsWith(prefixo)) ?? null;
}

export async function lancarFaturaRascunho(payload: LancamentoPayload): Promise<number> {
  const { dados_fatura: d, campos_selecionados: c } = payload;

  const body = {
    Fecha_mov: d.fecha_movimiento,
    Fecha_doc: d.fecha_documento,
    Nro_doc: d.numero_documento ?? gerarNumeroReferencial(),
    Documento_tipo_id: c.tipo_documento_id,
    Operacion_doc_id: c.operacao_id,
    Entidad_id: c.entidade_id,
    Zafra_id: c.zafra_id,
    Ctb_proyecto_id: c.projeto_id ?? null,
    Unidad_id: c.unidade_id,
    Timbrado_id: c.timbrado_id,
    Cdc: d.cdc ?? null,
    Moneda_doc_id: c.moeda_id,
    Moneda_mov_id: c.moeda_id,
    Total_mov: d.total,
    Tasa_cambio: d.tasa_cambio ?? null,
    Condicion_pago_id: c.condicao_pago_id,
    Cuenta_financiera_id: c.conta_financeira_id,
    Observacion: d.observacion ?? "",
  };

  const url = `${BASE}/Data?recurso=AF31&empresa_id=${EMPRESA_ID}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Versat POST AF31 falhou: ${res.status} — ${await res.text()}`);
  return res.json() as Promise<number>;
}

function gerarNumeroReferencial(): string {
  const hoje = new Date();
  const dia = String(hoje.getDate()).padStart(2, "0");
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const ano = hoje.getFullYear();
  return `007${dia}${mes}${ano}`;
}
