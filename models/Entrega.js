const { DataTypes } = require('sequelize')
const db = require('../db/conn')

const Entrega = db.define('entrega',{
    codEntrega: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    idPedido: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'pedidos',
            key: 'codPedido'
        }
    },
    cep: {
        type: DataTypes.STRING(9),
        allowNull: false
    },
    logradouro: {
        type: DataTypes.STRING(70),
        allowNull: false
    },
    complemento: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    bairro: {
        type: DataTypes.STRING(70),
        allowNull: false
    },
    localidade: {
        type: DataTypes.STRING(70),
        allowNull: false
    },
    uf: {
        type: DataTypes.STRING(2),
        allowNull: false
    },
    numero: {
        type: DataTypes.STRING(12),
        allowNull: false
    },
    dataEstimada: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    codigoRastreio: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    statusEntrega: {
        type: DataTypes.ENUM('AGUARDANDO','EM_TRANSITO','SAIU_PARA_ENTREGA','ENTREGUE','DEVOLVIDO'),
        allowNull: false
    }
},{
    timestamps: false,
    tableName: 'entregas'
})

module.exports = Entrega
