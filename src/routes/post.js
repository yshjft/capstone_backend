const express = require('express')
const router = express.Router()
const elasticsearch = require('elasticsearch')
const {isLoggedIn} = require('./middlewares/loggedInOrNotLoggedIn')
const authCheck = require('./lib/authCheck')
const getNow = require('./lib/getNow')
const {Post, sequelize} = require('../models')
const {
  writeReqValidator,
  readDetailReqValidator,
  paramsIdValidator,
  editReqValidator,
  readListReqValidator
} = require('./middlewares/reqValidator/postReq')

const esClient = new elasticsearch.Client({
  hosts: ['http://localhost:9200']
})

// 게시물 작성
router.post('/', isLoggedIn, writeReqValidator, async (req, res, next) => {
  const {title, language, public, code, memo} = req.body
  const {id} = req.user

  try {
    await esClient.ping({requestTimeout: 30000})
    const isIndexExist = await esClient.indices.exists({index: 'post-index'})

    if (!isIndexExist) {
      // 인덱스 다시 만들어야 한다
      await esClient.indices.create({
        index: 'post-index',
        body: {
          settings: {
            number_of_shards: 5,
            number_of_replicas: 1,
            analysis: {
              analyzer: {
                test_analyzer: {
                  tokenizer: 'nori_t_mixed',
                  filter: ['lowercase', 'my_syn']
                }
              },
              tokenizer: {
                nori_t_mixed: {
                  type: 'nori_tokenizer',
                  user_dictionary_rules: ['그리디', '탐욕법', '동적 계획법', '백트래킹', '프로그래머스'],
                  decompound_mode: 'mixed'
                }
              },
              filter: {
                my_syn: {
                  type: 'synonym',
                  synonyms: [
                    '스택, stack',
                    '큐, queue',
                    '힙, heap',
                    '해시, hash',
                    '정렬, 소팅, 소트, sort, sorting',
                    '완전탐색, 브루트포스, bruteforce',
                    '탐욕법, 그리디, greedy',
                    '동적계획법, 디피, 다이나믹 프로그래밍, dp, dynamic programming',
                    '깊이 우선 탐색, dfs, depth first search',
                    '너비 우선 탐색, bfs, breadth first search',
                    '이분 탐색, binary search',
                    '그래프, graph',
                    '수학, mathematics',
                    '구현, implementation',
                    '시뮬레이션, simulation',
                    '백트래킹, backtracking',
                    '비트마스킹, 비트마스크, bitmask',
                    '분할 정복, divide and conquer',
                    '우선순위 큐, priority queue',
                    '백준, boj, baekjoon',
                    '프로그래머스, programmers'
                  ]
                }
              }
            }
          },
          mappings: {
            properties: {
              title: {
                type: 'text',
                analyzer: 'test_analyzer'
              },
              memo: {
                type: 'text',
                analyzer: 'test_analyzer'
              }
            }
          }
        }
      })
    }

    const result = await Post.create({
      title,
      language,
      public,
      code,
      memo,
      writer: id
    })
    const dbId = result.dataValues.id

    // _doc 생성
    await esClient.create({
      id: dbId,
      index: 'post-index',
      body: {
        title: title,
        memo: memo
      }
    })

    res.status(201).json({
      message: 'POST_SUCCESS'
    })
  } catch (error) {
    return next(error)
  }
})

// 게시물 조회
router.get('/', readListReqValidator, async (req, res, next) => {
  const authCheckResult = authCheck(req)
  const {start, search} = req.query

  try {
    if (search) {
      const tmp = await esClient.search({
        index: 'post-index',
        body: {
          query: {
            multi_match: {
              query: search,
              fields: ['title^1.2', 'memo']
            }
          }
        }
      })

      console.log('검색 시발 : ', tmp.hits.hits)
    }

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
      order by likeNum desc, posts.createdAt desc, posts.updatedAt desc
      limit ${start * 10}, 10
    `)
    const [total] = await sequelize.query(` select count(id) as total from posts where posts.public=true`)

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
router.get('/:id', readDetailReqValidator, async (req, res, next) => {
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
      join users on posts.writer = users.id
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
router.get('/edit/:id', isLoggedIn, paramsIdValidator, async (req, res, next) => {
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
      join users on posts.writer = users.id
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
router.put('/:id', isLoggedIn, editReqValidator, async (req, res, next) => {
  const postId = req.params.id
  const {title, language, public, code, memo} = req.body

  try {
    await Post.update(
      {
        title,
        language,
        public,
        code,
        memo
      },
      {where: {id: postId}}
    )

    res.status(200).json({message: 'UPDATE SUCCESS'})
  } catch (error) {
    return next(error)
  }
})

// 게시물 삭제
router.delete('/:id', isLoggedIn, paramsIdValidator, async (req, res, next) => {
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
router.post('/like/:id', isLoggedIn, paramsIdValidator, async (req, res, next) => {
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
router.delete('/like/:id', isLoggedIn, paramsIdValidator, async (req, res, next) => {
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
