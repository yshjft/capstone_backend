const express = require('express')
const router = express.Router()

router.get('/greeting', (req, res, next) => {
  res.json({greeting: 'hello'})
})

module.exports = router
