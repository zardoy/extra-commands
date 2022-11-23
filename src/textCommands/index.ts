import deleteAllLeftAfterIndent from './deleteAllLeftAfterIndent'
import pasteReplaceLineContents from './pasteReplaceLineContents'
import removeSurroundingCharacter from './removeSurroundingCharacter'

export default () => {
    deleteAllLeftAfterIndent()
    removeSurroundingCharacter()
    pasteReplaceLineContents()
}
