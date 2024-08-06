const dotenv = require('dotenv')

dotenv.config()

module.exports = function () {
  let mysql = require('mysql2')

  //Establish Connection to the DB
  let connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: 3306,
  })

  //Instantiate the connection
  connection.connect(function (err) {
    if (err) {
      console.log(`connectionRequest Failed ${err.stack}`)
    } else {
      console.log(`DB connectionRequest Successful ${connection.threadId}`)
    }
  })

  //return connection object
  return connection
}
