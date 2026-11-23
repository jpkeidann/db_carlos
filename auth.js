const jwt = require('jsonwebtoken')
const Usuario = require('../models/Usuario')
const { jwt: cfg } = require('../config/regras')

// Exige o cabeçalho  Authorization: Bearer <TOKEN_JWT>
// Token ausente, inválido ou expirado => 401 Unauthorized
const autenticar = async (req, res, next) => {
    const [tipo, token] = (req.headers.authorization || '').split(' ')

    if (tipo !== 'Bearer' || !token) {
        return res.status(401).json({ message: 'Token não informado! Use Authorization: Bearer <token>' })
    }

    let payload
    try {
        payload = jwt.verify(token, cfg.secret)
    } catch (err) {
        const message = err.name === 'TokenExpiredError' ? 'Token expirado! Faça login novamente.' : 'Token inválido!'
        return res.status(401).json({ message })
    }

    try {
        // confere no banco: usuário excluído perde o acesso e o perfil (ADMIN/CLIENTE) é sempre o atual
        const usuario = await Usuario.findByPk(payload.codUsuario, { attributes: ['codUsuario', 'tipo_usuario'] })
        if (!usuario) {
            return res.status(401).json({ message: 'Usuário do token não existe mais!' })
        }
        req.usuario = { codUsuario: usuario.codUsuario, tipo_usuario: usuario.tipo_usuario }
        next()
    } catch (err) {
        console.error('Erro ao validar o token', err)
        res.status(500).json({ message: 'Erro ao validar o token' })
    }
}

// Usar SEMPRE depois de "autenticar"
const apenasAdmin = (req, res, next) => {
    if (!req.usuario || req.usuario.tipo_usuario !== 'ADMIN') {
        return res.status(403).json({ message: 'Acesso restrito a administradores!' })
    }
    next()
}

module.exports = { autenticar, apenasAdmin }
