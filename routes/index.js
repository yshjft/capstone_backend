const express = require('express')
const router = express.Router()
const testRouter = require('./test')
const authRouter = require('./auth')

router.use('/test', testRouter)
router.use('/auth', authRouter)

module.exports = router
