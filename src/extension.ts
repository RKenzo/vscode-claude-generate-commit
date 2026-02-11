import * as vscode from 'vscode';
import { execFile } from 'child_process';
import { generateCommitMessage } from './commitGenerator';

export function activate(context: vscode.ExtensionContext) {
	const claudePath = vscode.workspace.getConfiguration('claude-commit-gen').get<string>('claudePath', 'claude');

	execFile(claudePath, ['--version'], (error) => {
		if (error) {
			vscode.window.showWarningMessage(
				`Claude CLI not found at "${claudePath}". Install it or update the "claude-commit-gen.claudePath" setting.`
			);
		}
	});

	const disposable = vscode.commands.registerCommand('claude-commit-gen.generate', () => {
		return generateCommitMessage();
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}
