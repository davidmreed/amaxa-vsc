// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as os from 'os';
import * as child_process from 'child_process';
import * as path from 'path';
import * as util from 'util';

async function doOperation(op: string) {
	// Check for Amaxa

	// Get the operation definition

	let configuration = await vscode.window.showOpenDialog(
		{
			canSelectFiles: true,
			canSelectFolders: false,
			canSelectMany: false,
			filters: {
				'Amaxa Configuration': ['yaml', 'yml', 'json']
			}
		}
	);
	if (configuration === undefined) { return; }

	let configPath = configuration[0].fsPath;

	// Ask what kind of org they want to use: SFDX, or login.
	// Start with just SFDX auth.

	let sfdx_org = await vscode.window.showInputBox({
		prompt: 'SFDX org alias or username'
	});
	if (sfdx_org === undefined) { return; }

	let oc = vscode.window.createOutputChannel('Amaxa');

	oc.appendLine('Starting Amaxa operation');

	// Synthesize a credential file
	let folder = await util.promisify(fs.mkdtemp)(path.join(os.tmpdir(), 'amaxa-'));
	const data = new Uint8Array(Buffer.from(`version: 2\ncredentials:\n    sfdx: ${sfdx_org}`));
	let cred_path = path.join(folder, 'credentials.yml');
	await util.promisify(fs.writeFile)(cred_path, data);

	let args = [configPath, '-c', cred_path];

	if (op === 'load') {
		args.push('--load');
	}

	// Invoke Amaxa
	const amaxa_process = child_process.spawn(
		'/home/dreed/.local/bin/amaxa',
		args,
		{ cwd: path.dirname(configPath) }
	);

	amaxa_process.stdout.on('data', (output) => {
		oc.appendLine(output);
	});

	amaxa_process.stderr.on('data', (output) => {
		oc.appendLine(output);
	});

	amaxa_process.on('close', (status_code) => {
		oc.append(`\nOperation completed with code ${status_code}\n`);
	});

	amaxa_process.on('error', (err) => {
		oc.append(`Unable to launch Amaxa: ${err}\n`);
	});
}

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand('extension.runLoad', () => {
		doOperation('load');
	}));

	context.subscriptions.push(vscode.commands.registerCommand('extension.runExtraction', () => {
		doOperation('extract');
	}));
}

export function deactivate() { }
