# Vora Sistema — Gestão Operacional da Vora Propriedade Industrial

Sistema web interno que implementa o **Documento Mestre de Planejamento Operacional e Organizacional da Vora PI** (Módulos 0 a 7, Etapas 1 a 13), com a identidade visual de [vorapi.com.br](https://vorapi.com.br): fundo obsidiana, verde-limão `#ccff00`, Space Grotesk e JetBrains Mono.

## Módulos (abas)

| Aba | O que faz | Referência |
|---|---|---|
| **Painel** | KPIs, prazos fatais, pareceres para validar, funil e tarefas | Visão de CEO |
| **Prospecção** | Importa planilhas JUCEAL (CSV), separa contadores (contato em mais de 2 CNPJs ou termos contábeis), faz disparos personalizados pelo Sócio-Administrador, gera lotes CSV, aplica a régua de follow-up de 7 a 120 dias e mede a conversão por canal (A–E). Inclui o calendário do Instagram, os polos empresariais e os parceiros | Etapas 1–2 |
| **Funil comercial** | Kanban unificado (D9) do novo lead ao protocolo; ticket alto sugere reunião (D5) | Etapas 3–11 |
| **Formulário público** `/formulario` | Coleta inicial com consentimento LGPD e upload da logo; a entrada cai no funil. Use `?origem=A..E` para medir o canal | Etapa 3 |
| **Análises de viabilidade** | Fluxo D4 (IA → Colaborador → Caio): variações fonéticas, registro das buscas Exata e Radical no pePI, PDFs `TERMO P.1…` na pasta, 17 dados obrigatórios (com leitor do texto copiado do pePI), parecer, prompt para Claude/Gemini, relatório timbrado e Termo de Ciência de Risco | Etapa 5 |
| **Clientes & protocolo** | Relatório Cadastral 2.1, consulta de CNPJ com CNAEs (BrasilAPI) e checagem do Art. 128 §1º, pasta do cliente (01–06), validador e conversor de logo para o padrão e-Marcas, checklist de 10 itens com **trava da GRU** e protocolo exclusivo de Caio | Etapas 8 e 11 |
| **Carteira INPI** | Kanban por fase, importação da carteira antiga, despachos, mensagens 10.9 e relatório mensal com o Resumo de Vigilância | Etapas 12–13 |
| **Vigilância RPI** | Baixa e lê o XML da RPI (Seção V), atualiza processos, cria prazos e detecta colidências; gera alerta timbrado, mensagem 12.2.3 e termo de declínio 12.2.4. Roda automaticamente às terças | Etapa 12 |
| **Prazos INPI** | Contagem pela LPI (arts. 221–222, com prorrogação em feriados e fins de semana), regras por despacho, delegação e Kanban de execução | Módulo 5.1 |
| **Financeiro & comissões** | Vendas via Asaas, parcelas, inadimplência, previsão, comissão de 15% a 25% com bônus trimestral e liberação conforme a liquidação (PIX/cartão integral; boleto proporcional ou 50/50), repasse a contadores, webhook do Asaas e exportação para o Google Sheets | Etapa 9, Módulo 2.2 |
| **Preços & propostas** | Tabela por classe, desconto progressivo, simulador e proposta timbrada | Etapa 10, D3 |
| **Playbook de mensagens** | Modelos 10.1 a 10.10, follow-ups, alertas e prospecção, com envio por WhatsApp ou Gmail | Módulo 6 (item 10) |
| **Modelos de documentos** | Procurações (3.1–3.3), contratos (4.0–4.2), termos, notificação, substabelecimento, peças 9.0–9.7 e script da Pasta Modelo no Drive | Módulo 6 |
| **Tarefas da equipe** | Kanban de delegação (colaboradores e agentes de IA) | D9 |
| **Fluxo & mapa mental** | Etapas 1 a 13, mapa mental e matriz de responsabilidades | Módulo 5.3 |
| **Manual & playbook de vendas** | Gatilhos mentais, objeções, roteiro e manual operacional (pePI, CNAE, logo, GRU) | Itens 11.1 e 11.2 |
| **Institucional & LGPD** | D1/D2, CNAEs, calculadora do Fator R, ecossistema D8, LGPD, prova social e links oficiais | Módulos 0, 1 e 7 |
| **Configurações** | Usuários, dados da empresa, faixas de comissão, backup e auditoria | Somente admin |

## Regras de negócio aplicadas no servidor

- Só o **administrador** aprova pareceres (D4), registra protocolos, altera configurações, preços e saídas.
- O protocolo exige o checklist completo e a **GRU com status "compensada" e data/hora de liquidação** (agendamento é bloqueado).
- O número do processo precisa ter 9 dígitos e o número da RPI, 4 dígitos.
- Toda ação fica registrada na auditoria.

## Rodar localmente

```bash
npm install
ADMIN_PASSWORD=suaSenhaForte npm start   # http://localhost:3000
```

Requer Node.js 22.13 ou superior (usa o módulo nativo `node:sqlite`; não há banco externo). Os dados ficam em `./data` (ou em `DATA_DIR`).

## Implantação (VPS com Coolify/Traefik)

```bash
cp .env.example .env   # ajuste DOMINIO, ADMIN_EMAIL, ASAAS_WEBHOOK_TOKEN
docker compose up -d --build
```

O contêiner entra na rede `coolify`, e o Traefik emite o certificado HTTPS automaticamente. O registro DNS do tipo A do domínio precisa apontar para a VPS. Os dados persistem no volume `vora-data`.

## Integrações

- **Asaas**: webhook em `/api/webhooks/asaas`, com o cabeçalho `asaas-access-token` igual a `ASAAS_WEBHOOK_TOKEN`; a referência externa deve seguir o formato `idVenda:indiceParcela`.
- **INPI**: o XML da RPI é baixado de `revistas.inpi.gov.br/txt/RM{numero}.zip`.
- **BrasilAPI**: consulta de CNPJ e CNAEs feita pelo navegador.
