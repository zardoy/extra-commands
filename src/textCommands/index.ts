import deleteAllLeftAfterIndent from './deleteAllLeftAfterIndent'
import multiCursorPasteByLines from './multiCursorPasteByLines'
import pasteReplaceLineContents from './pasteReplaceLineContents'
import removeSurroundingCharacter from './removeSurroundingCharacter'

export default () => {
    deleteAllLeftAfterIndent()
    removeSurroundingCharacter()
    pasteReplaceLineContents()
    multiCursorPasteByLines()
}
