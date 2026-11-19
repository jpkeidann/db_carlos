const { DataTypes } = require('sequelize')
const db = require('../db/conn')

const Estoque = db.define('estoque',{
    codEstoque: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    idProduto: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'produtos',
            key: 'codProduto'
        }
    },
    quantidade_atual: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    quantidade_minima: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
},{
    timestamps: false,
    tableName: 'estoques'
})

module.exports = Estoque
