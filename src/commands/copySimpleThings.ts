import * as vscode from 'vscode'
import { registerExtensionCommand } from 'vscode-framework'

export default () => {
    registerExtensionCommand('copyCurrentLineNumber', async () => {
        const sel = vscode.window.activeTextEditor?.selections.slice(-1)[0]
        if (!sel) return
        await vscode.env.clipboard.writeText((sel.active.line + 1).toString())
    })
    registerExtensionCommand('copyCurrentColumnNumber', async () => {
        const sel = vscode.window.activeTextEditor?.selections.slice(-1)[0]
        if (!sel) return
        await vscode.env.clipboard.writeText((sel.active.character + 1).toString())
    })
    registerExtensionCommand('copyCurrentLineColumnNumber', async () => {
        const sel = vscode.window.activeTextEditor?.selections.slice(-1)[0]
        if (!sel) return
        await vscode.env.clipboard.writeText(`${sel.active.line + 1},${sel.active.character + 1}`)
    })
}
