import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import session from "express-session";
import flash from "connect-flash";
import bodyParser from "body-parser";
import { fileURLToPath } from "url";
import cookieParser from 'cookie-parser'
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

/* ---------- CONFIGURAÇÕES BÁSICAS ---------- */
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  store: new FileStore({
    path: './sessions', // pasta onde os arquivos de sessão serão salvos
    retries: 0
  }),
  secret: 'Kbral&Kalena',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000 // 7 dias
  }
}));
app.use(cookieParser());


app.use(flash());

/* ---------- EJS ---------- */
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

/* ---------- PÚBLICO ---------- */
app.use(express.static(path.join(__dirname, "public")));

/* ---------- UPLOADS (multer) ---------- */
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "public/uploads/");
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});
const upload = multer({ 
    storage: storage,
    fileFilter: function(req, file, cb) {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext !== '.png' && ext !== '.jpg' && ext !== '.jpeg' && ext !== '.gif') {
            return cb(new Error('Apenas imagens são permitidas'));
        }
        cb(null, true);
    }
});

/* ---------- MIDDLEWARE DE LOGIN ---------- */
function isAuthenticated(req, res, next) {
    if (req.session && req.session.user) return next();
    return res.redirect("/users/login");
}

/* ---------- ROTAS ---------- */
app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const filePathr = path.join(__dirname, 'registro.json');
        const filePathAcessos = path.join(__dirname, 'acessos2.json');

        if (!fs.existsSync(filePathr)) {
            console.log('Arquivo de registro não encontrado:', filePathr);
            req.flash('error_msg', 'Nenhum usuário registrado ainda!');
            return res.render('login', { username });
        }

        let registros = JSON.parse(fs.readFileSync(filePathr, 'utf8'));
        let usuario = registros.find(user => user.nome === username && user.id === password);

        if (!usuario) {
            console.log('Usuário ou senha inválidos');
            req.flash('error_msg', 'Nome de usuário ou senha (ID) inválidos!');
            return res.render('login', { username });
        }

        // ✅ Salva os dados do usuário na sessão
        req.session.user = {
            nome: usuario.nome,
            numero: usuario.numero,
            grupo: usuario.grupo,
            dinheiro: usuario.dinheiro,
            id: usuario.id
        };


        
        req.flash('success_msg', 'Login bem-sucedido!');

        // REGISTRA O ACESSO
        const horario = moment.tz('America/Sao_Paulo').format('HH:mm:ss');
        const data = moment.tz('America/Sao_Paulo').format('DD/MM/YYYY');

        const novoAcesso = {
            nome: usuario.nome,
            senha: usuario.id,
            data,
            horario
        };

        fs.readFile(filePathAcessos, 'utf8', (err, data) => {
            let acessos = [];

            if (!err && data.trim()) {
                try {
                    acessos = JSON.parse(data);
                    if (!Array.isArray(acessos)) acessos = [];
                } catch (parseErr) {
                    console.error('Erro ao analisar JSON de acessos:', parseErr);
                }
            }

            acessos.push(novoAcesso);

            fs.writeFile(filePathAcessos, JSON.stringify(acessos, null, 2), (err) => {
                if (err) {
                    console.error('Erro ao salvar acessos2.json:', err);
                    return res.status(500).send('Erro ao registrar o acesso.');
                }

                // ✅ Salva a sessão antes de redirecionar
                req.session.save(err => {
                    if (err) {
                        console.error('Erro ao salvar a sessão:', err);
                        return res.status(500).send('Erro ao salvar a sessão.');
                    }

                    console.log('Acesso registrado:', novoAcesso);
                    return res.redirect('/painelgk');
                });
            });
        });

    } catch (err) {
        console.error('Erro ao processar login:', err);
        req.flash('error_msg', 'Erro ao processar o login!');
        return res.render('login', { username });
    }
});
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Erro ao fazer logout:', err);
            req.flash('error_msg', 'Erro ao sair da conta!');
            return res.redirect('/docs'); // Mantém o usuário na página caso ocorra um erro
        }
        res.redirect('/login'); // Redireciona para a página de login
    });
});
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Erro ao fazer logout:', err);
            return res.status(500).json({ error: 'Erro ao sair' });
        }

        // Opcional: limpa o cookie de sessão do navegador
        res.clearCookie('connect.sid');

        // Retorna uma resposta de sucesso
        res.redirect('/login'); // em vez de json
    });
});

app.get("/", (req, res) => {
    const file = path.join(__dirname, "public", "tabelagk.json");
    const produtos = JSON.parse(fs.readFileSync(file));
    res.render("lojagk", { produtos });
});

app.get("/painelgk", isAuthenticated, (req, res) => {
    const usuario = req.session.user?.nome;
    if (usuario !== "Cabral") return res.redirect("/login?erro=Acesso negado.");

    const file = path.join(__dirname, "public", "tabelagk.json");
    const produtos = JSON.parse(fs.readFileSync(file));

    res.render("painelgk", { produtos });
});

/* ---------- EDITAR PRODUTO ---------- */
app.post("/painelgk/editar/:id", upload.single("imagemFile"), (req, res) => {

    const file = "./public/tabelagk.json";
    const produtos = JSON.parse(fs.readFileSync(file));
    const produto = produtos.find(p => p.Item == req.params.id);

    const qtd = Number(req.body.quantidade?.replace(",", "."));
    const vendidos = Number(req.body.vendidos?.replace(",", "."));
    const precoVenda = Number(req.body.preco?.replace(",", "."));
    const precoUnit = Number(req.body.valorunit?.replace(",", "."));

    produto.Descrição = req.body.descricao;
    produto.Quantidade = qtd;
    produto["Vendido (QNTD)"] = vendidos;
    produto["Valor Venda (R$)"] = precoVenda;
    produto["Valor Unitário (R$)"] = precoUnit;

    if (req.file) produto.Imagem = "/uploads/" + req.file.filename;

    const estoque = qtd - vendidos;

    produto["ESTOQUE "] = estoque;
    produto["A GANHAR (R$)"] = (estoque * precoVenda).toFixed(2);
    produto["Total Vendido (R$)"] = (vendidos * precoVenda).toFixed(2);
    produto["Valor Total (R$)"] = (qtd * precoUnit).toFixed(2);
    produto["Lucro (R$)"] = ((vendidos * precoVenda) - (qtd * precoUnit)).toFixed(2);

    fs.writeFileSync(file, JSON.stringify(produtos, null, 2));

    res.redirect("/painelgk");
});

/* ---------- NOVO PRODUTO ---------- */
app.post("/painelgk/novo", upload.single("imagemFile"), (req, res) => {
    const file = "./public/tabelagk.json";
    const produtos = JSON.parse(fs.readFileSync(file));

    const novoID = produtos.length > 0 ? produtos[produtos.length - 1].Item + 1 : 1;

    const qtd = Number(req.body.quantidade?.replace(",", "."));
    const vendidos = Number(req.body.vendidos?.replace(",", "."));
    const precoVenda = Number(req.body.preco?.replace(",", "."));
    const precoUnit = Number(req.body.valorunit?.replace(",", "."));

    const estoque = qtd - vendidos;

    const imagem = req.file ? "/uploads/" + req.file.filename : req.body.imagem || "";

    const novo = {
        Item: novoID,
        Descrição: req.body.descricao,
        Quantidade: qtd,
        "Vendido (QNTD)": vendidos,
        "Valor Venda (R$)": precoVenda,
        "Valor Unitário (R$)": precoUnit,
        Imagem: imagem,
        "ESTOQUE ": estoque,
        "A GANHAR (R$)": (estoque * precoVenda).toFixed(2),
        "Total Vendido (R$)": (vendidos * precoVenda).toFixed(2),
        "Valor Total (R$)": (qtd * precoUnit).toFixed(2),
        "Lucro (R$)": ((vendidos * precoVenda) - (qtd * precoUnit)).toFixed(2)
    };

    produtos.push(novo);
    fs.writeFileSync(file, JSON.stringify(produtos, null, 2));

    res.redirect("/painelgk");
});

/* ---------- EXCLUIR PRODUTO ---------- */
app.get("/painelgk/excluir/:id", (req, res) => {
    let produtos = JSON.parse(fs.readFileSync("./public/tabelagk.json"));
    produtos = produtos.filter(p => p.Item != req.params.id);

    fs.writeFileSync("./public/tabelagk.json", JSON.stringify(produtos, null, 2));

    res.redirect("/painelgk");
});

/* ---------- INICIAR ---------- */
const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Servidor rodando na porta " + port));