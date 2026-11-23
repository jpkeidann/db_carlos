const bcrypt = require('bcrypt')
const { Op } = require('sequelize')
const Usuario = require('../models/Usuario')
const Pedido = require('../models/Pedido')
const { validarCPF } = require('../utils/cpf')
const { completarEndereco } = require('../utils/viacep')
const { pick, vazio, soDigitos, ehEmail } = require('../utils/helpers')
const { bcryptRounds } = require('../config/regras')
const { tratarErro } = require('../utils/erros')

const CAMPOS_ENDERECO = ['cep','logradouro','numero','complemento','bairro','localidade','uf']
const CAMPOS_PERMITIDOS = ['nome','email','senha','telefone','cpf','identidade', ...CAMPOS_ENDERECO]

const erro = (codigo, message) => ({ erro: { codigo, message } })

const ehDonoOuAdmin = (req, id) =>
    req.usuario.tipo_usuario === 'ADMIN' || String(req.usuario.codUsuario) === String(id)

// Valida e normaliza os valores (cadastro e atualização).
// "atual" = usuário já existente (null no cadastro). Retorna { valores } ou { erro }
const prepararValores = async (entrada, atual) => {
    const v = { ...entrada }
    const idAtual = atual ? atual.codUsuario : null

    if(v.nome !== undefined){
        v.nome = String(v.nome).trim()
        if(!v.nome || v.nome.length > 80) return erro(400, 'Nome inválido! (obrigatório, máx. 80 caracteres)')
    }

    if(v.email !== undefined){
        v.email = String(v.email).trim().toLowerCase()
        if(!ehEmail(v.email) || v.email.length > 100) return erro(400, 'E-mail inválido!')

        // verifica se o e-mail já existe (em outro usuário)
        const existe = await Usuario.findOne({where: { email: v.email, ...(idAtual && { codUsuario: { [Op.ne]: idAtual } }) }})
        if(existe) return erro(409, 'E-mail já cadastrado!')
    }

    if(v.cpf !== undefined){
        if(!validarCPF(v.cpf)) return erro(400, 'CPF inválido!')
        v.cpf = soDigitos(v.cpf)

        // verifica se o CPF já existe (em outro usuário)
        const existe = await Usuario.findOne({where: { cpf: v.cpf, ...(idAtual && { codUsuario: { [Op.ne]: idAtual } }) }})
        if(existe) return erro(409, 'CPF já cadastrado!')
    }

    if(v.senha !== undefined){
        if(String(v.senha).length < 6) return erro(400, 'A senha deve ter no mínimo 6 caracteres!')
        v.senha = await bcrypt.hash(String(v.senha), bcryptRounds) // criptografia com bcrypt
    }

    if(v.telefone !== undefined){
        if(vazio(v.telefone)){
            v.telefone = null
        }else{
            const digitos = soDigitos(v.telefone)
            if(digitos.length < 10 || digitos.length > 11) return erro(400, 'Telefone inválido! Informe DDD + número.')
            v.telefone = digitos
        }
    }

    if(v.identidade !== undefined){
        v.identidade = vazio(v.identidade) ? null : String(v.identidade).trim().slice(0, 20)
    }

    // endereço: no cadastro é obrigatório; na atualização só se algum campo foi enviado
    const mexeuNoEndereco = CAMPOS_ENDERECO.some((c) => v[c] !== undefined)
    if(!atual || mexeuNoEndereco){
        const base = {}
        for(const c of CAMPOS_ENDERECO){
            base[c] = v[c] !== undefined ? v[c] : (atual ? atual[c] : undefined)
        }
        // só consulta o ViaCEP quando o CEP é novo ou mudou
        const cepMudou = !atual || !atual.cep || soDigitos(base.cep) !== soDigitos(atual.cep)
        const r = await completarEndereco(base, cepMudou)
        if(r.erro) return { erro: r.erro }
        Object.assign(v, r.endereco)
    }

    return { valores: v }
}

// POST /usuarios (público)
const cadastrar = async (req, res)=>{
    const entrada = pick(req.body, CAMPOS_PERMITIDOS)

    if(['nome','email','senha','cpf','cep','numero'].some((c) => vazio(entrada[c]))){
        return res.status(400).json({message: 'Nome, e-mail, senha, CPF, CEP e número do endereço são obrigatórios!'})
    }

    try{
        const r = await prepararValores(entrada, null)
        if(r.erro) return res.status(r.erro.codigo).json({message: r.erro.message})

        // cadastro público SEMPRE cria CLIENTE (ninguém se cadastra como ADMIN)
        const novo = await Usuario.create({ ...r.valores, tipo_usuario: 'CLIENTE' })
        const dados = await Usuario.findByPk(novo.codUsuario)

        res.status(201).json({message: 'Usuário cadastrado com sucesso!', usuario: dados})
    }catch(err){
        tratarErro(res, err, 'Não foi possível cadastrar o Usuário')
    }
}

// GET /usuarios (admin)
const listar = async (req, res)=>{
    try{
        const dados = await Usuario.findAll({order: [['nome','ASC']]})
        res.status(200).json(dados)
    }catch(err){
        console.error('Não foi possível listar os Usuários',err)
        res.status(500).json({message: 'Não foi possível listar os Usuários'})
    }
}

// GET /usuarios/perfil (logado)
const perfil = async (req, res)=>{
    try{
        const dados = await Usuario.findByPk(req.usuario.codUsuario)
        if(!dados){
            return res.status(404).json({message: 'Usuário não encontrado!'})
        }
        res.status(200).json(dados)
    }catch(err){
        console.error('Não foi possível carregar o perfil',err)
        res.status(500).json({message: 'Não foi possível carregar o perfil'})
    }
}

// GET /usuarios/:id (dono ou admin)
const buscarPorCod = async (req, res)=>{
    const id = req.params.id

    if(!ehDonoOuAdmin(req, id)){
        return res.status(403).json({message: 'Você não tem permissão para ver este usuário!'})
    }

    try{
        const dados = await Usuario.findByPk(id)
        if(!dados){
            res.status(404).json({message: 'Usuário não encontrado!'})
        }else{
            res.status(200).json(dados)
        }
    }catch(err){
        console.error('Não foi possível encontrar o Usuário',err)
        res.status(500).json({message: 'Não foi possível encontrar o Usuário'})
    }
}

// GET /usuarios/buscar/:nome (admin)
const buscarPorNome = async (req, res)=>{
    const nome = req.params.nome
    try{
        const dados = await Usuario.findAll({where: { nome: { [Op.like]: `%${nome}%` } }})
        if(dados.length === 0){
            res.status(404).json({message: 'Nome do Usuário não encontrado!'})
        }else{
            res.status(200).json(dados)
        }
    }catch(err){
        console.error('Não foi possível encontrar o nome do Usuário',err)
        res.status(500).json({message: 'Não foi possível encontrar o nome do Usuário'})
    }
}

// PUT (completo) e PATCH (parcial) /usuarios/:id  (dono ou admin)
const processarAtualizacao = async (req, res, parcial)=>{
    const id = req.params.id

    if(!ehDonoOuAdmin(req, id)){
        return res.status(403).json({message: 'Você não tem permissão para alterar este usuário!'})
    }

    // só o ADMIN pode mudar o tipo de usuário
    const permitidos = req.usuario.tipo_usuario === 'ADMIN' ? [...CAMPOS_PERMITIDOS, 'tipo_usuario'] : CAMPOS_PERMITIDOS
    const entrada = pick(req.body, permitidos)

    if(Object.keys(entrada).length === 0){
        return res.status(400).json({message: 'Nenhum campo válido foi informado para atualizar!'})
    }
    // PUT = atualização completa: exige os campos obrigatórios (a senha é opcional: só troca se vier)
    if(!parcial && ['nome','email','cpf','cep','numero'].some((c) => vazio(entrada[c]))){
        return res.status(400).json({message: 'No PUT informe nome, e-mail, CPF, CEP e número. Para enviar só alguns campos use PATCH.'})
    }
    if(entrada.tipo_usuario !== undefined && !['CLIENTE','ADMIN'].includes(entrada.tipo_usuario)){
        return res.status(400).json({message: 'tipo_usuario deve ser CLIENTE ou ADMIN!'})
    }

    try{
        const atual = await Usuario.findByPk(id)
        if(!atual){
            return res.status(404).json({message: 'Usuário não encontrado no banco de dados!'})
        }

        const r = await prepararValores(entrada, atual)
        if(r.erro) return res.status(r.erro.codigo).json({message: r.erro.message})

        await Usuario.update(r.valores, { where: { codUsuario: id}})
        const dados = await Usuario.findByPk(id)
        res.status(200).json(dados)
    }catch(err){
        tratarErro(res, err, 'Não foi possível atualizar o Usuário')
    }
}
const atualizar = (req, res)=> processarAtualizacao(req, res, false)
const atualizarParcial = (req, res)=> processarAtualizacao(req, res, true)

// DELETE /usuarios/:id (dono ou admin)
const excluir = async (req, res)=>{
    const id = req.params.id

    if(!ehDonoOuAdmin(req, id)){
        return res.status(403).json({message: 'Você não tem permissão para excluir este usuário!'})
    }

    try{
        const dados = await Usuario.findByPk(id)
        if(!dados){
            return res.status(404).json({message: 'Usuário não encontrado no banco de dados!'})
        }

        const qtdPedidos = await Pedido.count({where: { idUsuario: id}})
        if(qtdPedidos > 0){
            return res.status(409).json({message: 'Usuário possui pedidos e não pode ser excluído!'})
        }

        await Usuario.destroy({where: { codUsuario: id}})
        res.status(200).json({message: 'Usuário excluído com sucesso!'})
    }catch(err){
        console.error('Não foi possível excluir o Usuário',err)
        res.status(500).json({message: 'Não foi possível excluir o Usuário'})
    }
}

module.exports = { cadastrar, listar, perfil, buscarPorCod, buscarPorNome, excluir, atualizar, atualizarParcial }
