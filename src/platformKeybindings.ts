import * as vscode from 'vscode'
import { extensionCtx, registerActiveDevelopmentCommand, registerExtensionCommand } from 'vscode-framework'
import { getNodeValue, parseTree } from 'jsonc-parser'

const SCHEME = 'extraCommands.keybindings'

export default () => {
    const keybindingsFile =
        process.env.PLATFORM === 'web'
            ? vscode.Uri.parse('vscode-userdata:/User/keybindings.json')
            : vscode.Uri.joinPath(extensionCtx.globalStorageUri, '../../keybindings.json')

    vscode.workspace.registerFileSystemProvider(SCHEME, {
        createDirectory() {},
        delete() {},
        onDidChangeFile() {
            return { dispose() {} }
        },
        readDirectory() {
            return []
        },
        async readFile(uri) {
            if (uri.path === '/schema.json') {
                const originalSchema = await vscode.workspace
                    .openTextDocument(vscode.Uri.parse('vscode://schemas/keybindings'))
                    .then(val => JSON.parse(val.getText()))
                const keybindingsArr = {
                    $ref: '#/definitions/keybindings',
                }
                const schema = {
                    allowTrailingCommas: true,
                    allowComments: true,
                    title: 'Custom keybindings configuration',
                    type: 'object',
                    definitions: {
                        keybindings: {
                            type: 'array',
                            items: originalSchema.items,
                        },
                        ...originalSchema.definitions,
                    },
                    properties: {
                        universal: keybindingsArr,
                        windows: keybindingsArr,
                        mac: keybindingsArr,
                        linux: keybindingsArr,
                        other: keybindingsArr,
                    },
                }
                return new TextEncoder().encode(JSON.stringify(schema))
            }

            const source = await vscode.workspace.fs.readFile(keybindingsFile).then(val => val.toString())
            const tree = parseTree(source, [], { allowEmptyContent: true, allowTrailingComma: true })
            if (tree?.type !== 'array') throw new Error('Invalid keybindings.json: Root object must be array')
            const categories = {
                universal: [] as any[],
                win: [],
                mac: [],
                linux: [],
                other: [] as any[],
            }
            let prevOffset = tree.offset + 1 //+1 for [
            for (const child of tree.children!) {
                if (child.type !== 'object') continue
                const value: Partial<Record<'key' | 'command' | 'when' | 'win' | 'mac' | 'linux', string>> & { unversal?: number } = getNodeValue(child)
                const prevOffsetFixed = prevOffset
                prevOffset = child.offset + child.length
                if (source.at(prevOffset) === ',') prevOffset++

                const pushKeybinding = (key: string, obj = value) => {
                    categories[key].push({ ...obj, /* content between */ comment: source.slice(prevOffsetFixed, child.offset) })
                }

                if (value.unversal) {
                    // handle num
                    pushKeybinding('other', value)
                    continue
                }

                const mapWhenContext = {
                    win: 'isWindows',
                    mac: 'isMac',
                    linux: 'isLinux',
                }
                const mappedContextType = value.when && Object.entries(mapWhenContext).find(([, context]) => new RegExp(`^${context}( |$)`).exec(value.when!))
                if (mappedContextType) {
                    const newObj = { ...value, when: value.when!.slice(0, mappedContextType[1].length + 3).trim() }
                    pushKeybinding(mappedContextType[0], newObj)
                    continue
                }

                pushKeybinding('other')
            }

            categories.universal = categories.universal.map(({ universal, ...x }) => x)
            for (const key of Object.keys(categories)) {
                // categories[key] = categories[key].map(() => )
            }

            return new TextEncoder().encode(JSON.stringify(categories, undefined, 4 /* todo use editor tab size */))
        },
        async rename(oldUri, newUri) {
            throw new Error('Rename unsupported')
        },
        stat() {
            return { ctime: 0, mtime: 0, size: 0, type: 0 }
        },
        watch() {
            return { dispose() {} }
        },
        async writeFile(uri, content) {},
    })

    registerExtensionCommand('managePlatformKeybindings', async () => {
        await vscode.window.showTextDocument(vscode.Uri.from({ scheme: SCHEME, path: '/platform/keybindings.json' }))
    })

    vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor?.document.uri.scheme === SCHEME) void vscode.languages.setTextDocumentLanguage(editor.document, 'jsonc')
    })

    // todo vscode.commands.executeCommand('editor.action.defineKeybinding')
    // todo command: remove extension keybindings
}
