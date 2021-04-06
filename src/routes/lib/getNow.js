const getNow = () => {
  const today = new Date()
  const now = `${today.getFullYear()}-${
    today.getMonth() + 1
  }-${today.getDate()} ${today.getHours()}:${today.getMinutes()}:${today.getSeconds()}`

  return now
}

module.exports = getNow
