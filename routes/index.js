const express = require('express')
const router = express.Router()
const authRouter = require('./auth')
const postRouter = require('./post')
const userRouter = require('./user')

router.use('/auth', authRouter)
router.use('/post', postRouter)
router.use('/users', userRouter)

module.exports = router
