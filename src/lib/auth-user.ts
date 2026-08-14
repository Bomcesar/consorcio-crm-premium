import { createClient } from "@/lib/supabase/client";

export type AuthenticatedUser = {
  id: string;
  email?: string;
};

export async function getAuthenticatedUser(): Promise<AuthenticatedUser> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user?.id) {
    throw new Error("Não autenticado.");
  }

  return {
    id: data.user.id,
    email: data.user.email ?? undefined,
  };
}
