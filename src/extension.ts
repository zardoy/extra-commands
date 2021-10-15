import { VSCodeFramework } from 'vscode-framework'
import vscode from 'vscode'
import fs from 'fs'

export const activate = (ctx: vscode.ExtensionContext) => {
    const framework = new VSCodeFramework(ctx)
    framework.registerCommand('open-extension-folder', (_, extensionId: string) => {
        const path = vscode.extensions.getExtension(extensionId)!.extensionPath
        console.log(path)
    })
}
