import vscode from 'vscode'
import { VSCodeFramework } from 'vscode-framework'

export const activate = (ctx: vscode.ExtensionContext) => {
    const framework = new VSCodeFramework(ctx)
    framework.registerCommand('say-hello', async () => {
        await vscode.window.showInformationMessage('heyy')
    })
}
