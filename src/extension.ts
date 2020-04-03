// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as os from 'os';
import * as child_process from 'child_process';
import * as path from 'path';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	context.subscriptions.push(vscode.commands.registerCommand('extension.runLoad', () => {
		// Check for Amaxa

		// Get the operation definition

		vscode.window.showOpenDialog(
			{
				canSelectFiles: true,
				canSelectFolders: false,
				canSelectMany: false,
				filters: {
					'Amaxa Configuration': ['yaml', 'yml', 'json']
				}
			}
		).then(result => {
			if (result === undefined) { return; }

			let configPath = result[0].fsPath;

			// Ask what kind of org they want to use: SFDX, or login.
			// Start with just SFDX auth.

			vscode.window.showInputBox({
				prompt: 'SFDX org alias or username'
			}).then(result => {
				if (result === undefined) { return; }
				let sfdx_org = result;
				let oc = vscode.window.createOutputChannel('Amaxa');

				oc.appendLine('Starting Amaxa load');

				// Synthesize a credential file
				fs.mkdtemp(path.join(os.tmpdir(), 'amaxa-'), (err, folder) => {
					if (err) { throw err; }

					const data = new Uint8Array(Buffer.from(`version: 2\ncredentials:\n\tsfdx: ${sfdx_org}`));
					let cred_path = path.join(folder, 'credentials.yml');

					fs.writeFile(cred_path, data, (err) => {
						if (err) { throw err; }

						// Invoke Amaxa
						const amaxa_process = child_process.spawn('/home/dreed/.local/bin/amaxa', ['--load', configPath, '-c', cred_path], { cwd: path.dirname(configPath) });

						amaxa_process.stdout.on('data', (output) => {
							oc.append(output);
						});

						amaxa_process.stderr.on('data', (output) => {
							oc.append(output);
						});

						amaxa_process.on('close', (status_code) => {
							oc.append(`\nLoad completed with code ${status_code}\n`);
						});

						amaxa_process.on('error', (err) => {
							oc.append(`Unable to launch Amaxa: ${err}\n`);
						});
					});
				});
			});
		});
	}));

	context.subscriptions.push(vscode.commands.registerCommand('extension.runExtraction', () => {

	}));
}

// this method is called when your extension is deactivated
export function deactivate() { }
