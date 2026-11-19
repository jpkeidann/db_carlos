const { DataTypes } = require('sequelize')
const db = require('../db/conn')

const Pedido = db.define('pedido',{
    codPedido: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    idUsuario: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'usuarios',
            key: 'codUsuario'
        }
    },
    dataPedido: {
        type: DataTypes.DATE,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('PENDENTE','PAGO','ENVIADO','ENTREGUE','CANCELADO'),
        allowNull: false
    },
    valorSubtotal: {
        type: DataTypes.DECIMAL(10,2),
        allowNull: false
    },
    valorFrete: {
        type: DataTypes.DECIMAL(10,2),
        allowNull: false
    },
    valorTotal: {
        type: DataTypes.DECIMAL(10,2),
        allowNull: false
    }
},{
    timestamps: false,
    tableName: 'pedidos'
})

module.exports = Pedido
