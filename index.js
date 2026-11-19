const express = require('express')
const app = express()
const cors = require('cors')

const conn = require('./db/conn')
require('./models/rel')

const usuarioController = require('./controller/usuario.controller')
const categoriaController = require('./controller/categoria.controller')
const produtoController = require('./controller/produto.controller')
const estoqueController = require('./controller/estoque.controller')
const pedidoController = require('./controller/pedido.controller')
const itemPedidoController = require('./controller/itemPedido.controller')
const entregaController = require('./controller/entrega.controller')

const hostname = 'localhost' // 127.0.0.1
const PORT = 3000
// ------------ Middleware ----------
app.use(express.urlencoded({extended: true}))
app.use(express.json())
app.use(cors())
//--------------- Rotas --------------

app.post('/usuario', usuarioController.cadastrar)
app.get('/usuarios', usuarioController.listar)
app.get('/usuario/:id', usuarioController.buscarPorCod)
app.get('/usuario/buscar/:nome', usuarioController.buscarPorNome)
app.delete('/usuario/:id', usuarioController.excluir)
app.put('/usuario/:id', usuarioController.atualizar)

app.post('/categoria', categoriaController.cadastrar)
app.get('/categorias', categoriaController.listar)
app.get('/categoria/:id', categoriaController.buscarPorCod)
app.get('/categoria/buscar/:nome', categoriaController.buscarPorNome)
app.delete('/categoria/:id', categoriaController.excluir)
app.put('/categoria/:id', categoriaController.atualizar)

app.post('/produto', produtoController.cadastrar)
app.get('/produtos', produtoController.listar)
app.get('/produto/:id', produtoController.buscarPorCod)
app.get('/produto/buscar/:nome', produtoController.buscarPorNome)
app.delete('/produto/:id', produtoController.excluir)
app.put('/produto/:id', produtoController.atualizar)

app.post('/estoque', estoqueController.cadastrar)
app.get('/estoques', estoqueController.listar)
app.get('/estoque/:id', estoqueController.buscarPorCod)
app.get('/estoque/produto/:idProduto', estoqueController.buscarPorProduto)
app.delete('/estoque/:id', estoqueController.excluir)
app.put('/estoque/:id', estoqueController.atualizar)

app.post('/pedido', pedidoController.cadastrar)
app.get('/pedidos', pedidoController.listar)
app.get('/pedido/:id', pedidoController.buscarPorCod)
app.get('/pedido/usuario/:idUsuario', pedidoController.buscarPorUsuario)
app.delete('/pedido/:id', pedidoController.excluir)
app.put('/pedido/:id', pedidoController.atualizar)

app.post('/item-pedido', itemPedidoController.cadastrar)
app.get('/itens-pedidos', itemPedidoController.listar)
app.get('/item-pedido/:id', itemPedidoController.buscarPorCod)
app.get('/item-pedido/pedido/:idPedido', itemPedidoController.buscarPorPedido)
app.delete('/item-pedido/:id', itemPedidoController.excluir)
app.put('/item-pedido/:id', itemPedidoController.atualizar)

app.post('/entrega', entregaController.cadastrar)
app.get('/entregas', entregaController.listar)
app.get('/entrega/:id', entregaController.buscarPorCod)
app.get('/entrega/pedido/:idPedido', entregaController.buscarPorPedido)
app.delete('/entrega/:id', entregaController.excluir)
app.put('/entrega/:id', entregaController.atualizar)

app.get('/',(req,res)=>{
    res.status(200).json({message: 'Aplicação rodando!!!'})
})

// -------------- Server -------------
conn.sync()
.then(()=>{
    app.listen(PORT, hostname, ()=>{
        console.log(`Servidor rodando em http://${hostname}:${PORT}`)
    })
})
.catch((err)=>{
    console.error('Erro de conexão com o banco de dados!',err)
})
