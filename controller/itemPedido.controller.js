const ItemPedido = require('../models/ItemPedido')

const cadastrar = async (req, res)=>{
    const valores = req.body

    if(!valores.idPedido || !valores.idProduto || !valores.quantidade ||
        valores.precoUnitario === undefined || valores.valorTotalItem === undefined){

        return res.status(400).json({message: 'Todos os campos são obrigatórios!'})
    }

    try{
        await ItemPedido.create(valores)
        res.status(201).json({message: 'Item do Pedido Cadastrado com sucesso!'})
    }catch(err){
        console.error('Não foi possível cadastrar o Item do Pedido',err)
        res.status(500).json({message: 'Não foi possível cadastrar o Item do Pedido'})
    }
}

const listar = async (req,res)=>{
    try{
        const dados = await ItemPedido.findAll()
        res.status(200).json(dados)
    }catch(err){
        console.error('Não foi possível listar os Itens dos Pedidos',err)
        res.status(500).json({message: 'Não foi possível listar os Itens dos Pedidos'})
    }
}

const buscarPorCod = async (req,res)=>{
    const id = req.params.id
    try{
        const dados = await ItemPedido.findByPk(id)
        if(!dados){
            res.status(404).json({message: 'Item do Pedido não encontrado!'})
        }else{
            res.status(200).json(dados)
        }
    }catch(err){
        console.error('Não foi possível encontrar o Item do Pedido',err)
        res.status(500).json({message: 'Não foi possível encontrar o Item do Pedido'})
    }
}

const buscarPorPedido = async (req,res)=>{
    const idPedido = req.params.idPedido
    try{
        const dados = await ItemPedido.findAll({where: { idPedido: idPedido}})
        if(!dados || dados.length === 0){
            res.status(404).json({message: 'Nenhum Item encontrado para esse Pedido!'})
        }else{
            res.status(200).json(dados)
        }
    }catch(err){
        console.error('Não foi possível encontrar os Itens do Pedido',err)
        res.status(500).json({message: 'Não foi possível encontrar os Itens do Pedido'})
    }
}

const excluir = async (req,res)=>{
    const id = req.params.id
    try{
        const dados = await ItemPedido.findByPk(id)
        if(!dados){
            res.status(404).json({message: 'Item do Pedido não encontrado no banco de dados!'})
        }else{
            await ItemPedido.destroy({where: { codItemPedido: id}})
            res.status(200).json({message: 'Item do Pedido excluído com sucesso!'})
        }
    }catch(err){
        console.error('Não foi possível excluir o Item do Pedido',err)
        res.status(500).json({message: 'Não foi possível excluir o Item do Pedido'})
    }
}

const atualizar = async (req,res)=>{
    const id = req.params.id
    const valores = req.body
    try{
        let dados = await ItemPedido.findByPk(id)
        if(!dados){
            res.status(404).json({message: 'Item do Pedido não encontrado no banco de dados!'})
        }else{
            await ItemPedido.update(valores, { where: { codItemPedido: id}})
            dados = await ItemPedido.findByPk(id)
            res.status(200).json(dados)
        }
    }catch(err){
        console.error('Não foi possível atualizar o Item do Pedido',err)
        res.status(500).json({message: 'Não foi possível atualizar o Item do Pedido'})
    }
}

module.exports = { cadastrar, listar, buscarPorCod, buscarPorPedido, excluir, atualizar }
