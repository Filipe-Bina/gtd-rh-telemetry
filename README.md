# GTD-RH-Telemetry v1.0

Gestão de Telemetria e Consulta de Funcionários - Sistema operacional corporativo.

## 🎯 O que o sistema faz
- Painel corporativo para acompanhamento de status de funcionários em tempo real
- Dashboard administrativo com CRUD completo
- Autenticação e sincronização de dados via Supabase (PostgreSQL)

## 🚀 Início Rápido

### 1. Clonar o Repositório
```bash
git clone https://github.com/Filipe-Bina/gtd-rh-telemetry.git
cd gtd-rh-telemetry
```

### 2. Configurar Credenciais do Supabase
```bash
# Copiar arquivo de template
cp config.example.js config.js

# Editar config.js com suas credenciais reais
# Você pode usar seu editor favorito
```

### 3. Servir Localmente
```bash
# Opção 1: Usar Python
python -m http.server 8000

# Opção 2: Usar Node.js (npm install -g http-server)
http-server

# Opção 3: Usar VSCode Live Server
# Instalar extensão "Live Server" e clicar em "Go Live"
```

Abra `http://localhost:8000` no seu navegador.

---

## 🔒 Segurança

**⚠️ IMPORTANTE:**
- **Nunca** faça commit de `config.js` com credenciais reais
- Use `config.example.js` como template
- O arquivo `config.js` está no `.gitignore` e será ignorado automaticamente

### Regenerar Credenciais Expostas (se necessário):
1. Acesse seu projeto no [Supabase Dashboard](https://app.supabase.com)
2. Vá para `Settings > API`
3. Clique em "Regenerate" para as chaves
4. Atualize seu `config.js` local

---

## 📁 Estrutura do Projeto

```
gtd-rh-telemetry/
├── index.html          # Página principal
├── app.js              # Lógica da aplicação (602 linhas)
├── styles.css          # Estilos da aplicação
├── config.example.js   # Template de configuração
├── .gitignore          # Arquivos ignorados pelo Git
└── README.md           # Este arquivo
```

---

## 🛠️ Desenvolvimento

### Stack Tecnológico
- **Frontend:** HTML5, CSS3, JavaScript (Vanilla)
- **Backend:** Supabase (PostgreSQL + Auth)
- **Framework:** Nenhum (Zero dependencies)

### Arquivos Principais
- `app.js`: Gerencia estado, navegação, sincronização com Supabase
- `styles.css`: Design moderno com variáveis CSS (v3.4)
- `index.html`: Estrutura semântica com Supabase SDK

---

## 📦 Versões

- **v1.0** (Atual) - Release inicial com sistema de telemetria operacional

---

## 📝 Notas

- Aplicação responsiva e sem dependências externas (exceto Supabase)
- Suporte a múltiplas visualizações (login, público, dashboard)
- Tratamento robusto de erros de configuração
- Design clean corporativo com variáveis CSS

---

## 📞 Suporte

Para dúvidas ou problemas, consulte o repositório: [Filipe-Bina/gtd-rh-telemetry](https://github.com/Filipe-Bina/gtd-rh-telemetry)

---

**Versão:** 1.0  
**Última atualização:** 11 de Junho de 2026
