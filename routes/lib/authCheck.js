const authCheck = (req) => {
  if (req.isAuthenticated()) {
    const {id, nickName} = req.user

    return {isLoggedIn: true, id, nickName}
  } else {
    return {isLoggedIn: false, id: 0, nickName: ''}
  }
}

module.exports = authCheck
