import * as vscode from 'vscode';
import { execFile, spawn } from 'child_process';

interface GitExtension {
	getAPI(version: number): GitAPI;
}

interface GitAPI {
	repositories: Repository[];
}

interface Repository {
	rootUri: vscode.Uri;
	inputBox: { value: string };
	state: {
		indexChanges: unknown[];
	};
}

function execGit(args: string[], cwd: string): Promise<string> {
	return new Promise((resolve, reject) => {
		execFile('git', args, { cwd, maxBuffer: 10 * 1024 * 1024 }, (error, stdout) => {
			if (error) {
				reject(error);
				return;
			}
			resolve(stdout);
		});
	});
}

const CONFIG_DIR_KEY = 'claude-commit-gen.claudeConfigDir';
const CONFIG_DIR_ASKED_KEY = 'claude-commit-gen.claudeConfigDirAsked';

export async function promptClaudeConfigDir(context: vscode.ExtensionContext): Promise<void> {
	const current = context.globalState.get<string>(CONFIG_DIR_KEY, '');
	const value = await vscode.window.showInputBox({
		title: 'Claude Config Directory',
		prompt: 'Caminho para CLAUDE_CONFIG_DIR (deixe em branco para usar o padrão do sistema)',
		value: current,
		placeHolder: 'ex: C:\\Users\\voce\\.claude-work',
	});

	if (value === undefined) {
		return;
	}

	await context.globalState.update(CONFIG_DIR_KEY, value.trim());
	await context.globalState.update(CONFIG_DIR_ASKED_KEY, true);
}

async function getClaudeConfigDir(context: vscode.ExtensionContext): Promise<string> {
	const alreadyAsked = context.globalState.get<boolean>(CONFIG_DIR_ASKED_KEY, false);
	if (!alreadyAsked) {
		await promptClaudeConfigDir(context);
	}
	return context.globalState.get<string>(CONFIG_DIR_KEY, '');
}

function runClaude(
	prompt: string,
	cwd: string,
	token: vscode.CancellationToken,
	claudeConfigDir: string
): Promise<string> {
	const config = vscode.workspace.getConfiguration('claude-commit-gen');
	const claudePath = config.get<string>('claudePath', 'claude');
	const timeout = config.get<number>('timeout', 30000);

	return new Promise((resolve, reject) => {
		const env = { ...process.env };
		if (claudeConfigDir) {
			env.CLAUDE_CONFIG_DIR = claudeConfigDir;
		}

		const proc = spawn(claudePath, ['--print'], {
			cwd,
			env,
			stdio: ['pipe', 'pipe', 'pipe'],
		});

		let stdout = '';
		let stderr = '';

		const timer = setTimeout(() => {
			proc.kill();
			reject(new Error('Claude timed out. Increase "claude-commit-gen.timeout" if needed.'));
		}, timeout);

		const cancelListener = token.onCancellationRequested(() => {
			proc.kill();
			clearTimeout(timer);
			reject(new Error('Cancelled'));
		});

		proc.stdout.on('data', (data: Buffer) => {
			stdout += data.toString();
		});

		proc.stderr.on('data', (data: Buffer) => {
			stderr += data.toString();
		});

		proc.on('close', (code) => {
			clearTimeout(timer);
			cancelListener.dispose();
			if (code !== 0) {
				reject(new Error(`Claude exited with code ${code}: ${stderr}`));
				return;
			}
			resolve(stdout.trim());
		});

		proc.on('error', (err) => {
			clearTimeout(timer);
			cancelListener.dispose();
			reject(err);
		});

		proc.stdin.write(prompt);
		proc.stdin.end();
	});
}

function buildPrompt(diff: string, files: string, recentCommits: string): string {
	return `Analise o diff abaixo e gere UMA mensagem de commit seguindo o padrão Conventional Commits (feat:, fix:, refactor:, docs:, chore:, test:, ci:, style:, perf:, build:).

Formato obrigatório:
<type>[scope opcional]: <descrição imperativa do porquê> (máx 72 chars)

[linha em branco]
* <mudança específica 1>
* <mudança específica 2>
* ...

Regras:
- Idioma: Português Brasileiro
- Primeira linha: imperativa, concisa, foca no PORQUÊ da mudança (máx 72 caracteres)
- Corpo (bullet points): lista objetiva das mudanças concretas feitas (O QUÊ)
- Omita bullet points óbvios ou redundantes com o título
- Se houver apenas uma mudança trivial, não inclua corpo
- Não use ponto final na primeira linha
- Cada bullet deve ter no máximo 72 caracteres

Exemplo:
feat(auth): allow users to reset password via email

- add forgot-password endpoint with token generation
- send reset link using email service
- expire tokens after 15 minutes

Commits recentes do repositório (para referência de estilo):
${recentCommits}

Arquivos modificados:
${files}

Diff:
${diff}

Responda APENAS com a mensagem de commit, sem explicações, sem blocos de código, sem aspas ao redor.`;
}

export async function generateCommitMessage(context: vscode.ExtensionContext): Promise<void> {
	const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git');
	if (!gitExtension) {
		vscode.window.showErrorMessage('Git extension not found.');
		return;
	}

	const git = gitExtension.isActive ? gitExtension.exports.getAPI(1) : (await gitExtension.activate()).getAPI(1);
	const repo = git.repositories[0];

	if (!repo) {
		vscode.window.showErrorMessage('No Git repository found.');
		return;
	}

	if (repo.state.indexChanges.length === 0) {
		vscode.window.showWarningMessage('No staged files. Use "git add" first.');
		return;
	}

	const cwd = repo.rootUri.fsPath;
	const claudeConfigDir = await getClaudeConfigDir(context);

	await vscode.window.withProgress(
		{
			location: vscode.ProgressLocation.Notification,
			title: 'Generating commit message with Claude...',
			cancellable: true,
		},
		async (_progress, token) => {
			const [diff, files, recentCommits] = await Promise.all([
				execGit(['diff', '--cached'], cwd),
				execGit(['diff', '--cached', '--name-only'], cwd),
				execGit(['log', '--oneline', '-5'], cwd).catch(() => ''),
			]);

			if (!diff.trim()) {
				vscode.window.showWarningMessage('Staged diff is empty.');
				return;
			}

			const prompt = buildPrompt(diff, files, recentCommits);
			const message = await runClaude(prompt, cwd, token, claudeConfigDir);
			repo.inputBox.value = message;
		}
	);
}
