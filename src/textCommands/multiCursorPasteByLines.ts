import { commands, env } from 'vscode'
import { getExtensionCommandId } from 'vscode-framework'

// default behavior of vscode is to paste the same text in all cursors if N of cursors doesn't match N of lines in clipboard
// as default "editor.multiCursorPaste": "spread"
// BUT this command uses the same behavior but for any number of lines in clipboard

export default () => {
    commands.registerTextEditorCommand(getExtensionCommandId('multiCursorPasteByLines'), async (editor, _edit, options = {}) => {
        const clibpardText = await env.clipboard.readText()
        const lines = clibpardText.split('\n')
        const { selections } = editor
        await editor.edit(edit => {
            for (const [i, selection] of [...selections].sort((a, b) => a.start.compareTo(b.start)).entries()) {
                const line = lines[i]
                if (!line) return
                edit.replace(selection, line)
            }
        })
    })
}
