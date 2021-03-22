const express = require('express')
const router = express.Router()
const {User, sequelize} = require('../models')
const bcrypt = require('bcryptjs')
const passport = require('passport')
const {isLoggedIn, isNotLoggedIn} = require('./middlewares')

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
router.post('/join', isNotLoggedIn, async (req, res, next) => {
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

// login
router.post('/login', isNotLoggedIn, async (req, res, next) => {
  passport.authenticate('local', (authError, user, info) => {
    if (authError) return next(authError)

    if (!user) return res.status(404).json(info)

    return req.logIn(user, (loginError) => {
      if (loginError) return next(loginError)
      return res.status(200).json({id: req.user.id, nickName: req.user.nickName})
    })
  })(req, res, next)
})

//check auth
router.get('/authCheck', (req, res, next) => {
  if (req.isAuthenticated()) {
    res.json({isLoggedIn: true, id: req.user.id, nickName: req.user.nickName})
  } else {
    res.json({isLoggedIn: false, id: 0, nickName: ''})
  }
})

// logout
router.get('/logout', isLoggedIn, (req, res, next) => {
  req.logout()
  req.session.destroy()
  res.status(200).json({message: 'LOGOUT_SUCCESS'})
})

module.exports = router
