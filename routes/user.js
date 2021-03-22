const express = require('express')
const router = express.Router()
const {sequelize} = require('../models')
const authCheck = require('./lib/authCheck')

router.get('/:nickName', async (req, res, next) => {
  const authCheckResult = authCheck(req)
  try {
    const [user] = await sequelize.query(`
        select id, nickName, email
        from users
        where nickName = '${req.params.nickName}'
    `)
    res.status(200).json({...authCheckResult, info: user[0]})
  } catch (error) {
    return next(error)
  }
})

module.exports = router
