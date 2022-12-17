import * as vscode from 'vscode'
import { registerExtensionCommand } from 'vscode-framework'
import { showQuickPick } from '@zardoy/vscode-utils/build/quickPick'

export default () => {
    // can be used in keybinding with -1 arg to rotate leading selection
    registerExtensionCommand('changeLeadingSelection', async (_, indexArg?: number) => {
        const editor = vscode.window.activeTextEditor
        if (!editor) return
        const originalSelection = editor.selections
        const visibleRange = editor.visibleRanges
        /** sorted */
        const selections = [...originalSelection].sort((a, b) => a.start.compareTo(b.start))
        const strPos = (pos: vscode.Position) => `${pos.line}:${pos.character}`
        const selectedIndex =
            indexArg ??
            (await showQuickPick(
                selections.map((selection, i) => ({
                    label: `${i}. ${strPos(selection.anchor)} - ${strPos(selection.active)}`,
                    value: i,
                    // description: `${strPos(selection.start)} - ${strPos(selection.end)}`
                })),
                {
                    title: 'Selection to selection to make it leading...',
                    initialSelectedIndex: selections.indexOf(editor.selection),
                    onDidChangeFirstActive(item) {
                        editor.selection = selections[item.value]!
                        editor.revealRange(editor.selection, vscode.TextEditorRevealType.InCenterIfOutsideViewport)
                    },
                },
            ))
        if (!selectedIndex) {
            editor.selections = originalSelection
            editor.revealRange(editor.selection)
            // it seems to be bugged, so not restoring original selection :(
            // editor.revealRange(visibleRange[0]!, vscode.TextEditorRevealType.AtTop)
            return
        }

        const selectedSelection = selections.splice(selectedIndex, 1)[0]
        if (!selectedSelection) return
        editor.revealRange(selectedSelection)
        editor.selections = [selectedSelection, ...selections]
    })
    registerExtensionCommand('rotateActiveCursorInSelections', () => {
        const editor = vscode.window.activeTextEditor
        if (!editor) return
        editor.selections = editor.selections.map(selection => new vscode.Selection(selection.active, selection.anchor))
    })
}
