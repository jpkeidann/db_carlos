const { Obra , Material , Movimento , Funcionario } = require('./models/rel')
const conn = require('./db/conn')

async function syncDatabase() {
    try {
        console.log('Realizando a conexão com o banco...')
        await conn.sync({force: true})
    } catch (err) {
        console.error('Houve um problema ao se conectar com o banco!',err)
    }finally{
        console.log('Fechando a conexão com o banco...')
        await conn.close()
    }
}

syncDatabase()