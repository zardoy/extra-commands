import * as vscode from 'vscode'
import { CommandHandler, registerExtensionCommand } from 'vscode-framework'

// Commands for extension list

export const registerExtensionCommands = () => {
    const extensionAction: CommandHandler = async ({ command }, extensionId: string) => {
        const extension = vscode.extensions.getExtension(extensionId)
        if (!extension) {
            void vscode.window.showWarningMessage(`No acitve extension ${extensionId} found`)
            return
        }

        // TODO detect openVSX somehow
        const marketplaceLink = `https://marketplace.visualstudio.com/items?itemName=${extensionId}`

        switch (command) {
            case 'openExtensionFolder':
                await vscode.env.openExternal(extension.extensionUri)
                // const extPath = `${untildify(getExtensionsDir())}/${extensionId}-${extension.packageJSON.version}`
                break
            case 'copyExtensionMarkdown':
                await vscode.env.clipboard.writeText(`[${extension.packageJSON.displayName}](${marketplaceLink})`)
                break

            default:
        }
    }

    registerExtensionCommand('openExtensionFolder', extensionAction)
    registerExtensionCommand('copyExtensionMarkdown', extensionAction)
    registerExtensionCommand('copyExtensionLink', async (_, extensionId: string) => {
        const marketplaceLink = `https://marketplace.visualstudio.com/items?itemName=${extensionId}`
        await vscode.env.clipboard.writeText(marketplaceLink)
    })
}
