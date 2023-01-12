import * as vscode from 'vscode'
import { getExtensionCommandId } from 'vscode-framework'

export default () => {
    // use case: when surrounding braces can't be deleted with bracketeer (e.g. bad embedded support) bad easy to select
    vscode.commands.registerTextEditorCommand(getExtensionCommandId('removeSurroundingCharacter'), async (editor, edit) => {
        // TODO create something like also for withing selection (this works with outer sel)
        for (const selection of editor.selections)
            for (const [pos, delta] of [
                [selection.start, -1],
                [selection.end, 1],
            ] as Array<[vscode.Position, number]>)
                edit.delete(new vscode.Range(pos.translate(0, delta), pos))
    })
}
