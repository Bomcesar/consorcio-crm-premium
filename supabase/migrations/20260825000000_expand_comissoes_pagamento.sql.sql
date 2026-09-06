BEGIN;

ALTER TABLE public.comissoes_indicadores
  ADD COLUMN IF NOT EXISTS nota_fiscal_url TEXT,
  ADD COLUMN IF NOT EXISTS comprovante_pagamento_url TEXT,
  ADD COLUMN IF NOT EXISTS comprovante_pagamento_data DATE,
  ADD COLUMN IF NOT EXISTS comprovante_pagamento_mes INTEGER,
  ADD COLUMN IF NOT EXISTS comprovante_pagamento_ano INTEGER,
  ADD COLUMN IF NOT EXISTS status_pagamento TEXT NOT NULL DEFAULT 'Em aberto';

COMMIT;
