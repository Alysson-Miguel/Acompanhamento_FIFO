# 📊 Dashboard Operacional - Acompanhamento FIFO

Dashboard em tempo real para monitoramento de posições, atrelamento e desatrelamento de TOs (Transfer Orders).

![Status](https://img.shields.io/badge/status-active-success.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

---

## 🚀 Acesso Rápido

### 🌐 Online (Deploy)
- **Vercel**: [Em breve]
- **Render**: [Em breve]
- **GitHub Pages**: [Em breve]

### 💻 Local
```bash
# Opção 1: Python (Recomendado)
python -m http.server 8080
# Acesse: http://localhost:8080/dashboard_operacional.html

# Opção 2: Node.js
npx http-server -p 8080
# Acesse: http://localhost:8080/dashboard_operacional.html

# Opção 3: Abrir direto no navegador
# Clique duas vezes em: dashboard_operacional.html
```

---

## ✨ Funcionalidades

- 📊 **KPIs em Tempo Real**: TOs Atreladas, Desatreladas, Pacotes, SPP
- 📈 **Gráficos Interativos**: Consolidado por hora, FIFO, Zonas
- 🔍 **Filtros Avançados**: Por Turno, Zona e Hora
- 🔄 **Atualização Automática**: A cada 5 minutos
- 📱 **Responsivo**: Funciona em Desktop, Tablet e Mobile
- 🎨 **Interface Moderna**: Design cyberpunk com cores vibrantes

---

## 🎯 Capturas de Tela

### Dashboard Principal
![Dashboard](https://via.placeholder.com/800x400?text=Dashboard+Operacional)

### Gráficos e Filtros
![Gráficos](https://via.placeholder.com/800x400?text=Gráficos+Interativos)

---

## 🛠️ Tecnologias

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Gráficos**: Chart.js 4.4.1
- **Fontes**: Rajdhani, JetBrains Mono, Inter
- **Backend**: Google Apps Script (Web App)
- **Deploy**: Vercel / Render / Netlify / GitHub Pages

---

## 📦 Estrutura do Projeto

```
dashboard-operacional/
├── dashboard_operacional.html  # Dashboard principal
├── index.html                  # Redirecionamento
├── package.json               # Metadados do projeto
├── render.yaml                # Configuração Render
├── vercel.json                # Configuração Vercel
├── README.md                  # Este arquivo
├── COMO_USAR.md              # Guia do usuário
├── DEPLOY_RENDER.md          # Guia de deploy
├── DEBUG_APLICADO.md         # Detalhes técnicos
├── TESTE_CONCLUIDO.md        # Resultados dos testes
└── SOLUCAO_CONEXAO.md        # Troubleshooting
```

---

## 🚀 Como Rodar Localmente

### Pré-requisitos
- Python 3.x OU Node.js OU qualquer navegador moderno

### Passo a Passo

1. **Clone o repositório** (ou baixe os arquivos)
```bash
git clone https://github.com/seu-usuario/dashboard-operacional.git
cd dashboard-operacional
```

2. **Inicie um servidor local**
```bash
# Python
python -m http.server 8080

# OU Node.js
npx http-server -p 8080
```

3. **Abra no navegador**
```
http://localhost:8080/dashboard_operacional.html
```

4. **Pronto!** O dashboard conectará automaticamente

---

## 🌐 Como Fazer Deploy

### Opção 1: Vercel (Recomendado - Mais Rápido)

1. Crie conta em https://vercel.com
2. Conecte seu repositório GitHub
3. Clique em "Deploy"
4. Pronto! URL: `https://seu-projeto.vercel.app`

### Opção 2: Render

1. Crie conta em https://render.com
2. New → Static Site
3. Conecte seu repositório GitHub
4. Deploy automático!

### Opção 3: Netlify (Mais Fácil)

1. Acesse https://app.netlify.com/drop
2. Arraste a pasta do projeto
3. Pronto! Deploy instantâneo

### Opção 4: GitHub Pages (Gratuito)

1. No repositório: Settings → Pages
2. Source: main branch
3. URL: `https://seu-usuario.github.io/dashboard-operacional`

**Guia completo**: Veja `DEPLOY_RENDER.md`

---

## ⚙️ Configuração

### URL do Google Apps Script

O dashboard já vem com uma URL padrão configurada. Para usar sua própria:

1. Clique no botão **"⚙ URL"** no dashboard
2. Cole sua URL do Google Apps Script
3. Clique em **"🔍 Testar URL"** para verificar
4. Se OK, clique em **"Conectar Dashboard"**

### Estrutura de Dados Esperada

O Google Apps Script deve retornar:

```json
{
  "rows": [
    {
      "group_name": "ZONA BUFFER EHA",
      "turno": "T1",
      "hora": "06:00",
      "total_tos_atreladas": 150,
      "total_tos_desatreladas": 45,
      "total_pacotes": 450,
      "posicoes_por_zona": 25,
      "fifo_respected": 140,
      "fifo_not_respected": 10
    }
  ]
}
```

---

## 📖 Documentação

- **[COMO_USAR.md](COMO_USAR.md)** - Guia completo do usuário
- **[DEPLOY_RENDER.md](DEPLOY_RENDER.md)** - Como fazer deploy
- **[DEBUG_APLICADO.md](DEBUG_APLICADO.md)** - Detalhes técnicos
- **[TESTE_CONCLUIDO.md](TESTE_CONCLUIDO.md)** - Resultados dos testes
- **[SOLUCAO_CONEXAO.md](SOLUCAO_CONEXAO.md)** - Troubleshooting

---

## 🐛 Troubleshooting

### Dashboard não carrega dados?
1. Abra o Console (F12)
2. Veja os erros em vermelho
3. Verifique a URL do Google Apps Script
4. Teste com "Ver Demo"

### Gráficos em branco?
1. Limpe os filtros (selecione "Todos")
2. Clique em "⟳ Atualizar"
3. Verifique se há dados no período

### Erro de conexão?
1. Verifique se o Google Apps Script está publicado
2. "Quem tem acesso" deve ser "Qualquer pessoa"
3. URL deve terminar com `/exec`

**Mais soluções**: Veja `SOLUCAO_CONEXAO.md`

---

## 🤝 Contribuindo

Contribuições são bem-vindas!

1. Fork o projeto
2. Crie uma branch: `git checkout -b feature/nova-funcionalidade`
3. Commit suas mudanças: `git commit -m 'Adiciona nova funcionalidade'`
4. Push para a branch: `git push origin feature/nova-funcionalidade`
5. Abra um Pull Request

---

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

---

## 👥 Autores

- **Desenvolvedor Principal** - Dashboard Operacional

---

## 🙏 Agradecimentos

- Chart.js pela biblioteca de gráficos
- Google Fonts pelas fontes
- Comunidade open source

---

## 📞 Suporte

- 📧 Email: [seu-email@exemplo.com]
- 🐛 Issues: [GitHub Issues](https://github.com/seu-usuario/dashboard-operacional/issues)
- 📖 Docs: Veja os arquivos `.md` no repositório

---

## 🔄 Changelog

### v1.0.0 (2026-04-21)
- ✨ Lançamento inicial
- 📊 Dashboard completo com KPIs e gráficos
- 🔍 Filtros por Turno, Zona e Hora
- 🔄 Atualização automática a cada 5 minutos
- 📱 Interface responsiva
- 🎨 Design cyberpunk moderno
- 🔧 Integração com Google Apps Script
- 📚 Documentação completa

---

**Feito com ❤️ para otimizar operações**