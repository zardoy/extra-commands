import fs from 'fs'
import { posix } from 'path'
import vscode from 'vscode'
import { extensionCtx, registerActiveDevelopmentCommand, registerExtensionCommand, registerNoop } from 'vscode-framework'
import untildify from 'untildify'
import fastFolderSize from 'fast-folder-size'
import { Utils } from 'vscode-uri'
import ansiEscapes from 'ansi-escapes'
import renameSymbolAndFile from './commands/renameSymbolAndFile'

// TODO fight for releasing
const getExtensionsDir = () =>
    process.env.NODE_ENV === 'development'
        ? process.platform === 'win32'
            ? '%USERPROFILE%\\.vscode\\extensions'
            : '~/.vscode/extensions'
        : posix.join(extensionCtx.extensionPath, '..')

export const activate = async () => {
    vscode.workspace.registerTextDocumentContentProvider('extra-commands', {
        async provideTextDocumentContent(uri) {
            // TODO support windows
            return getPlatformKeybindings('windows')
        },
    })

    registerExtensionCommand('openShortcutsOfAnotherPlatform', async _ => {
        await vscode.window.showTextDocument(vscode.Uri.parse('extra-commands:windowsKeybindings.jsonc'), {
            preview: false,
        })
    })
    registerExtensionCommand('openExtensionFolder', async (_, extensionId: string) => {
        const extensionsDirs = await fs.promises.readdir(untildify(getExtensionsDir()))

        console.log(extensionsDirs)
    })
    // registerExtensionCommand('showExtensionosSizes', async () => {
    // const size = await new Promise<number>(resolve => fastFolderSize(getExtensionsDir()))
    // })
    registerExtensionCommand('goToLine', async () => {
        const { activeTextEditor } = vscode.window
        if (!activeTextEditor) return
        const inputBox = vscode.window.createInputBox()
        inputBox.title = 'Go to Line.'
        // inputBox.placeholder = '+ / - are relative to the current line'
        inputBox.onDidChangeValue(str => {
            inputBox.validationMessage = ''
            if (!str) return
            if (!/[+-]?\d+(:\d+)?/.test(str)) {
                inputBox.validationMessage = 'Wrong format number:number'
                return
            }

            const line = Number.parseInt(str)
            if (line > activeTextEditor.document.lineCount) inputBox.validationMessage = 'Maximum line exceeded'
        })
        inputBox.onDidAccept(() => {
            if (inputBox.validationMessage) return
            const lineNumber = +inputBox.value
            const line = activeTextEditor.document.lineAt(lineNumber)
            // TODO needs tab
            const startPos = new vscode.Position(lineNumber - 1, line.firstNonWhitespaceCharacterIndex)
            activeTextEditor.selection = new vscode.Selection(startPos, startPos)
            // always in center. always in focus
            activeTextEditor.revealRange(activeTextEditor.selection, vscode.TextEditorRevealType.InCenter)
            inputBox.hide()
        })
        inputBox.onDidHide(inputBox.dispose)
        inputBox.show()
    })
    registerExtensionCommand('goToRelativePath', async () => {
        const currentUri = vscode.window.activeTextEditor?.document.uri
        if (!currentUri) {
            await vscode.window.showWarningMessage('No opened text editor')
            return
        }

        const { fs } = vscode.workspace
        const selectedPath = await new Promise<string>(resolve => {
            // TODO implement multistep
            let currentPath = '..'
            const quickPick = vscode.window.createQuickPick<vscode.QuickPickItem & { type: vscode.FileType; name: string }>()
            const updateItems = async () => {
                const filesList = await fs.readDirectory(vscode.Uri.joinPath(currentUri, currentPath))
                quickPick.items = filesList.map(([name, type]) => ({
                    name,
                    type,
                    label: `$(${type === vscode.FileType.Directory ? 'file-directory' : 'file'}) ${name}`,
                    description: name,
                }))
            }

            // BUSY
            void updateItems()
            quickPick.onDidHide(quickPick.dispose)
            quickPick.onDidAccept(() => {
                const selectedItem = quickPick.activeItems[0]!
                const itemPath = posix.join(currentPath, selectedItem.name)
                if (selectedItem.type === vscode.FileType.Directory) {
                    currentPath = itemPath
                    void updateItems()
                } else {
                    quickPick.hide()
                    resolve(itemPath)
                }
            })
            quickPick.show()
        })
        if (selectedPath === undefined) return
        await vscode.workspace.openTextDocument(Utils.joinPath(currentUri, selectedPath))
    })
    registerExtensionCommand('addImport', async () => {
        // for TS files only
        // TODO this command will be removed from here in favor of TS plugin
        const editor = vscode.window.activeTextEditor
        if (editor === undefined) return
        // const nextImportIndex = /^(?!import)/m.exec(editor.document.getText())?.index ?? 0
        let nextImportLine = 1
        let lineIndex = 0
        for (const line of editor.document.getText().split('\n')) {
            lineIndex++
            if (line.startsWith('import')) continue
            nextImportLine = lineIndex - 1
            break
        }

        const currentPos = editor.selection.start
        await editor.insertSnippet(new vscode.SnippetString("import { $2 } from '$1'\n"), new vscode.Position(nextImportLine, 0))
        const { dispose } = vscode.window.onDidChangeTextEditorSelection(({ selections }) => {
            const currentLine = selections[0]!.start.line
            if (currentLine !== nextImportLine) dispose()

            if (currentLine <= nextImportLine) return
            // looses selections and mutl-selections
            editor.selection = new vscode.Selection(currentPos.translate(1), currentPos.translate(1))
        })
    })
    registerExtensionCommand('openTerminalWithoutFocus', async () => {
        await vscode.commands.executeCommand('workbench.action.togglePanel')
        setTimeout(() => {
            void vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup')
        }, 150)
    })
    registerNoop('enhenced terminal', () => {
        const writeEmitter = new vscode.EventEmitter<string>()
        let line = ''
        const terminal = vscode.window.createTerminal({
            name: `My Extension REPL`,
            pty: {
                onDidWrite: writeEmitter.event,
                open: () => writeEmitter.fire('Type and press enter to echo the text\r\n\r\n'),
                close: () => {},
                handleInput: (data: string) => {
                    // https://gist.github.com/fnky/458719343aabd01cfb17a3a4f7296797#general-ascii-codes
                    const codes = {
                        backspace: 127,
                        //
                        ctrlBackspace: 23,
                        del: 27,
                    }
                    if (data.charCodeAt(0) === 127) {
                        // backspace
                        writeEmitter.fire(`\b${ansiEscapes.eraseEndLine}`)
                        return
                    }

                    if (data === '\r') {
                        writeEmitter.fire(`\r\necho: "${line}"\r\n\n`)
                        line = ''
                    } else {
                        console.log('data', data.charCodeAt(0))
                        line += data
                        writeEmitter.fire(data)
                    }
                },
            },
        })
        terminal.show()
    })

    registerExtensionCommand('renameSymbolAndFile', renameSymbolAndFile)

    registerExtensionCommand('fixedCmdBackspace', async () => {
        const editor = vscode.window.activeTextEditor
        if (!editor || editor.viewColumn === undefined) return
        // TODO interesting how it works with [multi-]selection
        await editor.edit(edit => {
            for (const selection of editor.selections) {
                const pos = selection.active
                const lineStart = editor.document.lineAt(pos).firstNonWhitespaceCharacterIndex
                edit.delete(new vscode.Range(pos.with(undefined, lineStart), pos))
            }
        })
    })

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

// TODO support: portable, web?
const getPlatformKeybindings = async (platform: 'mac' | 'windows' | 'linux'): Promise<string> => {
    const rawContent = await fs.promises.readFile(
        posix.join(process.env.HOME!, 'Library/Application Support/Code/User/sync/keybindings/lastSynckeybindings.json'),
        'utf-8',
    )

    return JSON.parse(JSON.parse(JSON.parse(rawContent).content).content)[platform]
}
