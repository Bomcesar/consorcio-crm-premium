"use client";

import { useCallback, useEffect, useState } from "react";
import { useAnexos } from "@/hooks/use-anexos";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Trash2, FileText, Image, Film, Music, File } from "lucide-react";
import type { Anexo } from "@/repositories/client/anexos.repository";

interface AnexosListProps {
  entityType: string;
  entityId: string;
  onDeleted?: (id: string) => void;
}

type FileType = "pdf" | "image" | "video" | "audio" | "text" | "other";

function getFileType(mimeType: string): FileType {
  if (mimeType.includes("pdf")) return "pdf";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.startsWith("text/") || mimeType.includes("document") || mimeType.includes("spreadsheet")) return "text";
  return "other";
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function getFileIcon(type: FileType) {
  const icons: Record<FileType, typeof FileText> = {
    pdf: FileText,
    image: Image,
    video: Film,
    audio: Music,
    text: FileText,
    other: File,
  };
  return icons[type] || File;
}

export function AnexosList({ entityType, entityId, onDeleted }: AnexosListProps) {
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const anexosHook = useAnexos();

  const loadAnexos = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await anexosHook.list(entityType, entityId);
      setAnexos(data);
    } catch {
      setAnexos([]);
    } finally {
      setIsLoading(false);
    }
  }, [anexosHook, entityType, entityId]);

  useEffect(() => {
    void loadAnexos();
  }, [loadAnexos]);

  const handleDownload = async (anexo: Anexo) => {
    setDownloadingId(anexo.id);
    try {
      const url = await anexosHook.getDownloadUrl(anexo.caminho);
      window.open(url, "_blank");
    } catch {
      alert("Não foi possível baixar o arquivo.");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este anexo?")) return;
    setDeletingId(id);
    try {
      await anexosHook.remove(id);
      setAnexos((prev) => prev.filter((a) => a.id !== id));
      onDeleted?.(id);
    } catch {
      alert("Não foi possível excluir o anexo.");
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (anexos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Nenhum anexo registrado.</p>
    );
  }

  return (
    <div className="space-y-2">
      {anexos.map((anexo) => {
        const fileType = getFileType(anexo.tipo);
        const Icon = getFileIcon(fileType);

        return (
          <div
            key={anexo.id}
            className="flex items-center justify-between rounded-lg border border-border/50 p-3"
          >
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{anexo.nome}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(anexo.tamanho)} • {new Date(anexo.created_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDownload(anexo)}
                disabled={downloadingId === anexo.id}
                aria-label="Download"
              >
                {downloadingId === anexo.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(anexo.id)}
                disabled={deletingId === anexo.id}
                aria-label="Excluir"
              >
                {deletingId === anexo.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 text-red-600" />
                )}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
