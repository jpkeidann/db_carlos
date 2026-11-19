const Categoria = require('../models/Categoria')

const cadastrar = async (req, res)=>{
    const valores = req.body

    if(!valores.nome){
        return res.status(400).json({message: 'Todos os campos são obrigatórios!'})
    }

    try{
        await Categoria.create(valores)
        res.status(201).json({message: 'Categoria Cadastrada com sucesso!'})
    }catch(err){
        console.error('Não foi possível cadastrar a Categoria',err)
        res.status(500).json({message: 'Não foi possível cadastrar a Categoria'})
    }
}

const listar = async (req,res)=>{
    try{
        const dados = await Categoria.findAll()
        res.status(200).json(dados)
    }catch(err){
        console.error('Não foi possível listar as Categorias',err)
        res.status(500).json({message: 'Não foi possível listar as Categorias'})
    }
}

const buscarPorCod = async (req,res)=>{
    const id = req.params.id
    try{
        const dados = await Categoria.findByPk(id)
        if(!dados){
            res.status(404).json({message: 'Categoria não encontrada!'})
        }else{
            res.status(200).json(dados)
        }
    }catch(err){
        console.error('Não foi possível encontrar a Categoria',err)
        res.status(500).json({message: 'Não foi possível encontrar a Categoria'})
    }
}

const buscarPorNome = async (req,res)=>{
    const nome = req.params.nome
    try{
        const dados = await Categoria.findOne({where: { nome: nome}})
        if(!dados){
            res.status(404).json({message: 'Nome da Categoria não encontrado!'})
        }else{
            res.status(200).json(dados)
        }
    }catch(err){
        console.error('Não foi possível encontrar o nome da Categoria',err)
        res.status(500).json({message: 'Não foi possível encontrar o nome da Categoria'})
    }
}

const excluir = async (req,res)=>{
    const id = req.params.id
    try{
        const dados = await Categoria.findByPk(id)
        if(!dados){
            res.status(404).json({message: 'Categoria não encontrada no banco de dados!'})
        }else{
            await Categoria.destroy({where: { codCategoria: id}})
            res.status(200).json({message: 'Categoria excluída com sucesso!'})
        }
    }catch(err){
        console.error('Não foi possível excluir a Categoria',err)
        res.status(500).json({message: 'Não foi possível excluir a Categoria'})
    }
}

const atualizar = async (req,res)=>{
    const id = req.params.id
    const valores = req.body
    try{
        let dados = await Categoria.findByPk(id)
        if(!dados){
            res.status(404).json({message: 'Categoria não encontrada no banco de dados!'})
        }else{
            await Categoria.update(valores, { where: { codCategoria: id}})
            dados = await Categoria.findByPk(id)
            res.status(200).json(dados)
        }
    }catch(err){
        console.error('Não foi possível atualizar a Categoria',err)
        res.status(500).json({message: 'Não foi possível atualizar a Categoria'})
    }
}

module.exports = { cadastrar, listar, buscarPorCod, buscarPorNome, excluir, atualizar }
