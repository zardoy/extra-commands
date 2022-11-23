import * as vscode from 'vscode'
import { registerExtensionCommand } from 'vscode-framework'

export default () => {
    // use case: when surrounding braces can't be deleted with bracketeer (e.g. bad embedded support) bad easy to select
    registerExtensionCommand('removeSurroundingCharacter', async () => {
        // TODO create something like also for withing selection (this works with outer sel)
        const editor = vscode.window.activeTextEditor
        if (!editor || editor.viewColumn === undefined) return
        await editor.edit(edit => {
            for (const selection of editor.selections)
                for (const [pos, delta] of [
                    [selection.start, -1],
                    [selection.end, 1],
                ] as Array<[vscode.Position, number]>)
                    edit.delete(new vscode.Range(pos.translate(0, delta), pos))
        })
    })
}
