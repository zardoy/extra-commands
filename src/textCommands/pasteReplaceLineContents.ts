// eslint-disable-next-line unicorn/import-style
import { commands, env, Range, Selection } from 'vscode'
import { getExtensionCommandId } from 'vscode-framework'

export default () => {
    // reason: selectLineContents -> paste works, but it messes with your selection in undo stack, this one is super clean
    commands.registerTextEditorCommand(getExtensionCommandId('pasteReplaceLineContents'), async (editor, _edit, options = {}) => {
        const { trimEnd = true, content } = options
        let replaceContent = content ?? (await env.clipboard.readText())
        if (trimEnd) replaceContent = replaceContent.trimEnd()
        const { document, selections } = editor
        const pos = selections[0]!.end
        const resetSelection = selections.length === 1 && selections[0]!.start.isEqual(pos) && pos.isEqual(document.lineAt(pos).range.end)
        await editor.edit(edit => {
            // eslint-disable-next-line curly
            for (const selection of selections) {
                edit.replace(new Range(selection.start.with(undefined, 0), document.lineAt(selection.end).range.end), replaceContent)
            }
        })
        if (resetSelection) {
            const newPos = document.lineAt(pos).range.end
            editor.selections = [new Selection(newPos, newPos)]
        }
    })
}
