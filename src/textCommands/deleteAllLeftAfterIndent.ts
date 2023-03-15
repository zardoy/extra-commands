import * as vscode from 'vscode'
import { getExtensionCommandId } from 'vscode-framework'

export default () => {
    vscode.commands.registerTextEditorCommand(getExtensionCommandId('deleteAllLeftAfterIndent'), (editor, edit) => {
        for (const selection of editor.selections) {
            const pos = selection.end
            const lineStart = editor.document.lineAt(pos).firstNonWhitespaceCharacterIndex
            edit.delete(new vscode.Range(pos.with(undefined, lineStart), pos))
        }
    })
}
