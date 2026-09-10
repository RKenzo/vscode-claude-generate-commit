# Claude Commit Message Generator

Extensão do VS Code que gera mensagens de commit no padrão [Conventional Commits](https://www.conventionalcommits.org/) usando o [Claude Code CLI](https://docs.anthropic.com/claude/docs/claude-code), a partir do diff dos arquivos em stage.

## Funcionalidades

- Analisa o diff em stage (`git diff --cached`), os arquivos modificados e os últimos commits do repositório.
- Gera uma mensagem de commit em Português Brasileiro, seguindo Conventional Commits, e preenche automaticamente a caixa de mensagem do Source Control.
- Permite configurar um `CLAUDE_CONFIG_DIR` próprio, útil quando há mais de uma instalação/perfil do Claude na máquina.

## Requisitos

- [Claude Code CLI](https://docs.anthropic.com/claude/docs/claude-code) instalado e acessível no PATH (ou configurado via `claude-commit-gen.claudePath`).
- Extensão nativa do Git do VS Code habilitada.

## Como usar

1. Faça `git add` dos arquivos que deseja commitar.
2. Abra a aba **Source Control** do VS Code.
3. Clique no ícone ✨ (sparkle) no topo da aba Source Control, ou execute o comando **"Generate Commit Message with Claude"** pela paleta de comandos (`Ctrl+Shift+P`).
4. Na primeira execução, a extensão perguntará se você deseja definir um diretório de configuração customizado (`CLAUDE_CONFIG_DIR`). Deixe em branco para usar o padrão do sistema. Essa resposta é salva e não será perguntada novamente.
5. Aguarde a geração e revise a mensagem preenchida na caixa de commit antes de confirmar.

### Alterando o diretório de configuração do Claude depois

Caso precise trocar ou limpar o `CLAUDE_CONFIG_DIR` salvo (por exemplo, para alternar entre diferentes instalações do Claude), execute pela paleta de comandos (`Ctrl+Shift+P`):

```
Claude Commit Generator: Set Claude Config Directory
```

## Configurações

| Configuração | Padrão | Descrição |
| --- | --- | --- |
| `claude-commit-gen.claudePath` | `claude` | Caminho para o executável do Claude CLI. |
| `claude-commit-gen.timeout` | `30000` | Tempo limite (ms) para a resposta do Claude. |

## Desenvolvimento

### Instalar dependências

```bash
npm install
```

### Compilar

```bash
npm run compile
```

### Compilar em modo watch (recompila a cada alteração)

```bash
npm run watch
```

### Testar a extensão localmente

1. Abra este projeto no VS Code.
2. Pressione `F5` para abrir uma nova janela do VS Code (Extension Development Host) com a extensão carregada.
3. Abra um repositório Git com arquivos em stage e teste o comando pela aba Source Control ou pela paleta de comandos.

### Gerar o pacote `.vsix`

```bash
npm run package
```

O arquivo `.vsix` gerado pode ser instalado manualmente via **Extensions: Install from VSIX...** no VS Code.
