const express = require('express')
const router = express.Router()
const authCheck = require('./lib/authCheck')

// 작성된 알고리즘 목록 보기
// 항상 auth check를 한다
router.get('/', (req, res, next) => {
  const authCheckResult = authCheck(req)

  return res.status(200).json({
    ...authCheckResult,
    data: [],
    total: 0
  })
})

module.exports = router
