const express = require('express')
const router = express.Router()
const {isLoggedIn} = require('./middlewares')
const authCheck = require('./lib/authCheck')
const getNow = require('./lib/getNow')
const {Post, sequelize} = require('../models')

// 항상 auth check를 한다

// 게시물 작성
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

// 게시물 목록 보기
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
      order by posts.createdAt desc, posts.updatedAt desc
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

// 게시물 상세 조회
router.get('/:id', async (req, res, next) => {
  const authCheckResult = authCheck(req)
  const {id} = req.params
  const {writer} = req.query

  try {
    const [post] = await sequelize.query(`
      select 
           posts.id, 
           posts.title, 
           posts.language, 
           posts.public, 
           posts.createdAt,
           posts.updatedAt, 
           users.id as writerId,
           users.nickName as writer, 
           (select count(postId) from likes where likes.postId = posts.id) as likeNum,
           posts.code,
           posts.memo
      from posts
      join users
      on posts.writer = users.id
      where posts.id = ${id} and users.nickName='${writer}'
    `)

    if (post.length === 0) {
      return res.status(404).json({
        message: 'NOT_FOUND',
        auth: {...authCheckResult}
      })
    }

    if (authCheckResult.isLoggedIn && !post[0].public && post[0].writer !== authCheckResult.nickName) {
      return res.status(404).json({message: 'NOT_FOUND', auth: {...authCheckResult}})
    }
    if (!authCheckResult.isLoggedIn && !post[0].public) {
      return res.status(404).json({message: 'NOT_FOUND', auth: {...authCheckResult}})
    }

    let resData = {
      auth: {...authCheckResult},
      data: post[0]
    }

    if (authCheckResult.isLoggedIn) {
      const [postUserLike] = await sequelize.query(`
        select 
          userId
        from likes 
        where userId=${authCheckResult.id} and postId=${id}
      `)
      resData.data.like = postUserLike.length === 0 ? false : true
    }

    return res.status(200).json(resData)
  } catch (error) {
    return next(error)
  }
})

// 게시물 수정을 위한 게시물 상세 조회 api
router.get('/edit/:id', isLoggedIn, async (req, res, next) => {
  const postId = req.params.id
  const {id} = req.user

  try {
    const [post] = await sequelize.query(`
    select
        posts.id,
        posts.title,
        posts.language,
        posts.public,
        posts.code,
        posts.memo,
        users.nickName as writer
    from posts
    join users
    on posts.writer = users.id
    where posts.id=${postId} and posts.writer=${id}
  `)

    if (post.length === 0) {
      return res.status(404).json({message: 'NOT FOUND'})
    } else {
      return res.status(200).json({data: post[0]})
    }
  } catch (error) {
    return next(error)
  }
})

// 게시물 수정
router.put('/:id', isLoggedIn, async (req, res, next) => {
  const postId = req.params.id
  const {title, language, public, code, memo} = req.body
  const updatedAt = getNow()
  try {
    await sequelize.query(`
      update posts
      set
        title='${title}',
        language='${language}',
        public=${public},
        code='${code}',
        memo='${memo}',
        updatedAt='${updatedAt}'
      where id=${postId}
    `)

    res.status(200).json({message: 'UPDATE SUCCESS'})
  } catch (error) {
    return next(error)
  }
})

// 게시물 삭제
router.delete('/:id', isLoggedIn, async (req, res, next) => {
  const postId = req.params.id
  const userId = req.user.id

  try {
    const [result] = await sequelize.query(`
      delete from posts
      where posts.id=${postId} and posts.writer=${userId} 
    `)

    if (result.affectedRows === 0) {
      // 조건에 맞는 게시물 없음
      // 혹시나 다른 사람이 삭제할 수 없게 하기 위해
      res.status(404).json({message: 'NOT_FOUND'})
    } else {
      res.status(200).json({message: 'DELETE_SUCCESS', deletedPost: postId})
    }
  } catch (error) {
    return next(error)
  }
})

// 게시물 좋아요
router.post('/like/:id', isLoggedIn, async (req, res, next) => {
  const postId = req.params.id
  const userId = req.user.id
  const createdAt = getNow()

  try {
    await sequelize.query(`
      insert into likes (userId, postId, createdAt, updatedAt)
      values ('${userId}', '${postId}', '${createdAt}', '${createdAt}')
    `)

    const [likeNum] = await sequelize.query(`
      select
        count(userId) as likeNum
      from likes
      where postId='${postId}'
    `)

    res.status(201).json({
      message: 'POST_SUCCESS',
      likeNum: likeNum[0].likeNum
    })
  } catch (error) {
    return next(error)
  }
})

// 게시물 좋아요 해제
router.delete('/like/:id', isLoggedIn, async (req, res, next) => {
  const postId = req.params.id
  const userId = req.user.id

  try {
    await sequelize.query(`delete from likes where userId='${userId}' and postId='${postId}'`)
    const [likeNum] = await sequelize.query(`
      select
        count(userId) as likeNum
      from likes
      where postId='${postId}'
    `)

    res.status(200).json({
      message: 'DELETE_SUCCESS',
      likeNum: likeNum[0].likeNum
    })
  } catch (error) {
    return next(error)
  }
})

module.exports = router
