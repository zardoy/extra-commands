import * as vscode from 'vscode'
import { getExtensionCommandId, registerExtensionCommand } from 'vscode-framework'
import { showQuickPick } from '@zardoy/vscode-utils/build/quickPick'

export default () => {
    registerExtensionCommand('showFilteredSymbols', async (_, query?: string, folderUri?: vscode.Uri) => {
        const defaultQuery = ''
        const updateQuickPickItems = async (quickPick: vscode.QuickPick<any>) => {
            quickPick.busy = true
            const result: vscode.SymbolInformation[] = await vscode.commands.executeCommand('vscode.executeWorkspaceSymbolProvider', quickPick.value)
            quickPick.busy = false
            quickPick.items = result
                .map(({ name, containerName, location, kind }) => {
                    // TODO parse .gitignore & ignore instead
                    if (location.uri.path.includes('/node_modules/')) return undefined!
                    if (folderUri && !location.uri.fsPath.startsWith(folderUri.fsPath)) return

                    const relativePath = vscode.workspace.asRelativePath(location.uri)
                    const kindStr = vscode.SymbolKind[kind]!.toLowerCase()
                    return {
                        label: `$(symbol-${kindStr}) ${name}`,
                        description: `${containerName} • ${relativePath}`,
                        value: location,
                    }
                })
                .filter(Boolean)
        }

        const location = await showQuickPick<vscode.Location>([], {
            title: `Filtered Go to Symbol in ${folderUri ? 'Folder' : 'Workspace'}...`,
            initialValue: query ?? defaultQuery,
            onDidChangeValue() {
                void updateQuickPickItems(this)
            },
            onDidShow() {
                void updateQuickPickItems(this)
            },
        })
        if (!location) return
        const pos = location.range.start
        await vscode.window.showTextDocument(location.uri, { selection: new vscode.Range(pos, pos) })
    })

    registerExtensionCommand('searchForSymbolWithinFolder', async (_, folderUri: vscode.Uri) => {
        await vscode.commands.executeCommand(getExtensionCommandId('showFilteredSymbols'), undefined, folderUri)
    })
    // TODO?
    // openAllSymbols?
    // removeAllSymbols?
}
