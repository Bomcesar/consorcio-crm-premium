import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ liveId: string }>;
};

export default async function LiveVozSalaPage({ params }: Props) {
  const { liveId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // O anfitrião é determinado no banco, nunca pela URL.
  const { data: live } = await supabase
    .from("live_rooms")
    .select("id, titulo, anfitriao_id, status")
    .eq("id", liveId)
    .single();

  const isHost = !!live && user?.id === (live as { anfitriao_id: string }).anfitriao_id;

  const { LiveRoomView } = await import("@/components/live/live-room-view");

  return <LiveRoomView liveId={liveId} isHost={isHost} />;
}
