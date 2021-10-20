import fs from 'fs'
import { join } from 'path'
import vscode from 'vscode'
import { extensionCtx, registerExtensionCommand } from 'vscode-framework'
import untildify from 'untildify'
import fastFolderSize from 'fast-folder-size'

// TODO fight for releasing
const getExtensionsDir = () =>
    process.env.NODE_ENV === 'development'
        ? process.platform === 'win32'
            ? '%USERPROFILE%\\.vscode\\extensions'
            : '~/.vscode/extensions'
        : join(extensionCtx.extensionPath, '..')

export const activate = () => {
    registerExtensionCommand('open-extension-folder', async (_, extensionId: string) => {
        const extensionsDirs = await fs.promises.readdir(untildify(getExtensionsDir()))

        console.log(extensionsDirs)
    })
    registerExtensionCommand('show-extensionos-sizes', async () => {
        // const size = await new Promise<number>(resolve => fastFolderSize(getExtensionsDir()))
    })
}
