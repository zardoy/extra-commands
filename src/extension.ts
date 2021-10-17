import fs from 'fs'
import { join } from 'path'
import vscode from 'vscode'
import { VSCodeFramework } from 'vscode-framework'
import untildify from 'untildify'

export const activate = (ctx: vscode.ExtensionContext) => {
    const framework = new VSCodeFramework(ctx)
    framework.registerCommand('open-extension-folder', async (_, extensionId: string) => {
        const extensionsPath =
            process.env.NODE_ENV === 'development'
                ? process.platform === 'win32'
                    ? '%USERPROFILE%\\.vscode\\extensions'
                    : '~/.vscode/extensions'
                : join(ctx.extensionPath, '..')

        const extensionsDirs = await fs.promises.readdir(untildify(extensionsPath))

        // const extensions = extensionsDirs.

        console.log(extensionsPath, extensionsDirs)
    })
}
