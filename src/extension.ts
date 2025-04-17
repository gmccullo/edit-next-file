import * as vscode from 'vscode';
import * as path from 'path';

interface IFileInfo {
	workspacePath: string;
	fsPath: string;
	level: number;
}

interface INavigationResult {
	file: IFileInfo;
	wrapped: boolean;
}

class FileNavigator {

	private _fileSystemWatcher: vscode.FileSystemWatcher | undefined;
	private _cachedFiles: IFileInfo[] | undefined;

	public constructor () {
		this.setupFileWatcher();
	}

	public dispose(): void {
		if (this._fileSystemWatcher !== undefined) {
			this._fileSystemWatcher.dispose();
		}
	}

	// Navigate to next/previous file, maintaining the same directory level when moving backwards
	public async navigateToFile(direction: 'next' | 'previous'): Promise<void> {
		const editor = vscode.window.activeTextEditor;
		if (editor === undefined) {
			void vscode.window.showInformationMessage('No active editor');
			return;
		}

		if (editor.document.uri.scheme !== 'file') {
			void vscode.window.showInformationMessage('Please navigate to a file first');
			return;
		}

		const workspaceFolder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
		if (workspaceFolder === undefined) {
			void vscode.window.showInformationMessage('File is not in workspace');
			return;
		}

		const files = await this.getFiles();
		if (files.length === 0) {
			void vscode.window.showInformationMessage('No files found in workspace');
			return;
		}

		const currentIndex = files.findIndex((f): boolean => f.fsPath === editor.document.uri.fsPath);
		if (currentIndex === -1) {
			void vscode.window.showInformationMessage('Current file not found in workspace');
			return;
		}

		const nextFile = direction === 'next'
			? this.findNextFile(files, currentIndex)
			: this.findPreviousFile(files, currentIndex);

		await this.openFile(nextFile);
	}

	// Get cached file list or rebuild if cache is invalid
	private async getFiles(): Promise<IFileInfo[]> {
		this._cachedFiles ??= await this.buildFileList();
		return this._cachedFiles;
	}

	// Find next file in flat order, wrapping to start if at end
	private findNextFile(files: IFileInfo[], currentIndex: number): INavigationResult {
		const nextIndex = currentIndex < files.length - 1 ? currentIndex + 1 : 0;
		return {
			file: files[ nextIndex ],
			wrapped: nextIndex === 0
		};
	}

	// Find previous file in flat order, wrapping to end if at start
	private findPreviousFile(files: IFileInfo[], currentIndex: number): INavigationResult {
		const previousIndex = currentIndex > 0 ? currentIndex - 1 : files.length - 1;
		return {
			file: files[ previousIndex ],
			wrapped: previousIndex === files.length - 1
		};
	}

	private setupFileWatcher(): void {
		this._fileSystemWatcher = vscode.workspace.createFileSystemWatcher("**/*");
		if (this._fileSystemWatcher !== undefined) {
			this._fileSystemWatcher.onDidCreate(() => this.invalidateCache());
			this._fileSystemWatcher.onDidDelete(() => this.invalidateCache());
			this._fileSystemWatcher.onDidChange(() => this.invalidateCache());
		}
	}

	private invalidateCache(): void {
		this._cachedFiles = undefined;
	}

	// Build hierarchical list of files with their directory levels
	private async buildFileList(): Promise<IFileInfo[]> {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (workspaceFolders === undefined) {
			return [];
		}
		const result: IFileInfo[] = [];
		for (const wsFolder of workspaceFolders) {
			await this.processDirectory(wsFolder.uri.fsPath, 0, result, wsFolder);
		}
		return result;
	}

	// Recursively process directories, tracking depth level for each file
	private async processDirectory(dirPath: string, level: number, result: IFileInfo[], wsFolder: vscode.WorkspaceFolder): Promise<void> {
		try {
			const entries = await vscode.workspace.fs.readDirectory(vscode.Uri.file(dirPath));
			const filesAtLevel: IFileInfo[] = [];
			const subDirs: string[] = [];
			for (const [ name, type ] of entries) {
				const fullPath = path.join(dirPath, name);
				if (type === vscode.FileType.File) {
					filesAtLevel.push({
						workspacePath: path.relative(wsFolder.uri.fsPath, fullPath),
						fsPath: fullPath,
						level
					});
				}
				else if (type === vscode.FileType.Directory) {
					subDirs.push(fullPath);
				}
			}
			// Sort files and directories to ensure consistent navigation order
			filesAtLevel.sort((a, b) => a.workspacePath.localeCompare(b.workspacePath));
			result.push(...filesAtLevel);
			subDirs.sort((a, b) => a.localeCompare(b));
			for (const subDir of subDirs) {
				await this.processDirectory(subDir, level + 1, result, wsFolder);
			}
		}
		catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			void vscode.window.showErrorMessage(`Error reading directory ${ dirPath }: ${ errorMessage }`);
			throw error;
		}
	}

	private async openFile(result: INavigationResult | null): Promise<void> {
		if (result?.file === undefined) {
			void vscode.window.showInformationMessage('No files to navigate to');
			return;
		}
		const doc = await vscode.workspace.openTextDocument(result.file.fsPath);
		await vscode.window.showTextDocument(doc);
		if (result.wrapped === true) {
			await vscode.window.showInformationMessage(
				"File navigation wrapped.",
				{
					modal: false,
				});
		}
	}
}

let navigator: FileNavigator | undefined;

function activate(context: vscode.ExtensionContext): void {
	navigator = new FileNavigator();
	const nextFileCommand = vscode.commands.registerCommand('edit-next-file.nextFile', (): void => {
		if (navigator !== undefined) {
			void navigator.navigateToFile('next');
		}
	});
	const previousFileCommand = vscode.commands.registerCommand('edit-next-file.previousFile', (): void => {
		if (navigator !== undefined) {
			void navigator.navigateToFile('previous');
		}
	});
	context.subscriptions.push(navigator, nextFileCommand, previousFileCommand);
}

function deactivate(): void {
	if (navigator !== undefined) {
		navigator.dispose();
	}
}

export {
	activate,
	deactivate
};
