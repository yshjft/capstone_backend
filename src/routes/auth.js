const express = require('express')
const router = express.Router()
const {User, sequelize} = require('../models')
const bcrypt = require('bcryptjs')
const passport = require('passport')
const nodemailer = require('nodemailer')
const {isLoggedIn, isNotLoggedIn} = require('./middlewares/loggedInOrNotLoggedIn')
const {
  joinReqValidator,
  logInReqValidator,
  searchPasswordReqValidator,
  infoEditReqValidator
} = require('./middlewares/reqValidator/authReq')
const generatePassword = require('./lib/generatePassword')

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
router.post('/join', isNotLoggedIn, joinReqValidator, async (req, res, next) => {
  const {email, nickName, password} = req.body
  console.log(email, nickName, password)
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
router.post('/login', isNotLoggedIn, logInReqValidator, async (req, res, next) => {
  passport.authenticate('local', (authError, user, info) => {
    if (authError) return next(authError)

    if (!user) return res.status(404).json(info)

    return req.logIn(user, (loginError) => {
      if (loginError) return next(loginError)
      return res.status(200).json({id: req.user.id, nickName: req.user.nickName, email: req.user.email})
    })
  })(req, res, next)
})

// 로그아웃
router.get('/logout', isLoggedIn, (req, res, next) => {
  req.logout()
  req.session.destroy()
  res.status(200).json({message: 'LOGOUT_SUCCESS'})
})

// auth check
router.get('/authCheck', (req, res, next) => {
  if (req.isAuthenticated()) {
    res.json({isLoggedIn: true, id: req.user.id, nickName: req.user.nickName, email: req.user.email})
  } else {
    res.json({isLoggedIn: false, id: 0, nickName: '', email: ''})
  }
})

// 비밀번호 찾기
router.get('/searchPassword', isNotLoggedIn, searchPasswordReqValidator, async (req, res, next) => {
  const {email} = req.query

  try {
    const [existUser] = await sequelize.query(`select id, nickName from users where users.email='${email}'`)

    if (existUser.length === 0) {
      return res.status(404).json({message: 'NOT_FOUND'})
    } else {
      const password = generatePassword()

      const hash = await bcrypt.hash(password, 14)
      await User.update({password: hash}, {where: {email}})

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.NODEMAILER_USER,
          pass: process.env.NODEMAILER_PASSWORD
        }
      })

      await transporter.sendMail({
        from: `${process.env.NODEMAILER_USER}`,
        to: email,
        subject: 'AlgoHub 비밀번호 찾기',
        html: `
          <div>
            <h1>AlgoHub 비밀번호 찾기</h1>
            <h2>안녕하세요 ${existUser[0].nickName}님! 제공된 비밀번호로 로그인 후 설정에서 반드시 비밀번호를 변경하세요</h2>
            <h4>비밀 번호: ${password}</h4>
          </div>
        `
      })

      return res.status(200).json({message: 'EMAIL_SEND_SUCCESS'})
    }
  } catch (error) {
    return next(error)
  }
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

router.put('/edit', isLoggedIn, infoEditReqValidator, async (req, res, next) => {
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
router.delete('/quit', isLoggedIn, async (req, res, next) => {
  const userId = req.user.id

  try {
    await sequelize.query(`
      delete from users 
      where users.id=${userId}
    `)

    return res.status(200).json({message: 'QUIT_SUCCESS'})
  } catch (error) {
    return next(error)
  }
})

module.exports = router
