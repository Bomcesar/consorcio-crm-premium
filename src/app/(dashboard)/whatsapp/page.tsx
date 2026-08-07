"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { ExternalLink, MessageCircle, MessageSquareText, Pin, PinOff, Send, Smartphone, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useWhatsApp } from "@/hooks/use-whatsapp";
import type { WhatsAppConversation, WhatsAppConversationStatus, WhatsAppMessage, WhatsAppTemplate } from "@/types/crm";

const statusOptions: WhatsAppConversationStatus[] = ["Novo", "Em atendimento", "Aguardando retorno", "Concluido"];

function formatDateTime(value: string | null) {
  if (!value) return "Sem histórico";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sem histórico";

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function openWhatsAppLink(phone: string, text: string) {
  const encodedText = encodeURIComponent(text.trim());
  window.open(`https://wa.me/${phone}?text=${encodedText}`, "_blank", "noopener,noreferrer");
}

export default function WhatsAppPage() {
  const { profile } = useAuth();
  const { listConversations, listMessages, listTemplates, sendMessage, registerInbound, updateConversation } = useWhatsApp();
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"Todos" | WhatsAppConversationStatus>("Todos");
  const [outboundMessage, setOutboundMessage] = useState("");
  const [inboundMessage, setInboundMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadConversations = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [conversationData, templateData] = await Promise.all([listConversations(), listTemplates()]);
      setConversations(conversationData);
      setTemplates(templateData);
      setSelectedConversationId((current) => {
        if (current && conversationData.some((item) => item.id === current)) {
          return current;
        }
        return conversationData[0]?.id ?? null;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao foi possivel carregar o modulo de WhatsApp.";
      setErrorMessage(message);
      setConversations([]);
      setTemplates([]);
      setSelectedConversationId(null);
    } finally {
      setIsLoading(false);
    }
  }, [listConversations, listTemplates]);

  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const data = await listMessages(conversationId);
      setMessages(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao foi possivel carregar as mensagens.";
      setErrorMessage(message);
      setMessages([]);
    }
  }, [listMessages]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      return;
    }

    void loadMessages(selectedConversationId);
  }, [loadMessages, selectedConversationId]);

  useEffect(() => {
    if (!successMessage) return undefined;
    const timer = window.setTimeout(() => setSuccessMessage(null), 3000);
    return () => window.clearTimeout(timer);
  }, [successMessage]);

  const filteredConversations = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return conversations.filter((conversation) => {
      const passSearch =
        !term ||
        [conversation.contact_name, conversation.phone, conversation.city, conversation.last_message]
          .join(" ")
          .toLowerCase()
          .includes(term);

      const passStatus = filterStatus === "Todos" || conversation.status === filterStatus;
      return passSearch && passStatus;
    });
  }, [conversations, filterStatus, searchTerm]);

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId],
  );

  const summary = useMemo(() => {
    return {
      total: conversations.length,
      pendentes: conversations.filter((conversation) => conversation.status === "Aguardando retorno").length,
      emAtendimento: conversations.filter((conversation) => conversation.status === "Em atendimento").length,
      semMensagens: conversations.filter((conversation) => conversation.last_message === "Sem mensagens ainda").length,
    };
  }, [conversations]);

  const refreshConversationSlice = useCallback(async (conversationId: string) => {
    await Promise.all([loadConversations(), loadMessages(conversationId)]);
  }, [loadConversations, loadMessages]);

  const handleSendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedConversation || !outboundMessage.trim()) return;

    setIsSaving(true);
    setErrorMessage(null);

    try {
      await sendMessage({
        conversation_id: selectedConversation.id,
        content: outboundMessage.trim(),
        author_name: profile?.nome || "Consultor",
      });
      openWhatsAppLink(selectedConversation.phone, outboundMessage.trim());
      setOutboundMessage("");
      await refreshConversationSlice(selectedConversation.id);
      setSuccessMessage("Mensagem registrada e WhatsApp aberto.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao foi possivel registrar o envio da mensagem.";
      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegisterInbound = async () => {
    if (!selectedConversation || !inboundMessage.trim()) return;

    setIsSaving(true);
    setErrorMessage(null);

    try {
      await registerInbound({
        conversation_id: selectedConversation.id,
        content: inboundMessage.trim(),
        author_name: selectedConversation.contact_name,
      });
      setInboundMessage("");
      await refreshConversationSlice(selectedConversation.id);
      setSuccessMessage("Resposta recebida registrada com sucesso.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao foi possivel registrar a resposta.";
      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (status: WhatsAppConversationStatus) => {
    if (!selectedConversation) return;

    try {
      await updateConversation(selectedConversation.id, { status });
      await loadConversations();
      setSuccessMessage("Status da conversa atualizado.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao foi possivel atualizar o status da conversa.";
      setErrorMessage(message);
    }
  };

  const handleTogglePinned = async () => {
    if (!selectedConversation) return;

    try {
      await updateConversation(selectedConversation.id, { pinned: !selectedConversation.pinned });
      await loadConversations();
      setSuccessMessage(selectedConversation.pinned ? "Conversa desafixada." : "Conversa fixada no topo.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao foi possivel atualizar a conversa.";
      setErrorMessage(message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">WhatsApp</h2>
          <p className="text-sm text-muted-foreground">Sprint 2: central de atendimento, follow-up e histórico de conversas com indicadores.</p>
        </div>
        <Badge variant="success" className="w-fit">Operacional</Badge>
      </div>

      {errorMessage ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600">
          {successMessage}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/50 bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Conversas ativas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total}</div>
            <p className="mt-1 text-xs text-muted-foreground">Indicadores com canal disponível</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Em atendimento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.emAtendimento}</div>
            <p className="mt-1 text-xs text-muted-foreground">Conversas com abordagem ativa</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Aguardando retorno</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.pendentes}</div>
            <p className="mt-1 text-xs text-muted-foreground">Contatos esperando resposta</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sem histórico</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.semMensagens}</div>
            <p className="mt-1 text-xs text-muted-foreground">Prontos para primeiro contato</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="border-border/50 bg-card/70">
          <CardHeader>
            <CardTitle className="text-lg">Fila de conversas</CardTitle>
            <CardDescription>Use busca, status e fixação para priorizar o atendimento.</CardDescription>
            <div className="grid gap-2 pt-2">
              <Input
                placeholder="Buscar por nome, telefone, cidade ou última mensagem"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={filterStatus}
                onChange={(event) => setFilterStatus(event.target.value as "Todos" | WhatsAppConversationStatus)}
              >
                <option value="Todos">Todos os status</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? <p className="text-sm text-muted-foreground">Carregando conversas...</p> : null}
            {!isLoading && filteredConversations.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum indicador com WhatsApp disponível foi encontrado.</p>
            ) : null}
            <div className="space-y-3">
              {filteredConversations.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => setSelectedConversationId(conversation.id)}
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    selectedConversationId === conversation.id
                      ? "border-primary bg-primary/5"
                      : "border-border/50 bg-background/40 hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{conversation.contact_name}</p>
                        {conversation.pinned ? <Pin className="h-3.5 w-3.5 text-primary" /> : null}
                      </div>
                      <p className="text-xs text-muted-foreground">{conversation.city || "Cidade não informada"}</p>
                    </div>
                    <Badge variant="outline">{conversation.status}</Badge>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{conversation.last_message}</p>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{conversation.phone}</span>
                    <span>{formatDateTime(conversation.last_message_at)}</span>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border/50 bg-card/70">
            <CardHeader>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="text-lg">{selectedConversation?.contact_name || "Selecione uma conversa"}</CardTitle>
                  <CardDescription>
                    {selectedConversation
                      ? `${selectedConversation.source} • ${selectedConversation.phone}`
                      : "Escolha um indicador para iniciar o atendimento."}
                  </CardDescription>
                </div>
                {selectedConversation ? (
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={handleTogglePinned}>
                      {selectedConversation.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                      {selectedConversation.pinned ? "Desafixar" : "Fixar"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => openWhatsAppLink(selectedConversation.phone, outboundMessage || "Olá!")}
                    >
                      <ExternalLink className="h-4 w-4" />
                      Abrir WhatsApp
                    </Button>
                  </div>
                ) : null}
              </div>
            </CardHeader>
            <CardContent>
              {selectedConversation ? (
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-lg border border-border/50 bg-background/40 p-4">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <select
                      className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={selectedConversation.status}
                      onChange={(event) => void handleStatusChange(event.target.value as WhatsAppConversationStatus)}
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="rounded-lg border border-border/50 bg-background/40 p-4">
                    <p className="text-xs text-muted-foreground">Última movimentação</p>
                    <p className="mt-2 text-sm font-medium">{formatDateTime(selectedConversation.last_message_at)}</p>
                  </div>
                  <div className="rounded-lg border border-border/50 bg-background/40 p-4">
                    <p className="text-xs text-muted-foreground">Canal</p>
                    <p className="mt-2 text-sm font-medium">{selectedConversation.source}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma conversa selecionada.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/70">
            <CardHeader>
              <CardTitle className="text-lg">Mensagens</CardTitle>
              <CardDescription>Histórico operacional do atendimento e follow-up.</CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedConversation ? (
                <p className="text-sm text-muted-foreground">Selecione uma conversa para ver o histórico.</p>
              ) : messages.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma mensagem registrada ainda para este indicador.</p>
              ) : (
                <div className="space-y-3">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`rounded-xl border p-4 ${
                        message.direction === "outbound"
                          ? "ml-auto border-primary/20 bg-primary/10"
                          : "border-border/50 bg-background/40"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          {message.direction === "outbound" ? <Send className="h-3.5 w-3.5" /> : <MessageCircle className="h-3.5 w-3.5" />}
                          {message.direction === "outbound" ? "Enviada" : "Recebida"}
                        </span>
                        <span>{formatDateTime(message.created_at)}</span>
                      </div>
                      <p className="mt-2 text-sm">{message.content}</p>
                      <p className="mt-2 text-xs text-muted-foreground">{message.author_name}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <Card className="border-border/50 bg-card/70">
              <CardHeader>
                <CardTitle className="text-lg">Enviar mensagem</CardTitle>
                <CardDescription>Registra o envio e abre o contato no WhatsApp oficial.</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleSendMessage}>
                  <div className="space-y-2">
                    <Label htmlFor="outbound-message">Mensagem</Label>
                    <textarea
                      id="outbound-message"
                      className="flex min-h-[140px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={outboundMessage}
                      onChange={(event) => setOutboundMessage(event.target.value)}
                      placeholder="Digite a mensagem que será enviada ao indicador"
                      disabled={!selectedConversation}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {templates.map((template) => (
                      <Button
                        key={template.id}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setOutboundMessage(template.content)}
                        disabled={!selectedConversation}
                      >
                        <MessageSquareText className="h-4 w-4" />
                        {template.title}
                      </Button>
                    ))}
                  </div>

                  <Button type="submit" disabled={!selectedConversation || isSaving || !outboundMessage.trim()}>
                    <Send className="h-4 w-4" />
                    Registrar envio e abrir WhatsApp
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/70">
              <CardHeader>
                <CardTitle className="text-lg">Registrar resposta</CardTitle>
                <CardDescription>Use quando o cliente respondeu e você quer manter o histórico atualizado.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="inbound-message">Resposta recebida</Label>
                  <textarea
                    id="inbound-message"
                    className="flex min-h-[140px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={inboundMessage}
                    onChange={(event) => setInboundMessage(event.target.value)}
                    placeholder="Descreva a resposta recebida no WhatsApp"
                    disabled={!selectedConversation}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleRegisterInbound()}
                  disabled={!selectedConversation || isSaving || !inboundMessage.trim()}
                >
                  <Smartphone className="h-4 w-4" />
                  Registrar resposta
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/50 bg-card/70">
            <CardHeader>
              <CardTitle className="text-lg">Resumo da conversa</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedConversation ? (
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-lg border border-border/50 bg-background/40 p-4">
                    <p className="flex items-center gap-2 text-sm font-medium"><UserRound className="h-4 w-4 text-primary" /> Contato</p>
                    <p className="mt-2 text-sm text-muted-foreground">{selectedConversation.contact_name}</p>
                  </div>
                  <div className="rounded-lg border border-border/50 bg-background/40 p-4">
                    <p className="flex items-center gap-2 text-sm font-medium"><Smartphone className="h-4 w-4 text-primary" /> Telefone</p>
                    <p className="mt-2 text-sm text-muted-foreground">{selectedConversation.phone}</p>
                  </div>
                  <div className="rounded-lg border border-border/50 bg-background/40 p-4">
                    <p className="flex items-center gap-2 text-sm font-medium"><MessageCircle className="h-4 w-4 text-primary" /> Mensagens</p>
                    <p className="mt-2 text-sm text-muted-foreground">{messages.length} registradas</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Selecione uma conversa para ver o resumo.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
