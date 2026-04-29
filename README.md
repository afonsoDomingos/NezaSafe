# NEZA - Sistema Integrado de Monitoramento e Gestão de Riscos Digitais

**Powered By Muv Educação & Engenharia** - [muv.co.mz](https://muv.co.mz)

## Visão Geral

O **NEZA** é uma plataforma corporativa e moderna voltada para a área de Cibersegurança e SecOps. O sistema atua como um painel de controle centralizado para cadastro, monitoramento, e relatórios de vulnerabilidades e ameaças digitais.

A aplicação foi estruturada sem o uso de "frameworks pesados" no frontend (apenas HTML, CSS Vanilla, e JavaScript), priorizando a performance e simplicidade, mas conta com um design limpo e interfaces reativas (micro-animações e responsividade).

## Arquitetura do Sistema

O projeto adota uma arquitetura Serverless moderna, dividida em:

1. **Frontend (Static Site):**
   - Construído em HTML5, CSS3, e Vanilla JS.
   - Design System próprio com *Dark Mode* corporativo.
   - Gráficos integrados via Chart.js (CDN).
   - Gerenciamento de interface estilo *Single Page Application* (SPA) manipulando a DOM.
   
2. **Backend (Vercel Serverless Functions):**
   - As operações de banco de dados são gerenciadas através da pasta `api/`.
   - Utilizamos o ecossistema `Node.js` + `Mongoose` para expor uma API REST que funciona perfeitamente dentro da arquitetura da Vercel.

3. **Banco de Dados (MongoDB Atlas):**
   - Os dados agora são **100% dinâmicos**, armazenados na nuvem.
   - Cluster hospedado no MongoDB Atlas (`nezasafedb`).

## Estrutura de Diretórios

```
NEZA/
├── api/
│   └── risks.js        # Vercel Serverless Function (CRUD API)
├── index.html          # Ponto de entrada do Frontend
├── style.css           # Estilização completa do projeto
├── script.js           # Lógica do painel e comunicação com a API
├── package.json        # Dependências (Mongoose)
├── .env                # Variáveis de ambiente (MONGO_URI)
└── README.md           # Documentação técnica
```

## Como a Dinâmica de Dados Funciona

O frontend e o backend se comunicam de forma fluída, garantindo que o dashboard reflita sempre os dados em tempo real.

1. **Leitura (GET):** Ao abrir o site, o `script.js` chama a rota `GET /api/risks` e atualiza todos os contadores do Dashboard, as tabelas de relatório e os gráficos do Chart.js.
2. **Criação (POST):** Ao preencher o formulário de "Novo Risco", um ID dinâmico é gerado e o pacote JSON é enviado via `POST /api/risks`. O risco é validado pelo Schema Mongoose e persistido no MongoDB. Caso o nível seja crítico, um alerta visual *toast* surge imediatamente.
3. **Atualização (PUT):** O botão "Resolver" envia um comando assíncrono mudando o `status` da ameaça no banco de dados para "resolvido". As views e o gráfico recarregam os dados em seguida.
4. **Exclusão (DELETE):** Clicar no ícone de lixeira faz uma requisição `DELETE /api/risks?id={ID}`, removendo do banco de forma permanente.

## Deploy no Vercel

O projeto foi inteiramente desenhado para deployment em **um clique** na plataforma Vercel. 

### Passos de Configuração:
1. Importe o repositório `afonsoDomingos/NezaSafe` para a Vercel.
2. Nas opções de configuração (`Environment Variables`), adicione sua variável:
   - **Key:** `MONGO_URI`
   - **Value:** `Sua_URI_do_MongoDB_Atlas`
3. Faça o **Deploy**.

**O que acontece nos bastidores?**
A Vercel servirá os arquivos estáticos (`index.html`, `style.css`, `script.js`) pela rede global Edge, e simultaneamente detectará a pasta `/api`, convertendo o `risks.js` em uma API Serverless disponível no endereço genérico de `<seu-dominio>.vercel.app/api/risks`.

## Setup Local

Para rodar o projeto localmente para testes e novas integrações:

1. Instale o CLI da Vercel:
   ```bash
   npm i -g vercel
   ```
2. Inicie o servidor local da Vercel (ele injetará as Serverless Functions corretamente):
   ```bash
   vercel dev
   ```
3. O servidor emulará o ambiente e conectará ao seu banco automaticamente desde que a URI no `.env` esteja configurada.

---
*Documentação desenvolvida para a Karingana Studio & Muv Educação & Engenharia.*
