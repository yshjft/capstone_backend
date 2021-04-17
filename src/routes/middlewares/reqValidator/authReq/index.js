const yaml = require('js-yaml')
const fs = require('fs')
const path = require('path')
const Ajv = require('ajv')
const addFormats = require('ajv-formats')
const ajv = new Ajv()
addFormats(ajv, ['email'])

const makeValidator = (file) => {
  const object = yaml.load(fs.readFileSync(path.join(__dirname, file), 'utf8'))
  return ajv.compile(object)
}

exports.joinReqValidator = (req, res, next) => {
  try {
    const validate = makeValidator('join.yml')

    if (validate(req.body)) next()
    else next(new Error(ajv.errorsText(validate.errors)))
  } catch (error) {
    next(error)
  }
}

exports.logInReqValidator = (req, res, next) => {
  try {
    const validate = makeValidator('login.yml')

    if (validate(req.body)) next()
    else next(new Error(ajv.errorsText(validate.errors)))
  } catch (error) {
    next(error)
  }
}

exports.searchPasswordReqValidator = (req, res, next) => {
  try {
    const validate = makeValidator('searchPassword.yml')

    if (validate(req.query)) next()
    else next(new Error(ajv.errorsText(validate.errors)))
  } catch (error) {
    next(error)
  }
}

exports.infoEditReqValidator = (req, res, next) => {
  try {
    const queryValidate = makeValidator('editType.yml')
    if (!queryValidate(req.query)) next(new Error(ajv.errorsText(queryValidate.errors)))

    const {editType} = req.query
    const bodyValidate = makeValidator(
      editType === 'nickName' ? 'editNickName.yml' : editType === 'email' ? 'editEmail.yml' : 'editPwd.yml'
    )
    if (!bodyValidate(req.body)) next(new Error(ajv.errorsText(bodyValidate.errors)))

    next()
  } catch (error) {
    next(error)
  }
}
