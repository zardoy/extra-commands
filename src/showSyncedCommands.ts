import jsonfile from 'jsonfile'
import fs from 'fs'

const keybindingsContent = JSON.parse(JSON.parse(jsonfile.readFileSync('./json.json').content).content)

console.log(fs.writeFileSync('windows.json', keybindingsContent['windows']))
