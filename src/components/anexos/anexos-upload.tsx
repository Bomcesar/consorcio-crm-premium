"use client";

import { useCallback, useState } from "react";
import { useAnexos } from "@/hooks/use-anexos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload } from "lucide-react";
import type { Anexo } from "@/repositories/client/anexos.repository";

interface AnexosUploadProps {
  entityType: string;
  entityId: string;
  onUploaded?: (anexo: Anexo) => void;
  accept?: string;
  maxSizeMB?: number;
}

export function AnexosUpload({
  entityType,
  entityId,
  onUploaded,
  accept = ".pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.jpg,.jpeg,.png,.gif,.webp,.mp4,.webm,.mp3,.wav,.ogg,.txt,.csv,.md",
  maxSizeMB = 50,
}: AnexosUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const anexos = useAnexos();

  const handleUpload = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const input = event.currentTarget.elements.namedItem("file") as HTMLInputElement | null;
      const file = input?.files?.[0];

      if (!file) return;

      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`Arquivo muito grande. Tamanho máximo: ${maxSizeMB}MB`);
        return;
      }

      setIsUploading(true);
      setError(null);

      try {
        const uploaded = await anexos.upload(entityType, entityId, file);
        onUploaded?.(uploaded);
        if (input) input.value = "";
      } catch {
        setError("Não foi possível enviar o arquivo.");
      } finally {
        setIsUploading(false);
      }
    },
    [anexos, entityType, entityId, maxSizeMB, onUploaded]
  );

  return (
    <form onSubmit={handleUpload} className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          id={`anexo-upload-${entityType}-${entityId}`}
          name="file"
          type="file"
          accept={accept}
          disabled={isUploading}
          className="hidden"
        />
        <Label
          htmlFor={`anexo-upload-${entityType}-${entityId}`}
          className="cursor-pointer"
        >
          <Button type="button" variant="outline" size="sm" disabled={isUploading} asChild>
            <span>
              {isUploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {isUploading ? "Enviando..." : "Enviar arquivo"}
            </span>
          </Button>
        </Label>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </form>
  );
}
