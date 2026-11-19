const Estoque = require('../models/Estoque')

const cadastrar = async (req, res)=>{
    const valores = req.body

    if(!valores.idProduto || valores.quantidade_atual === undefined || valores.quantidade_minima === undefined){
        return res.status(400).json({message: 'Todos os campos são obrigatórios!'})
    }

    try{
        await Estoque.create(valores)
        res.status(201).json({message: 'Estoque Cadastrado com sucesso!'})
    }catch(err){
        console.error('Não foi possível cadastrar o Estoque',err)
        res.status(500).json({message: 'Não foi possível cadastrar o Estoque'})
    }
}

const listar = async (req,res)=>{
    try{
        const dados = await Estoque.findAll()
        res.status(200).json(dados)
    }catch(err){
        console.error('Não foi possível listar os Estoques',err)
        res.status(500).json({message: 'Não foi possível listar os Estoques'})
    }
}

const buscarPorCod = async (req,res)=>{
    const id = req.params.id
    try{
        const dados = await Estoque.findByPk(id)
        if(!dados){
            res.status(404).json({message: 'Estoque não encontrado!'})
        }else{
            res.status(200).json(dados)
        }
    }catch(err){
        console.error('Não foi possível encontrar o Estoque',err)
        res.status(500).json({message: 'Não foi possível encontrar o Estoque'})
    }
}

const buscarPorProduto = async (req,res)=>{
    const idProduto = req.params.idProduto
    try{
        const dados = await Estoque.findOne({where: { idProduto: idProduto}})
        if(!dados){
            res.status(404).json({message: 'Estoque do Produto não encontrado!'})
        }else{
            res.status(200).json(dados)
        }
    }catch(err){
        console.error('Não foi possível encontrar o Estoque do Produto',err)
        res.status(500).json({message: 'Não foi possível encontrar o Estoque do Produto'})
    }
}

const excluir = async (req,res)=>{
    const id = req.params.id
    try{
        const dados = await Estoque.findByPk(id)
        if(!dados){
            res.status(404).json({message: 'Estoque não encontrado no banco de dados!'})
        }else{
            await Estoque.destroy({where: { codEstoque: id}})
            res.status(200).json({message: 'Estoque excluído com sucesso!'})
        }
    }catch(err){
        console.error('Não foi possível excluir o Estoque',err)
        res.status(500).json({message: 'Não foi possível excluir o Estoque'})
    }
}

const atualizar = async (req,res)=>{
    const id = req.params.id
    const valores = req.body
    try{
        let dados = await Estoque.findByPk(id)
        if(!dados){
            res.status(404).json({message: 'Estoque não encontrado no banco de dados!'})
        }else{
            await Estoque.update(valores, { where: { codEstoque: id}})
            dados = await Estoque.findByPk(id)
            res.status(200).json(dados)
        }
    }catch(err){
        console.error('Não foi possível atualizar o Estoque',err)
        res.status(500).json({message: 'Não foi possível atualizar o Estoque'})
    }
}

module.exports = { cadastrar, listar, buscarPorCod, buscarPorProduto, excluir, atualizar }
