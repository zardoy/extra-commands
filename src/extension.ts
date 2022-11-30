import * as vscode from 'vscode'
import { getExtensionCommandId, getExtensionSetting, registerActiveDevelopmentCommand, registerExtensionCommand } from 'vscode-framework'
import filteredGoToSymbol from './commands/extendedGoToSymbol'
import goToLine from './commands/goToLine'
import renameSymbolAndFile from './commands/renameSymbolAndFile'
import seedSearchField from './commands/seedSearchField'
import { initUriCommands } from './commands/uri'
import { registerExtensionCommands } from './extensionCommands'
import textCommands from './textCommands'

export const activate = async () => {
    registerExtensionCommands()

    vscode.workspace.registerTextDocumentContentProvider('extra-commands', {
        async provideTextDocumentContent(uri) {
            // TODO support windows
            return getPlatformKeybindings('windows')
        },
    })

    registerExtensionCommand('openShortcutsOfAnotherPlatform', async _ => {
        if (process.platform !== 'darwin') {
            await vscode.window.showWarningMessage('Only macos is supported')
            return
        }

        await vscode.window.showTextDocument(vscode.Uri.parse('extra-commands:windowsKeybindings.jsonc'), {
            preview: false,
        })
    })

    registerExtensionCommand('togglePanelVisibility', async () => {
        await vscode.commands.executeCommand('workbench.action.togglePanel')
        setTimeout(() => {
            void vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup')
        }, 150)
    })
    // preserved for compatibility
    registerExtensionCommand('openTerminalWithoutFocus', async () => {
        await vscode.commands.executeCommand(getExtensionCommandId('togglePanelVisibility'))
    })
    // registerExtensionCommand('showExtensionosSizes', async () => {
    // const size = await new Promise<number>(resolve => fastFolderSize(getExtensionsDir()))
    // })

    registerExtensionCommand('renameSymbolAndFile', renameSymbolAndFile)

    textCommands()
    filteredGoToSymbol()

    goToLine()
    initUriCommands()
    seedSearchField()
}

// TODO support: portable, web? (WONTFIX for now)
// TODO support other platforms at least. the path was hardcoded to easy testing in dev
const getPlatformKeybindings = async (platform: 'mac' | 'windows' | 'linux'): Promise<string> => {
    const rawContent = await vscode.workspace.fs.readFile(
        vscode.Uri.joinPath(vscode.Uri.file(process.env.HOME!), 'Library/Application Support/Code/User/sync/keybindings/lastSynckeybindings.json'),
    )

    return JSON.parse(JSON.parse(JSON.parse(new TextDecoder().decode(rawContent)).content).content)[platform]
}
