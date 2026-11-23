const db = require('../db/conn')
const Pedido = require('../models/Pedido')
const ItemPedido = require('../models/ItemPedido')
const Produto = require('../models/Produto')
const Estoque = require('../models/Estoque')
const Entrega = require('../models/Entrega')
const Usuario = require('../models/Usuario')
const MovimentoEstoque = require('../models/MovimentoEstoque')
const regras = require('../config/regras')
const { completarEndereco } = require('../utils/viacep')
const { inteiro, vazio } = require('../utils/helpers')
const { ErroNegocio, tratarErro } = require('../utils/erros')

const STATUS = ['PENDENTE','PAGO','ENVIADO','ENTREGUE','CANCELADO']
const SEQUENCIA = ['PENDENTE','PAGO','ENVIADO','ENTREGUE'] // ordem em que o pedido evolui

const centavos = (valor) => Math.round(parseFloat(valor) * 100)

const includePedido = (admin) => [
    { model: ItemPedido, as: 'itens', include: [{ model: Produto, as: 'produto', attributes: ['codProduto','nome','imagem_url'] }] },
    { model: Entrega, as: 'entregas' },
    ...(admin ? [{ model: Usuario, as: 'usuario', attributes: ['codUsuario','nome','email'] }] : [])
]

const ehDonoOuAdmin = (req, pedido) =>
    req.usuario.tipo_usuario === 'ADMIN' || String(pedido.idUsuario) === String(req.usuario.codUsuario)

// Mantém a entrega coerente com o status do pedido
const sincronizarEntrega = async (idPedido, statusPedido, t)=>{
    const mapa = { ENVIADO: 'EM_TRANSITO', ENTREGUE: 'ENTREGUE', CANCELADO: 'CANCELADA' }
    const novoStatus = mapa[statusPedido]
    if(!novoStatus) return

    const where = { idPedido }
    if(statusPedido === 'ENVIADO') where.statusEntrega = 'AGUARDANDO'
    await Entrega.update({ statusEntrega: novoStatus }, { where, transaction: t })
}

// Devolve ao estoque os itens de um pedido cancelado
const devolverEstoque = async (pedido, idUsuarioAcao, t)=>{
    const itens = await ItemPedido.findAll({ where: { idPedido: pedido.codPedido }, order: [['idProduto','ASC']], transaction: t })

    for(const item of itens){
        const estoque = await Estoque.findOne({ where: { idProduto: item.idProduto }, transaction: t, lock: t.LOCK.UPDATE })
        if(estoque){
            await estoque.update({ quantidade_atual: estoque.quantidade_atual + item.quantidade }, { transaction: t })
        }else{
            await Estoque.create({ idProduto: item.idProduto, quantidade_atual: item.quantidade, quantidade_minima: 0 }, { transaction: t })
        }
        await MovimentoEstoque.create({
            idProduto: item.idProduto, idUsuario: idUsuarioAcao, idPedido: pedido.codPedido,
            tipo: 'ENTRADA', quantidade: item.quantidade, motivo: `CANCELAMENTO DO PEDIDO #${pedido.codPedido}`
        }, { transaction: t })
    }
}

const cancelarNaTransacao = async (pedido, idUsuarioAcao, t)=>{
    await devolverEstoque(pedido, idUsuarioAcao, t)
    await pedido.update({ status: 'CANCELADO' }, { transaction: t })
    await sincronizarEntrega(pedido.codPedido, 'CANCELADO', t)
}

// POST /pedidos (logado) - CHECKOUT: converte o carrinho em pedido, cria itens/entrega e deduz o estoque
const criar = async (req, res)=>{
    const { itens, entrega } = req.body || {}

    if(!Array.isArray(itens) || itens.length === 0){
        return res.status(400).json({message: 'O carrinho está vazio! Informe os itens do pedido.'})
    }
    if(itens.length > 50){
        return res.status(400).json({message: 'O pedido pode ter no máximo 50 itens diferentes!'})
    }

    // agrupa itens repetidos do mesmo produto
    const agrupados = new Map()
    for(const item of itens){
        const idProduto = inteiro(item && item.idProduto, 1)
        const quantidade = inteiro(item && item.quantidade, 1)
        if(idProduto === null || quantidade === null){
            return res.status(400).json({message: 'Cada item precisa de idProduto e quantidade (inteiros maiores que zero)!'})
        }
        agrupados.set(idProduto, (agrupados.get(idProduto) || 0) + quantidade)
    }

    try{
        // endereço de entrega: o informado no pedido (consulta ViaCEP) ou o do perfil do usuário
        const usuario = await Usuario.findByPk(req.usuario.codUsuario)
        let resultado
        if(entrega && typeof entrega === 'object' && !vazio(entrega.cep)){
            resultado = await completarEndereco(entrega, true)
        }else if(!vazio(usuario.cep)){
            resultado = await completarEndereco(usuario.toJSON(), false)
        }else{
            return res.status(400).json({message: 'Informe o endereço de entrega (campo "entrega") ou cadastre um endereço no seu perfil!'})
        }
        if(resultado.erro) return res.status(resultado.erro.codigo).json({message: resultado.erro.message})
        const endereco = resultado.endereco

        const criado = await db.transaction(async (t)=>{
            // ordena por produto para evitar deadlock entre pedidos simultâneos
            const ids = [...agrupados.keys()].sort((a, b)=> a - b)
            const linhas = []

            for(const idProduto of ids){
                const quantidade = agrupados.get(idProduto)

                const produto = await Produto.findByPk(idProduto, { transaction: t })
                if(!produto) throw new ErroNegocio(404, `Produto ${idProduto} não encontrado!`)
                if(!produto.ativo) throw new ErroNegocio(409, `O produto "${produto.nome}" não está disponível para venda!`)

                // trava a linha do estoque para ninguém vender a mesma unidade ao mesmo tempo
                const estoque = await Estoque.findOne({ where: { idProduto }, transaction: t, lock: t.LOCK.UPDATE })
                if(!estoque || estoque.quantidade_atual <= 0){
                    throw new ErroNegocio(409, `O produto "${produto.nome}" está esgotado!`)
                }
                if(estoque.quantidade_atual < quantidade){
                    throw new ErroNegocio(409, `Estoque insuficiente para "${produto.nome}". Disponível: ${estoque.quantidade_atual}.`)
                }

                // o preço SEMPRE vem do banco (nunca do cliente)
                linhas.push({ produto, estoque, quantidade, precoCent: centavos(produto.preco) })
            }

            // ---- cálculo do pedido (em centavos para não ter erro de arredondamento) ----
            const unidades = linhas.reduce((soma, l)=> soma + l.quantidade, 0)
            const subtotal = linhas.reduce((soma, l)=> soma + l.precoCent * l.quantidade, 0)

            const faixa = regras.descontos.find((f)=> unidades >= f.minUnidades)
            const percentual = faixa ? faixa.percentual : 0
            const desconto = Math.round(subtotal * percentual / 100)

            const baseFrete = subtotal - desconto
            const frete = baseFrete >= Math.round(regras.frete.gratisAcimaDe * 100) ? 0 : Math.round(regras.frete.valorFixo * 100)
            const total = baseFrete + frete

            const pedido = await Pedido.create({
                idUsuario: usuario.codUsuario,
                dataPedido: new Date(),
                status: 'PENDENTE',
                valorSubtotal: subtotal / 100,
                valorDesconto: desconto / 100,
                valorFrete: frete / 100,
                valorTotal: total / 100
            }, { transaction: t })

            for(const l of linhas){
                await ItemPedido.create({
                    idPedido: pedido.codPedido,
                    idProduto: l.produto.codProduto,
                    quantidade: l.quantidade,
                    precoUnitario: l.precoCent / 100,
                    valorTotalItem: (l.precoCent * l.quantidade) / 100
                }, { transaction: t })

                // dedução do estoque + histórico
                await l.estoque.update({ quantidade_atual: l.estoque.quantidade_atual - l.quantidade }, { transaction: t })
                await MovimentoEstoque.create({
                    idProduto: l.produto.codProduto, idUsuario: usuario.codUsuario, idPedido: pedido.codPedido,
                    tipo: 'SAIDA', quantidade: l.quantidade, motivo: `VENDA - PEDIDO #${pedido.codPedido}`
                }, { transaction: t })
            }

            const prazo = new Date(Date.now() + regras.prazoEntregaDias * 24 * 60 * 60 * 1000)
            await Entrega.create({
                idPedido: pedido.codPedido,
                ...endereco,
                dataEstimada: prazo.toISOString().slice(0, 10),
                statusEntrega: 'AGUARDANDO'
            }, { transaction: t })

            return { codPedido: pedido.codPedido, unidades, percentualDesconto: percentual }
        })

        const pedido = await Pedido.findByPk(criado.codPedido, { include: includePedido(false) })
        res.status(201).json({
            message: 'Pedido realizado com sucesso!',
            pedido,
            resumo: { unidades: criado.unidades, percentualDesconto: criado.percentualDesconto }
        })
    }catch(err){
        tratarErro(res, err, 'Não foi possível registrar o Pedido')
    }
}

// GET /pedidos/meus-pedidos (logado) - histórico do cliente
const meusPedidos = async (req, res)=>{
    try{
        const dados = await Pedido.findAll({
            where: { idUsuario: req.usuario.codUsuario },
            include: includePedido(false),
            order: [['dataPedido','DESC'], ['codPedido','DESC']]
        })
        res.status(200).json(dados)
    }catch(err){
        console.error('Não foi possível listar seus Pedidos',err)
        res.status(500).json({message: 'Não foi possível listar seus Pedidos'})
    }
}

// GET /pedidos (admin) - todos os pedidos (?status=PENDENTE)
const listar = async (req, res)=>{
    const where = {}
    if(!vazio(req.query.status)){
        if(!STATUS.includes(req.query.status)){
            return res.status(400).json({message: `Status inválido! Use: ${STATUS.join(', ')}`})
        }
        where.status = req.query.status
    }

    try{
        const dados = await Pedido.findAll({ where, include: includePedido(true), order: [['dataPedido','DESC'], ['codPedido','DESC']] })
        res.status(200).json(dados)
    }catch(err){
        console.error('Não foi possível listar os Pedidos',err)
        res.status(500).json({message: 'Não foi possível listar os Pedidos'})
    }
}

// GET /pedidos/:id (dono ou admin)
const buscarPorCod = async (req, res)=>{
    const id = req.params.id
    try{
        const dados = await Pedido.findByPk(id, { include: includePedido(req.usuario.tipo_usuario === 'ADMIN') })
        if(!dados){
            return res.status(404).json({message: 'Pedido não encontrado!'})
        }
        if(!ehDonoOuAdmin(req, dados)){
            return res.status(403).json({message: 'Você não tem permissão para ver este pedido!'})
        }
        res.status(200).json(dados)
    }catch(err){
        console.error('Não foi possível encontrar o Pedido',err)
        res.status(500).json({message: 'Não foi possível encontrar o Pedido'})
    }
}

// GET /pedidos/usuario/:idUsuario (admin)
const buscarPorUsuario = async (req, res)=>{
    const idUsuario = req.params.idUsuario
    try{
        const dados = await Pedido.findAll({ where: { idUsuario }, include: includePedido(false), order: [['dataPedido','DESC']] })
        if(dados.length === 0){
            res.status(404).json({message: 'Nenhum Pedido encontrado para esse Usuário!'})
        }else{
            res.status(200).json(dados)
        }
    }catch(err){
        console.error('Não foi possível encontrar os Pedidos do Usuário',err)
        res.status(500).json({message: 'Não foi possível encontrar os Pedidos do Usuário'})
    }
}

// PATCH /pedidos/:id/status (admin) - PENDENTE -> PAGO -> ENVIADO -> ENTREGUE (ou CANCELADO)
const atualizarStatus = async (req, res)=>{
    const id = req.params.id
    const { status } = req.body || {}

    if(!STATUS.includes(status)){
        return res.status(400).json({message: `Status inválido! Use: ${STATUS.join(', ')}`})
    }

    try{
        await db.transaction(async (t)=>{
            const pedido = await Pedido.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE })
            if(!pedido) throw new ErroNegocio(404, 'Pedido não encontrado no banco de dados!')

            if(pedido.status === status) throw new ErroNegocio(400, `O pedido já está com o status ${status}!`)
            if(pedido.status === 'CANCELADO') throw new ErroNegocio(409, 'Pedido cancelado não pode ser alterado!')
            if(pedido.status === 'ENTREGUE') throw new ErroNegocio(409, 'Pedido já entregue não pode ser alterado!')

            if(status === 'CANCELADO'){
                await cancelarNaTransacao(pedido, req.usuario.codUsuario, t)
                return
            }
            if(SEQUENCIA.indexOf(status) < SEQUENCIA.indexOf(pedido.status)){
                throw new ErroNegocio(409, 'Não é possível voltar o status do pedido!')
            }

            await pedido.update({ status }, { transaction: t })
            await sincronizarEntrega(pedido.codPedido, status, t)
        })

        const dados = await Pedido.findByPk(id, { include: includePedido(true) })
        res.status(200).json(dados)
    }catch(err){
        tratarErro(res, err, 'Não foi possível atualizar o status do Pedido')
    }
}

// PATCH /pedidos/:id/cancelar (dono ou admin) - só enquanto estiver PENDENTE; devolve o estoque
const cancelar = async (req, res)=>{
    const id = req.params.id
    try{
        await db.transaction(async (t)=>{
            const pedido = await Pedido.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE })
            if(!pedido) throw new ErroNegocio(404, 'Pedido não encontrado!')
            if(!ehDonoOuAdmin(req, pedido)) throw new ErroNegocio(403, 'Você não tem permissão para cancelar este pedido!')
            if(pedido.status !== 'PENDENTE') throw new ErroNegocio(409, 'Só é possível cancelar pedidos com status PENDENTE!')

            await cancelarNaTransacao(pedido, req.usuario.codUsuario, t)
        })

        const dados = await Pedido.findByPk(id, { include: includePedido(false) })
        res.status(200).json({message: 'Pedido cancelado com sucesso!', pedido: dados})
    }catch(err){
        tratarErro(res, err, 'Não foi possível cancelar o Pedido')
    }
}

// DELETE /pedidos/:id (admin) - só pedidos CANCELADOS (não se apaga venda realizada)
const excluir = async (req, res)=>{
    const id = req.params.id
    try{
        const dados = await Pedido.findByPk(id)
        if(!dados){
            return res.status(404).json({message: 'Pedido não encontrado no banco de dados!'})
        }
        if(dados.status !== 'CANCELADO'){
            return res.status(409).json({message: 'Só é possível excluir pedidos CANCELADOS!'})
        }

        await Pedido.destroy({where: { codPedido: id}})
        res.status(200).json({message: 'Pedido excluído com sucesso!'})
    }catch(err){
        console.error('Não foi possível excluir o Pedido',err)
        res.status(500).json({message: 'Não foi possível excluir o Pedido'})
    }
}

module.exports = { criar, meusPedidos, listar, buscarPorCod, buscarPorUsuario, atualizarStatus, cancelar, excluir }
