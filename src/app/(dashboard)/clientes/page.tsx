import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

const clientes = [
  { nome: "Maria Silva", status: "Ativo", cidade: "São Paulo", telefone: "(11) 99999-0001" },
  { nome: "João Pereira", status: "Em análise", cidade: "Rio de Janeiro", telefone: "(21) 98888-0002" },
  { nome: "Ana Costa", status: "Ativo", cidade: "Belo Horizonte", telefone: "(31) 97777-0003" },
];

export default function ClientesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Users className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
          <p className="text-sm text-muted-foreground">Base completa de clientes</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Clientes</CardTitle>
          <CardDescription>Lista inicial de clientes para validar o funcionamento da página.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Nome</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Cidade</th>
                  <th className="px-3 py-2 font-medium">Telefone</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((cliente) => (
                  <tr key={cliente.nome} className="border-b last:border-b-0">
                    <td className="px-3 py-3 font-medium">{cliente.nome}</td>
                    <td className="px-3 py-3">
                      <Badge variant="success">{cliente.status}</Badge>
                    </td>
                    <td className="px-3 py-3">{cliente.cidade}</td>
                    <td className="px-3 py-3">{cliente.telefone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
