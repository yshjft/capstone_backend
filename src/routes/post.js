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
require('dotenv').config()

const esClient = new elasticsearch.Client({
  hosts: [`${process.env.NODE_ENV === 'production' ? process.env.ES_PROD_URL : process.env.ES_DEV_URL}`]
})

// 게시물 작성
router.post('/', isLoggedIn, writeReqValidator, async (req, res, next) => {
  const {title, language, public, code, memo} = req.body
  const {id} = req.user

  try {
    await esClient.ping({requestTimeout: 30000})
    const isIndexExist = await esClient.indices.exists({index: 'post-index'})

    if (!isIndexExist) {
      await esClient.indices.create({
        index: 'post-index',
        body: {
          settings: {
            number_of_shards: 5,
            number_of_replicas: 1,
            analysis: {
              analyzer: {
                post_analyzer: {
                  char_filter: ['my_char_filter'],
                  tokenizer: 'nori_t_mixed',
                  filter: ['lowercase', 'my_syn']
                }
              },
              char_filter: {
                my_char_filter: {
                  type: 'mapping',
                  mappings: ['+ => p', '# => sharp']
                }
              },
              tokenizer: {
                nori_t_mixed: {
                  type: 'nori_tokenizer',
                  user_dictionary_rules: [
                    '그리디',
                    '탐욕법',
                    '계획법',
                    '백트래킹',
                    '프로그래머스',
                    'c언어',
                    '씨언어',
                    '씨플플',
                    'c++',
                    'c샵',
                    '씨샵',
                    '자바스크립트'
                  ],
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
                    '완전 탐색, 브루트 포스, bruteforce',
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
                    '프로그래머스, programmers',
                    '씨언어, c언어, c',
                    '씨샵, c샵, csharp, c#',
                    '씨플플, cpp, c++',
                    '파이썬, python',
                    '자바, java',
                    '자바스크립트, js, javascript',
                    '루비, ruby',
                    '코틀린, kotlin',
                    '스위프트, swift'
                  ]
                }
              }
            }
          },
          mappings: {
            properties: {
              title: {
                type: 'text',
                analyzer: 'post_analyzer'
              },
              memo: {
                type: 'text',
                analyzer: 'post_analyzer'
              },
              language: {
                type: 'text',
                analyzer: 'post_analyzer'
              },
              writer: {
                type: 'integer'
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

    if (public) {
      await esClient.create({
        id: dbId,
        index: 'post-index',
        body: {
          writer: id,
          title: title,
          language: language,
          memo: memo
        }
      })
    }

    res.status(201).json({message: 'POST_SUCCESS'})
  } catch (error) {
    return next(error)
  }
})

// 게시물 조회
router.get('/', readListReqValidator, async (req, res, next) => {
  const {start, search, langFilter} = req.query

  try {
    const authCheckResult = authCheck(req)
    let data = []
    let total = 0

    if (search) {
      await esClient.ping({requestTimeout: 30000})

      const isIndexExist = await esClient.indices.exists({index: 'post-index'})
      if(isIndexExist){
        let searchResult = {}

        if(langFilter){
          searchResult = await esClient.search({
            index: 'post-index',
            body: {
              query: {
                bool: {
                  must: [
                    {
                      multi_match: {
                        query: search,
                        fields: ['title^1.2', 'memo']
                      }
                    },
                    {
                      match: {
                        language: langFilter
                      }
                    }
                  ]
                }
              },
              from: start * 10,
              size: 10
            }
          })
        }else{
          searchResult = await esClient.search({
            index: 'post-index',
            body: {
              query: {
                multi_match: {
                  query: search,
                  fields: ['title^1.2', 'memo']
                }
              },
              from: start * 10,
              size: 10
            }
          })
        }

        const {hits} = searchResult.hits
        const hitIdList = hits.map((hit) => hit._id)
        total = searchResult.hits.total.value

        if (total !== 0) {
          const scoreMap = new Map()
          let whereCondition = 'where '

          hits.forEach((hit, index) => {
            if (index === hitIdList.length - 1) whereCondition += `posts.id = ${hit._id}`
            else whereCondition += `posts.id = ${hit._id} or `

            scoreMap.set(Number(hit._id), hit._score)
          })

          const [posts] = await sequelize.query(`
          select posts.id,
               posts.title,
               posts.language,
               posts.createdAt,
               posts.updatedAt,
               users.nickName as writer,
               (select count(postId) from likes where likes.postId = posts.id) as likeNum,
               left(posts.memo, 50) as memo,
               char_length(posts.memo) as memoLength
          from posts
          join users
          on posts.writer = users.id
          ${whereCondition}
        `)

          posts.forEach((post, index) => {
            data.push(post)
            data[index].score = scoreMap.get(post.id)
          })

          data.sort((a, b) => b.score - a.score)
        }
      }
    } else {
      let whereCondition = `where posts.public = true`

      if(langFilter){
        whereCondition += ' and (' + langFilter.split(',').map((lang, langIndex) => `posts.language = '${lang}'`).join(' or ') + ')'
      }

      const [posts] = await sequelize.query(`
        select
             posts.id,
             posts.title,
             posts.language,
             posts.createdAt,
             posts.updatedAt,
             users.nickName as writer,
             (select count(postId) from likes where likes.postId = posts.id) as likeNum,
             left(posts.memo, 50) as memo,
             char_length(posts.memo) as memoLength
        from posts
        join users
        on posts.writer = users.id
        ${whereCondition}
        order by likeNum desc, posts.createdAt desc, posts.updatedAt desc
        limit ${start * 10}, 10
      `)

      const [totalNum] = await sequelize.query(` select count(id) as total from posts ${whereCondition}`)

      data = posts
      total = totalNum[0].total
    }

    return res.status(200).json({auth: {...authCheckResult}, data, total})
  } catch (error) {
    return next(error)
  }
})

// 게시물 상세 조회
router.get('/:id', readDetailReqValidator, async (req, res, next) => {
  const {id} = req.params
  const {writer} = req.query

  try {
    const authCheckResult = authCheck(req)

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
    await esClient.ping({requestTimeout: 30000})

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

    // public false는 인덱싱을 안함 => _doc 존재하지 않는다
    const isDocExist = await esClient.exists({index: 'post-index', id: postId})

    if (public && isDocExist) {
      await esClient.update({
        id: postId,
        index: 'post-index',
        body: {
          doc: {
            title: title,
            language: language,
            memo: memo
          }
        }
      })
    }

    if (public && !isDocExist) {
      const [writer] = await sequelize.query(`select writer from posts where id=${postId}`)

      await esClient.create({
        id: postId,
        index: 'post-index',
        body: {
          writer: writer[0].writer,
          title: title,
          language: language,
          memo: memo
        }
      })
    }

    if (!public && isDocExist) {
      await esClient.delete({id: postId, index: 'post-index'})
    }

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
    await esClient.ping({requestTimeout: 30000})

    const [result] = await sequelize.query(`
      delete from posts
      where posts.id=${postId} and posts.writer=${userId}
    `)

    if (result.affectedRows === 0) {
      res.status(404).json({message: 'NOT_FOUND'})
    } else {
      const isDocExist = await esClient.exists({index: 'post-index', id: postId})

      if (isDocExist) {
        await esClient.delete({
          id: postId,
          index: 'post-index'
        })
      }

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
