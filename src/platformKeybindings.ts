import * as vscode from 'vscode'
import { extensionCtx, registerExtensionCommand } from 'vscode-framework'
import { getNodeValue, parse, parseTree } from 'jsonc-parser'
import { compact, pickObj } from '@zardoy/utils'

const SCHEME = 'extraCommands.keybindings'

// universal keybinding usually has two source keybinding with the same id:
// the first one for win and second for mac
type UniversalKeybindingId = number
type KeybindingOutput = Partial<Record<'key' | 'command' | 'when' | 'win' | 'mac' | 'linux', string>> & { universal?: UniversalKeybindingId }

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
                const commandEnumToPatch = originalSchema.items.properties.command.anyOf[0]
                // remove annoying - suggestions
                commandEnumToPatch.enum = commandEnumToPatch.enum.filter(c => !c.startsWith('-'))
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

            type KeybindingSource = Partial<Record<'key' | 'command' | 'when', string>> & { universal?: UniversalKeybindingId }
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
                    const { key, newWhen } = platformMatch
                    current.when = newWhen
                    const objectWithPlatformKey = { [key]: current.key }

                    // TODO HACK useSpecialModifiers here
                    // eslint-disable-next-line @typescript-eslint/dot-notation
                    if (originalKeybinding?.['win']?.startsWith('ctrl') && current.key?.startsWith('cmd')) {
                        originalKeybinding.key = `ctrlCmd${current.key.slice('cmd'.length)}`
                        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete, @typescript-eslint/dot-notation
                        delete originalKeybinding['win']
                        return prev
                    }

                    delete current.key

                    Object.assign(originalKeybinding ?? current, objectWithPlatformKey)
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
            return { ctime: 0, mtime: 0, size: 0, type: 0 }
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

            parsed.other = parsed.other.filter(bind => {
                const { key, win, mac, linux } = bind
                // todo use specialModifiers
                if (win || mac || linux || key?.includes('ctrlCmd')) {
                    parsed.universal.push(bind)
                    return false
                }

                return true
            })

            // TODO:
            // 1. basic + (not sure: advanced) linting
            // 2. when completions
            // 3. command: pull from extensions
            for (const [index, bind] of parsed.universal.entries()) {
                if (bind.key) {
                    const getKeyPartWithSep = (part: string) => {
                        let sep = ''
                        const clean = part.replace(/^[+ ]/, s => {
                            sep = s
                            return ''
                        })
                        return [sep, clean] as const
                    }

                    const parts = bind.key.split(/(?=[+ ])/)
                    if (parts.some(part => specialModifiers[part.replace(/^[+ ]/, '')]))
                        for (const platform of universalPlatformKey) {
                            const newKey = parts
                                .map(partWithSep => {
                                    const [sep, part] = getKeyPartWithSep(partWithSep)
                                    return sep + ((specialModifiers[part]?.[platform] ?? part) as string)
                                })
                                .join('')
                            // eslint-disable-next-line max-depth
                            if (newKey === bind.key) continue
                            bind[platform] = newKey
                        }
                }

                const bindKeys = Object.keys(bind)
                if (universalPlatformKey.every(platform => !(bindKeys as string[]).includes(platform)))
                    throw new Error(`Keybinding with index ${index} is going to be skipped, because of no platform-dep keys / modifiers.`)

                for (const platform of universalPlatformKey) {
                    const platformKey = bind[platform]
                    if (!platformKey) continue
                    allBinds.push({
                        ...pickObj(bind, 'command'),
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

            const tabSize = vscode.workspace.getConfiguration('', null).get<number>('editor.tabSize')
            await vscode.workspace.fs.writeFile(keybindingsFile, new TextEncoder().encode(JSON.stringify(allBinds, undefined, tabSize)))
        },
    })

    registerExtensionCommand('managePlatformKeybindings', async () => {
        await vscode.window.showTextDocument(vscode.Uri.from({ scheme: SCHEME, path: '/crossKeybindings.json' }))
    })

    vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor?.document.uri.scheme === SCHEME) void vscode.languages.setTextDocumentLanguage(editor.document, 'jsonc')
    })

    // todo vscode.commands.executeCommand('editor.action.defineKeybinding')
    // todo command: remove extension keybindings
}
