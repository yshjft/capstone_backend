const yaml = require('js-yaml')
const fs = require('fs')
const Ajv = require('ajv')
const addFormats = require('ajv-formats')
const ajv = new Ajv()
addFormats(ajv, ['email'])

const makeValidator = (filePath) => {
  const object = yaml.load(fs.readFileSync(filePath, 'utf8'))
  return ajv.compile(object)
}

module.exports = makeValidator
