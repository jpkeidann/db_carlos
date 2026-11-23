require('dotenv').config({ quiet: true })
const express = require('express')
const app = express()
const cors = require('cors')

const conn = require('./db/conn')
require('./models/rel')

const { autenticar, apenasAdmin } = require('./middleware/auth')

const authController = require('./controller/auth.controller')
const cepController = require('./controller/cep.controller')
const usuarioController = require('./controller/usuario.controller')
const categoriaController = require('./controller/categoria.controller')
const produtoController = require('./controller/produto.controller')
const estoqueController = require('./controller/estoque.controller')
const pedidoController = require('./controller/pedido.controller')
const itemPedidoController = require('./controller/itemPedido.controller')
const entregaController = require('./controller/entrega.controller')
const relatorioController = require('./controller/relatorio.controller')

const hostname = process.env.HOST || '0.0.0.0' // no Railway precisa ser 0.0.0.0
const PORT = process.env.PORT || 3000

// ------------ Middleware ----------
app.use(express.urlencoded({extended: true}))
app.use(express.json())
app.use(cors())

// "privado" = precisa de token JWT  |  "admin" = token JWT + usuário ADMIN
const privado = [autenticar]
const admin = [autenticar, apenasAdmin]

//--------------- Rotas PÚBLICAS (sem login) --------------
app.get('/',(req,res)=>{
    res.status(200).json({message: 'Aplicação rodando!!!'})
})

app.post('/login', authController.login)
app.post('/usuarios', usuarioController.cadastrar)           // cadastro de cliente
app.get('/cep/:cep', cepController.buscar)                   // autocompletar endereço (ViaCEP)

app.get('/produtos', produtoController.listar)
app.get('/produtos/buscar', produtoController.listar)        // ?nome=...&idCategoria=...
app.get('/produtos/buscar/:nome', produtoController.listar)
app.get('/produtos/:id', produtoController.buscarPorCod)

app.get('/categorias', categoriaController.listar)
app.get('/categorias/buscar/:nome', categoriaController.buscarPorNome)
app.get('/categorias/:id', categoriaController.buscarPorCod)

//--------------- Rotas PRIVADAS (token JWT) --------------
// Usuário (perfil)
app.get('/usuarios/perfil', privado, usuarioController.perfil)
app.get('/usuarios/:id', privado, usuarioController.buscarPorCod)
app.put('/usuarios/:id', privado, usuarioController.atualizar)
app.patch('/usuarios/:id', privado, usuarioController.atualizarParcial)
app.delete('/usuarios/:id', privado, usuarioController.excluir)

// Pedidos do cliente logado
app.post('/pedidos', privado, pedidoController.criar)                    // checkout
app.get('/pedidos/meus-pedidos', privado, pedidoController.meusPedidos)
app.get('/pedidos/:id', privado, pedidoController.buscarPorCod)
app.patch('/pedidos/:id/cancelar', privado, pedidoController.cancelar)

app.get('/itens-pedidos/pedido/:idPedido', privado, itemPedidoController.buscarPorPedido)
app.get('/itens-pedidos/:id', privado, itemPedidoController.buscarPorCod)

app.get('/entregas/pedido/:idPedido', privado, entregaController.buscarPorPedido)
app.get('/entregas/:id', privado, entregaController.buscarPorCod)

//--------------- Rotas ADMIN (token JWT + ADMIN) --------------
app.get('/usuarios', admin, usuarioController.listar)
app.get('/usuarios/buscar/:nome', admin, usuarioController.buscarPorNome)

app.post('/categorias', admin, categoriaController.cadastrar)
app.put('/categorias/:id', admin, categoriaController.atualizar)
app.patch('/categorias/:id', admin, categoriaController.atualizarParcial)
app.delete('/categorias/:id', admin, categoriaController.excluir)

app.get('/admin/produtos', admin, produtoController.listarAdmin)        // inclui inativos + estoque mínimo
app.post('/produtos', admin, produtoController.cadastrar)
app.put('/produtos/:id', admin, produtoController.atualizar)
app.patch('/produtos/:id', admin, produtoController.atualizarParcial)
app.delete('/produtos/:id', admin, produtoController.excluir)

app.get('/estoque', admin, estoqueController.listar)
app.get('/estoque/movimentos', admin, estoqueController.listarMovimentos)
app.get('/estoque/produto/:idProduto', admin, estoqueController.buscarPorProduto)
app.get('/estoque/:id', admin, estoqueController.buscarPorCod)
app.post('/estoque', admin, estoqueController.cadastrar)
app.post('/estoque/movimentar', admin, estoqueController.movimentar)    // ENTRADA / SAIDA
app.put('/estoque/:id', admin, estoqueController.atualizar)
app.patch('/estoque/:id', admin, estoqueController.atualizarParcial)
app.delete('/estoque/:id', admin, estoqueController.excluir)

app.get('/pedidos', admin, pedidoController.listar)
app.get('/pedidos/usuario/:idUsuario', admin, pedidoController.buscarPorUsuario)
app.patch('/pedidos/:id/status', admin, pedidoController.atualizarStatus)
app.delete('/pedidos/:id', admin, pedidoController.excluir)

app.get('/itens-pedidos', admin, itemPedidoController.listar)

app.get('/entregas', admin, entregaController.listar)
app.put('/entregas/:id', admin, entregaController.atualizar)
app.patch('/entregas/:id', admin, entregaController.atualizarParcial)

app.get('/relatorios/vendas', admin, relatorioController.vendas)         // gráficos
app.get('/relatorios/estoque', admin, relatorioController.estoque)

// rota inexistente
app.use((req,res)=>{
    res.status(404).json({message: 'Rota não encontrada!'})
})

// erros gerais (ex.: JSON malformado no body)
app.use((err, req, res, next)=>{
    if(err.type === 'entity.parse.failed'){
        return res.status(400).json({message: 'JSON inválido no corpo da requisição!'})
    }
    console.error('Erro não tratado',err)
    res.status(500).json({message: 'Erro interno do servidor'})
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
