BEGIN;

-- ============================================================
-- MÓDULO: LIVE DE VOZ
-- Permissões (códigos live.*) e visibilidade do menu
-- ============================================================

INSERT INTO public.user_permissions (codigo, nome, categoria, descricao)
VALUES
  ('live.acessar',            'Acessar Live de Voz',        'Live de Voz', 'Ver o módulo e entrar nas lives'),
  ('live.iniciar',            'Iniciar Live',               'Live de Voz', 'Criar uma live e torná-la anfitrião'),
  ('live.encerrar',           'Encerrar Live',              'Live de Voz', 'Encerrar a própria live'),
  ('live.convidar',           'Gerar Links de Convite',     'Live de Voz', 'Gerar e revogar links temporários para convidados'),
  ('live.participar',         'Participar da Live',         'Live de Voz', 'Solicitar e ocupar cadeira'),
  ('live.presentear',         'Apresentar',                 'Live de Voz', 'Iniciar apresentação em vídeo, tela, PDF ou vídeo'),
  ('live.chat',               'Participar do Chat',         'Live de Voz', 'Enviar mensagens no chat da live'),
  ('live.presentes.enviar',   'Enviar Presentes',           'Live de Voz', 'Enviar presentes para quem está em cadeira'),
  ('live.presentes.gerenciar','Gerenciar Presentes',        'Live de Voz', 'Criar categorias, presentes, imagens e valores')
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  categoria = EXCLUDED.categoria,
  descricao = EXCLUDED.descricao;

-- Concede o uso do módulo a todos os perfis do sistema.
-- Quem pode iniciar uma Live não é uma permissão estática: o poder
-- de anfitrião vem de `live_rooms.anfitriao_id`, preenchido pelo
-- servidor e imutável para quem não é o dono da sala.
-- `live.presentes.gerenciar` NÃO é concedido aqui: continua
-- restrito ao Administrador (is_admin() na RLS).
INSERT INTO public.user_permission_grants (usuario_id, permissao_id)
SELECT u.id, p.id
FROM public.profiles u
CROSS JOIN public.user_permissions p
WHERE p.codigo IN (
  'live.acessar',
  'live.iniciar',
  'live.encerrar',
  'live.convidar',
  'live.participar',
  'live.presentear',
  'live.chat',
  'live.presentes.enviar'
)
  AND u.ativo = TRUE
ON CONFLICT (usuario_id, permissao_id) DO NOTHING;

-- Concede a visibilidade do módulo a todos os perfis do sistema.
-- As permissões de controle continuam sendo checadas em código
-- (hasPermission) e no banco (is_admin / live_e_anfitriao).
INSERT INTO public.module_visibility (perfil, modulo, href, titulo, visivel)
SELECT p.perfil, 'Live de Voz', '/live-voz', 'Live de Voz', TRUE
FROM (
  VALUES
    ('Administrador'::text),
    ('Gestor'::text),
    ('Consultor'::text),
    ('Trainee'::text),
    ('Secretaria'::text),
    ('Indicador'::text),
    ('Assistente'::text)
) AS p(perfil)
ON CONFLICT (perfil, modulo) DO UPDATE SET
  href = EXCLUDED.href,
  titulo = EXCLUDED.titulo,
  visivel = TRUE;

COMMIT;
