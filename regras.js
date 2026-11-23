require('dotenv').config({ quiet: true })

const secret = process.env.JWT_SECRET
if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('Defina a variável JWT_SECRET no ambiente de produção!')
}

module.exports = {
    jwt: {
        secret: secret || 'segredo-apenas-para-desenvolvimento',
        expiresIn: process.env.JWT_EXPIRES_IN || '2h'
    },
    bcryptRounds: 10,

    // ---- REGRAS DE NEGÓCIO (ajuste conforme o professor/P.O. definir) ----
    // O PDF cita "regras de desconto nas compras" mas não detalha os valores.
    // Desconto por quantidade total de unidades no pedido (ordem DECRESCENTE de minUnidades).
    descontos: [
        { minUnidades: 10, percentual: 10 },
        { minUnidades: 5, percentual: 5 }
    ],
    // Frete fixo, grátis quando o subtotal (já com desconto) atinge o valor abaixo
    frete: { valorFixo: 25.0, gratisAcimaDe: 500.0 },
    // Prazo estimado de entrega (dias corridos a partir da data do pedido)
    prazoEntregaDias: 7
}
