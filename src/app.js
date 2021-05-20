const express = require('express')
const cookieParser = require('cookie-parser')
const session = require('express-session')
const path = require('path')
const morgan = require('morgan')
const hpp = require('hpp')
const helmet = require('helmet')
const passport = require('passport')
const redis = require('redis')
const RedisStore = require('connect-redis')(session)
const {sequelize} = require('./models')
const passportConfig = require('./passport')
require('dotenv').config()

const api = require('./routes')

const app = express()
sequelize.sync({force: false})
passportConfig(passport)

app.set('PORT', 5000)

if (process.env.NODE_ENV) {
  app.use(morgan('combined'))
  app.use(hpp())
  app.use(helmet())
} else {
  app.use(morgan('dev'))
}
app.use(express.static(path.join(path.join(__dirname, 'public'))))
app.use(express.json())
app.use(express.urlencoded({extended: false}))
app.use(cookieParser(process.env.COOKIE_SECRET))
const redisClient = redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
  loggErrors: true
})
redisClient.on('error', (error) => {
  console.log('redis err: ', error)
  console.log('redis err.stack: ', error.stack)
})

const sessionOption = {
  resave: false,
  saveUninitialized: false,
  secret: process.env.COOKIE_SECRET,
  proxy: true,
  cookie: {
    httpOnly: true,
    secure: false,
    maxAge: 3000 * 60 * 60
  },
  store: new RedisStore({client: redisClient})
}
app.use(session(sessionOption))
app.use(passport.initialize())
app.use(passport.session())

app.use('/api', api)

app.use((req, res, next) => {
  const err = new Error()
  err.status = 404
  next(err)
})

app.use((err, req, res, next) => {
  res.status(err.status || 500).json(err.message)
})

app.listen(app.get('PORT'), () => {
  console.log(app.get('PORT'), '번 포트에서 대기 중')
})
