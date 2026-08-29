"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboard } from "@/hooks/use-dashboard";
import { useToast } from "@/hooks/use-toast";
import { BarChart3, Users, UserPlus, Handshake, Calendar, MessageCircle, Lock, Download } from "lucide-react";
import { useEffect, useState } from "react";
import { getAuthenticatedUser, hasPermission } from "@/lib/auth-user";
import { getModuleReport, getRelatorioPayload, type ModuleReportItem, type RelatorioPayload } from "@/repositories/client/dashboard.repository";

const availableModules = [
  { key: "leads", label: "Leads", icon: UserPlus },
  { key: "clientes", label: "Clientes", icon: Users },
  { key: "indicadores", label: "Indicadores", icon: Users },
  { key: "negociacoes", label: "Negociações", icon: Handshake },
  { key: "comissoes", label: "Comissões", icon: BarChart3 },
  { key: "agenda", label: "Agenda", icon: Calendar },
  { key: "whatsapp", label: "WhatsApp", icon: MessageCircle },
] as const;

export default function RelatoriosPage() {
  const { error: _error } = useToast();
  const { atividades, pipeline, isLoading, errorMessage, reload } = useDashboard();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [selectedModules, setSelectedModules] = useState<string[]>(["leads", "clientes", "indicadores", "negociacoes", "comissoes"]);
  const [moduleReports, setModuleReports] = useState<ModuleReportItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<RelatorioPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    const checkAccess = async () => {
      try {
        const user = await getAuthenticatedUser();
        const allowed = hasPermission(user, "relatorios.ver");
        if (!cancelled) {
          setHasAccess(allowed);
        }
      } catch {
        if (!cancelled) {
          setHasAccess(false);
        }
      } finally {
        if (!cancelled) {
          setIsChecking(false);
        }
      }
    };
    void checkAccess();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleModule = (key: string) => {
    setSelectedModules((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    );
  };

  const handleGenerateReport = async () => {
    if (selectedModules.length === 0) return;
    setIsGenerating(true);
    try {
      const reports = await Promise.all(selectedModules.map((module) => getModuleReport(module)));
      setModuleReports(reports);
      const payload = await getRelatorioPayload(selectedModules);
      setGeneratedReport(payload);
    } catch {
      _error("Não foi possível gerar o relatório.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = () => {
    if (!generatedReport) return;
    const blob = new Blob([JSON.stringify(generatedReport, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (isChecking) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <Lock className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Você não tem permissão para acessar Relatórios.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Relatórios</h2>
          <p className="text-sm text-muted-foreground">Análises, métricas e exportação de dados</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={reload}>
            <BarChart3 className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
          {generatedReport && (
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Exportar JSON
            </Button>
          )}
        </div>
      </div>

      {errorMessage ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-sm text-red-600">{errorMessage}</p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Selecione os módulos</CardTitle>
          <CardDescription>Escolha quais módulos deseja incluir no relatório.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {availableModules.map((item) => {
              const Icon = item.icon;
              const isSelected = selectedModules.includes(item.key);
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => toggleModule(item.key)}
                  className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                    isSelected ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span className="font-medium">{item.label}</span>
                  </div>
                  <span className={`mt-2 inline-flex items-center text-xs font-medium ${isSelected ? "text-green-700" : "text-muted-foreground"}`}>
                    {isSelected ? "Selecionado" : "Não selecionado"}
                  </span>
                </button>
              );
            })}
          </div>
          <Button className="mt-4" onClick={handleGenerateReport} disabled={selectedModules.length === 0 || isGenerating}>
            {isGenerating ? "Gerando..." : "Gerar relatório"}
          </Button>
        </CardContent>
      </Card>

      {moduleReports.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {moduleReports.map((report) => {
            const Icon = availableModules.find((item) => item.key === report.key)?.icon ?? BarChart3;
            return (
              <Card key={report.key}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{report.label}</CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{report.total}</div>
                  <p className="text-xs text-muted-foreground">Total registrado</p>
                  {report.details && Object.keys(report.details).length > 0 && (
                    <div className="mt-3 space-y-1">
                      {Object.entries(report.details).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between text-xs">
                          <span className="capitalize text-muted-foreground">{key}</span>
                          <span className="font-medium">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Pipeline de negociações</CardTitle>
            <CardDescription>Distribuição por etapa</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando pipeline...</p>
            ) : pipeline.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma negociação registrada.</p>
            ) : (
              <div className="space-y-4">
                {pipeline.map((stage) => (
                  <div key={stage.name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{stage.name}</span>
                      <span className="text-muted-foreground">{stage.count}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div
                        className={`h-2 rounded-full ${stage.color}`}
                        style={{ width: stage.width }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Atividades recentes</CardTitle>
            <CardDescription>Últimas atualizações</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando atividades...</p>
            ) : atividades.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma atividade recente.</p>
            ) : (
              <div className="space-y-4">
                {atividades.slice(0, 8).map((item) => (
                  <div key={item.id} className="flex flex-col gap-1">
                    <p className="text-sm font-medium leading-none">{item.descricao}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.data).toLocaleString("pt-BR")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}