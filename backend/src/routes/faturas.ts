import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { extrairDadosFatura } from "../services/ocr";
import { carregarCadastros, matchEntidadePorRuc, matchTimbradoPorPrefixo, lancarFaturaRascunho } from "../services/versat";
import { salvarPdfStorage, registrarLancamento, listarLancamentos } from "../services/supabase";
import { LancamentoPayload } from "../types";

const router = Router();

const upload = multer({
  dest: "/tmp/caltech_uploads/",
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (_req, file, cb) => {
    const permitidos = [".pdf", ".png", ".jpg", ".jpeg"];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, permitidos.includes(ext));
  },
});

// GET /api/cadastros — carrega todos os combos do Versat
router.get("/cadastros", async (_req: Request, res: Response) => {
  try {
    const cadastros = await carregarCadastros();
    res.json(cadastros);
  } catch (err: any) {
    res.status(500).json({ erro: err.message });
  }
});

// POST /api/faturas/upload — recebe PDF/imagem e extrai dados via Claude
router.post("/upload", upload.single("arquivo"), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ erro: "Nenhum arquivo enviado." });
    return;
  }

  const arquivoTemp = req.file.path;

  try {
    let imagemPath = arquivoTemp;

    // Se for PDF, converte a primeira página para imagem
    if (req.file.mimetype === "application/pdf") {
      imagemPath = await converterPdfParaImagem(arquivoTemp);
    }

    const dadosExtraidos = await extrairDadosFatura(imagemPath);

    // Faz match automático com os cadastros do Versat
    const cadastros = await carregarCadastros();
    let entidadeSugerida = null;
    let timbradoSugerido = null;

    if (dadosExtraidos.entidad_ruc) {
      entidadeSugerida = matchEntidadePorRuc(dadosExtraidos.entidad_ruc, cadastros.entidades);
    }
    if (dadosExtraidos.timbrado) {
      timbradoSugerido = matchTimbradoPorPrefixo(dadosExtraidos.timbrado, cadastros.timbrados);
    }

    // Salva o PDF original no Supabase Storage
    const pdfBuffer = fs.readFileSync(arquivoTemp);
    const pdfUrl = await salvarPdfStorage(pdfBuffer, req.file.originalname);

    res.json({
      dados_extraidos: dadosExtraidos,
      matches: {
        entidade: entidadeSugerida,
        timbrado: timbradoSugerido,
      },
      pdf_url: pdfUrl,
      cadastros,
    });
  } catch (err: any) {
    res.status(500).json({ erro: err.message });
  } finally {
    fs.unlink(arquivoTemp, () => {});
  }
});

// POST /api/faturas/lancar — confirma e lança no Versat
router.post("/lancar", async (req: Request, res: Response) => {
  const payload: LancamentoPayload & { pdf_url: string } = req.body;

  try {
    const versátId = await lancarFaturaRascunho(payload);

    await registrarLancamento({
      pdf_url: payload.pdf_url,
      dados_extraidos: payload.dados_fatura,
      versat_id: versátId,
      status: "rascunho",
    });

    res.json({ sucesso: true, versat_id: versátId });
  } catch (err: any) {
    res.status(500).json({ erro: err.message });
  }
});

// GET /api/faturas/historico — lista lançamentos anteriores
router.get("/historico", async (_req: Request, res: Response) => {
  try {
    const lancamentos = await listarLancamentos();
    res.json(lancamentos);
  } catch (err: any) {
    res.status(500).json({ erro: err.message });
  }
});

async function converterPdfParaImagem(pdfPath: string): Promise<string> {
  // Usa sharp + pdf-poppler para converter a primeira página do PDF em PNG
  const { default: pdfPoppler } = await import("pdf-poppler");
  const outputDir = path.dirname(pdfPath);
  const opts = { format: "png", out_dir: outputDir, out_prefix: path.basename(pdfPath), page: 1 };
  await pdfPoppler.convert(pdfPath, opts);
  return `${outputDir}/${path.basename(pdfPath)}-1.png`;
}

export default router;
