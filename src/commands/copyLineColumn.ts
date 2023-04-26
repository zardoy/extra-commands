import * as vscode from 'vscode'
import { getExtensionCommandId } from 'vscode-framework'

export default () => {
    vscode.commands.registerTextEditorCommand(getExtensionCommandId('copyCurrentLineNumber'), async editor => {
        const sel = editor.selections.slice(-1)[0]
        if (!sel) return
        await vscode.env.clipboard.writeText((sel.active.line + 1).toString())
    })
    vscode.commands.registerTextEditorCommand(getExtensionCommandId('copyCurrentColumnNumber'), async editor => {
        const sel = editor.selections.slice(-1)[0]
        if (!sel) return
        await vscode.env.clipboard.writeText((sel.active.character + 1).toString())
    })
    vscode.commands.registerTextEditorCommand(getExtensionCommandId('copyCurrentLineColumnNumber'), async editor => {
        const sel = editor.selections.slice(-1)[0]
        if (!sel) return
        await vscode.env.clipboard.writeText(`${sel.active.line + 1},${sel.active.character + 1}`)
    })
}
