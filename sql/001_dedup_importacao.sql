-- 001 — Rede de proteção contra lançamento duplicado na importação
--
-- Até aqui o dedup era 100% no navegador: dois cliques no botão, duas abas
-- abertas ou uma falha no meio do lote duplicavam tudo, porque cf_transacoes
-- só tinha a PK. Estas duas mudanças movem a garantia para o banco.

-- 1) Chave natural da linha importada.
--    Montada no cliente: conta|data|valor|tipo|descricao|ocorrência.
--    A ocorrência é o que permite o mesmo extrato ter dois lançamentos
--    idênticos legítimos (dois cafés de R$ 12 no mesmo dia) sem que o
--    segundo seja confundido com duplicata.
alter table public.cf_transacoes add column if not exists hash_dedup text;

--    Índice parcial: só vale para o que veio de importação e já tem chave.
--    Lançamento manual continua livre para repetir à vontade, e as linhas
--    antigas (hash nulo) não são afetadas.
create unique index if not exists cf_transacoes_dedup_uq
  on public.cf_transacoes (user_id, hash_dedup)
  where origem = 'importacao' and hash_dedup is not null;

-- 2) Histórico de importações, para avisar que um período já foi importado
--    naquela conta (hoje os "meses detectados" eram só enfeite na tela).
create table if not exists public.cf_importacoes (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid(),
  perfil          text not null check (perfil in ('pessoal','empresa')),
  conta_id        uuid references public.cf_contas(id) on delete cascade,
  mes_referencia  text not null,           -- 'YYYY-MM'
  qtd_lancamentos integer not null default 0,
  arquivos        text,
  created_at      timestamptz not null default now()
);

create index if not exists cf_importacoes_busca_idx
  on public.cf_importacoes (user_id, conta_id, mes_referencia);

alter table public.cf_importacoes enable row level security;

drop policy if exists user_owns_importacoes on public.cf_importacoes;
create policy user_owns_importacoes on public.cf_importacoes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
