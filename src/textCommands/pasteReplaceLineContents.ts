// eslint-disable-next-line unicorn/import-style
import { commands, env, Range } from 'vscode'
import { getExtensionCommandId } from 'vscode-framework'

export default () => {
    // reason: selectLineContents -> paste works, but it messes with your selection in undo stack, this one is super clean
    commands.registerTextEditorCommand(getExtensionCommandId('pasteReplaceLineContents'), async (editor, edit, options = {}) => {
        const { trimEnd = true, content } = options
        let replaceContent = content ?? (await env.clipboard.readText())
        if (trimEnd) replaceContent = replaceContent.trimEnd()
        const { document, selections } = editor
        // eslint-disable-next-line curly
        for (const selection of selections) {
            edit.replace(new Range(selection.start.with(undefined, 0), document.lineAt(selection.end).range.end), replaceContent.replace(/\n\r?$/, ''))
        }
    })
}
