# Provador Virtual 👗✨

O **Provador Virtual** é uma aplicação inovadora que utiliza Inteligência Artificial para permitir que usuários visualizem como diferentes peças de roupa ficariam em seus corpos. Utilizando a tecnologia **Gemini (Nano Banana)**, o app processa fotos do usuário e sobrepõe peças de vestuário com realismo impressionante.

## 🚀 Funcionalidades

- **Try-On Virtual:** Envie uma foto sua e selecione uma peça do guarda-roupa para ver o resultado instantaneamente.
- **Variação de Poses:** Mude a pose do modelo gerado por IA (ex: mãos nos quadris, perfil, caminhando).
- **Guarda-Roupa Inteligente:** Gerencie suas próprias peças de roupa ou use a coleção padrão.
- **Interface Responsiva:** Experiência otimizada para Desktop e Mobile.
- **Tecnologia de Ponta:** Alimentado pelo modelo Gemini 2.5 Flash para processamento de imagem ultra-rápido.

## 🛠️ Tecnologias Utilizadas

- **Frontend:** React 19 + TypeScript
- **Estilização:** Tailwind CSS
- **Animações:** Framer Motion
- **IA:** @google/genai (Google Gemini API)
- **Build Tool:** Vite
- **Ícones:** Lucide React

## 📦 Como rodar o projeto localmente

1. **Clone o repositório:**
   ```bash
   git clone <url-do-seu-repositorio>
   cd provador-virtual
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente:**
   Crie um arquivo `.env` na raiz do projeto e adicione sua chave da API do Gemini:
   ```env
   GEMINI_API_KEY=sua_chave_aqui
   ```

4. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

5. **Acesse no navegador:**
   `http://localhost:3000`

## 💡 Como usar

1. Na tela inicial, faça o upload de uma foto sua (corpo inteiro ou meio corpo funciona melhor).
2. Selecione uma categoria de roupa no painel lateral.
3. Clique em uma peça para "prová-la".
4. Use o painel de poses para ver o look de diferentes ângulos.
5. Adicione suas próprias peças clicando no botão "+" no guarda-roupa.

## 📄 Licença

Este projeto está sob a licença Apache-2.0. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---
Desenvolvido com ❤️ utilizando Google Gemini API.
