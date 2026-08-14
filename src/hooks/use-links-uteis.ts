import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { LinkUtil, LinkUtilInsert } from "@/repositories/client/links-uteis.repository";

const emptyForm: LinkUtilInsert = {
  nome: "",
  descricao: "",
  categoria: "",
  url: "",
  status: "Ativo",
  usuario_id: "",
};

export function useLinksUteis() {
  const { success, error } = useToast();
  const [links, setLinks] = useState<LinkUtil[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState<LinkUtilInsert>(emptyForm);
  const [selectedLink, setSelectedLink] = useState<LinkUtil | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategoria, setFilterCategoria] = useState("");

  const loadLinks = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const { getLinksUteis } = await import("@/repositories/client/links-uteis.repository");
      const data = await getLinksUteis();
      setLinks(data);
    } catch {
      setErrorMessage("Não foi possível carregar os links.");
      error("Não foi possível carregar os links.");
    } finally {
      setIsLoading(false);
    }
  }, [error]);

  const openCreate = () => {
    setSelectedLink(null);
    setFormData(emptyForm);
    setIsFormOpen(true);
  };

  const openEdit = (link: LinkUtil) => {
    setSelectedLink(link);
    setFormData({
      id: link.id,
      nome: link.nome,
      descricao: link.descricao,
      categoria: link.categoria,
      url: link.url,
      status: link.status,
      usuario_id: link.usuario_id,
      created_at: link.created_at,
      updated_at: link.updated_at,
    });
    setIsFormOpen(true);
  };

  const openDelete = (link: LinkUtil) => {
    setSelectedLink(link);
    setIsDeleteOpen(true);
  };

  const validateUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url);
      const allowedProtocols = ["http:", "https:"];
      if (!allowedProtocols.includes(parsed.protocol)) {
        return false;
      }
      const lower = url.toLowerCase();
      if (lower.includes("<script") || lower.includes("javascript:") || lower.includes("data:")) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!(formData.nome?.trim()) && !selectedLink) return;

    const trimmedUrl = formData.url?.trim() || "";
    if (!validateUrl(trimmedUrl)) {
      setErrorMessage("URL inválida. Use apenas http(s) e evite conteúdo suspeito.");
      error("URL inválida.");
      return;
    }

    setIsSaving(true);
    try {
      const payload: LinkUtilInsert = {
        nome: formData.nome?.trim() || "",
        descricao: formData.descricao?.trim() || "",
        categoria: formData.categoria?.trim() || "",
        url: trimmedUrl,
        status: formData.status,
        usuario_id: formData.usuario_id,
      };

      const { createLinkUtil, updateLinkUtil } = await import("@/repositories/client/links-uteis.repository");

      if (selectedLink) {
        const updated = await updateLinkUtil(selectedLink.id, payload);
        setLinks((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
        success("Link atualizado com sucesso.");
      } else {
        const created = await createLinkUtil(payload);
        setLinks((prev) => [created, ...prev]);
        success("Link cadastrado com sucesso.");
      }
      setIsFormOpen(false);
      setFormData(emptyForm);
      setSelectedLink(null);
    } catch {
      error("Não foi possível salvar o link.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedLink) return;
    try {
      const { deleteLinkUtil } = await import("@/repositories/client/links-uteis.repository");
      await deleteLinkUtil(selectedLink.id);
      setLinks((prev) => prev.filter((l) => l.id !== selectedLink.id));
      success("Link excluído com sucesso.");
      setIsDeleteOpen(false);
      setSelectedLink(null);
    } catch {
      error("Não foi possível excluir o link.");
    }
  };

  const filteredLinks = links.filter((l) => {
    const matchesSearch = l.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.descricao.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategoria = filterCategoria === "" || l.categoria === filterCategoria;
    return matchesSearch && matchesCategoria;
  });

  const categorias = Array.from(new Set(links.map((l) => l.categoria)));

  const refresh = async () => {
    await loadLinks();
  };

  useEffect(() => {
    void loadLinks();
  }, [loadLinks]);

  return {
    links: filteredLinks,
    allLinks: links,
    isLoading,
    isSaving,
    errorMessage,
    formData,
    setFormData,
    selectedLink,
    setSelectedLink,
    isFormOpen,
    setIsFormOpen,
    isDeleteOpen,
    setIsDeleteOpen,
    searchQuery,
    setSearchQuery,
    filterCategoria,
    setFilterCategoria,
    categorias,
    openCreate,
    openEdit,
    openDelete,
    handleSubmit,
    handleDelete,
    refresh,
  };
}
