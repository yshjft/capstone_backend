const Sequelize = require('sequelize')

module.exports = class User extends Sequelize.Model {
  static init(sequelize) {
    return super.init(
      {
        email: {
          type: Sequelize.STRING(30),
          allowNull: false,
          unique: true
        },
        nickName: {
          type: Sequelize.STRING(10),
          allowNull: false,
          unique: true
        },
        password: {
          type: Sequelize.STRING,
          allowNull: false
        }
      },
      {
        sequelize,
        timestamps: true,
        tableName: 'users',
        charset: 'utf8',
        collate: 'utf8_general_ci'
      }
    )
  }
  static associate(db) {
    db.User.hasMany(db.Post, {foreignKey: 'writer', sourceKey: 'id', onDelete: 'cascade'})
    db.User.belongsToMany(db.Post, {foreignKey: 'userId', through: 'likes', onDelete: 'cascade'})
  }
}
