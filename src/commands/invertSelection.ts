import * as vscode from 'vscode'
import { registerExtensionCommand } from 'vscode-framework'

export default () => {
    registerExtensionCommand('invertSelection', () => {
        const editor = vscode.window.activeTextEditor
        if (!editor) return
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
