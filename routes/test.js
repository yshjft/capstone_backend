const express = require('express')
const router = express.Router()
const {isLoggedIn} = require('./middlewares')

router.get('/hello_world', (req, res, next) => {
  res.json({greeting: 'hello world'})
})

router.get('/greeting', isLoggedIn, (req, res, next) => {
  res.json({greeting: 'hello'})
})

module.exports = router
