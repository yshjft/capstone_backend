const path = require('path')
const Ajv = require('ajv')
const ajv = new Ajv()
const addFormats = require('ajv-formats')
addFormats(ajv, ['email'])
const makeValidator = require('../makeValidator')

exports.joinReqValidator = (req, res, next) => {
  try {
    const validate = makeValidator(path.join(__dirname, 'join.yml'))

    if (validate(req.body)) next()
    else next(new Error(ajv.errorsText(validate.errors)))
  } catch (error) {
    next(error)
  }
}

exports.logInReqValidator = (req, res, next) => {
  try {
    const validate = makeValidator(path.join(__dirname, 'login.yml'))

    if (validate(req.body)) next()
    else next(new Error(ajv.errorsText(validate.errors)))
  } catch (error) {
    next(error)
  }
}

exports.searchPasswordReqValidator = (req, res, next) => {
  try {
    const validate = makeValidator(path.join(__dirname, 'searchPassword.yml'))

    if (validate(req.query)) next()
    else next(new Error(ajv.errorsText(validate.errors)))
  } catch (error) {
    next(error)
  }
}

exports.infoEditReqValidator = (req, res, next) => {
  try {
    const queryValidate = makeValidator(path.join(__dirname, 'editType.yml'))
    if (!queryValidate(req.query)) return next(new Error(ajv.errorsText(queryValidate.errors)))

    const {editType} = req.query
    const bodyValidate = makeValidator(
      path.join(
        __dirname,
        editType === 'nickName' ? 'editNickName.yml' : editType === 'email' ? 'editEmail.yml' : 'editPwd.yml'
      )
    )
    if (!bodyValidate(req.body)) return next(new Error(ajv.errorsText(bodyValidate.errors)))

    next()
  } catch (error) {
    next(error)
  }
}
