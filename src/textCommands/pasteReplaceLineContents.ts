// eslint-disable-next-line unicorn/import-style
import { env, Range } from 'vscode'
import { getActiveRegularEditor } from '@zardoy/vscode-utils'
import { registerExtensionCommand } from 'vscode-framework'

export default () => {
    // reason: selectLineContents -> paste works, but it messes with your selection in undo stack, this one is super clean
    registerExtensionCommand('pasteReplaceLineContents', async (_, options: { trimEnd?: boolean } = {}) => {
        const editor = getActiveRegularEditor()
        if (!editor) return
        const { trimEnd = true } = options
        let replaceContent = await env.clipboard.readText()
        if (trimEnd) replaceContent = replaceContent.trimEnd()
        const { document } = editor
        void editor.edit(edit => {
            // eslint-disable-next-line curly
            for (const selection of editor.selections) {
                edit.replace(new Range(selection.start.with(undefined, 0), document.lineAt(selection.end).range.end), replaceContent.replace(/\n\r?$/, ''))
            }
        })
    })
}
