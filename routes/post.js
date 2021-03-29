const express = require('express')
const router = express.Router()
const {isLoggedIn} = require('./middlewares')
const authCheck = require('./lib/authCheck')
const {Post, sequelize} = require('../models')

// 항상 auth check를 한다
// 작성된 알고리즘 목록 보기
router.get('/', async (req, res, next) => {
  const authCheckResult = authCheck(req)
  const {start = 0, perPage = 10} = req.query
  try {
    const [posts] = await sequelize.query(`
      select 
           posts.id, 
           posts.title, 
           posts.language, 
           posts.createdAt, 
           posts.updatedAt, 
           users.nickName as writer, 
           (select count(postId) from likes where likes.postId = posts.id) as likeNum
      from posts
      join users
      on posts.writer = users.id
      where posts.public = true
      order by posts.createdAt
      limit ${start * perPage}, ${perPage}
    `)
    const [total] = await sequelize.query(` select count(id) as total from posts`)

    return res.status(200).json({
      auth: {...authCheckResult},
      data: posts,
      total: total[0].total
    })
  } catch (error) {
    return next(error)
  }
})

// 알고리즘 상세 조회
router.get('/:id', async (req, res, nex) => {
  const authCheckResult = authCheck(req)
  const {id} = req.params

  try {
    const [post] = await sequelize.query(`
      select 
           posts.id, 
           posts.title, 
           posts.language, 
           posts.public, 
           posts.createdAt, 
           posts.updatedAt, 
           users.nickName as writer, 
           (select count(postId) from likes where likes.postId = posts.id) as likeNum,
           posts.code,
           posts.memo
      from posts
      join users
      on posts.writer = users.id
      where posts.id = ${id}
      order by posts.createdAt
    `)
    return res.status(200).json({
      auth: {...authCheckResult},
      data: post[0]
    })
  } catch (error) {
    return next(error)
  }
})

// 알고리즘 기록
router.post('/', isLoggedIn, async (req, res, next) => {
  const {title, language, public, code, memo} = req.body
  const {id} = req.user

  try {
    await Post.create({
      title,
      language,
      public,
      code,
      memo,
      writer: id
    })
    res.status(201).json({
      message: 'POST_SUCCESS'
    })
  } catch (error) {
    return next(error)
  }
})

module.exports = router
