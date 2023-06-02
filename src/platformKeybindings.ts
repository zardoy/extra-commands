import * as vscode from 'vscode'
import { extensionCtx, getExtensionCommandId, registerExtensionCommand } from 'vscode-framework'
import { getLocation, getNodeValue, parse, parseTree } from 'jsonc-parser'
import { omitObj, pickObj } from '@zardoy/utils'
import { getJsonCompletingInfo } from '@zardoy/vscode-utils/build/jsonCompletions'
import { showQuickPick } from '@zardoy/vscode-utils/build/quickPick'

const SCHEME = 'extraCommands.keybindings'

// universal keybinding usually has two source keybinding with the same id:
// the first one for win and second for mac
type UniversalKeybindingId = number
type KeybindingOutput = Partial<Record<'key' | 'command' | 'args' | 'when' | 'win' | 'mac' | 'linux', string>> & { universal?: UniversalKeybindingId }

const _initialCategories = {
    universal: null,
    win: null,
    mac: null,
    linux: null,
    other: null,
    removed: null,
}

type AllKeybindingsOutput = Record<keyof typeof _initialCategories, KeybindingOutput[]>

const platformWhenContextMap = {
    win: 'isWindows',
    mac: 'isMac',
    linux: 'isLinux',
}

const universalPlatformKey = Object.keys(platformWhenContextMap)

const getCategoriesWithEmptyArrays = () => Object.fromEntries(Object.keys(_initialCategories).map(key => [key, [] as any[]]))

/** They are available only in universal */
const specialModifiers = {
    ctrlCmd: {
        mac: 'cmd',
        win: 'ctrl',
    },
}

const platformKeyToSpecialModifier = {
    mac: {
        cmd: 'ctrlCmd',
    },
    win: {
        ctrl: 'ctrlCmd',
    },
}

let saveIter = 0

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
                const universalKeybindingsArr = {
                    $ref: '#/definitions/universalKeybindings',
                }
                const stringProp = {
                    type: 'string',
                }
                originalSchema.items.properties.command = { anyOf: [{ $ref: '#/definitions/commandNames' }, { type: 'string' }] }
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
                        universalKeybindings: {
                            type: 'array',
                            items: {
                                ...originalSchema.items,
                                required: [],
                                defaultSnippets: [],
                                properties: {
                                    ...originalSchema.items.properties,
                                    ...Object.fromEntries(Object.keys(platformWhenContextMap).map(key => [key, stringProp])),
                                },
                            },
                        },
                        ...originalSchema.definitions,
                    },
                    properties: {
                        universal: universalKeybindingsArr,
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

            const categories = getCategoriesWithEmptyArrays()

            type KeybindingSource = Partial<Record<'key' | 'command' | 'when' | 'args', string>> & { universal?: UniversalKeybindingId }
            let prevOffset = tree.offset + 1 //+1 for [
            for (const child of tree.children!) {
                if (child.type !== 'object') continue

                const value: KeybindingSource = getNodeValue(child)
                const prevOffsetFixed = prevOffset
                prevOffset = child.offset + child.length
                if (source.at(prevOffset) === ',') prevOffset++

                const pushKeybinding = (key: string, obj = value) => {
                    categories[key].push({
                        ...obj,
                        /* content between */ comment: source
                            .slice(prevOffsetFixed, child.offset)
                            .trimStart()
                            .replace(/( |\t)+$/, ''),
                    })
                }

                if (value.command?.startsWith('-')) {
                    pushKeybinding('removed')
                    continue
                }

                if (value.universal !== undefined) {
                    // handle num
                    pushKeybinding('universal', value)
                    continue
                }

                // #region push win, mac, linux keybindings
                const mappedContextType = getPlatformFromContext(value.when)
                if (mappedContextType) {
                    const newObj = { ...value, when: mappedContextType.newWhen }
                    pushKeybinding(mappedContextType.key, newObj)
                    continue
                }

                pushKeybinding('other')
            }
            // #endregion

            let output = '{\n'
            // #region form universal keybindings output
            categories.universal = categories.universal.reduce<Array<KeybindingSource & { comment? }>>((prev, current: KeybindingSource & { comment? }) => {
                if (current.universal === undefined) return prev
                const originalKeybinding = prev.find(({ universal }) => universal === current.universal)
                const platformMatch = getPlatformFromContext(current.when)
                if (platformMatch) {
                    const { key: platformMatchKey, newWhen } = platformMatch
                    current.when = newWhen
                    const objectWithPlatformKey = { [platformMatchKey]: current.key }

                    delete current.key

                    Object.assign(originalKeybinding ?? current, objectWithPlatformKey)

                    if (originalKeybinding && !originalKeybinding.key) {
                        const mappedWithoutSpecial: Record<string, string> = {}
                        for (const platform of universalPlatformKey) {
                            if (!originalKeybinding[platform]) continue
                            mappedWithoutSpecial[platform] = KeybindignsParts.mapParts(
                                originalKeybinding[platform],
                                part => platformKeyToSpecialModifier[platform]?.[part] ?? part,
                            )
                        }

                        const keyValues = Object.values(mappedWithoutSpecial)
                        if (arrayAllEqual(keyValues)) {
                            originalKeybinding.key = keyValues[0]!
                            for (const platform of universalPlatformKey) originalKeybinding[platform] = undefined
                        }
                    }
                }

                if (!originalKeybinding) prev.push(current)

                return prev
            }, [])
            // #endregion
            for (const [key, keybindings] of Object.entries(categories))
                output += `\t"${key}": [\n${keybindings
                    .map(({ comment, universal, ...keybinding }) =>
                        ((comment as string) + JSON.stringify(keybinding, undefined, '\t'))
                            .split('\n')
                            .map(line => `\t\t${line}`)
                            .join('\n'),
                    )
                    .join(',\n')}\n\t],\n`

            output += '}'

            return new TextEncoder().encode(output)

            function getPlatformFromContext(when: string | undefined) {
                if (!when) return
                const match = when && Object.entries(platformWhenContextMap).find(([, context]) => new RegExp(`^${context}( |$)`).exec(when))
                if (!match) return
                const [key, contextKey] = match
                return {
                    key,
                    newWhen: when.slice(contextKey.length + 3).trim(),
                }
            }
        },
        async rename(oldUri, newUri) {
            throw new Error('Rename unsupported')
        },
        stat() {
            return { ctime: 0, mtime: 0, size: saveIter, type: 0 }
        },
        watch() {
            return { dispose() {} }
        },
        async writeFile(uri, content) {
            const parsed: AllKeybindingsOutput | undefined = {
                ...getCategoriesWithEmptyArrays(),
                ...parse(new TextDecoder().decode(content), [], { allowEmptyContent: true, allowTrailingComma: true }),
            }
            if (!parsed) throw new Error('No contents')
            const allBinds: any[] = []

            const addWhen = (when: string | undefined, platform: keyof typeof platformWhenContextMap) => {
                const addWhenContext = platformWhenContextMap[platform]
                return addWhenContext + (when ? ` && ${when}` : '')
            }

            parsed.removed = parsed.removed.filter(bind => {
                if (!bind.command?.startsWith('-')) {
                    parsed.other.push(bind)
                    return false
                }

                return true
            })

            parsed.other = parsed.other.filter(bind => {
                const { key, win, mac, linux } = bind
                if (win || mac || linux || (key && KeybindignsParts.hasSpecialModifier(key))) {
                    parsed.universal.push(bind)
                    return false
                }

                return true
            })

            for (const [index, bind] of parsed.universal.entries()) {
                if (bind.key && KeybindignsParts.hasSpecialModifier(bind.key))
                    for (const platform of universalPlatformKey) {
                        const newKey = KeybindignsParts.mapParts(bind.key!, part => specialModifiers[part]?.[platform] ?? part)
                        if (newKey === bind.key) continue
                        bind[platform] = newKey
                    }

                const bindKeys = Object.keys(bind)
                if (universalPlatformKey.every(platform => !bindKeys.includes(platform)))
                    throw new Error(`Keybinding with index ${index} is going to be skipped, because of no platform-dep keys / modifiers.`)

                for (const platform of universalPlatformKey) {
                    const platformKey = bind[platform]
                    if (!platformKey) continue
                    allBinds.push({
                        ...omitObj(bind, 'win', 'mac', 'linux', 'key'),
                        key: platformKey,
                        when: addWhen(bind.when, platform),
                        universal: index,
                    })
                }
            }

            for (const keyToReplace of universalPlatformKey)
                for (const bind of parsed[keyToReplace])
                    allBinds.push({
                        ...bind,
                        when: addWhen(bind.when, keyToReplace),
                    })

            allBinds.push(...parsed.other, ...parsed.removed)

            const configuration = vscode.workspace.getConfiguration('', null)
            const tabSize = configuration.get<number>('editor.tabSize')
            let stringified = JSON.stringify(allBinds, undefined, tabSize)
            if (configuration.get('files.insertFinalNewline')) {
                stringified += '\n'
            }
            await vscode.workspace.fs.writeFile(keybindingsFile, new TextEncoder().encode(stringified))
            saveIter++
        },
    })

    registerExtensionCommand('managePlatformKeybindings', async () => {
        await vscode.window.showTextDocument(vscode.Uri.from({ scheme: SCHEME, path: '/crossKeybindings.json' }))
    })

    vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor?.document.uri.scheme === SCHEME) void vscode.languages.setTextDocumentLanguage(editor.document, 'jsonc')
    })

    vscode.languages.registerCompletionItemProvider(
        { scheme: SCHEME, language: '*' },
        {
            async provideCompletionItems(document, position, token, context) {
                const location = getLocation(document.getText(), document.offsetAt(position))

                const { insideStringRange } = getJsonCompletingInfo(location, document, position) || {}

                if (!insideStringRange || !location.matches(['*', '*', 'when'])) return

                const wordRange = document.getWordRangeAtPosition(position, /[\w\d.-]+/)
                const wordStart = wordRange?.start ?? position
                const textBeforePos = document.lineAt(wordStart).text.slice(wordStart.character - 3)
                if (['=', '!=', '~='].some(x => textBeforePos.startsWith(x))) return

                type ContextKeyInfo = { key: string; type?: string; description?: string }
                const when = await vscode.commands.executeCommand<ContextKeyInfo[]>('getContextKeyInfo')

                return when.map(x => ({
                    label: { label: x.key, description: x.type },
                    filterText: `${x.key}${x.description ?? ''}`,
                    detail: x.description,
                    range: wordRange,
                }))
            },
        },
    )

    type CodeActionCommand = 'remove-duplicates' | 'import-from-extension'

    // todo-low need thinking of lint command (eg duplicates)
    // todo command for always deleting all keybinding commands
    registerExtensionCommand('_applyCodeAction' as any, async (_, command: CodeActionCommand) => {
        const editor = vscode.window.activeTextEditor!
        // eslint-disable-next-line sonarjs/no-duplicate-string
        if (command === 'import-from-extension') {
            // todo filter already imported
            // todo add keybinding to sync keybindings instead (or always invert)?
            const keybindings: Array<[string, string, KeybindingOutput[]]> = vscode.extensions.all
                .map(ext => ext.packageJSON.contributes?.keybindings && ([ext.id, ext.packageJSON.displayName, ext.packageJSON.contributes.keybindings] as any))
                .filter(Boolean)
            const selectedKeybindingsFromExtensions = await showQuickPick(
                keybindings.map(([id, title, keybinding]) => ({
                    label: title,
                    description: id,
                    detail: `${keybinding.length} keybindings to import`,
                    value: keybinding,
                })),
                {
                    title: 'Select extensions from which keybindings to import',
                    matchOnDescription: true,
                },
            )
            if (!selectedKeybindingsFromExtensions) return
            const finalKeybindings = await showQuickPick(
                selectedKeybindingsFromExtensions.flat().map(keybinding => ({
                    label: `${keybinding.command!}${keybinding.args ? ` args: ${keybinding.args}` : ''}`,
                    description: keybinding.when,
                    detail: JSON.stringify(omitObj(keybinding, 'command', 'args', 'when')),
                    value: keybinding,
                })),
                {
                    canPickMany: true,
                    initialAllSelected: true,
                    matchOnDescription: true,
                    matchOnDetail: true,
                },
            )
            if (!finalKeybindings) return
            const { document } = editor
            const lastClosingBrace = document.positionAt(document.getText().lastIndexOf(']'))
            const edit = new vscode.WorkspaceEdit()
            edit.set(document.uri, [
                {
                    range: new vscode.Range(lastClosingBrace, lastClosingBrace),
                    newText: `\n${JSON.stringify(finalKeybindings, undefined, editor.options.insertSpaces ? editor.options.tabSize : '\t').slice(1, -1)}`,
                },
            ])
            await vscode.workspace.applyEdit(edit)
        }
    })

    vscode.languages.registerCodeActionsProvider(
        {
            language: 'jsonc',
            scheme: SCHEME,
        },
        {
            provideCodeActions(document, range, context, token) {
                if (!context.only?.contains(vscode.CodeActionKind.Source)) return
                const codeActionCommand = (command: CodeActionCommand, title: string, id: string) => {
                    const codeAction = new vscode.CodeAction(title, vscode.CodeActionKind.Source.append(id))
                    codeAction.command = {
                        title: '',
                        command: getExtensionCommandId('_applyCodeAction' as any),
                        arguments: [command],
                    }
                    return codeAction
                }

                return [
                    // codeActionCommand('remove-duplicates', 'Remove possible duplicates', 'removeDuplicates')
                    codeActionCommand('import-from-extension', 'Import keybindings from extension', 'import-from-extension'),
                ]
            },
        },
    )

    // todo vscode.commands.executeCommand('editor.action.defineKeybinding')
    // todo command: remove extension keybindings
}

const KeybindignsParts = {
    getKeyPartWithSep(part: string) {
        let sep = ''
        const clean = part.replace(/^[+ ]/, s => {
            sep = s
            return ''
        })
        return [sep, clean] as const
    },

    mapParts(key: string, newPart: (old: string) => string) {
        const parts = this.getParts(key)
        return parts
            .map(partWithSep => {
                const [sep, part] = this.getKeyPartWithSep(partWithSep)
                return sep + newPart(part)
            })
            .join('')
    },

    getParts(key: string) {
        return key.split(/(?=[+ ])/)
    },

    hasSpecialModifier(key: string) {
        return Object.keys(specialModifiers).some(mod => key.includes(mod))
    },
}

const arrayAllEqual = (arr: any[]): boolean => {
    const first = arr[0]
    if (first === undefined) return false
    return arr.every(x => x === first)
}
