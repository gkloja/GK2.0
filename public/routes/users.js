const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { site_nome } = require('../settings');

// Caminho correto do arquivo de registro de usuários


// Middleware para verificar se o usuário está autenticado
function notAuthenticated(req, res, next) {
    if (req.session && req.session.user) {
        return res.redirect('/'); // Se estiver autenticado, redireciona
    }
    next(); // Se não estiver autenticado, continua
}

// Página de login
router.get('/login', notAuthenticated, (req, res) => {
    res.render('login', {
        nome_site: site_nome
    });
});

// Processo de login



const moment = require('moment-timezone'); // Certifique-se de que o pacote moment-timezone está instalado

// Caminho para o arquivo de registro e de acessos
const filePathAcessos = path.join(__dirname, '..', 'public', 'acessos2.json');
const filePathr = path.join(__dirname, '..', 'public', 'registro.json');

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Verifica se o arquivo de registro existe
        if (!fs.existsSync(filePathr)) {
            // Cria o arquivo com um array vazio se não existir
            fs.writeFileSync(filePathr, JSON.stringify([]));
            console.log('Arquivo registro.json criado!');
            return res.render('login', {
                error_msg: 'Nenhum usuário registrado ainda!',
                nome_site: site_nome
            });
        }

        // Carrega os registros do arquivo JSON
        let registros;
        try {
            registros = JSON.parse(fs.readFileSync(filePathr, 'utf8'));
            console.log('Dados carregados do arquivo:', registros); // Verifique os dados carregados
        } catch (error) {
            console.log('Erro ao ler ou analisar o arquivo JSON:', error);
            return res.render('login', {
                error_msg: 'Erro ao processar o arquivo de registro.',
                nome_site: site_nome
            });
        }

        // Verifica se o usuário existe e a senha está correta
        let usuario = registros.find(user => 
            user.nome.trim().toLowerCase() === username.trim().toLowerCase() && 
            user.id.trim() === password.trim()
        );

        if (usuario) {
            // Salva os dados do usuário na sessão
            req.session.user = {
                nome: usuario.nome,
                numero: usuario.numero,
                grupo: usuario.grupo,
                dinheiro: usuario.dinheiro,
                id: usuario.id
            };

            req.flash('success_msg', 'Login bem-sucedido!');

            // REGISTRO DE ACESSO
            const horario = moment.tz('America/Sao_Paulo').format('HH:mm:ss');
            const data = moment.tz('America/Sao_Paulo').format('DD/MM/YYYY');

            const novoAcesso = {
                nome: usuario.nome,
                senha: usuario.id, // Senha (ID)
                data,
                horario
            };

            // Verifica se o arquivo de acessos já existe
            fs.readFile(filePathAcessos, 'utf8', (err, data) => {
                if (err) {
                    console.error('Erro ao ler acessos2.json:', err);
                    return res.status(500).send('Erro ao processar o acesso.');
                }

                let acessos = [];
                if (data.trim()) {  // Se o arquivo não estiver vazio
                    try {
                        acessos = JSON.parse(data);
                        if (!Array.isArray(acessos)) acessos = []; // Se for um objeto `{}`, redefine como array
                    } catch (error) {
                        console.error('Erro ao analisar JSON:', error);
                        acessos = []; // Se houver erro, inicializa como array vazio
                    }
                }

                // Adiciona o novo acesso ao array de acessos
                acessos.push(novoAcesso);

                // Salva os acessos atualizados no arquivo
                fs.writeFile(filePathAcessos, JSON.stringify(acessos, null, 2), (err) => {
                    if (err) {
                        console.error('Erro ao salvar acessos2.json:', err);
                        return res.status(500).send('Erro ao processar o acesso.');
                    }

                    console.log('Acesso registrado:', novoAcesso);
                    return res.redirect('/');
                });
            });
        } else {
            console.log('Usuário ou senha inválidos');
            return res.render('login', {
                error_msg: 'Nome de usuário ou senha inválidos!',
                nome_site: site_nome
            });
        }
    } catch (err) {
        console.log('Erro ao processar login:', err);
        return res.render('login', {
            error_msg: 'Erro ao processar login!',
            nome_site: site_nome
        });
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.log('Erro ao deslogar:', err);
            return res.redirect('/'); // Redireciona para a página principal se houver erro
        }
        res.redirect('/login'); // Redireciona para a página de login após deslogar
    });
});

module.exports = router;