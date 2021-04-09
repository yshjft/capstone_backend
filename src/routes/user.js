const express = require('express')
const router = express.Router()
const {isLoggedIn} = require('./middlewares')
const authCheck = require('./lib/authCheck')
const getNow = require('./lib/getNow')
const {sequelize} = require('../models')

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

// follow user
router.post('/follow/:id', isLoggedIn, async (req, res, next) => {
  const followingId = req.params.id
  const followerId = req.user.id
  const createdAt = getNow()

  // 자기 자신 팔로우 못함(거의 일어날일 없음)
  // 혹시나 유저가 사라지면 어떻게 하지(?)
  try {
    await sequelize.query(`
      insert into follows (followingId, followerId, createdAt, updatedAt)
      values ('${followingId}', '${followerId}', '${createdAt}', '${createdAt}')
    `)

    const [followerNum] = await sequelize.query(`
      select 
        count(followerId) as followerNum
       from follows
       where followingId='${followingId}'
    `)

    res.status(201).json({
      message: 'FOLLOW_SUCCESS',
      followerNum: followerNum[0].followerNum
    })
  } catch (error) {
    return next(error)
  }
})

// unfollow user
router.delete('/follow/:id', isLoggedIn, async (req, res, next) => {
  const followingId = req.params.id
  const followerId = req.user.id

  try {
    await sequelize.query(`delete from follows where followingId='${followingId}' and followerId='${followerId}'`)

    const [followerNum] = await sequelize.query(`
      select 
        count(followerId) as followerNum
       from follows
       where followingId='${followingId}'
    `)

    res.status(200).json({
      message: 'UNFOLLOW_SUCCESS',
      followerNum: followerNum[0].followerNum
    })
  } catch (error) {
    return next(error)
  }
})

module.exports = router
