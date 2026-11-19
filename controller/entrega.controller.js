const Entrega = require('../models/Entrega')

const cadastrar = async (req, res)=>{
    const valores = req.body

    if(!valores.idPedido || !valores.cep || !valores.logradouro ||
        !valores.bairro || !valores.localidade || !valores.uf ||
        !valores.numero || !valores.statusEntrega){

        return res.status(400).json({message: 'Todos os campos são obrigatórios!'})
    }

    try{
        await Entrega.create(valores)
        res.status(201).json({message: 'Entrega Cadastrada com sucesso!'})
    }catch(err){
        console.error('Não foi possível cadastrar a Entrega',err)
        res.status(500).json({message: 'Não foi possível cadastrar a Entrega'})
    }
}

const listar = async (req,res)=>{
    try{
        const dados = await Entrega.findAll()
        res.status(200).json(dados)
    }catch(err){
        console.error('Não foi possível listar as Entregas',err)
        res.status(500).json({message: 'Não foi possível listar as Entregas'})
    }
}

const buscarPorCod = async (req,res)=>{
    const id = req.params.id
    try{
        const dados = await Entrega.findByPk(id)
        if(!dados){
            res.status(404).json({message: 'Entrega não encontrada!'})
        }else{
            res.status(200).json(dados)
        }
    }catch(err){
        console.error('Não foi possível encontrar a Entrega',err)
        res.status(500).json({message: 'Não foi possível encontrar a Entrega'})
    }
}

const buscarPorPedido = async (req,res)=>{
    const idPedido = req.params.idPedido
    try{
        const dados = await Entrega.findOne({where: { idPedido: idPedido}})
        if(!dados){
            res.status(404).json({message: 'Entrega do Pedido não encontrada!'})
        }else{
            res.status(200).json(dados)
        }
    }catch(err){
        console.error('Não foi possível encontrar a Entrega do Pedido',err)
        res.status(500).json({message: 'Não foi possível encontrar a Entrega do Pedido'})
    }
}

const excluir = async (req,res)=>{
    const id = req.params.id
    try{
        const dados = await Entrega.findByPk(id)
        if(!dados){
            res.status(404).json({message: 'Entrega não encontrada no banco de dados!'})
        }else{
            await Entrega.destroy({where: { codEntrega: id}})
            res.status(200).json({message: 'Entrega excluída com sucesso!'})
        }
    }catch(err){
        console.error('Não foi possível excluir a Entrega',err)
        res.status(500).json({message: 'Não foi possível excluir a Entrega'})
    }
}

const atualizar = async (req,res)=>{
    const id = req.params.id
    const valores = req.body
    try{
        let dados = await Entrega.findByPk(id)
        if(!dados){
            res.status(404).json({message: 'Entrega não encontrada no banco de dados!'})
        }else{
            await Entrega.update(valores, { where: { codEntrega: id}})
            dados = await Entrega.findByPk(id)
            res.status(200).json(dados)
        }
    }catch(err){
        console.error('Não foi possível atualizar a Entrega',err)
        res.status(500).json({message: 'Não foi possível atualizar a Entrega'})
    }
}

module.exports = { cadastrar, listar, buscarPorCod, buscarPorPedido, excluir, atualizar }
