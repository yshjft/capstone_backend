const Sequelize = require('sequelize')

module.exports = class Posts extends Sequelize.Model {
  static init(sequelize) {
    return super.init(
      {
        title: {
          type: Sequelize.STRING(100),
          allowNull: false
        },
        language: {
          type: Sequelize.STRING(30),
          allowNull: false
        },
        public: {
          type: Sequelize.BOOLEAN,
          allowNull: false
        },
        code: {
          type: Sequelize.TEXT,
          allowNull: false
        },
        memo: {
          type: Sequelize.TEXT,
          allowNull: false
        }
      },
      {
        sequelize,
        timestamps: true,
        tableName: 'posts',
        charset: 'utf8',
        collate: 'utf8_general_ci'
      }
    )
  }
  static associate(db) {
    db.Post.belongsTo(db.User, {foreignKey: 'writer', targetKey: 'id'})
    db.Post.belongsToMany(db.User, {foreignKey: 'postId', through: 'like', onDelete: 'cascade'})
  }
}
