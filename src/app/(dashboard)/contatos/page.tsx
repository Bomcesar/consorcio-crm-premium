"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useClientes } from "@/hooks/use-clientes";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Pencil, Trash2, Loader2, Upload, Download, Users, Phone, Mail, UserPlus, FolderOpen, ChevronRight, MessageSquare, ArrowRight, ClipboardList, Filter, MessageCircle, UserCheck } from "lucide-react";
import type { Cliente } from "@/repositories/client/clientes.repository";
import type { Contato, ContatoImportPreview } from "@/lib/contatos";
import type { Pasta, PastaItem } from "@/repositories/client/pastas.repository";
import { exportCSV, exportVCF, exportTXT, exportXLSX, downloadFile, parseCSV, parseVCF, parseTXT, parseXLSX, detectDuplicates } from "@/lib/contatos";

const emptyForm = {
  nome: "",
  telefone: "",
  email: "",
  observacoes: "",
};

export default function ContatosPage() {
  const clientesHook = useClientes();
  const clientesHookRef = useRef(clientesHook);
  clientesHookRef.current = clientesHook;
  const { success, error } = useToast();
  const successRef = useRef(success);
  const errorRef = useRef(error);
  successRef.current = success;
  errorRef.current = error;
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [filtered, setFiltered] = useState<Cliente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [contatosPage, setContatosPage] = useState(1);
  const [contatosPageSize, setContatosPageSize] = useState(20);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleteSelectedOpen, setIsDeleteSelectedOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [importFormat, setImportFormat] = useState<"csv" | "vcf" | "txt" | "xlsx">("csv");
  const [exportFormat, setExportFormat] = useState<"csv" | "vcf" | "txt" | "xlsx">("csv");
  const [importPreview, setImportPreview] = useState<ContatoImportPreview[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importMode, setImportMode] = useState<"new" | "update" | "all">("new");
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const clientesRef = useRef(clientes);
  clientesRef.current = clientes;
  const [pastas, setPastas] = useState<Pasta[]>([]);
  const [selectedPastaId, setSelectedPastaId] = useState<string | null>(null);
  const [pastaItens, setPastaItens] = useState<PastaItem[]>([]);
  const [isPastaFormOpen, setIsPastaFormOpen] = useState(false);
  const [pastaFormData, setPastaFormData] = useState({ nome: "", descricao: "", cor: "#3b82f6", origem: "", observacao: "" });
  const [isAddClienteToPastaOpen, setIsAddClienteToPastaOpen] = useState(false);
  const [selectedClienteForPasta, setSelectedClienteForPasta] = useState<Cliente | null>(null);
  const [pastaItemForm, setPastaItemForm] = useState({ prospeccao_status: "Não contatado" as PastaItem["prospeccao_status"], proxima_acao: "", data_retorno: "" });
  const [pastaFilter, setPastaFilter] = useState<string | null>(null);
  const [selectedPastaItemIds, setSelectedPastaItemIds] = useState<Set<string>>(new Set());
  const [selectedClienteIds, setSelectedClienteIds] = useState<Set<string>>(new Set());
  const [isMoveToPastaOpen, setIsMoveToPastaOpen] = useState(false);
  const [targetPastaId, setTargetPastaId] = useState<string>("");
  const [isPastaMassActionOpen, setIsPastaMassActionOpen] = useState(false);
  const [pastaMassActionType, setPastaMassActionType] = useState<"move" | "remove">("move");
  const [targetPastaIdForMove, setTargetPastaIdForMove] = useState<string>("");
  const [isEditPastaOpen, setIsEditPastaOpen] = useState(false);
  const [editingPasta, setEditingPasta] = useState<Pasta | null>(null);
  const [editPastaForm, setEditPastaForm] = useState({ nome: "", descricao: "", cor: "#3b82f6", origem: "", observacao: "" });
  const [isDeletePastaOpen, setIsDeletePastaOpen] = useState(false);
  const [deletingPasta, setDeletingPasta] = useState<Pasta | null>(null);
  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [convertingCliente, setConvertingCliente] = useState<Cliente | null>(null);
  const [convertTarget, setConvertTarget] = useState<string>("leads");
  const [isConverting, setIsConverting] = useState(false);
  const [pastaMestreId, setPastaMestreId] = useState<string | null>(null);

   useEffect(() => {
     let cancelled = false;
     const initPastaMestre = async () => {
       try {
         const { getOrCreatePastaMestre } = await import("@/repositories/client/pastas.repository");
         const pasta = await getOrCreatePastaMestre();
         if (!cancelled) {
           setPastaMestreId(pasta.id);
         }
       } catch (err) {
         console.error("[Contatos] Erro ao criar pasta mestre:", err);
       }
     };
     void initPastaMestre();
     return () => {
       cancelled = true;
     };
   }, []);

   useEffect(() => {
     let cancelled = false;
     clientesHookRef.current.listAvailable()
       .then((data) => {
         if (!cancelled) {
           setClientes(data);
           setFiltered(data);
         }
       })
       .catch((err) => {
         if (!cancelled) {
           const message = err instanceof Error ? err.message : "Não foi possível carregar os contatos.";
           errorRef.current(message);
           setImportError(message);
         }
       })
       .finally(() => {
         if (!cancelled) setIsLoading(false);
       });
     return () => {
       cancelled = true;
     };
   }, []);

  useEffect(() => {
    let cancelled = false;
    clientesHookRef.current.loadPastas().then((data) => {
      if (!cancelled) {
        setPastas(data);
      }
    }).catch(() => {
      if (!cancelled) {
        errorRef.current("Não foi possível carregar as pastas.");
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setFiltered(clientesRef.current);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const results = await clientesHookRef.current.search(trimmed);
        if (!cancelled) {
          setFiltered(results);
        }
      } catch {
        if (!cancelled) {
          errorRef.current("Não foi possível pesquisar clientes.");
        }
      }
    }, 250);
    return () => {
      clearTimeout(timeout);
      cancelled = true;
    };
   }, [searchQuery]);

  const contatosTotalPages = Math.max(1, Math.ceil(filtered.length / contatosPageSize));
  const safeContatosPage = Math.min(contatosPage, contatosTotalPages);
  const contatosStart = (safeContatosPage - 1) * contatosPageSize;
  const paginatedContatos = filtered.slice(contatosStart, contatosStart + contatosPageSize);

  const handleChange = (field: keyof typeof emptyForm, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData.nome.trim()) return;
    setIsSaving(true);
    try {
      const payload = {
        nome: formData.nome.trim(),
        telefone: formData.telefone.trim(),
        email: formData.email.trim(),
        observacoes: formData.observacoes.trim(),
        cpf_cnpj: "",
        cidade: "",
        estado: "",
        status: "Ativo" as const,
        origem: "Contatos",
      };

      let clienteId: string;
      if (selectedCliente) {
        const updated = await clientesHook.update(selectedCliente.id, payload);
        clienteId = updated.id;
      } else {
        const created = await clientesHook.create(payload);
        clienteId = created.id;
      }

      if (!selectedCliente && pastaMestreId) {
        try {
          await clientesHook.addClienteToPasta(pastaMestreId, clienteId);
        } catch (err) {
          console.error("[Contatos] Erro ao adicionar à pasta mestre:", err);
        }
      }

      setIsFormOpen(false);
      setFormData(emptyForm);
      setSelectedCliente(null);
      setSearchQuery("");
      const updated = await clientesHook.listAvailable();
      setClientes(updated);
      setFiltered(updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Não foi possível salvar o contato.";
      errorRef.current(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCliente) return;
    try {
      const pastasAtuais = await clientesHook.loadPastas();
      for (const pasta of pastasAtuais) {
        const itens = await clientesHook.loadPastaItens(pasta.id);
        const item = itens.find((i) => i.cliente_id === selectedCliente.id);
        if (item) {
          await clientesHook.removeClienteFromPasta(item.id);
        }
      }
      await clientesHook.remove(selectedCliente.id);
      setIsDeleteOpen(false);
      setSelectedCliente(null);
      setSearchQuery("");
      const updated = await clientesHook.listAvailable();
      setClientes(updated);
      setFiltered(updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Não foi possível excluir o contato.";
      errorRef.current(message);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedClienteIds.size === 0) return;
    try {
      const pastasAtuais = await clientesHook.loadPastas();
      for (const id of selectedClienteIds) {
        for (const pasta of pastasAtuais) {
          const itens = await clientesHook.loadPastaItens(pasta.id);
          const item = itens.find((i) => i.cliente_id === id);
          if (item) {
            await clientesHook.removeClienteFromPasta(item.id);
          }
        }
        await clientesHook.remove(id);
      }
      setSelectedClienteIds(new Set());
      setSearchQuery("");
      const updated = await clientesHook.listAvailable();
      setClientes(updated);
      setFiltered(updated);
      successRef.current(`${selectedClienteIds.size} contato(s) excluído(s).`);
    } catch {
      errorRef.current("Não foi possível excluir os contatos selecionados.");
    }
  };

  const createPastaNow = async () => {
    console.log("[Contatos] Criando pasta:", pastaFormData);
    if (!pastaFormData.nome.trim()) return;
    try {
      await clientesHook.createPasta(pastaFormData);
      console.log("[Contatos] Pasta criada com sucesso.");
      setIsPastaFormOpen(false);
      setPastaFormData({ nome: "", descricao: "", cor: "#3b82f6", origem: "", observacao: "" });
      const pastasAtualizadas = await clientesHook.loadPastas();
      console.log("[Contatos] Pastas atualizadas:", pastasAtualizadas);
      setPastas(pastasAtualizadas);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Não foi possível criar a pasta.";
      console.error("[Contatos] Erro ao criar pasta:", err);
      errorRef.current(message);
    }
  };

  const handleCreatePasta = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await createPastaNow();
  };

  const handleOpenPasta = async (pasta: Pasta) => {
    setSelectedPastaId(pasta.id);
    setFiltered([]);
    setSearchQuery("");
    const itens = await clientesHook.loadPastaItens(pasta.id);
    setPastaItens(itens);
  };

  const handleBackToMain = async () => {
    setSelectedPastaId(null);
    setPastaItens([]);
    const data = await clientesHook.listAvailable();
    setClientes(data);
    setFiltered(data);
  };

  const handleAddClienteToPasta = async () => {
    if (!selectedPastaId || !selectedClienteForPasta) return;
    await clientesHook.addClienteToPasta(selectedPastaId, selectedClienteForPasta.id);

    if (pastaMestreId && selectedPastaId !== pastaMestreId) {
      const itensMestre = await clientesHook.loadPastaItens(pastaMestreId);
      const itemMestre = itensMestre.find((i) => i.cliente_id === selectedClienteForPasta.id);
      if (itemMestre) {
        await clientesHook.removeClienteFromPasta(itemMestre.id);
      }
    }

    setIsAddClienteToPastaOpen(false);
    setSelectedClienteForPasta(null);
    const itens = await clientesHook.loadPastaItens(selectedPastaId);
    setPastaItens(itens);
  };

  const handleRemoveClienteFromPasta = async (pastaItemId: string) => {
    const item = pastaItens.find((i) => i.id === pastaItemId);
    await clientesHook.removeClienteFromPasta(pastaItemId);
    if (selectedPastaId) {
      const itens = await clientesHook.loadPastaItens(selectedPastaId);
      setPastaItens(itens);
    }
    if (item && pastaMestreId && item.pasta_id !== pastaMestreId) {
      try {
        await clientesHook.addClienteToPasta(pastaMestreId, item.cliente_id);
      } catch (err) {
        console.error("[Contatos] Erro ao devolver para pasta mestre:", err);
      }
    }
  };

  const handleUpdatePastaItemStatus = async (pastaItemId: string, status: string) => {
    await clientesHook.updatePastaItem(pastaItemId, { prospeccao_status: status });
    if (selectedPastaId) {
      const itens = await clientesHook.loadPastaItens(selectedPastaId);
      setPastaItens(itens);
    }
  };

  const handleExport = async () => {
    const source = selectedPastaId ? pastaItens : filtered;
    const contatos: Contato[] = source.map((item) => {
      const pastaItem = item as PastaItem & { cliente?: Cliente } & { nome?: string; telefone?: string; observacoes?: string; observacao?: string };
      const cliente = pastaItem.cliente;
      return {
        nome: pastaItem.nome || cliente?.nome || "",
        telefone: pastaItem.telefone || cliente?.telefone || "",
        observacao: pastaItem.observacoes || pastaItem.observacao || cliente?.observacoes || "",
      } as Contato;
    });
    if (contatos.length === 0) {
      error("Nenhum contato para exportar.");
      return;
    }
    const timestamp = new Date().toISOString().slice(0, 10);
    if (exportFormat === "csv") {
      downloadFile(exportCSV(contatos), `contatos_${timestamp}.csv`, "text/csv");
    } else if (exportFormat === "vcf") {
      downloadFile(exportVCF(contatos), `contatos_${timestamp}.vcf`, "text/vcard");
    } else if (exportFormat === "xlsx") {
      const content = await exportXLSX(contatos);
      downloadFile(content, `contatos_${timestamp}.xlsx`, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    } else {
      downloadFile(exportTXT(contatos), `contatos_${timestamp}.txt`, "text/plain");
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    console.log("[Contatos] handleFileChange arquivo selecionado", file?.name, file?.type);
    if (!file) return;
    setImportError(null);
    try {
      if (importFormat === "xlsx") {
        const buffer = await file.arrayBuffer();
        const contatos = await parseXLSX(buffer);
        console.log("[Contatos] handleFileChange xlsx parsed", contatos.length);
        const preview = detectDuplicates(contatos, clientesRef.current.map((c) => ({ nome: c.nome, telefone: c.telefone, observacao: c.observacoes || "" })));
        console.log("[Contatos] handleFileChange preview", preview.length);
        setImportPreview(preview);
      } else {
        const text = await file.text();
        const firstLines = text.split(/\r?\n/).slice(0, 5);
        console.log("[Contatos] handleFileChange texto bruto", firstLines);
        let contatos: Contato[] = [];
        if (importFormat === "csv") contatos = parseCSV(text);
        else if (importFormat === "vcf") contatos = parseVCF(text);
        else contatos = parseTXT(text);
        console.log("[Contatos] handleFileChange parsed", contatos.length);
        const preview = detectDuplicates(contatos, clientesRef.current.map((c) => ({ nome: c.nome, telefone: c.telefone, observacao: c.observacoes || "" })));
        console.log("[Contatos] handleFileChange preview", preview.length);
        setImportPreview(preview);
      }
    } catch {
      setImportError("Não foi possível ler o arquivo selecionado.");
      setImportPreview([]);
    }
  };

  const handleImport = async () => {
    console.log("[Contatos] handleImport clicado", {
      importPreviewLength: importPreview.length,
      importMode,
      pastaMestreId,
      isImporting,
    });

    if (importPreview.length === 0) {
      error("Nenhum contato para importar.");
      return;
    }
    setIsImporting(true);
    try {
      const novos = importPreview.filter((p) => p.status === "Novo");
      const naoNovos = importPreview.filter((p) => p.status !== "Novo");
      console.log("[Contatos] handleImport modos", { novos: novos.length, naoNovos: naoNovos.length, importMode });

      if (importMode === "new" && naoNovos.length > 0) {
        const confirmar = window.confirm(`${naoNovos.length} contato(s) já existem e serão ignorados. Deseja continuar?`);
        if (!confirmar) {
          setIsImporting(false);
          return;
        }
      }

      if (importMode === "update" && naoNovos.length > 0) {
        for (const c of naoNovos) {
          const existente = clientesRef.current.find((cl) => cl.telefone.replace(/\D/g, "") === c.telefone.replace(/\D/g, ""));
          if (existente) {
            await clientesHookRef.current.update(existente.id, { nome: c.nome, telefone: c.telefone, observacoes: c.observacao || "" });
          }
        }
      }

      for (const c of novos) {
        const created = await clientesHookRef.current.create({ nome: c.nome, telefone: c.telefone, observacoes: c.observacao || "", status: "Ativo" });
        if (pastaMestreId) {
          try {
            await clientesHookRef.current.addClienteToPasta(pastaMestreId, created.id);
          } catch (err) {
            console.error("[Contatos] Erro ao adicionar importado à pasta mestre:", err);
          }
        }
      }

      const updated = await clientesHookRef.current.listAvailable();
      setClientes(updated);
      setFiltered(updated);
      setIsImportOpen(false);
      setImportPreview([]);
      setImportError(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      successRef.current("Importação concluída com sucesso.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Não foi possível concluir a importação.";
      setImportError(message);
      errorRef.current(message);
    } finally {
      setIsImporting(false);
    }
  };

  const openCreate = () => {
    setSelectedCliente(null);
    setFormData(emptyForm);
    setIsFormOpen(true);
  };

  const openEdit = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setFormData({ nome: cliente.nome, telefone: cliente.telefone, email: cliente.email || "", observacoes: cliente.observacoes || "" });
    setIsFormOpen(true);
  };

  const openDelete = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setIsDeleteOpen(true);
  };

  const openConvert = (cliente: Cliente) => {
    setConvertingCliente(cliente);
    setConvertTarget("leads");
    setIsConvertOpen(true);
  };

  const handleConvert = async () => {
    if (!convertingCliente) return;
    setIsConverting(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado.");

      if (convertTarget === "leads") {
        const { error } = await supabase.from("leads").insert({
          nome: convertingCliente.nome,
          telefone: convertingCliente.telefone,
          email: convertingCliente.email || "",
          observacoes: convertingCliente.observacoes || "Convertido de contato",
          origem: "Contatos",
          status: "Novo",
          valor_estimado: 0,
          probabilidade: 0,
          ultimo_contato: new Date().toISOString(),
        });
        if (error) throw error;
      } else if (convertTarget === "clientes") {
        const { error } = await supabase.from("clientes").insert({
          nome: convertingCliente.nome,
          telefone: convertingCliente.telefone,
          email: convertingCliente.email || "",
          observacoes: convertingCliente.observacoes || "Convertido de contato",
          origem: "Contatos",
          status: "Ativo",
        });
        if (error) throw error;
      } else if (convertTarget === "indicadores") {
        const { error } = await supabase.from("indicadores").insert({
          nome: convertingCliente.nome,
          telefone: convertingCliente.telefone,
          email: convertingCliente.email || "",
          cidade: "",
          estado: "",
          cpf: "",
          pix: "",
          origem: "Contatos",
          status: "Ativo",
          observacoes: convertingCliente.observacoes || "Convertido de contato",
          ativo: true,
          usuario_id: user.id,
          grupo_whatsapp: false,
          link_grupo: "",
          grupo_criado: false,
        });
        if (error) throw error;
      } else if (convertTarget === "parceiros") {
        const { error } = await supabase.from("parceiros").insert({
          nome: convertingCliente.nome,
          cnpj: "",
          contato: convertingCliente.nome,
          email: convertingCliente.email || "",
          telefone: convertingCliente.telefone,
          tipo: "",
          status: "Ativo",
          observacoes: convertingCliente.observacoes || "Convertido de contato",
          usuario_id: user.id,
        });
        if (error) throw error;
      } else if (convertTarget === "recrutamento") {
        const { error } = await supabase.from("recrutamento").insert({
          nome: convertingCliente.nome,
          email: convertingCliente.email || "",
          telefone: convertingCliente.telefone,
          origem: "Contatos",
          status: "Novo",
          observacoes: convertingCliente.observacoes || "Convertido de contato",
          usuario_id: user.id,
        });
        if (error) throw error;
      }

      setIsConvertOpen(false);
      setConvertingCliente(null);
      successRef.current("Contato convertido com sucesso.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Não foi possível converter o contato.";
      errorRef.current(message);
    } finally {
      setIsConverting(false);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (!file) return;
    const accepted = [".csv", ".vcf", ".txt"];
    const extension = "." + file.name.split(".").pop()?.toLowerCase();
    if (!accepted.includes(extension)) {
      setImportError("Formato não suportado. Use CSV, VCF ou TXT.");
      return;
    }
    const format = extension === ".csv" ? "csv" : extension === ".vcf" ? "vcf" : "txt";
    setImportFormat(format);
    setImportError(null);
    try {
      const text = await file.text();
      let parsed: Contato[] = [];
      if (format === "csv") parsed = parseCSV(text);
      else if (format === "vcf") parsed = parseVCF(text);
      else parsed = parseTXT(text);
      const preview = detectDuplicates(parsed, clientes.map((c) => ({ nome: c.nome, telefone: c.telefone, observacao: c.observacoes || "" })));
      setImportPreview(preview);
      setIsImportOpen(true);
    } catch {
      setImportError("Não foi possível ler o arquivo arrastado.");
      setImportPreview([]);
    }
  };

  const getPastaStats = () => {
    const stats = {
      total: pastaItens.length,
      naoContatado: 0,
      contatado: 0,
      retornoPendente: 0,
      interessado: 0,
      convertido: 0,
      semResposta: 0,
      numeroInvalido: 0,
    };
    pastaItens.forEach((item) => {
      const status = item.prospeccao_status || "Não contatado";
      switch (status) {
        case "Não contatado":
          stats.naoContatado++;
          break;
        case "Ligação realizada":
        case "WhatsApp enviado":
        case "SMS enviado":
        case "Conversa iniciada":
          stats.contatado++;
          break;
        case "Retorno pendente":
          stats.retornoPendente++;
          break;
        case "Interessado":
        case "Em negociação":
          stats.interessado++;
          break;
        case "Convertido":
          stats.convertido++;
          break;
        case "Sem resposta":
          stats.semResposta++;
          break;
        case "Número inválido":
          stats.numeroInvalido++;
          break;
      }
    });
    return stats;
  };

   const sortedPastas = useMemo(() => {
     const mestre = pastaMestreId ? pastas.find((p) => p.id === pastaMestreId) : null;
     const outras = pastas.filter((p) => p.id !== pastaMestreId);
     return mestre ? [mestre, ...outras] : pastas;
   }, [pastas, pastaMestreId]);

   const pastaStats = useMemo(() => getPastaStats(), [pastaItens]);
   const filteredPastaItens = pastaItens.filter((item) => {
    if (!pastaFilter) return true;
    return item.prospeccao_status === pastaFilter;
  });

  const handleSelectAllPastaItems = (checked: boolean) => {
    if (checked) {
      setSelectedPastaItemIds(new Set(filteredPastaItens.map((i) => i.id)));
    } else {
      setSelectedPastaItemIds(new Set());
    }
  };

  const handleTogglePastaItem = (id: string) => {
    setSelectedPastaItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleNextContact = () => {
    const hoje = new Date().toISOString().slice(0, 10);
    const naoContatados = pastaItens.filter((i) => i.prospeccao_status === "Não contatado");
    if (naoContatados.length > 0) {
      const next = naoContatados[0];
      setSelectedPastaItemIds(new Set([next.id]));
      return;
    }
    const retornosPendentes = pastaItens.filter((i) => i.prospeccao_status === "Retorno pendente" && i.data_retorno && i.data_retorno <= hoje);
    if (retornosPendentes.length > 0) {
      const next = retornosPendentes[0];
      setSelectedPastaItemIds(new Set([next.id]));
      return;
    }
    const retornosHoje = pastaItens.filter((i) => i.prospeccao_status === "Retorno pendente" && i.data_retorno === hoje);
    if (retornosHoje.length > 0) {
      const next = retornosHoje[0];
      setSelectedPastaItemIds(new Set([next.id]));
      return;
    }
  };

  const handleOpenPastaMassAction = (type: "move" | "remove") => {
    if (selectedPastaItemIds.size === 0) return;
    setPastaMassActionType(type);
    setTargetPastaIdForMove("");
    setIsPastaMassActionOpen(true);
  };

  const handleMovePastaItemsToPasta = async () => {
    if (!targetPastaIdForMove || selectedPastaItemIds.size === 0) return;
    try {
      for (const itemId of selectedPastaItemIds) {
        const item = pastaItens.find((i) => i.id === itemId);
        if (item) {
          await clientesHookRef.current.addClienteToPasta(targetPastaIdForMove, item.cliente_id);
          if (pastaMestreId && targetPastaIdForMove !== pastaMestreId) {
            const itensMestre = await clientesHookRef.current.loadPastaItens(pastaMestreId);
            const itemMestre = itensMestre.find((i) => i.cliente_id === item.cliente_id);
            if (itemMestre) {
              await clientesHookRef.current.removeClienteFromPasta(itemMestre.id);
            }
          }
        }
      }
      setSelectedPastaItemIds(new Set());
      setTargetPastaIdForMove("");
      setIsPastaMassActionOpen(false);
      if (selectedPastaId) {
        const itensAtualizados = await clientesHookRef.current.loadPastaItens(selectedPastaId);
        setPastaItens(itensAtualizados);
      }
    } catch {
      errorRef.current("Não foi possível mover os contatos.");
    }
  };

  const handleRemovePastaItems = async () => {
    if (selectedPastaItemIds.size === 0) return;
    try {
      for (const itemId of selectedPastaItemIds) {
        const item = pastaItens.find((i) => i.id === itemId);
        await clientesHookRef.current.removeClienteFromPasta(itemId);
        if (item && pastaMestreId && item.pasta_id !== pastaMestreId) {
          try {
            await clientesHookRef.current.addClienteToPasta(pastaMestreId, item.cliente_id);
          } catch (err) {
            console.error("[Contatos] Erro ao devolver para pasta mestre:", err);
          }
        }
      }
      setSelectedPastaItemIds(new Set());
      setIsPastaMassActionOpen(false);
      if (selectedPastaId) {
        const itensAtualizados = await clientesHookRef.current.loadPastaItens(selectedPastaId);
        setPastaItens(itensAtualizados);
      }
    } catch {
      errorRef.current("Não foi possível remover os contatos da pasta.");
    }
  };

  const handleSelectAllClientes = (checked: boolean) => {
    if (checked) {
      setSelectedClienteIds(new Set(filtered.map((c) => c.id)));
    } else {
      setSelectedClienteIds(new Set());
    }
  };

  const handleToggleCliente = (id: string) => {
    setSelectedClienteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleMoveSelectedToPasta = async () => {
    if (!targetPastaId || selectedClienteIds.size === 0) return;
    try {
      for (const clienteId of selectedClienteIds) {
        await clientesHookRef.current.addClienteToPasta(targetPastaId, clienteId);
        if (pastaMestreId && targetPastaId !== pastaMestreId) {
          const itensMestre = await clientesHookRef.current.loadPastaItens(pastaMestreId);
          const itemMestre = itensMestre.find((i) => i.cliente_id === clienteId);
          if (itemMestre) {
            await clientesHookRef.current.removeClienteFromPasta(itemMestre.id);
          }
        }
      }
      setSelectedClienteIds(new Set());
      setTargetPastaId("");
      setIsMoveToPastaOpen(false);
      const pastasAtualizadas = await clientesHookRef.current.loadPastas();
      setPastas(pastasAtualizadas);
      if (selectedPastaId) {
        const itensAtualizados = await clientesHookRef.current.loadPastaItens(selectedPastaId);
        setPastaItens(itensAtualizados);
      }
      const updated = await clientesHookRef.current.listAvailable();
      setClientes(updated);
      setFiltered(updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Não foi possível adicionar os contatos à pasta.";
      errorRef.current(message);
    }
  };

  const handleNavigatePasta = async (direction: "prev" | "next") => {
    if (!selectedPastaId || pastas.length === 0) return;
    const currentIndex = pastas.findIndex((p) => p.id === selectedPastaId);
    let targetIndex = currentIndex;
    if (direction === "prev") {
      targetIndex = currentIndex > 0 ? currentIndex - 1 : pastas.length - 1;
    } else {
      targetIndex = currentIndex < pastas.length - 1 ? currentIndex + 1 : 0;
    }
    const targetPasta = pastas[targetIndex];
    if (!targetPasta) return;
    setSelectedPastaId(targetPasta.id);
    setPastaItens([]);
    const itens = await clientesHookRef.current.loadPastaItens(targetPasta.id);
    setPastaItens(itens);
    setSelectedPastaItemIds(new Set());
  };

  const handleOpenEditPasta = (pasta: Pasta) => {
    setEditingPasta(pasta);
    setEditPastaForm({ nome: pasta.nome, descricao: pasta.descricao || "", cor: pasta.cor, origem: pasta.origem || "", observacao: pasta.observacao || "" });
    setIsEditPastaOpen(true);
  };

  const handleSaveEditPasta = async () => {
    if (!editingPasta) return;
    try {
      await clientesHookRef.current.updatePasta(editingPasta.id, editPastaForm);
      setIsEditPastaOpen(false);
      setEditingPasta(null);
      const pastasAtualizadas = await clientesHookRef.current.loadPastas();
      setPastas(pastasAtualizadas);
      if (selectedPastaId === editingPasta.id) {
        const itensAtualizados = await clientesHookRef.current.loadPastaItens(editingPasta.id);
        setPastaItens(itensAtualizados);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Não foi possível atualizar a pasta.";
      errorRef.current(message);
    }
  };

  const handleOpenDeletePasta = (pasta: Pasta) => {
    setDeletingPasta(pasta);
    setIsDeletePastaOpen(true);
  };

  const handleConfirmDeletePasta = async () => {
    if (!deletingPasta) return;
    try {
      await clientesHookRef.current.deletePasta(deletingPasta.id);
      setIsDeletePastaOpen(false);
      setDeletingPasta(null);
      if (selectedPastaId === deletingPasta.id) {
        setSelectedPastaId(null);
        setPastaItens([]);
      }
      const pastasAtualizadas = await clientesHookRef.current.loadPastas();
      setPastas(pastasAtualizadas);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Não foi possível excluir a pasta.";
      errorRef.current(message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Users className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{selectedPastaId ? "Pasta de Prospecção" : "Central de Prospecção"}</h1>
          <p className="text-sm text-muted-foreground">{selectedPastaId ? "Gerencie sua fila de contatos" : "Organize contatos por nicho, origem ou campanha"}</p>
        </div>
      </div>

      {importError ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-sm text-red-600">{importError}</p>
          </CardContent>
        </Card>
      ) : null}

      {!selectedPastaId ? (
        <>
          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Minhas Pastas</CardTitle>
                <CardDescription>
                  {pastas.length > 0 ? `${pastas.length} pasta(s) criada(s)` : "Nenhuma pasta criada ainda."}
                </CardDescription>
              </div>
              <Button onClick={() => setIsPastaFormOpen(true)}>
                <FolderOpen className="mr-2 h-4 w-4" />
                Nova Pasta
              </Button>
            </CardHeader>
            <CardContent>
              {sortedPastas.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma pasta criada ainda. Crie sua primeira pasta para organizar seus contatos.</p>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {sortedPastas.map((pasta) => (
                    <Card key={pasta.id} className="relative">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleOpenPasta(pasta)}>
                            <div className="h-4 w-4 rounded-full" style={{ backgroundColor: pasta.cor }} />
                            <CardTitle className="text-base">
                              {pasta.nome}
                              {pastaMestreId && pasta.id === pastaMestreId && <span className="ml-2 text-xs text-muted-foreground">(Mestre)</span>}
                            </CardTitle>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => { e.stopPropagation(); handleOpenEditPasta(pasta); }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-600"
                              onClick={(e) => { e.stopPropagation(); handleOpenDeletePasta(pasta); }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        <CardDescription className="line-clamp-2 cursor-pointer" onClick={() => handleOpenPasta(pasta)}>{pasta.descricao || "Sem descrição"}</CardDescription>
                      </CardHeader>
                      <CardContent className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{pasta.origem || "Origem não definida"}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Contatos cadastrados</CardTitle>
                <CardDescription>
                  {filtered.length > 0 ? `${filtered.length} contato(s) encontrado(s)` : "Nenhum contato cadastrado ainda."}
                </CardDescription>
              </div>
               <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setIsImportOpen(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Importar
                </Button>
                <select
                  value={selectedPastaId || ""}
                  onChange={(e) => setSelectedPastaId(e.target.value || null)}
                  className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Lista principal</option>
                  {pastas.map((pasta) => (
                    <option key={pasta.id} value={pasta.id}>
                      {pasta.nome}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2">
                  <select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value as "csv" | "vcf" | "txt" | "xlsx")}
                    className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="csv">CSV</option>
                    <option value="vcf">VCF/vCard</option>
                    <option value="txt">TXT UTF-8</option>
                    <option value="xlsx">XLSX</option>
                  </select>
                   <Button size="sm" onClick={handleExport} type="button">
                    <Download className="mr-2 h-4 w-4" />
                    Exportar
                  </Button>
                </div>
                <Button onClick={openCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo contato
                </Button>
                <Button variant="secondary" onClick={() => { if (selectedClienteIds.size === 0) { errorRef.current("Selecione pelo menos um contato."); } else { setIsMoveToPastaOpen(true); } }}>
                  <FolderOpen className="mr-2 h-4 w-4" />
                  Mover para pasta {selectedClienteIds.size > 0 ? `(${selectedClienteIds.size})` : ""}
                </Button>
                {selectedClienteIds.size > 0 && (
                  <Button variant="destructive" onClick={() => setIsDeleteSelectedOpen(true)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir selecionados ({selectedClienteIds.size})
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent onDragOver={handleDragOver} onDrop={handleDrop}>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full sm:max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Pesquisar por nome, telefone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum contato cadastrado ainda.</p>
              ) : (
                <div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[40px]">
                            <input
                              type="checkbox"
                              checked={selectedClienteIds.size === filtered.length && filtered.length > 0}
                              onChange={(e) => handleSelectAllClientes(e.target.checked)}
                            />
                          </TableHead>
                          <TableHead>Nome</TableHead>
                          <TableHead>Telefone</TableHead>
                          <TableHead>Observação</TableHead>
                          <TableHead className="w-[180px] text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedContatos.map((cliente) => (
                          <TableRow key={cliente.id}>
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={selectedClienteIds.has(cliente.id)}
                                onChange={() => handleToggleCliente(cliente.id)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{cliente.nome}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                {cliente.telefone}
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">{cliente.observacoes || "—"}</TableCell>
                            <TableCell className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" aria-label="Ligar" onClick={() => window.location.href = `tel:+55${cliente.telefone.replace(/\D/g, "")}`}>
                                <Phone className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" aria-label="WhatsApp" onClick={() => window.open(`https://wa.me/55${cliente.telefone.replace(/\D/g, "")}`, "_blank")}>
                                <MessageSquare className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" aria-label="SMS" onClick={() => window.location.href = `sms:+55${cliente.telefone.replace(/\D/g, "")}`}>
                                <MessageCircle className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" aria-label="E-mail" onClick={() => window.location.href = `mailto:${cliente.email || ""}`}>
                                <Mail className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => openEdit(cliente)} aria-label="Editar">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => openConvert(cliente)} aria-label="Converter">
                                <UserCheck className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => openDelete(cliente)} aria-label="Excluir">
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {filtered.length > contatosPageSize && (
                    <div className="flex items-center justify-between pt-4">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={safeContatosPage === 1}
                          onClick={() => setContatosPage((current) => Math.max(1, current - 1))}
                        >
                          Anterior
                        </Button>
                        <span className="text-xs text-muted-foreground">Página {safeContatosPage} de {contatosTotalPages}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={safeContatosPage >= contatosTotalPages}
                          onClick={() => setContatosPage((current) => current + 1)}
                        >
                          Próxima
                        </Button>
                      </div>
                      <select
                        className="flex h-9 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={contatosPageSize}
                        onChange={(e) => { setContatosPageSize(Number(e.target.value)); setContatosPage(1); }}
                      >
                        <option value="20">20</option>
                        <option value="50">50</option>
                        <option value="150">150</option>
                      </select>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => handleNavigatePasta("prev")} aria-label="Pasta anterior">
                <ArrowRight className="h-4 w-4 rotate-180" />
              </Button>
                <Button variant="ghost" size="icon" onClick={handleBackToMain} aria-label="Voltar para pastas">
                  <FolderOpen className="h-4 w-4" />
                </Button>
              <Button variant="ghost" size="icon" onClick={() => handleNavigatePasta("next")} aria-label="Próxima pasta">
                <ArrowRight className="h-4 w-4" />
              </Button>
              <div>
                <CardTitle>{pastas.find((p) => p.id === selectedPastaId)?.nome || "Pasta"}</CardTitle>
                <CardDescription>
                  {pastaStats.total} contato(s) • {pastaStats.naoContatado} não contatados • {pastaStats.retornoPendente} retornos pendentes
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleNextContact}>
                <ClipboardList className="mr-2 h-4 w-4" />
                Próximo contato
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsAddClienteToPastaOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Adicionar contato
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPastaFilter(pastaFilter === "Não contatado" ? null : "Não contatado")}>
                <Filter className="mr-2 h-4 w-4" />
                {pastaFilter === "Não contatado" ? "Mostrar todos" : "Não contatados"}
              </Button>
              {selectedPastaItemIds.size > 0 && (
                <>
                  <Button variant="outline" size="sm" onClick={() => handleOpenPastaMassAction("move")}>
                    <FolderOpen className="mr-2 h-4 w-4" />
                    Mover selecionados ({selectedPastaItemIds.size})
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleOpenPastaMassAction("remove")}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remover selecionados ({selectedPastaItemIds.size})
                  </Button>
                </>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-lg font-semibold">{pastaStats.total}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Não contatados</p>
                <p className="text-lg font-semibold">{pastaStats.naoContatado}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Contatados</p>
                <p className="text-lg font-semibold">{pastaStats.contatado}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Interessados</p>
                <p className="text-lg font-semibold">{pastaStats.interessado}</p>
              </div>
            </div>

            {filteredPastaItens.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum contato na pasta.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]">
                        <input
                          type="checkbox"
                          checked={selectedPastaItemIds.size === filteredPastaItens.length && filteredPastaItens.length > 0}
                          onChange={(e) => handleSelectAllPastaItems(e.target.checked)}
                        />
                      </TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Último contato</TableHead>
                      <TableHead>Próxima ação</TableHead>
                      <TableHead className="w-[180px] text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                      <TableBody>
                        {filteredPastaItens.map((item) => {
                          const cliente = item.cliente as Cliente | undefined;
                          return (
                            <TableRow key={item.id}>
                              <TableCell>
                                <input
                                  type="checkbox"
                                  checked={selectedPastaItemIds.has(item.id)}
                                  onChange={() => handleTogglePastaItem(item.id)}
                                />
                              </TableCell>
                              <TableCell className="font-medium">{cliente?.nome || "—"}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Phone className="h-4 w-4 text-muted-foreground" />
                                  {cliente?.telefone || "—"}
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-800">
                                  {item.prospeccao_status || "Não contatado"}
                                </span>
                              </TableCell>
                              <TableCell>{item.ultimo_contato || "—"}</TableCell>
                              <TableCell>{item.proxima_acao || "—"}</TableCell>
                              <TableCell className="flex justify-end gap-1">
                                <Button variant="ghost" size="icon" aria-label="Ligar" onClick={() => window.location.href = `tel:+55${(cliente?.telefone || "").replace(/\D/g, "")}`}>
                                  <Phone className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" aria-label="WhatsApp" onClick={() => window.open(`https://wa.me/55${(cliente?.telefone || "").replace(/\D/g, "")}`, "_blank")}>
                                  <MessageSquare className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" aria-label="SMS" onClick={() => window.location.href = `sms:+55${(cliente?.telefone || "").replace(/\D/g, "")}`}>
                                  <MessageCircle className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" aria-label="E-mail" onClick={() => window.location.href = `mailto:${cliente?.email || ""}`}>
                                  <Mail className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" aria-label="Editar status" onClick={() => {
                                  const novoStatus = prompt("Novo status de prospecção:", item.prospeccao_status || "Não contatado");
                                  if (novoStatus !== null) {
                                    handleUpdatePastaItemStatus(item.id, novoStatus);
                                  }
                                }}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" aria-label="Remover da pasta" onClick={() => handleRemoveClienteFromPasta(item.id)}>
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedCliente ? "Editar contato" : "Novo contato"}</DialogTitle>
            <DialogDescription>{selectedCliente ? "Atualize os dados do contato." : "Cadastre um novo contato."}</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" value={formData.nome} onChange={(e) => handleChange("nome", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input id="telefone" value={formData.telefone} onChange={(e) => handleChange("telefone", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={formData.email} onChange={(e) => handleChange("email", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="observacoes">Observação</Label>
              <Input id="observacoes" value={formData.observacoes} onChange={(e) => handleChange("observacoes", e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : selectedCliente ? "Salvar alterações" : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir contato</DialogTitle>
            <DialogDescription>Tem certeza que deseja excluir este contato? Esta ação não pode ser desfeita.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteSelectedOpen} onOpenChange={setIsDeleteSelectedOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir contatos selecionados</DialogTitle>
            <DialogDescription>Tem certeza que deseja excluir {selectedClienteIds.size} contato(s)? Esta ação não pode ser desfeita.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteSelectedOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => { setIsDeleteSelectedOpen(false); void handleDeleteSelected(); }}>
              Excluir selecionados
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importar contatos</DialogTitle>
            <DialogDescription>Selecione o formato e o arquivo para importar.</DialogDescription>
          </DialogHeader>
            <Tabs value={importFormat} defaultValue="csv" onValueChange={(v) => setImportFormat(v as "csv" | "vcf" | "txt" | "xlsx")} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="csv">CSV</TabsTrigger>
              <TabsTrigger value="vcf">VCF/vCard</TabsTrigger>
              <TabsTrigger value="txt">TXT UTF-8</TabsTrigger>
              <TabsTrigger value="xlsx">XLSX</TabsTrigger>
            </TabsList>
            <TabsContent value={importFormat} className="space-y-4">
              <div className="space-y-2">
                <Label>Formato selecionado: {importFormat.toUpperCase()}</Label>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept={importFormat === "csv" ? ".csv" : importFormat === "vcf" ? ".vcf" : importFormat === "xlsx" ? ".xlsx" : ".txt"}
                  onChange={handleFileChange}
                />
                <p className="text-xs text-muted-foreground">Você também pode arrastar e soltar o arquivo nesta área.</p>
              </div>

              {importError && (
                <p className="text-sm text-red-600">{importError}</p>
              )}
              {importPreview.length > 0 && (
                <div className="space-y-2">
                  <Label>Prévia da importação</Label>
                  <div className="max-h-60 overflow-y-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Telefone</TableHead>
                          <TableHead>E-mail</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importPreview.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{item.nome || "—"}</TableCell>
                            <TableCell>{item.telefone || "—"}</TableCell>
                            <TableCell>{item.email || "—"}</TableCell>
                            <TableCell>
                              <Badge variant={item.status === "Novo" ? "success" : item.status === "Já cadastrado" ? "secondary" : "outline"}>
                                {item.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={() => setImportMode("new")}>
                      Importar somente novos
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setImportMode("update")}>
                      Atualizar existentes
                    </Button>
                    <Button type="button" onClick={() => setImportMode("all")}>
                      Importar todos
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportOpen(false)}>
              Fechar
            </Button>
            <Button onClick={handleImport} disabled={isImporting || importPreview.length === 0}>
              {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Confirmar importação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPastaFormOpen} onOpenChange={setIsPastaFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova pasta</DialogTitle>
            <DialogDescription>Crie uma pasta para organizar sua prospecção.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreatePasta}>
            <div className="space-y-2">
              <Label htmlFor="pasta-nome">Nome</Label>
              <Input id="pasta-nome" value={pastaFormData.nome} onChange={(e) => setPastaFormData((current) => ({ ...current, nome: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pasta-descricao">Descrição</Label>
              <Input id="pasta-descricao" value={pastaFormData.descricao} onChange={(e) => setPastaFormData((current) => ({ ...current, descricao: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pasta-cor">Cor</Label>
              <Input id="pasta-cor" type="color" value={pastaFormData.cor} onChange={(e) => setPastaFormData((current) => ({ ...current, cor: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pasta-origem">Origem</Label>
              <Input id="pasta-origem" value={pastaFormData.origem} onChange={(e) => setPastaFormData((current) => ({ ...current, origem: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pasta-observacao">Observação</Label>
              <Input id="pasta-observacao" value={pastaFormData.observacao} onChange={(e) => setPastaFormData((current) => ({ ...current, observacao: e.target.value }))} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsPastaFormOpen(false)}>
                Cancelar
              </Button>
              <Button type="button" onClick={createPastaNow}>Criar pasta</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddClienteToPastaOpen} onOpenChange={setIsAddClienteToPastaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar contato à pasta</DialogTitle>
            <DialogDescription>Selecione um contato para adicionar à pasta atual.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Contato</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedClienteForPasta?.id || ""}
                onChange={(e) => {
                  const cliente = clientes.find((c) => c.id === e.target.value);
                  setSelectedClienteForPasta(cliente || null);
                }}
              >
                <option value="">Selecione um contato</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nome} — {cliente.telefone}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Status de prospecção</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={pastaItemForm.prospeccao_status}
                onChange={(e) => setPastaItemForm((current) => ({ ...current, prospeccao_status: e.target.value as PastaItem["prospeccao_status"] }))}
              >
                <option value="Não contatado">Não contatado</option>
                <option value="Ligação realizada">Ligação realizada</option>
                <option value="WhatsApp enviado">WhatsApp enviado</option>
                <option value="SMS enviado">SMS enviado</option>
                <option value="Conversa iniciada">Conversa iniciada</option>
                <option value="Sem resposta">Sem resposta</option>
                <option value="Retorno pendente">Retorno pendente</option>
                <option value="Interessado">Interessado</option>
                <option value="Em negociação">Em negociação</option>
                <option value="Não interessado">Não interessado</option>
                <option value="Número inválido">Número inválido</option>
                <option value="Convertido">Convertido</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddClienteToPastaOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddClienteToPasta} disabled={!selectedClienteForPasta}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isMoveToPastaOpen} onOpenChange={setIsMoveToPastaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mover contatos para pasta</DialogTitle>
            <DialogDescription>Selecione a pasta de destino para os contatos selecionados.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Pasta de destino</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={targetPastaId}
                onChange={(e) => setTargetPastaId(e.target.value)}
              >
                <option value="">Selecione uma pasta</option>
                {pastas.map((pasta) => (
                  <option key={pasta.id} value={pasta.id}>
                    {pasta.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Contatos selecionados</Label>
              <div className="max-h-60 overflow-y-auto rounded-md border p-2">
                {clientes.filter((c) => selectedClienteIds.has(c.id)).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum contato selecionado.</p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {clientes.filter((c) => selectedClienteIds.has(c.id)).map((cliente) => (
                      <li key={cliente.id} className="flex items-center justify-between">
                        <span className="font-medium">{cliente.nome}</span>
                        <span className="text-muted-foreground">{cliente.telefone}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMoveToPastaOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleMoveSelectedToPasta} disabled={!targetPastaId || selectedClienteIds.size === 0}>
              Mover para pasta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPastaMassActionOpen} onOpenChange={setIsPastaMassActionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pastaMassActionType === "move" ? "Mover contatos da pasta" : "Remover contatos da pasta"}
            </DialogTitle>
            <DialogDescription>
              {pastaMassActionType === "move"
                ? "Selecione a pasta de destino para os contatos selecionados."
                : "Essa ação não exclui os contatos do CRM, apenas remove esta vinculação."}
            </DialogDescription>
          </DialogHeader>
          {pastaMassActionType === "move" && (
            <div className="space-y-2">
              <Label>Pasta de destino</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={targetPastaIdForMove}
                onChange={(e) => setTargetPastaIdForMove(e.target.value)}
              >
                <option value="">Selecione uma pasta</option>
                {pastas
                  .filter((p) => p.id !== selectedPastaId)
                  .map((pasta) => (
                    <option key={pasta.id} value={pasta.id}>
                      {pasta.nome}
                    </option>
                  ))}
              </select>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            {selectedPastaItemIds.size} contato(s) selecionado(s)
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPastaMassActionOpen(false)}>
              Cancelar
            </Button>
            {pastaMassActionType === "move" ? (
              <Button onClick={handleMovePastaItemsToPasta} disabled={!targetPastaIdForMove}>
                Mover para pasta
              </Button>
            ) : (
              <Button variant="destructive" onClick={handleRemovePastaItems}>
                Remover da pasta
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditPastaOpen} onOpenChange={setIsEditPastaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar pasta</DialogTitle>
            <DialogDescription>Atualize os dados da pasta.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={editPastaForm.nome} onChange={(e) => setEditPastaForm((current) => ({ ...current, nome: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input value={editPastaForm.descricao} onChange={(e) => setEditPastaForm((current) => ({ ...current, descricao: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <Input type="color" value={editPastaForm.cor} onChange={(e) => setEditPastaForm((current) => ({ ...current, cor: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Origem</Label>
              <Input value={editPastaForm.origem} onChange={(e) => setEditPastaForm((current) => ({ ...current, origem: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Observação</Label>
              <Input value={editPastaForm.observacao} onChange={(e) => setEditPastaForm((current) => ({ ...current, observacao: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditPastaOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEditPasta}>Salvar alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeletePastaOpen} onOpenChange={setIsDeletePastaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir pasta</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a pasta <strong>{deletingPasta?.nome}</strong>? Os contatos continuarão cadastrados no CRM, mas serão removidos desta pasta.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeletePastaOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleConfirmDeletePasta}>
              Excluir pasta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isConvertOpen} onOpenChange={setIsConvertOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Converter contato</DialogTitle>
            <DialogDescription>Selecione para qual módulo deseja converter <strong>{convertingCliente?.nome}</strong>.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Destino</Label>
              <select
                value={convertTarget}
                onChange={(e) => setConvertTarget(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="leads">Lead</option>
                <option value="clientes">Cliente</option>
                <option value="indicadores">Indicador</option>
                <option value="parceiros">Parceiro</option>
                <option value="recrutamento">Recrutamento</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConvertOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConvert} disabled={isConverting}>
              {isConverting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Converter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
