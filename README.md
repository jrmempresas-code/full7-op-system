# Full7 — Sistema Automático de OP

Sistema completo para transformar pedido (PDF) + layout (imagem) + observações (e-mail) em OP preenchida, card no Trello e dashboard de produção.

---

## Fluxo Automático

```
E-mail recebido (PDF + Imagem + Texto)
        ↓
Leitura e download dos anexos
        ↓
Extração de dados via Claude IA
        ↓
Geração da OP em PDF
        ↓
Upload no Supabase Storage
        ↓
Criação do card no Trello (com anexos)
        ↓
Dashboard atualizado automaticamente
```

---

## Setup Passo a Passo

### 1. Supabase

1. Acesse https://supabase.com e crie um projeto gratuito
2. Vá em **SQL Editor** e execute o conteúdo de `supabase/migrations/001_initial.sql`
3. Vá em **Storage** e crie três buckets públicos:
   - `ops`
   - `pedidos`
   - `layouts`
4. Copie os valores do **Settings → API**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

---

### 2. Trello API

1. Acesse https://trello.com/app-key e copie sua **API Key**
2. Gere um **Token** clicando em "Token" na mesma página
3. Crie (ou use) um quadro no Trello com as listas:
   - Recebido, OP Gerada, Em Produção, Sublimação, Corte, Costura, Conferência, Pronto, Entregue, Atrasado
4. Para pegar o `TRELLO_BOARD_ID`:
   - Abra o quadro no Trello
   - Adicione `.json` ao final da URL: `https://trello.com/b/XXXXX/nome.json`
   - O campo `"id"` é o Board ID
5. Para pegar os IDs das listas:
   - Acesse: `https://api.trello.com/1/boards/SEU_BOARD_ID/lists?key=SUA_KEY&token=SEU_TOKEN`
   - Copie o `id` de cada lista e coloque nas variáveis correspondentes

---

### 3. Gmail API

1. Acesse https://console.cloud.google.com
2. Crie um projeto → Ative a **Gmail API**
3. Vá em **APIs & Services → Credentials → Create credentials → OAuth 2.0 Client ID**
   - Application type: Web application
   - Authorized redirect URIs: `https://developers.google.com/oauthplayground`
4. Copie `Client ID` e `Client Secret`
5. Gere o Refresh Token:
   - Acesse https://developers.google.com/oauthplayground
   - Clique na engrenagem → marque "Use your own OAuth credentials"
   - Cole seu Client ID e Client Secret
   - Em "Step 1", selecione `Gmail API v1` → `https://mail.google.com/`
   - Clique "Authorize APIs" → autorize com sua conta Gmail
   - Em "Step 2", clique "Exchange authorization code for tokens"
   - Copie o `Refresh token`

---

### 4. Claude IA (Anthropic)

1. Acesse https://console.anthropic.com
2. Vá em **API Keys** e crie uma chave
3. Cole em `AI_API_KEY`
4. O modelo padrão é `claude-opus-4-7` (mais preciso para extração)

---

### 5. Deploy na Vercel

1. Instale o CLI: `npm i -g vercel`
2. Execute: `vercel`
3. Siga o assistente e escolha o projeto
4. Adicione todas as variáveis de ambiente no painel da Vercel:
   - Project → Settings → Environment Variables
5. O arquivo `vercel.json` já configura:
   - Verificação de e-mails a cada 2 horas
   - Sync com Trello a cada hora

---

### 6. Configuração Local

```bash
# 1. Instalar dependências
npm install

# 2. Copiar e preencher o .env
cp .env.example .env.local

# 3. Rodar em desenvolvimento
npm run dev
```

Acesse: http://localhost:3000

---

## Estrutura de Pastas

```
full7-op-system/
├── src/
│   ├── app/
│   │   ├── (dashboard)/          # Páginas do dashboard
│   │   │   ├── page.tsx          # Dashboard principal
│   │   │   ├── pedidos/          # Lista de pedidos
│   │   │   │   └── [id]/         # Detalhe do pedido
│   │   │   └── logs/             # Logs de processamento
│   │   └── api/
│   │       ├── email/check/      # Verificar e processar e-mails
│   │       ├── orders/           # CRUD de pedidos
│   │       │   └── [id]/
│   │       │       └── reprocess/ # Reprocessar OP
│   │       └── trello/sync/      # Sincronizar com Trello
│   ├── lib/
│   │   ├── supabase/client.ts    # DB + Storage
│   │   ├── trello/client.ts      # Trello API
│   │   ├── gmail/client.ts       # Gmail API
│   │   ├── ai/extractor.ts       # Extração de dados via IA
│   │   ├── pdf/generator.ts      # Geração da OP em PDF
│   │   └── email-processor.ts   # Orquestrador do fluxo
│   ├── components/
│   │   ├── dashboard/            # StatsCard, OrdersTable
│   │   ├── layout/               # Sidebar
│   │   └── ui/                   # Badge, botões
│   └── types/index.ts            # Tipos TypeScript
├── supabase/
│   └── migrations/001_initial.sql
├── .env.example
├── vercel.json                   # Cron jobs
└── README.md
```

---

## Dashboard — Funcionalidades

| Seção            | O que mostra                                 |
|-----------------|----------------------------------------------|
| Dashboard        | Stats gerais, atrasados, urgentes, entregas  |
| Pedidos          | Todos os pedidos com filtros                 |
| Detalhe do Pedido| Dados completos + grade + logs + arquivos    |
| Logs             | Histórico de todos os processamentos         |

**Filtros disponíveis:**
- Por status, cliente, número do pedido
- Por data de entrega (início/fim)
- Apenas urgentes

---

## Reprocessar OP

Na tela de detalhe do pedido, clique em **Reprocessar OP** para:
1. Regerar o PDF da OP com os dados atuais
2. Fazer upload da nova OP no Storage
3. Atualizar o card no Trello

---

## E-mail Esperado

```
Assunto: OP - Pedido 4587 - Cliente Time XPTO

Corpo:
Cliente: Time XPTO
Urgência: Alta
Observações:
- Colocar patch PET 3D
- Gola, manga e punho na mesma malha
- Não usar ribana

Anexos:
- pedido.pdf    ← PDF do sistema Comod
- layout.png    ← Imagem/arte do uniforme
```

> As observações do e-mail têm PRIORIDADE sobre o PDF do pedido.

---

## Checklist de Configuração

- [ ] Supabase: projeto criado + migration executada + 3 buckets criados
- [ ] Trello: API Key + Token + IDs de todas as listas configurados
- [ ] Gmail: OAuth2 configurado + Refresh Token gerado
- [ ] IA: Chave Anthropic configurada
- [ ] Vercel: deploy feito + todas as env vars adicionadas
- [ ] Teste: enviar e-mail de teste para a caixa configurada
- [ ] Verificar: clicar em "Verificar E-mails" na sidebar do dashboard
