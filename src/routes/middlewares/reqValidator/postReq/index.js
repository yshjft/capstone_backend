const path = require('path')
const Ajv = require('ajv')
const ajv = new Ajv()
const addFormats = require('ajv-formats')
addFormats(ajv, ['email'])
const makeValidator = require('../makeValidator')

exports.writeReqValidator = (req, res, next) => {
  try {
    const validate = makeValidator(path.join(__dirname, 'post.yml'))

    if (validate(req.body)) next()
    else next(new Error(ajv.errorsText(validate.errors)))
  } catch (error) {
    next(error)
  }
}

exports.readDetailReqValidator = (req, res, next) => {
  try {
    const paramsValidate = makeValidator(path.join(__dirname, 'postId.yml'))
    if (!paramsValidate(req.params)) return next(new Error(ajv.errorsText(paramsValidate.errors)))

    const queryValidate = makeValidator(path.join(__dirname, 'postWriter.yml'))
    if (!queryValidate(req.query)) return next(new Error(ajv.errorsText(queryValidate.errors)))

    next()
  } catch (error) {
    next(error)
  }
}

exports.paramsIdValidator = (req, res, next) => {
  const paramsValidate = makeValidator(path.join(__dirname, 'postId.yml'))
  if (!paramsValidate(req.params)) next(new Error(ajv.errorsText(paramsValidate.errors)))
  else next()
}

exports.editReqValidator = (req, res, next) => {
  try {
    const paramsValidate = makeValidator(path.join(__dirname, 'postId.yml'))
    if (!paramsValidate(req.params)) return next(new Error(ajv.errorsText(paramsValidate.errors)))

    const postValidate = makeValidator(path.join(__dirname, 'post.yml'))
    if (!postValidate(req.body)) return next(new Error(ajv.errorsText(postValidate.errors)))

    next()
  } catch (error) {
    next(error)
  }
}
