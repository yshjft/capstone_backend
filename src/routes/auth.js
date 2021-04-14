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

// 회원 가입
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
    res.status(201).json({type: 'JOIN_SUCCESS'})
  } catch (error) {
    return next(error)
  }
})

// 로그인
router.post('/login', isNotLoggedIn, async (req, res, next) => {
  passport.authenticate('local', (authError, user, info) => {
    if (authError) return next(authError)

    if (!user) return res.status(404).json(info)

    return req.logIn(user, (loginError) => {
      if (loginError) return next(loginError)
      return res.status(200).json({id: req.user.id, nickName: req.user.nickName, email: req.user.email})
    })
  })(req, res, next)
})

// auth check
router.get('/authCheck', (req, res, next) => {
  if (req.isAuthenticated()) {
    res.json({isLoggedIn: true, id: req.user.id, nickName: req.user.nickName, email: req.user.email})
  } else {
    res.json({isLoggedIn: false, id: 0, nickName: '', email: ''})
  }
})

// 로그아웃
router.get('/logout', isLoggedIn, (req, res, next) => {
  req.logout()
  req.session.destroy()
  res.status(200).json({message: 'LOGOUT_SUCCESS'})
})

// 정보 수정 (nickName, email, password)
class Respond {
  constructor(res, statusCode, resBody) {
    this.res = res
    this.statusCode = statusCode
    this.resBody = resBody
  }

  setRes(statusCode, resBody) {
    this.statusCode = statusCode
    this.resBody = resBody
  }

  sendRes() {
    this.res.status(this.statusCode).json(this.resBody)
  }
}

router.put('/edit', isLoggedIn, async (req, res, next) => {
  const userId = req.user.id
  const {nickName, email, password} = req.body
  const {editType} = req.query
  const respond = new Respond(res, 200, {})

  try {
    switch (editType) {
      case 'nickName':
        if (nickName === req.user.nickName) {
          respond.setRes(200, {message: 'EDIT_NICKNAME_SUCCESS'})
        } else if (!(await checkUnique('NICK_NAME', nickName))) {
          respond.setRes(409, {type: 'SAME_NICKNAME'})
        } else {
          await User.update({nickName}, {where: {id: userId}})
          respond.setRes(200, {message: 'EDIT_NICKNAME_SUCCESS', nickName})
        }
        break
      case 'email':
        if (email === req.user.email) {
          respond.setRes(200, {message: 'EDIT_EMAIL_SUCCESS'})
        } else if (!(await checkUnique('EMAIL', email))) {
          respond.setRes(409, {type: 'SAME_EMAIL'})
        } else {
          await User.update({email}, {where: {id: userId}})
          respond.setRes(200, {message: 'EDIT_EMAIL_SUCCESS', email})
        }
        break
      case 'password':
        const hash = await bcrypt.hash(password, 14)
        await User.update({password: hash}, {where: {id: userId}})
        respond.setRes(200, {message: 'EDIT_PASSWORD_SUCCESS'})
        break
      default:
        respond.setRes(400, {message: 'BAD_REQUEST'})
        break
    }
    return respond.sendRes()
  } catch (error) {
    return next(error)
  }
})

// 탈퇴

module.exports = router
