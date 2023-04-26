import * as vscode from 'vscode'
import { getExtensionCommandId } from 'vscode-framework'

export default () => {
    vscode.commands.registerTextEditorCommand(
        getExtensionCommandId('deleteAllLeftAfterIndent'),
        (editor, edit, { onlyBeforeCursor = true, lineDiff = 0 } = {}) => {
            for (const selection of editor.selections) {
                const pos = selection.end
                if (lineDiff) onlyBeforeCursor = false
                try {
                    const line = editor.document.lineAt(pos.line + (lineDiff as number))
                    const lineStart = line.firstNonWhitespaceCharacterIndex
                    edit.delete(new vscode.Range(line.range.start.with(undefined, lineStart), onlyBeforeCursor ? pos : line.range.end))
                } catch {}
            }
        },
    )
}
