const Pedido = require('../models/Pedido')

const cadastrar = async (req, res)=>{
    const valores = req.body

    if(!valores.idUsuario || !valores.dataPedido || !valores.status ||
        valores.valorSubtotal === undefined || valores.valorFrete === undefined || valores.valorTotal === undefined){

        return res.status(400).json({message: 'Todos os campos são obrigatórios!'})
    }

    try{
        await Pedido.create(valores)
        res.status(201).json({message: 'Pedido Cadastrado com sucesso!'})
    }catch(err){
        console.error('Não foi possível cadastrar o Pedido',err)
        res.status(500).json({message: 'Não foi possível cadastrar o Pedido'})
    }
}

const listar = async (req,res)=>{
    try{
        const dados = await Pedido.findAll()
        res.status(200).json(dados)
    }catch(err){
        console.error('Não foi possível listar os Pedidos',err)
        res.status(500).json({message: 'Não foi possível listar os Pedidos'})
    }
}

const buscarPorCod = async (req,res)=>{
    const id = req.params.id
    try{
        const dados = await Pedido.findByPk(id)
        if(!dados){
            res.status(404).json({message: 'Pedido não encontrado!'})
        }else{
            res.status(200).json(dados)
        }
    }catch(err){
        console.error('Não foi possível encontrar o Pedido',err)
        res.status(500).json({message: 'Não foi possível encontrar o Pedido'})
    }
}

const buscarPorUsuario = async (req,res)=>{
    const idUsuario = req.params.idUsuario
    try{
        const dados = await Pedido.findAll({where: { idUsuario: idUsuario}})
        if(!dados || dados.length === 0){
            res.status(404).json({message: 'Nenhum Pedido encontrado para esse Usuário!'})
        }else{
            res.status(200).json(dados)
        }
    }catch(err){
        console.error('Não foi possível encontrar os Pedidos do Usuário',err)
        res.status(500).json({message: 'Não foi possível encontrar os Pedidos do Usuário'})
    }
}

const excluir = async (req,res)=>{
    const id = req.params.id
    try{
        const dados = await Pedido.findByPk(id)
        if(!dados){
            res.status(404).json({message: 'Pedido não encontrado no banco de dados!'})
        }else{
            await Pedido.destroy({where: { codPedido: id}})
            res.status(200).json({message: 'Pedido excluído com sucesso!'})
        }
    }catch(err){
        console.error('Não foi possível excluir o Pedido',err)
        res.status(500).json({message: 'Não foi possível excluir o Pedido'})
    }
}

const atualizar = async (req,res)=>{
    const id = req.params.id
    const valores = req.body
    try{
        let dados = await Pedido.findByPk(id)
        if(!dados){
            res.status(404).json({message: 'Pedido não encontrado no banco de dados!'})
        }else{
            await Pedido.update(valores, { where: { codPedido: id}})
            dados = await Pedido.findByPk(id)
            res.status(200).json(dados)
        }
    }catch(err){
        console.error('Não foi possível atualizar o Pedido',err)
        res.status(500).json({message: 'Não foi possível atualizar o Pedido'})
    }
}

module.exports = { cadastrar, listar, buscarPorCod, buscarPorUsuario, excluir, atualizar }
