import fs from 'fs'
import { posix } from 'path'
import untildify from 'untildify'
import vscode from 'vscode'
import { extensionCtx, getExtensionCommandId, getExtensionSetting, registerExtensionCommand } from 'vscode-framework'
import renameSymbolAndFile from './commands/renameSymbolAndFile'

// TODO fight for releasing
const getExtensionsDir = () =>
    process.env.NODE_ENV === 'development'
        ? process.platform === 'win32'
            ? `${process.env.USERPROFILE!}\\.vscode\\extensions`
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
        if (process.platform !== 'darwin') {
            await vscode.window.showWarningMessage('Only macos is supported')
            return
        }

        await vscode.window.showTextDocument(vscode.Uri.parse('extra-commands:windowsKeybindings.jsonc'), {
            preview: false,
        })
    })
    registerExtensionCommand('openExtensionFolder', async (_, extensionId: string) => {
        const extension = vscode.extensions.getExtension(extensionId)
        if (!extension) {
            void vscode.window.showWarningMessage(`No acitve extension ${extensionId} found`)
            return
        }

        const extPath = `${untildify(getExtensionsDir())}/${extensionId}-${extension.packageJSON.version}`
        await vscode.env.openExternal(vscode.Uri.file(extPath))
    })
    registerExtensionCommand('togglePanelVisibility', async () => {
        await vscode.commands.executeCommand('workbench.action.togglePanel')
        setTimeout(() => {
            void vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup')
        }, 150)
    })
    // preserved for compatibility
    registerExtensionCommand('openTerminalWithoutFocus', async () => {
        await vscode.commands.executeCommand(getExtensionCommandId('togglePanelVisibility'))
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

            const line = +str
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
            const revealType: vscode.TextEditorRevealType = (() => {
                switch (getExtensionSetting('goToLine.centerViewport')) {
                    case 'always':
                        return vscode.TextEditorRevealType.InCenter
                    case 'ifOutOfView':
                        return vscode.TextEditorRevealType.InCenterIfOutsideViewport

                    default:
                        return vscode.TextEditorRevealType.Default
                }
            })()
            activeTextEditor.revealRange(activeTextEditor.selection, revealType)
            inputBox.hide()
        })
        inputBox.onDidHide(inputBox.dispose)
        inputBox.show()
    })

    registerExtensionCommand('renameSymbolAndFile', renameSymbolAndFile)

    registerExtensionCommand('deleteAllLeftAfterIndent', async () => {
        const editor = vscode.window.activeTextEditor
        if (!editor || editor.viewColumn === undefined) return
        // TODO interesting how it works with [multi-]selection
        await editor.edit(edit => {
            for (const selection of editor.selections) {
                const pos = selection.end
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

// TODO support: portable, web? (WONTFIX for now)
// TODO support other platforms at least. the path was hardcoded to easy testing in dev
const getPlatformKeybindings = async (platform: 'mac' | 'windows' | 'linux'): Promise<string> => {
    const rawContent = await fs.promises.readFile(
        posix.join(process.env.HOME!, 'Library/Application Support/Code/User/sync/keybindings/lastSynckeybindings.json'),
        'utf-8',
    )

    return JSON.parse(JSON.parse(JSON.parse(rawContent).content).content)[platform]
}
