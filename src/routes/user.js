const express = require('express')
const router = express.Router()
const {isLoggedIn} = require('./middlewares')
const authCheck = require('./lib/authCheck')
const getNow = require('./lib/getNow')
const {sequelize} = require('../models')

// 로그인 비로그인 접근 모두 가능
router.get('/:nickName', async (req, res, next) => {
  const authCheckResult = authCheck(req)
  const userNickName = req.params.nickName
  const {year, tab, tabPage, perPage = 10} = req.query

  try {
    const [userIdList] = await sequelize.query(`select users.id from users where users.nickName='${userNickName}'`)
    const userId = userIdList[0].id
    const {isLoggedIn, id} = authCheckResult

    const [userInfo] = await sequelize.query(`
      select
        users.id,
        users.nickName,
        users.email,
        (select count(followingId) from follows where follows.followingId=${userId}) as followerNum,
        (select count(posts.id) from posts join likes on posts.id = likes.postId where posts.writer=${userId}) as totalLike,
        users.createdAt     
      from users
      where users.id=${userId}
    `)

    const [allPostLog] = await sequelize.query(`
      select
        posts.createdAt
      from posts
      where posts.writer=${userId}
    `)

    const lastPostCreatedAt = allPostLog[allPostLog.length - 1].createdAt
    userInfo[0].lastPostCreatedAt = lastPostCreatedAt

    const postLog = allPostLog.filter((postLog) => {
      return new Date(postLog.createdAt).getFullYear() === Number(year)
    })

    let resBody = {
      auth: {...authCheckResult},
      userInfo: userInfo[0],
      postLog
    }

    if (isLoggedIn) {
      const [userFollow] = await sequelize.query(`
        select
          followerId
        from follows
        where followingId=${userId} and followerId=${id}
      `)
      resBody.userInfo.follow = userFollow.length === 0 ? false : true
    }

    switch (tab) {
      case 'posts':
        const condition = isLoggedIn ? `` : ` and posts.public=true`
        const [posts] = await sequelize.query(`
         select
           posts.id,
           posts.public,
           posts.title,
           posts.language,
           posts.createdAt,
           posts.updatedAt,
           users.nickName as writer,
           (select count(postId) from likes where likes.postId = posts.id) as likeNum
         from posts
         join users on users.id=posts.writer
         where posts.writer=${userId}${condition}
         order by posts.createdAt desc, posts.updatedAt desc
         limit ${tabPage * perPage}, ${perPage}
        `)
        const [postTotal] = await sequelize.query(`
          select
            count(posts.id) as total
          from posts
          where posts.writer=${userId}${condition}
        `)
        resBody.posts = posts
        resBody.total = postTotal[0].total
        break
      case 'likes':
        const [likePosts] = await sequelize.query(`
          select
            posts.id,
            posts.title,
            posts.language,
            posts.createdAt,
            posts.updatedAt,
            users.nickName as writer,
            (select count(postId) from likes where likes.postId = posts.id) as likeNum
          from posts
                 join users on posts.writer=users.id
                 join likes on posts.id=likes.postId
          where likes.userId=${userId} and posts.public=true
          limit ${tabPage * perPage}, ${perPage}
        `)
        const [likePostTotal] = await sequelize.query(
          `select count(likes.userId) as total from likes where likes.userId=${userId}`
        )
        resBody.likePosts = likePosts
        resBody.total = likePostTotal[0].total
        break
      case 'followings':
        const [followingUsers] = await sequelize.query(`
          select
            users.id,
            users.nickName,
            users.email,
            (select count(followingId) from follows where follows.followingId=users.id) as followerNum,
            (select count(posts.id) from posts join likes on posts.id = likes.postId where posts.writer=users.id) as totalLike
          from users
          join follows on users.id=follows.followingId
          where follows.followerId=${userId}
          limit ${tabPage * perPage}, ${perPage}
        `)
        const [followingTotal] = await sequelize.query(
          `select count(follows.followingId) as total from follows where follows.followerId=${userId}`
        )
        resBody.followingUsers = followingUsers
        resBody.total = followingTotal[0].total
        break
      default:
        break
    }

    res.status(200).json(resBody)
  } catch (error) {
    return next(error)
  }
})

// follow user
router.post('/follow/:id', isLoggedIn, async (req, res, next) => {
  const followingId = req.params.id
  const followerId = req.user.id
  const createdAt = getNow()

  try {
    // 자기 자신 팔로우 못함(거의 일어날일 없음)
    if (followingId === followerId) return res.status(400).json({message: 'BAD_REQUEST'})

    // 혹시나 유저가 사라지면 어떻게 하지(?)
    const [exist] = await sequelize.query(`select id from users where users.id=${followingId}`)
    if (exist.length === 0) return res.status(404).json({message: 'NOT_FOUND'})

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
