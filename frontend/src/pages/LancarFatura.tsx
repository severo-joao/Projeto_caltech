import { useState, useRef } from "react";
import { uploadFatura, lancarFatura } from "../services/api";
import { CamposVersat, DadosFatura, LancamentoPayload } from "../types";

type CamposSelecionados = LancamentoPayload["campos_selecionados"];

export default function LancarFatura() {
  const [etapa, setEtapa] = useState<"upload" | "conferencia" | "sucesso">("upload");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [dados, setDados] = useState<DadosFatura | null>(null);
  const [cadastros, setCadastros] = useState<CamposVersat | null>(null);
  const [versátId, setVersatId] = useState<number | null>(null);
  const [selecionados, setSelecionados] = useState<Partial<CamposSelecionados>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(arquivo: File) {
    setCarregando(true);
    setErro(null);
    try {
      const resultado = await uploadFatura(arquivo);
      setDados(resultado.dados_extraidos);
      setCadastros(resultado.cadastros);
      setPdfUrl(resultado.pdf_url);

      // Pré-seleciona os matches automáticos
      const pre: Partial<CamposSelecionados> = {};
      if (resultado.matches.entidade) pre.entidade_id = resultado.matches.entidade.id;
      if (resultado.matches.timbrado) pre.timbrado_id = resultado.matches.timbrado.id;
      setSelecionados(pre);

      setEtapa("conferencia");
    } catch (e: any) {
      setErro(e.response?.data?.erro ?? e.message);
    } finally {
      setCarregando(false);
    }
  }

  async function handleLancar() {
    if (!dados || !cadastros) return;
    const campos = selecionados as CamposSelecionados;
    const obrigatorios: (keyof CamposSelecionados)[] = [
      "tipo_documento_id", "operacao_id", "entidade_id", "zafra_id",
      "unidade_id", "timbrado_id", "moeda_id", "condicao_pago_id", "conta_financeira_id",
    ];
    const faltando = obrigatorios.filter((k) => !campos[k]);
    if (faltando.length > 0) {
      setErro(`Preencha os campos obrigatórios em vermelho.`);
      return;
    }

    setCarregando(true);
    setErro(null);
    try {
      const resultado = await lancarFatura({ dados_fatura: dados, campos_selecionados: campos, pdf_url: pdfUrl });
      setVersatId(resultado.versat_id);
      setEtapa("sucesso");
    } catch (e: any) {
      setErro(e.response?.data?.erro ?? e.message);
    } finally {
      setCarregando(false);
    }
  }

  function sel(campo: keyof CamposSelecionados, valor: number) {
    setSelecionados((prev) => ({ ...prev, [campo]: valor }));
  }

  function campoFaltando(campo: keyof CamposSelecionados) {
    return !selecionados[campo];
  }

  const estiloSelect = (campo: keyof CamposSelecionados) =>
    `w-full border rounded px-3 py-2 text-sm ${campoFaltando(campo) ? "border-red-500 bg-red-50" : "border-gray-300"}`;

  const estiloInput = (valor: string | number | null) =>
    `w-full border rounded px-3 py-2 text-sm ${!valor ? "border-red-500 bg-red-50" : "border-gray-300"}`;

  if (etapa === "sucesso") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl shadow p-10 text-center max-w-md">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Fatura lançada!</h2>
          <p className="text-gray-500 mb-1">ID no Versat: <strong className="text-blue-700">#{versátId}</strong></p>
          <p className="text-gray-400 text-sm mb-6">O rascunho foi criado no Versat e aguarda contabilização.</p>
          <button
            onClick={() => { setEtapa("upload"); setDados(null); setSelecionados({}); }}
            className="bg-blue-700 text-white px-6 py-2 rounded-lg hover:bg-blue-800"
          >
            Lançar nova fatura
          </button>
        </div>
      </div>
    );
  }

  if (etapa === "conferencia" && dados && cadastros) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Conferência da Fatura</h1>
            {dados.qualidade_imagem === "baixa" && (
              <span className="bg-orange-100 text-orange-700 text-sm px-3 py-1 rounded-full font-medium">
                ⚠️ Imagem de baixa qualidade — verifique os campos com atenção
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Coluna esquerda: imagem da fatura */}
            <div className="bg-white rounded-2xl shadow p-4">
              <h3 className="text-sm font-semibold text-gray-500 mb-3">DOCUMENTO ORIGINAL</h3>
              <img src={pdfUrl} alt="Fatura" className="w-full rounded border" onError={(e) => { (e.target as any).style.display = "none"; }} />
              <p className="text-xs text-gray-400 mt-2 break-all">{pdfUrl}</p>
            </div>

            {/* Coluna direita: formulário */}
            <div className="bg-white rounded-2xl shadow p-6 space-y-4">
              <p className="text-xs text-red-600">Campos em vermelho precisam de preenchimento manual.</p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600">Data do Documento *</label>
                  <input className={estiloInput(dados.fecha_documento)} value={dados.fecha_documento ?? ""} onChange={(e) => setDados({ ...dados, fecha_documento: e.target.value })} placeholder="DD/MM/YYYY" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">Data de Movimento *</label>
                  <input className={estiloInput(dados.fecha_movimiento)} value={dados.fecha_movimiento ?? ""} onChange={(e) => setDados({ ...dados, fecha_movimiento: e.target.value })} placeholder="DD/MM/YYYY" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600">Número do Documento *</label>
                  <input className={estiloInput(dados.numero_documento)} value={dados.numero_documento ?? ""} onChange={(e) => setDados({ ...dados, numero_documento: e.target.value })} placeholder="Nº da fatura" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">Total *</label>
                  <input type="number" className={estiloInput(dados.total)} value={dados.total ?? ""} onChange={(e) => setDados({ ...dados, total: Number(e.target.value) })} placeholder="0" />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600">Entidade / Fornecedor *</label>
                <select className={estiloSelect("entidade_id")} value={selecionados.entidade_id ?? ""} onChange={(e) => sel("entidade_id", Number(e.target.value))}>
                  <option value="">-- Selecione --</option>
                  {cadastros.entidades.map((e) => <option key={e.id} value={e.id}>{e.nombre} {e.ruc ? `(${e.ruc})` : ""}</option>)}
                </select>
                {dados.entidad_nombre && <p className="text-xs text-gray-400 mt-1">OCR identificou: <em>{dados.entidad_nombre}</em> {dados.entidad_ruc ? `— RUC: ${dados.entidad_ruc}` : ""}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600">Tipo de Documento *</label>
                  <select className={estiloSelect("tipo_documento_id")} value={selecionados.tipo_documento_id ?? ""} onChange={(e) => sel("tipo_documento_id", Number(e.target.value))}>
                    <option value="">-- Selecione --</option>
                    {cadastros.tipos_documento.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">Operação *</label>
                  <select className={estiloSelect("operacao_id")} value={selecionados.operacao_id ?? ""} onChange={(e) => sel("operacao_id", Number(e.target.value))}>
                    <option value="">-- Selecione --</option>
                    {cadastros.operacoes.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600">Timbrado *</label>
                  <select className={estiloSelect("timbrado_id")} value={selecionados.timbrado_id ?? ""} onChange={(e) => sel("timbrado_id", Number(e.target.value))}>
                    <option value="">-- Selecione --</option>
                    {cadastros.timbrados.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                  </select>
                  {dados.timbrado && <p className="text-xs text-gray-400 mt-1">OCR: {dados.timbrado}</p>}
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">Moeda *</label>
                  <select className={estiloSelect("moeda_id")} value={selecionados.moeda_id ?? ""} onChange={(e) => sel("moeda_id", Number(e.target.value))}>
                    <option value="">-- Selecione --</option>
                    {cadastros.moedas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600">Safra *</label>
                  <select className={estiloSelect("zafra_id")} value={selecionados.zafra_id ?? ""} onChange={(e) => sel("zafra_id", Number(e.target.value))}>
                    <option value="">-- Selecione --</option>
                    {cadastros.safras.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">Unidade de Lançamento *</label>
                  <select className={estiloSelect("unidade_id")} value={selecionados.unidade_id ?? ""} onChange={(e) => sel("unidade_id", Number(e.target.value))}>
                    <option value="">-- Selecione --</option>
                    {cadastros.unidades.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600">Condição de Pagamento *</label>
                  <select className={estiloSelect("condicao_pago_id")} value={selecionados.condicao_pago_id ?? ""} onChange={(e) => sel("condicao_pago_id", Number(e.target.value))}>
                    <option value="">-- Selecione --</option>
                    {cadastros.condicoes_pago.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">Conta Financeira *</label>
                  <select className={estiloSelect("conta_financeira_id")} value={selecionados.conta_financeira_id ?? ""} onChange={(e) => sel("conta_financeira_id", Number(e.target.value))}>
                    <option value="">-- Selecione --</option>
                    {cadastros.contas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600">Projeto (opcional)</label>
                <select className="w-full border border-gray-300 rounded px-3 py-2 text-sm" value={selecionados.projeto_id ?? ""} onChange={(e) => sel("projeto_id", Number(e.target.value))}>
                  <option value="">-- Nenhum --</option>
                  {cadastros.projetos.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600">Observações *</label>
                <textarea className={`w-full border rounded px-3 py-2 text-sm ${!dados.observacion ? "border-red-500 bg-red-50" : "border-gray-300"}`} rows={2} value={dados.observacion ?? ""} onChange={(e) => setDados({ ...dados, observacion: e.target.value })} placeholder="Descrição breve da fatura" />
              </div>

              {erro && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{erro}</p>}

              <div className="flex gap-3 pt-2">
                <button onClick={() => setEtapa("upload")} className="flex-1 border border-gray-300 text-gray-600 py-3 rounded-lg hover:bg-gray-50">
                  Voltar
                </button>
                <button onClick={handleLancar} disabled={carregando} className="flex-1 bg-blue-700 text-white py-3 rounded-lg font-semibold hover:bg-blue-800 disabled:opacity-50">
                  {carregando ? "Lançando..." : "Lançar no Versat"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Etapa de upload
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-lg p-10 w-full max-w-lg text-center">
        <img src="/logo-caltech.png" alt="Caltech" className="h-12 mx-auto mb-6" onError={(e) => { (e.target as any).style.display = "none"; }} />
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Lançamento de Faturas</h1>
        <p className="text-gray-400 text-sm mb-8">Envie o PDF ou a foto da fatura para leitura automática</p>

        <div
          className="border-2 border-dashed border-blue-300 rounded-xl p-10 cursor-pointer hover:bg-blue-50 transition"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleUpload(f); }}
        >
          <div className="text-4xl mb-3">📄</div>
          <p className="text-blue-700 font-medium">Clique ou arraste o arquivo aqui</p>
          <p className="text-gray-400 text-xs mt-1">PDF, PNG, JPG — até 20MB</p>
          <input ref={inputRef} type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
        </div>

        {carregando && (
          <div className="mt-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Lendo fatura com IA...</p>
          </div>
        )}

        {erro && <p className="mt-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{erro}</p>}
      </div>
    </div>
  );
}
