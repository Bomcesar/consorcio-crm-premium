import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import type { TickerMessage, TickerMessageInsert } from "@/repositories/client/ticker.repository";

const emptyForm: TickerMessageInsert = {
  text: "",
  tipo: "mensagem_dia",
  ativo: true,
};

export function useTickerMessages() {
  const { success, error } = useToast();
  const [messages, setMessages] = useState<TickerMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<TickerMessageInsert>(emptyForm);
  const [selected, setSelected] = useState<TickerMessage | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const load = async () => {
    setIsLoading(true);
    try {
      const { getTickerMessages } = await import("@/repositories/client/ticker.repository");
      const data = await getTickerMessages();
      setMessages(data);
    } catch {
      error("Não foi possível carregar as mensagens.");
    } finally {
      setIsLoading(false);
    }
  };

  const subscribedRef = useRef(false);

  useEffect(() => {
    if (subscribedRef.current) return;
    subscribedRef.current = true;

    void load();

    const supabase = createClient();
    const topic = "public:ticker_messages";
    const realtimeTopic = `realtime:${topic}`;

    const channels = supabase.getChannels();
    channels
      .filter((c) => c.topic === realtimeTopic)
      .forEach((chan) => {
        supabase.removeChannel(chan);
        const idx = channels.indexOf(chan);
        if (idx > -1) channels.splice(idx, 1);
      });

    const channel = supabase
      .channel(topic)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ticker_messages" },
        (payload) => {
          const newMsg = payload.new as TickerMessage;
          setMessages((prev) => [newMsg, ...prev]);
        },
      )
      .subscribe();

    const handler = (e: CustomEvent<{ text: string; tipo: string }>) => {
      const newMsg: TickerMessage = {
        id: `temp-${Date.now()}`,
        text: e.detail.text,
        tipo: e.detail.tipo,
        ativo: true,
        usuario_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setMessages((prev) => [newMsg, ...prev]);
    };

    window.addEventListener("crm:ticker:new", handler as EventListener);
    return () => {
      window.removeEventListener("crm:ticker:new", handler as EventListener);
      supabase.removeChannel(channel);
      const chans = supabase.getChannels();
      const idx = chans.indexOf(channel);
      if (idx > -1) chans.splice(idx, 1);
    };
  }, []);

  const openCreate = () => {
    setSelected(null);
    setFormData(emptyForm);
    setIsFormOpen(true);
  };

  const openEdit = (item: TickerMessage) => {
    setSelected(item);
    setFormData({
      id: item.id,
      text: item.text,
      tipo: item.tipo as TickerMessageInsert["tipo"],
      ativo: item.ativo,
      usuario_id: item.usuario_id,
    });
    setIsFormOpen(true);
  };

  const openDelete = (item: TickerMessage) => {
    setSelected(item);
    setIsDeleteOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData.text?.trim()) return;

    setIsSaving(true);
    try {
      const { createTickerMessage, updateTickerMessage } = await import("@/repositories/client/ticker.repository");

      if (selected) {
        const updated = await updateTickerMessage(selected.id, formData);
        setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        success("Mensagem atualizada com sucesso.");
      } else {
        const created = await createTickerMessage(formData);
        setMessages((prev) => [created, ...prev]);
        success("Mensagem cadastrada com sucesso.");
      }

      setIsFormOpen(false);
      setFormData(emptyForm);
      setSelected(null);
    } catch {
      error("Não foi possível salvar a mensagem.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    try {
      const { deleteTickerMessage } = await import("@/repositories/client/ticker.repository");
      await deleteTickerMessage(selected.id);
      setMessages((prev) => prev.filter((m) => m.id !== selected.id));
      success("Mensagem excluída com sucesso.");
      setIsDeleteOpen(false);
      setSelected(null);
    } catch {
      error("Não foi possível excluir a mensagem.");
    }
  };

  return {
    messages,
    isLoading,
    isSaving,
    formData,
    setFormData,
    selected,
    setSelected,
    isFormOpen,
    setIsFormOpen,
    isDeleteOpen,
    setIsDeleteOpen,
    openCreate,
    openEdit,
    openDelete,
    handleSubmit,
    handleDelete,
    refresh: load,
  };
}
