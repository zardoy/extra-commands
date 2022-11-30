import * as vscode from 'vscode'
import { getExtensionSetting, registerExtensionCommand } from 'vscode-framework'

export default () => {
    registerExtensionCommand('goToLine', async () => {
        const { activeTextEditor } = vscode.window
        if (!activeTextEditor) return
        const inputBox = vscode.window.createInputBox()
        inputBox.title = 'Go to Line'
        // inputBox.placeholder = '+ / - are relative to the current line'
        inputBox.onDidChangeValue(str => {
            inputBox.validationMessage = ''
            if (!str) return
            if (!/[+-]?\d+(:\d+)?/.test(str)) {
                inputBox.validationMessage = 'Wrong format number:number'
                return
            }

            const line = +str
            if (line > activeTextEditor.document.lineCount) inputBox.validationMessage = 'Maximum line exceeded'
        })
        inputBox.onDidAccept(() => {
            if (inputBox.validationMessage) return
            const lineNumber = +inputBox.value
            const line = activeTextEditor.document.lineAt(lineNumber)
            // TODO needs tab
            const startPos = new vscode.Position(lineNumber - 1, line.firstNonWhitespaceCharacterIndex)
            activeTextEditor.selection = new vscode.Selection(startPos, startPos)
            // always in center. always in focus
            const revealType: vscode.TextEditorRevealType = (() => {
                switch (getExtensionSetting('goToLine.centerViewport')) {
                    case 'always':
                        return vscode.TextEditorRevealType.InCenter
                    case 'ifOutOfView':
                        return vscode.TextEditorRevealType.InCenterIfOutsideViewport

                    default:
                        return vscode.TextEditorRevealType.Default
                }
            })()
            activeTextEditor.revealRange(activeTextEditor.selection, revealType)
            inputBox.hide()
        })
        inputBox.onDidHide(inputBox.dispose)
        inputBox.show()
    })
}
