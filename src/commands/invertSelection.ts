import * as vscode from 'vscode'
import { getExtensionCommandId } from 'vscode-framework'

export default () => {
    vscode.commands.registerTextEditorCommand(getExtensionCommandId('invertSelection'), editor => {
        const newSelections: vscode.Selection[] = []
        let prevPos = new vscode.Position(0, 0)
        const doSelectionAgainstPrevPos = (pos: vscode.Position) => {
            newSelections.push(new vscode.Selection(prevPos, pos))
        }

        for (const selection of editor.selections) {
            doSelectionAgainstPrevPos(selection.start)
            prevPos = selection.end
        }

        doSelectionAgainstPrevPos(editor.document.lineAt(editor.document.lineCount - 1).range.end)
        editor.selections = newSelections
    })
}
