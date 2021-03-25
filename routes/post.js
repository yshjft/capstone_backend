const express = require('express')
const router = express.Router()
const {isLoggedIn} = require('./middlewares')
const authCheck = require('./lib/authCheck')
const {Post} = require('../models')

// 항상 auth check를 한다

// 작성된 알고리즘 목록 보기
router.get('/', (req, res, next) => {
  const authCheckResult = authCheck(req)

  return res.status(200).json({
    ...authCheckResult,
    data: [],
    total: 0
  })
})

// 알고리즘 기록
router.post('/', isLoggedIn, async (req, res, next) => {
  const {title, language, code, memo} = req.body
  const {id} = req.user

  try {
    await Post.create({
      title,
      language,
      code,
      memo,
      writer: id
    })
  } catch (error) {
    return next(error)
  }
})

module.exports = router
