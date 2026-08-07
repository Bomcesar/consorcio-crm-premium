import { useMemo } from "react";
import {
  getConfiguracoesService,
  resetConfiguracoesService,
  saveConfiguracoesService,
  savePerfilService,
} from "@/services/configuracoes.service";

export function useConfiguracoes() {
  return useMemo(
    () => ({
      getConfiguracoes: getConfiguracoesService,
      savePerfil: savePerfilService,
      saveConfiguracoes: saveConfiguracoesService,
      resetConfiguracoes: resetConfiguracoesService,
    }),
    [],
  );
}