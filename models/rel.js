const Usuario = require('./Usuario')
const Categoria = require('./Categoria')
const Produto = require('./Produto')
const Estoque = require('./Estoque')
const Pedido = require('./Pedido')
const ItemPedido = require('./ItemPedido')
const Entrega = require('./Entrega')

Categoria.hasMany(Produto,{
    foreignKey: 'idCategoria',
    as: 'produtoCategoria',
    onDelete: 'CASCADE'
})

Produto.belongsTo(Categoria,{
    foreignKey: 'idCategoria',
    as: 'categoriaProduto',
    allowNull: false
})

Produto.hasMany(Estoque,{
    foreignKey: 'idProduto',
    as: 'estoqueProduto',
    onDelete: 'CASCADE'
})

Estoque.belongsTo(Produto,{
    foreignKey: 'idProduto',
    as: 'produtoEstoque',
    allowNull: false
})

Produto.hasMany(ItemPedido,{
    foreignKey: 'idProduto',
    as: 'itemPedidoProduto',
    onDelete: 'CASCADE'
})

ItemPedido.belongsTo(Produto,{
    foreignKey: 'idProduto',
    as: 'produtoItemPedido',
    allowNull: false
})

Usuario.hasMany(Pedido,{
    foreignKey: 'idUsuario',
    as: 'pedidoUsuario',
    onDelete: 'CASCADE'
})

Pedido.belongsTo(Usuario,{
    foreignKey: 'idUsuario',
    as: 'usuarioPedido',
    allowNull: false
})

Pedido.hasMany(ItemPedido,{
    foreignKey: 'idPedido',
    as: 'itemPedidoPedido',
    onDelete: 'CASCADE'
})

ItemPedido.belongsTo(Pedido,{
    foreignKey: 'idPedido',
    as: 'pedidoItemPedido',
    allowNull: false
})

Pedido.hasMany(Entrega,{
    foreignKey: 'idPedido',
    as: 'entregaPedido',
    onDelete: 'CASCADE'
})

Entrega.belongsTo(Pedido,{
    foreignKey: 'idPedido',
    as: 'pedidoEntrega',
    allowNull: false
})

module.exports = { Usuario, Categoria, Produto, Estoque, Pedido, ItemPedido, Entrega }
