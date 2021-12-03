# Extra Commands

Contains commands, that should be builtin!!

Some commands are already builtin or already got covered by another extension? Create an issue! Once I find one of these commands, it **will be removed** from this extension! So, expect breaking changes.

However, for now, there is no even way to notify you about that!

> You can find more experimental and unstable commands/features in [vscode-experiments](https://github.com/zardoy/vscode-experiments).

## Commands

### `openShortcutsOfAnotherPlatform`

[microsoft/vscode#134338](https://github.com/microsoft/vscode/issues/134338)

### `goToLine`

1. Doesn't jump between lines when you enter numbers
2. Shows helpful message if you exceeded number of lines
3. When you jump to line, keep you screen in center

### `openTerminalWithoutFocus`

[microsoft/vscode#135429](https://github.com/microsoft/vscode/issues/135429)

### `renameSymbolAndFile`

Renames symbol and (forcefully!) renames file to the same name.

For example:

```ts
// 📁 parseSomething.ts

export const parseSomething = () => {}
```

Position cursor on `parseSomething` variable and run this command. It will rename the symbol and file name. (refactor)

```ts
// 📁 parseString.ts

export const parseString = () => {}
```

You can just run it with the same name to quickly turn file name into symbol name:

```ts
// 📁 parseString.ts

export const parseSomething = () => {}
```

After running on `parseSomething`:

```ts
// 📁 parseSomething.ts

export const parseSomething = () => {}
```

> `typescript.updateImportsOnFileMove.enabled` recommended to be `always`
> Be aware, ctrl+z most probably won't work correctly

### `deleteAllLeftAfterIndent`

I use it as fixed variant of `cmd+backspace` shortcut.

### `removeSurroundingCharacter`

```ts
const obj = {
    'foo',
    'barr'
}
```

Select **everything** inside brackets, and run this command to remove surrounding symbols of the selection. Then you can quickly type `[` to turn it into array.

Other `extension*` commands are not implemented yet.
