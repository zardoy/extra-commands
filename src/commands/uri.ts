import * as vscode from 'vscode'
import { registerExtensionCommand } from 'vscode-framework'
import { getCurrentWorkspaceRoot } from '@zardoy/vscode-utils/build/fs'
import { Utils } from 'vscode-uri'

export const initUriCommands = () => {
    // move copyCurrentWorkspacePath to here from experiments
    registerExtensionCommand('revealCurrentWorkspaceFolder', async () => {
        const currentWorkspaceRoot = getCurrentWorkspaceRoot()
        await vscode.env.openExternal(currentWorkspaceRoot.uri)
    })

    registerExtensionCommand('renameCurrentWorkspaceFolder', async () => {
        const currentWorkspaceRoot = getCurrentWorkspaceRoot()
        const oldUri = currentWorkspaceRoot.uri
        const oldName = Utils.basename(oldUri)
        const newName = await vscode.window.showInputBox({
            title: `Rename current workspace folder`,
            value: oldName,
        })
        if (!newName || newName === oldName) return
        const edit = new vscode.WorkspaceEdit()
        const newUri = vscode.Uri.joinPath(oldUri, '..', newName)
        edit.renameFile(oldUri, newUri)
        await vscode.workspace.applyEdit(edit)
        await vscode.commands.executeCommand('vscode.removeFromRecentlyOpened', oldUri)
        await vscode.commands.executeCommand('vscode.openFolder', newUri)
    })
}
