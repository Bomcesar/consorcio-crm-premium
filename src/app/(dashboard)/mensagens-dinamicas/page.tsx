"use client";

import { useState } from "react";
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
import { useTickerMessages } from "@/hooks/use-ticker-messages";
import { useToast } from "@/hooks/use-toast";
import type { TickerMessageInsert } from "@/repositories/client/ticker.repository";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

const emptyForm: TickerMessageInsert = {
  text: "",
  tipo: "mensagem_dia",
  ativo: true,
};

export default function TickerMessagesPage() {
  const { success, error } = useToast();
  const ticker = useTickerMessages();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Mensagens dinâmicas</h2>
          <p className="text-sm text-muted-foreground">Cadastre e edite as mensagens que aparecem no topo do dashboard.</p>
        </div>
        <Button onClick={ticker.openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nova mensagem
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mensagens cadastradas</CardTitle>
          <CardDescription>
            {ticker.messages.length > 0 ? `${ticker.messages.length} mensagem(ns) encontrada(s)` : "Nenhuma mensagem cadastrada ainda."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ticker.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : ticker.messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma mensagem cadastrada ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mensagem</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[160px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ticker.messages.map((message) => (
                    <TableRow key={message.id}>
                      <TableCell className="font-medium">{message.text}</TableCell>
                      <TableCell>{message.tipo === "mensagem_dia" ? "Mensagem do dia" : message.tipo === "mensagem_mes" ? "Mensagem do mês" : message.tipo === "resultado" ? "Resultado" : "Meta"}</TableCell>
                      <TableCell>{message.ativo ? "Ativo" : "Inativo"}</TableCell>
                      <TableCell className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => ticker.openEdit(message)} aria-label="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => ticker.openDelete(message)} aria-label="Excluir">
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={ticker.isFormOpen} onOpenChange={ticker.setIsFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{ticker.selected ? "Editar mensagem" : "Nova mensagem"}</DialogTitle>
            <DialogDescription>{ticker.selected ? "Atualize a mensagem do ticker." : "Cadastre uma nova mensagem para o ticker do dashboard."}</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={ticker.handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="text">Mensagem</Label>
              <Input id="text" value={ticker.formData.text} onChange={(e) => ticker.setFormData({ ...ticker.formData, text: e.target.value })} placeholder="Ex: Parabéns Consultor X por realizar mais um sonho" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo</Label>
              <select
                id="tipo"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={ticker.formData.tipo}
                onChange={(e) => ticker.setFormData({ ...ticker.formData, tipo: e.target.value as TickerMessageInsert["tipo"] })}
              >
                <option value="mensagem_dia">Mensagem do dia</option>
                <option value="mensagem_mes">Mensagem do mês</option>
                <option value="resultado">Resultado</option>
                <option value="meta">Meta</option>
              </select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { ticker.setIsFormOpen(false); ticker.setFormData(emptyForm); ticker.setSelected(null); }}>
                Cancelar
              </Button>
              <Button type="submit" disabled={ticker.isSaving}>
                {ticker.isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : ticker.selected ? "Salvar alterações" : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={ticker.isDeleteOpen} onOpenChange={ticker.setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir mensagem</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a mensagem <strong>{ticker.selected?.text}</strong>? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => ticker.setIsDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={ticker.handleDelete}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
