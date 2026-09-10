import * as vscode from 'vscode';
import { execFile } from 'child_process';
import { generateCommitMessage, promptClaudeConfigDir } from './commitGenerator';

export function activate(context: vscode.ExtensionContext) {
	const claudePath = vscode.workspace.getConfiguration('claude-commit-gen').get<string>('claudePath', 'claude');

	execFile(claudePath, ['--version'], (error) => {
		if (error) {
			vscode.window.showWarningMessage(
				`Claude CLI not found at "${claudePath}". Install it or update the "claude-commit-gen.claudePath" setting.`
			);
		}
	});

	const generateDisposable = vscode.commands.registerCommand('claude-commit-gen.generate', () => {
		return generateCommitMessage(context);
	});

	const setConfigDirDisposable = vscode.commands.registerCommand('claude-commit-gen.setConfigDir', () => {
		return promptClaudeConfigDir(context);
	});

	context.subscriptions.push(generateDisposable, setConfigDirDisposable);
}

export function deactivate() {}
