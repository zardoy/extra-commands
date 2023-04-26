import * as vscode from 'vscode'
import { expandPosition, offsetPosition } from '@zardoy/vscode-utils/build/position'

import { getExtensionCommandId, registerExtensionCommand } from 'vscode-framework'

export default () => {
    vscode.commands.registerTextEditorCommand(getExtensionCommandId('expandSelection'), async (editor, edit) => {
        const prompt = await vscode.window.showInputBox({
            title: 'Expand selection',
            placeHolder: 'e.g. -1 to shrink both start & end or -1,0 to only start',
        })
        if (!prompt) return
        const [startExpand, endExpand] = (prompt.includes(',') ? prompt.split(',') : [prompt, prompt]).map(Number)
        changeType<number>(startExpand)
        changeType<number>(endExpand)
        if (Number.isNaN(startExpand)) throw new Error('Incorrect input format')
        const newSelections = [] as vscode.Selection[]
        const { document } = editor
        for (const { start, end } of editor.selections)
            newSelections.push(new vscode.Selection(offsetPosition(document, start, -startExpand), offsetPosition(document, end, endExpand)))
        editor.selections = newSelections
    })
}

function changeType<T>(arg): asserts arg is T {}
