# 💿 Music Player
Um player de música feito com HTML, CSS e JavaScript puro — sem frameworks, sem dependências externas. Interface moderna com visualizador de áudio, playlists personalizadas e suporte a arquivos locais.

---

## ✨ Funcionalidades
- ▶️ **Reprodução de faixas** — play, pause, próxima, anterior
- 🔀 **Modo aleatório** — ordem de reprodução embaralhada
- 🔁 **Modos de repetição** — desligado, repetir tudo ou repetir uma
- 🎵 **Visualizador de áudio** — barras animadas em tempo real via Web Audio API
- 📁 **Importar músicas locais** — suporte a arquivos de áudio do seu computador
- ❤️ **Favoritos** — marque faixas como favoritas e filtre por elas
- 📋 **Playlists personalizadas** — crie, renomeie e delete suas playlists
- 🔍 **Busca** — filtre por nome da faixa ou artista
- 🌙 **Tema claro / escuro** — alternável com um clique
- ⌨️ **Atalhos de teclado** — controle o player sem usar o mouse

---

## ⌨️ Atalhos de Teclado
| Tecla | Ação |
|-------|------|
| `Espaço` | Play / Pause |
| `→` | Próxima faixa |
| `←` | Faixa anterior |
| `F` | Filtrar favoritos |
| `R` | Alternar modo de repetição |

---

## 📁 Estrutura do Projeto
```
music-player/
│
├── index.html          # Estrutura principal da página
│
├── css/
│   └── style.css       # Estilos, temas claro/escuro e responsividade
│
└── js/
    ├── tracks.js       # Lista de faixas com metadados (título, artista, cores, duração)
    └── player.js       # Toda a lógica do player (áudio, visualizador, playlists, etc.)
```

---

## 🚀 Como usar
Não precisa instalar nada. É só abrir!

1. Clone ou baixe o repositório:
   ```bash
   git clone https://github.com/seu-usuario/music-player.git
   ```

2. Abra o arquivo `index.html` no navegador.
> ⚠️ Para o visualizador de áudio funcionar com arquivos locais, recomenda-se usar uma extensão de servidor local como o **Live Server** (VS Code) — devido às restrições de CORS dos navegadores.

---

## 🛠️ Tecnologias utilizadas
- **HTML5** — estrutura e semântica
- **CSS3** — temas com variáveis CSS, animações e layout responsivo
- **JavaScript (ES6+)** — lógica completa sem frameworks
- **localStorage** — persistência de favoritos e playlists

---

## 📌 Adicionando suas próprias músicas
Você pode adicionar faixas de duas formas:

**1. Pelo código** — edite o arquivo `js/tracks.js` e adicione um objeto seguindo o padrão:
```js
{
  title: "Nome da Música",
  artist: "Nome do Artista",
  duration: 240,  // duração em segundos
  color: "#D85A30",
  diskGradient: "conic-gradient(#D85A30 0deg, #F0997B 120deg, #993C1D 240deg, #D85A30 360deg)",
  barColors: ["#D85A30", "#993C1D", "#F0997B", "#D85A30"]
}
```
**2. Pela interface** — clique em **"Adicionar"** na biblioteca para importar arquivos de áudio diretamente do seu computador.

---

## 📱 Responsividade
O layout se adapta para telas menores que 700px, empilhando as colunas verticalmente para melhor usabilidade em dispositivos móveis.

---
## 👩‍💻 Autora
Feito por **Bruna Cavalcanti** — estudante de Ciência da Computação, focada em front-end.
Sinta-se a vontade para usar ou reaproveitar! 
