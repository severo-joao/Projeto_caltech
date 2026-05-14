export interface DadosFatura {
  fecha_movimiento: string | null;
  fecha_documento: string | null;
  numero_documento: string | null;
  timbrado: string | null;
  cdc: string | null;
  entidad_ruc: string | null;
  entidad_nombre: string | null;
  moneda: "GUARANIES" | "DOLAR" | null;
  total: number | null;
  tasa_cambio: number | null;
  observacion: string | null;
  qualidade_imagem: "boa" | "media" | "baixa";
}

export interface VersatItem {
  id: number;
  nombre: string;
}

export interface VersatEntidade {
  id: number;
  nombre: string;
  ruc: string;
}

export interface VersatTimbrado {
  id: number;
  numero: string;
  nombre: string;
}

export interface CamposVersat {
  entidades: VersatEntidade[];
  tipos_documento: VersatItem[];
  operacoes: VersatItem[];
  safras: VersatItem[];
  timbrados: VersatTimbrado[];
  moedas: VersatItem[];
  condicoes_pago: VersatItem[];
  contas: VersatItem[];
  projetos: VersatItem[];
  unidades: VersatItem[];
}

export interface LancamentoPayload {
  dados_fatura: DadosFatura;
  campos_selecionados: {
    tipo_documento_id: number;
    operacao_id: number;
    entidade_id: number;
    zafra_id: number;
    projeto_id?: number;
    unidade_id: number;
    timbrado_id: number;
    moeda_id: number;
    condicao_pago_id: number;
    conta_financeira_id: number;
  };
}
