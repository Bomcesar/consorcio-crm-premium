import { createAdminClient } from "../src/lib/supabase/server";

const USERS = [
  { email: "admin@crm.com", nome: "Admin", perfil: "Administrador" },
  { email: "analuciadeoliveira148@gmail.com", nome: "Ana Lucia", perfil: "Trainee" },
  { email: "fabioantoniosimonete891@gmail.com", nome: "Fabio Simonete", perfil: "Trainee" },
  { email: "radiofiladelfia106tvnews@gmail.com", nome: "Filadelfia", perfil: "Consultor" },
  { email: "mateuzingoncalves4@gmail.com", nome: "Mateus Martinez", perfil: "Trainee" },
  { email: "paulo.martinez@autorizadoademicon.com.br", nome: "Paulo Cesar", perfil: "Administrador" },
  { email: "paulocesar19106@gmail.com", nome: "Paulo Cesar", perfil: "Administrador" },
];

const DEFAULT_PASSWORD = "123456";

async function main() {
  const supabase = createAdminClient();

  for (const user of USERS) {
    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: DEFAULT_PASSWORD,
        email_confirm: true,
      });

      if (error) {
        console.error(`Erro ao criar ${user.email}:`, error.message);
        continue;
      }

      if (!data.user) {
        console.error(`Usuário não retornado para ${user.email}`);
        continue;
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: data.user.id,
            nome: user.nome,
            email: user.email,
            perfil: user.perfil,
            ativo: true,
          },
          { onConflict: "id" }
        );

      if (profileError) {
        console.error(`Erro ao criar profile para ${user.email}:`, profileError.message);
      }

      console.log(`Usuário criado: ${user.email} (${user.perfil})`);
    } catch (err) {
      console.error(`Erro inesperado para ${user.email}:`, err);
    }
  }
}

main().catch((err) => {
  console.error("Erro no seed:", err);
  process.exit(1);
});
