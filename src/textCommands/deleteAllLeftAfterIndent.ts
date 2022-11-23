import * as vscode from 'vscode'
import { registerExtensionCommand } from 'vscode-framework'

export default () => {
    registerExtensionCommand('deleteAllLeftAfterIndent', async () => {
        const editor = vscode.window.activeTextEditor
        if (!editor || editor.viewColumn === undefined) return
        // TODO interesting how it works with [multi-]selection
        await editor.edit(edit => {
            for (const selection of editor.selections) {
                const pos = selection.end
                const lineStart = editor.document.lineAt(pos).firstNonWhitespaceCharacterIndex
                edit.delete(new vscode.Range(pos.with(undefined, lineStart), pos))
            }
        })
    })
}
