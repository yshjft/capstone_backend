const express = require('express')
const router = express.Router()
const testRouter = require('./test')
const authRouter = require('./auth')
const algoRouter = require('./algo')
const userRouter = require('./user')

router.use('/auth', authRouter)
router.use('/algos', algoRouter)
router.use('/users', userRouter)
router.use('/test', testRouter)

module.exports = router
