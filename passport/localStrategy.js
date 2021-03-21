const localStrategy = require('passport-local').Strategy
const bcrypt = require('bcryptjs')
const {User} = require('../models')

module.exports = (passport) => {
  passport.use(
    new localStrategy(
      {
        usernameField: 'email',
        passwordField: 'password'
      },
      async (email, password, done) => {
        try {
          const exUser = await User.findOne({where: {email}})
          if (exUser) {
            const result = await bcrypt.compare(password, exUser.password)
            if (result) {
              done(null, exUser)
            } else {
              done(null, false, {message: 'WRONG_PASSWORD'})
            }
          } else {
            done(null, false, {message: 'NOT_REGISTERED'})
          }
        } catch (error) {
          done(error)
        }
      }
    )
  )
}
