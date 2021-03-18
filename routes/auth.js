const express = require('express')
const router = express.Router()
const {User, sequelize} = require('../models')
const bcrypt = require('bcryptjs')

async function checkUnique(type, value) {
  let query = 'select users.id from users '
  switch (type) {
    case 'EMAIL':
      query += `where users.email = '${value}'`
      break
    case 'NICK_NAME':
      query += `where users.nickName = '${value}'`
      break
    default:
      break
  }
  const [users] = await sequelize.query(query)
  return users.length > 0 ? false : true
}

// join
router.post('/join', async (req, res, next) => {
  const {email, nickName, password} = req.body

  try {
    let isUnique = await checkUnique('EMAIL', email)
    if (!isUnique) res.status(409).json({type: 'SAME_EMAIL'})

    isUnique = await checkUnique('NICK_NAME', nickName)
    if (!isUnique) res.status(409).json({type: 'SAME_NICK_NAME'})

    const hash = await bcrypt.hash(password, 14)
    await User.create({
      email,
      nickName,
      password: hash
    })
    res.status(201).json({type: 'SUCCESS'})
  } catch (error) {
    return next(error)
  }
})

module.exports = router
