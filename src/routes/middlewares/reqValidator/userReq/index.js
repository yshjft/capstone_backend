const path = require('path')
const Ajv = require('ajv')
const ajv = new Ajv()
const makeValidator = require('../makeValidator')

exports.userReqValidator = (req, res, next) => {
  try {
    const paramsValidate = makeValidator(path.join(__dirname, 'userNickName.yml'))
    if (!paramsValidate(req.params)) return next(new Error(ajv.errorsText(paramsValidate.errors)))

    const queryValidate = makeValidator(path.join(__dirname, 'userReqQuery.yml'))
    if (!queryValidate(req.query)) return next(new Error(ajv.errorsText(queryValidate.errors)))

    next()
  } catch (error) {
    next(error)
  }
}

exports.paramsIdValidator = (req, res, next) => {
  try {
    const validate = makeValidator(path.join(__dirname, 'userId.yml'))

    if (!validate(req.params)) next(new Error(ajv.errorsText(validate.errors)))
    else next()
  } catch (error) {
    next(error)
  }
}
