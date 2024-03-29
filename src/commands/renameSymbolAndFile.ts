// TODO introduce general rename command with decorations!
import vscode from 'vscode'
import path from 'path-browserify'

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
        title: 'Change file name and symbol name to',
        // valueSelection: startPos.compareTo(endPos) === 0 ? undefined : startPos.,
    })
    if (newName === undefined) return
    let edit: vscode.WorkspaceEdit | undefined = await vscode.commands.executeCommand(
        'vscode.executeDocumentRenameProvider',
        editor.document.uri,
        startPos,
        newName,
    )
    if (!edit) edit = new vscode.WorkspaceEdit()

    const { uri } = editor.document
    const newFileName = `${newName}${path.extname(uri.path)}`
    edit.renameFile(editor.document.uri, vscode.Uri.joinPath(editor.document.uri, '../', newFileName))

    await vscode.workspace.applyEdit(edit)
}
