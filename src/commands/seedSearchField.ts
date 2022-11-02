import * as vscode from 'vscode'
import { showQuickPick } from '@zardoy/vscode-utils/build/quickPick'
import { getExtensionSetting, registerExtensionCommand, Settings } from 'vscode-framework'

// todo probably should be removed from here, as it also relies on setting!
export default () => {
    registerExtensionCommand('seedSearchField', async (_, options?: Settings['seedSearchField']) => {
        options ??= getExtensionSetting('seedSearchField')
        const selectedArgs = await showQuickPick(
            options.map(args => {
                const { name, filesToExclude, filesToInclude, query, ...otherProps } = args
                let label = name ?? ''
                if (query) label += ` query: ${query}`
                if (filesToInclude) label += ` include: ${filesToInclude}`
                if (filesToExclude) label += ` exclude: ${filesToExclude}`
                label = label.trimStart()
                const description = Object.entries(otherProps)
                    .map(([key, value]) => `${key}${value === true ? '' : `=${value.toString()}`}`)
                    .join(', ')
                return {
                    label,
                    detail: description,
                    value: args,
                }
            }),
            {},
        )
        if (!selectedArgs) return
        await vscode.commands.executeCommand('workbench.action.findInFiles', {query: '', ...selectedArgs})
    })
}
