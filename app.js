const express = require('express')
const cookieParser = require('cookie-parser')
const session = require('express-session')
const path = require('path')
const morgan = require('morgan')
const hpp = require('hpp')
const helmet = require('helmet')
require('dotenv').config()

const app = express()
const api = require('./api')

app.set('PORT', 5000)

if (process.env.NODE_ENV) {
  app.use(morgan('combined'))
  app.use(hpp())
  app.use(helmet())
} else {
  app.use(morgan('dev'))
}
app.use(express.static(path.join(path.join(__dirname, 'public'))))
app.use(cookieParser(process.env.COOKIE_SECRET))
app.use(
  session({
    resave: false,
    saveUninitialized: false,
    secret: process.env.COOKIE_SECRET,
    proxy: true,
    cookie: {
      httpOnly: true,
      secure: false,
      maxAge: 3000 * 60 * 60
    }
  })
)

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
