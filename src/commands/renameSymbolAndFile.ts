// TODO introduce general rename command with decorations!
import path from 'path'
import vscode from 'vscode'

export default async () => {
    const editor = vscode.window.activeTextEditor
    if (!editor || editor.viewColumn === undefined) return
    if (editor.document.uri.scheme === 'untitled') {
        await vscode.window.showWarningMessage('Can be used only on saved documents')
        return
    }

    const startPos = editor.selection.start
    const endPos = editor.selection.end
    const newName = await vscode.window.showInputBox({
        ignoreFocusOut: true,
        value: editor.document.getText(editor.document.getWordRangeAtPosition(startPos)),
        // valueSelection: startPos.compareTo(endPos) === 0 ? undefined : startPos.,
    })
    if (newName === undefined) return
    const renameSymbolEdit: vscode.WorkspaceEdit | undefined = await vscode.commands.executeCommand(
        'vscode.executeDocumentRenameProvider',
        editor.document.uri,
        startPos,
        newName,
    )
    // Also rename file only. by this command now is even more powerful
    const renameFileEdit = new vscode.WorkspaceEdit()

    const { uri } = editor.document
    const newFileName = `${newName}${path.extname(uri.path)}`
    renameFileEdit.renameFile(editor.document.uri, vscode.Uri.joinPath(editor.document.uri, '../', newFileName))
    // TODO make it possible to easily undo changes. To make it possible, execute rename provider twice or even better: patch uris
    console.log()
    if (renameSymbolEdit)
        // eslint-disable-next-line zardoy-config/@typescript-eslint/dot-notation
        renameFileEdit['_edits'].unshift(...renameSymbolEdit['_edits'])

    await vscode.workspace.applyEdit(renameFileEdit)
}
