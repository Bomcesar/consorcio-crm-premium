"use client";

import * as React from "react";
import { useControleAudioSala, type ControleAudioSala } from "@/hooks/live/use-live-audio-sala";

/**
 * Ponte entre o `RoomContext` do LiveKit e a barra de controles.
 *
 * `useControleAudioSala` depende de `RoomContext` (via
 * `useRemoteParticipants`), que só existe dentro de `SalaMidia`. A
 * barra de controles, porém, é renderizada FORA dela, e um contexto
 * React não atravessa para os irmãos. A ponte resolve o descompasso:
 * ela fica dentro da sala de mídia, roda o hook e entrega o resultado
 * para o componente pai por `reportar`.
 *
 * O pai guarda o objeto num ref e força a renderização quando
 * preciso. Como o hook devolve um objeto novo a cada render, o
 * `reportar` só é chamado quando a ASSINATURA dos dados muda — sem
 * isso, `setState` dispararia render, que recriaria o objeto, e o
 * ciclo não terminaria.
 */
export function LiveAudioControlePonte({
  reportar,
}: {
  reportar: (controle: ControleAudioSala) => void;
}) {
  const controle = useControleAudioSala();
  const ultimaAssinatura = React.useRef<string>("");

  React.useEffect(() => {
    const assinatura = JSON.stringify([controle.idsSilenciados, controle.conectados]);
    if (assinatura === ultimaAssinatura.current) return;
    ultimaAssinatura.current = assinatura;
    reportar(controle);
  }, [controle, reportar]);

  return null;
}