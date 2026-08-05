-- 002 — Fatura de cartão como sub-ledger de passivo
--
-- Hoje o pagamento da fatura entra no extrato como despesa comum. Quando a
-- fatura também é importada, as compras entram como gasto de cartão: o MESMO
-- dinheiro conta duas vezes nas saídas. A fatura passa a ser uma dívida, e
-- pagá-la vira liquidação — não despesa.
--
-- Tudo aqui é ADIÇÃO: nenhuma coluna existente muda de nome ou tipo, e os
-- CHECK novos são superconjuntos dos antigos. Nada que roda hoje quebra.

-- ── Ciclo real da fatura ────────────────────────────────────────
alter table public.cf_faturas
  add column if not exists data_fechamento date,
  add column if not exists data_vencimento date,
  add column if not exists valor_pago      numeric not null default 0,
  add column if not exists perfil          text;

-- 'parcial' é novo: fatura com pagamento parcial não é aberta nem paga
alter table public.cf_faturas drop constraint if exists cf_faturas_status_check;
alter table public.cf_faturas add  constraint cf_faturas_status_check
  check (status in ('aberta','fechada','parcial','paga'));

-- Uma fatura por cartão/mês — a competência é a chave natural
create unique index if not exists cf_faturas_cartao_mes_uq
  on public.cf_faturas (cartao_id, mes_referencia);

-- ── Vínculos na transação ───────────────────────────────────────
alter table public.cf_transacoes
  -- em qual fatura a compra caiu (respeitando o fechamento)
  add column if not exists fatura_id        uuid references public.cf_faturas(id)    on delete set null,
  -- parcela 3/12 aponta para a compra que a originou
  add column if not exists transacao_pai_id uuid references public.cf_transacoes(id) on delete set null;

create index if not exists cf_transacoes_fatura_idx on public.cf_transacoes (fatura_id) where fatura_id is not null;
create index if not exists cf_transacoes_pai_idx    on public.cf_transacoes (transacao_pai_id) where transacao_pai_id is not null;

-- Liquidação de fatura é um tipo próprio: sai da conta, abate a dívida, e
-- NÃO entra nos totais de despesa (senão dobra com as compras do cartão).
alter table public.cf_transacoes drop constraint if exists cf_transacoes_tipo_check;
alter table public.cf_transacoes add  constraint cf_transacoes_tipo_check
  check (tipo in ('receita','despesa','transferencia','cartao','pagamento_fatura'));

-- ── Pagamentos da fatura ────────────────────────────────────────
-- Tabela própria porque uma fatura aceita PAGAMENTO PARCIAL e MÚLTIPLOS
-- pagamentos, inclusive de contas diferentes. Guardar um único
-- "pago_em/pago_por" na fatura não cobriria isso.
create table if not exists public.cf_fatura_pagamentos (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid(),
  fatura_id    uuid not null references public.cf_faturas(id)    on delete cascade,
  transacao_id uuid          references public.cf_transacoes(id) on delete set null,
  conta_id     uuid          references public.cf_contas(id)     on delete set null,
  valor        numeric not null check (valor > 0),
  data         date    not null,
  created_at   timestamptz not null default now()
);

create index if not exists cf_fatura_pagamentos_fatura_idx on public.cf_fatura_pagamentos (fatura_id);

alter table public.cf_fatura_pagamentos enable row level security;
drop policy if exists user_owns_fatura_pagamentos on public.cf_fatura_pagamentos;
create policy user_owns_fatura_pagamentos on public.cf_fatura_pagamentos
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── valor_pago sempre igual à soma dos pagamentos ───────────────
-- Manter o total no app abriria espaço para divergir do detalhe; o banco
-- recalcula e ajusta o status junto.
create or replace function public.cf_recalcular_fatura() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  alvo uuid := coalesce(new.fatura_id, old.fatura_id);
  pago numeric;
  total numeric;
begin
  select coalesce(sum(valor), 0) into pago  from cf_fatura_pagamentos where fatura_id = alvo;
  select coalesce(valor_total, 0)  into total from cf_faturas           where id = alvo;

  update cf_faturas set
    valor_pago = pago,
    status = case
      when pago <= 0                    then status
      when total > 0 and pago >= total  then 'paga'
      else 'parcial'
    end
  where id = alvo;

  return null;
end $$;

drop trigger if exists cf_fatura_pagamentos_recalc on public.cf_fatura_pagamentos;
create trigger cf_fatura_pagamentos_recalc
  after insert or update or delete on public.cf_fatura_pagamentos
  for each row execute function public.cf_recalcular_fatura();
