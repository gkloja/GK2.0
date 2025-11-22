import express from "express";
import path from "path";
import fs from "fs";
import axios from 'axios';
import fetch from 'node-fetch'; // caso esteja usando Node 18+ pode remover e usar o fetch nativo
import multer from "multer";
import session from "express-session";
import flash from "connect-flash";
import bodyParser from "body-parser";
import { fileURLToPath } from "url";
import cookieParser from 'cookie-parser'
import FileStoreFactory from "session-file-store";
import cors from "cors";
const FileStore = FileStoreFactory(session);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

/* ---------- CONFIGURAÇÕES BÁSICAS ---------- */
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors({
  origin: "*",      // permite qualquer domínio acessar
  methods: "GET,POST",
  allowedHeaders: "Content-Type"
}));
app.use(express.json());









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
app.post('/play', async (req, res) => {
  const { query, userId, User } = req.body;

  if (!userId || (userId !== "https://whatsapp.com/channel/0029VatppnH4o7qSzKKm0X3x" && userId !== "site")) {
    return res.status(400).json({ message: '⚠️  ID do usuário errado, use https://whatsapp.com/channel/0029VatppnH4o7qSzKKm0X3x  obrigatórios.' });
  }
  if (!query) return res.status(400).json({ message: `⚠️ *Erro!* Você não informou o nome da música.` });
  if (!User) return res.status(400).json({ message: `*A Api Atualizou* \n> Entre em contato: +55 21 98904-7220` });

  // Pegar IP do cliente
  const userIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip;

  // Horário de Brasília
  const dataHora = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

  // Função para salvar logs
  const salvarLog = () => {
  const novoLog = { query, userId, User, horario: dataHora };

  let logs = {};
  if (fs.existsSync(logPath)) {
    logs = JSON.parse(fs.readFileSync(logPath, 'utf8'));
  }

  // Se não existir ainda a chave do IP, cria uma lista
  if (!logs[userIP]) {
    logs[userIP] = [];
  }

  // Adiciona o novo log à lista do IP
  logs[userIP].push(novoLog);

  // Salva o arquivo novamente
  fs.writeFileSync(logPath, JSON.stringify(logs, null, 2), 'utf8');
  console.log(`📄 Log salvo para IP ${userIP}:`, novoLog);
};

  salvarLog();

  if (!global.activeUsers) global.activeUsers = new Set();
  if (!global.activeUsers2) global.activeUsers2 = new Set();

  if (global.activeUsers.has(User)) {
    return res.status(429).json({ message: `⏳ *Calma, DJ!* \n> Espere um pouco antes de pedir outra música.` + '\n`https://whatsapp.com/channel/0029VatppnH4o7qSzKKm0X3x/2126`' });
  }

  global.activeUsers2.delete(User);
  global.activeUsers.add(User);


  const tempoInicio = Date.now();

  try {
    const API_KEYS = [
"Yuki"
    ]




// Função para buscar vídeo no YouTube
const searchYouTube = async (query) => {
  console.log("🔍 Iniciando busca no YouTube:", query);

  // 1️⃣ Bronxy
  for (const key of API_KEYS) {
    try {
      console.log(`- Testando Bronxy com key: ${key}`);
      const res = await axios.get(`https://api.bronxyshost.com.br/api-bronxys/pesquisa_ytb?nome=${encodeURIComponent(query)}&apikey=${key}`);
      const data = res.data;
      if (Array.isArray(data) && data.length > 0 && data[0].url) {
        const result = data[0];
        console.log(`✅ Bronxy encontrou: ${result.titulo}`);
        return {
          url: result.url,
          image: result.thumb || "",
          title: result.titulo,
          desc: result.desc || "",
          tempo: result.tempo || "0:00",
          fonte: "Bronxy"
        };
      }
    } catch (err) {
      console.warn(`⚠️ Bronxy erro com key ${key}: ${err.message}`);
    }
  }

// 2️⃣ NexFuture
try {
  console.log("- Testando NexFuture");

  const apiKey = 'a48a2450-a134-4e7d-8203-10f1f1725d81';
  const nexRes = await axios.get('https://api.nexfuture.com.br/api/downloads/play', {
    params: {
      query: query,
      apikey: apiKey
    }
  });

  const result = nexRes.data.result;

  if (nexRes.data.status && result?.video?.url) {
    console.log(`✅ NexFuture encontrou: ${result.video.title}`);
    return {
      url: result.video.url,
      title: result.video.title,
      image: result.video.thumbnails?.[1]?.url || result.video.thumbnails?.[0]?.url || "",
      desc: result.video.description || "",
      tempo: result.video.duration || "0:00",
      views: result.video.views || "",
      canal: result.channel?.name || "",
      audio: result.downloads?.audio?.config || result.downloads?.audio?.any4k || "",
      videoDownload: result.downloads?.video?.config || result.downloads?.video?.any4k || "",
      fonte: "NexFuture"
    };
  }

  console.warn("⚠️ NexFuture retornou resultado inválido.");
} catch (err) {
  console.warn(`⚠️ NexFuture erro: ${err.response?.data?.mensagem || err.message}`);
}

  // 3️⃣ Anomaki
  try {
    console.log("- Testando Anomaki");
    const anoRes = await axios.get(`https://www.apis-anomaki.zone.id/search/ytsearch?query=${encodeURIComponent(query)}`);
    const vid = anoRes.data.result?.videos?.[0];
    if (anoRes.data.status && vid?.url) {
      console.log(`✅ Anomaki encontrou: ${vid.title}`);
      return {
        url: vid.url,
        image: vid.thumbnail || "",
        title: vid.title,
        desc: vid.author?.url || "",
        tempo: vid.duration || "0:00",
        fonte: "Anomaki"
      };
    }
    console.warn("⚠️ Anomaki retornou resultado inválido.");
  } catch (err) {
    console.warn(`⚠️ Anomaki erro: ${err.message}`);
  }

  // 4️⃣ NekoLabs
  try {
    console.log("- Testando NekoLabs");
    const nekoRes = await axios.get(`https://api.nekolabs.my.id/downloader/youtube/play/v1?q=${encodeURIComponent(query)}`);
    const data = nekoRes.data?.result;
    if (nekoRes.data?.success && data?.metadata?.url) {
      console.log(`✅ NekoLabs encontrou: ${data.metadata.title}`);
      return {
        url: data.metadata.url,
        image: data.metadata.cover || "",
        title: data.metadata.title,
        desc: data.metadata.channel || "",
        tempo: data.metadata.duration || "0:00",
        fonte: "NekoLabs"
      };
    }
    console.warn("⚠️ NekoLabs retornou resultado inválido.");
  } catch (err) {
    console.warn(`⚠️ NekoLabs erro: ${err.message}`);
  }

  throw new Error("❌ Nenhuma API conseguiu fornecer resultados para essa pesquisa.");
};
    const videoData = await searchYouTube(query);
    console.log("📌 Vídeo selecionado:", videoData.title, videoData.url);


// 🔹 Função principal para tentar baixar áudio de várias APIs
const sendAudio = async (url, apiName, needsDownloadLink = false) => {
  try {
    console.log(`🔗 Testando download com API: ${apiName}`);
    const response = await fetch(url);

    // Verifica se a resposta é JSON antes de tratar como áudio binário
    const contentType = response.headers.get("content-type") || "";

    // Se for JSON, converte direto — evita corromper o texto com Buffer.toString()
    const responseText = contentType.includes("application/json")
      ? await response.text()
      : Buffer.from(await response.arrayBuffer()).toString();

    if (
      responseText.includes("LIMITE DE REQUEST EXCEDIDO") ||
      responseText.includes("apikey") ||
      responseText.includes("expirou")
    ) {
      console.warn(`⚠️ API ${apiName} retornou limite ou key inválida.`);
      return null;
    }

    let audioUrl = url;

    if (needsDownloadLink) {
      try {
        const jsonResponse = JSON.parse(responseText);

        // Alguns retornam "statusCode", outros "success" — cobrir ambos
        if (
          jsonResponse.success === false ||
          jsonResponse.status === false ||
          jsonResponse.statusCode >= 400
        ) return null;

        // Tentativa de extrair o link de download de várias estruturas conhecidas
        audioUrl =
          jsonResponse.download?.url ||
          jsonResponse.download?.downloadLink ||
          jsonResponse.download_url ||
          jsonResponse.data?.download_url || // ✅ ZenzzXD v2
          jsonResponse.resultado?.result?.downloads?.audio?.config ||
          jsonResponse.result?.downloadUrl ||
          jsonResponse.result?.url ||
          jsonResponse.resultado?.audio ||
          jsonResponse.audio_url ||
          jsonResponse.link ||
          null;

        if (!audioUrl || !/^https?:\/\//i.test(audioUrl)) {
          console.warn(`⚠️ Link inválido retornado por ${apiName}:`, audioUrl);
          return null;
        }
      } catch (err) {
        console.warn(`❌ Erro ao extrair link de download (${apiName}): ${err.message}`);
        return null;
      }
    }

    if (!/^https?:\/\//i.test(audioUrl)) {
      console.error(`❌ Erro na API ${apiName}: Only absolute URLs are supported`);
      return null;
    }

    // 🔹 Faz o download real do áudio
    const audioResponse = await fetch(audioUrl);
    const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());

    if (audioBuffer.length < 800000) {
      console.warn(`⚠️ Áudio muito pequeno (${audioBuffer.length} bytes), descartando.`);
      return null;
    }

    return { downloadLink: audioUrl, apiName };
  } catch (err) {
    console.error(`❌ Erro na API ${apiName}: ${err.message}`);
    return null;
  }
};

// 🔹 Todas as APIs, incluindo o novo YTMP3.cx (ZenzzXD)


const apiKey7 = "a48a2450-a134-4e7d-8203-10f1f1725d81";

const apis = [
  { 
    url: (v) => `https://api.nekolabs.my.id/downloader/youtube/v1?url=${encodeURIComponent(v)}&format=mp3`, 
    name: "NekoLabs", 
    needsDownloadLink: true 
  },
  { 
    url: (v) => `https://api.nexfuture.com.br/api/downloads/youtube/mp3/v3?url=${encodeURIComponent(v)}&apikey=${apiKey7}`, 
    name: "NexFuture V3", 
    needsDownloadLink: true 
  },
  {
    url: (v) => `https://hobsidian.shop/api/downloads/youtubemp3?apikey=daa0da72-6d58-4cd4-9cef-ac355dc4d8dc&query=${encodeURIComponent(v)}`,
    name: "Hobsidian",
    needsDownloadLink: true
  },
  { 
    url: (v) => `https://api.nexfuture.com.br/api/downloads/youtube/playaudio/v2?query=${encodeURIComponent(v)}&apikey=${apiKey7}`, 
    name: "NexFuture V2", 
    needsDownloadLink: true 
  },
  // 🔹 NexFuture Play-Audio (testada com curl)
  { 
    url: (v) => `https://api.nexfuture.com.br/api/downloads/play-audio?apikey=${apiKey7}&query=${encodeURIComponent(v)}`, 
    name: "NexFuture Play-Audio", 
    needsDownloadLink: true 
  },
  // 🔹 NexFuture Play-APIYT-MP3
  { 
    url: (v) => `https://api.nexfuture.com.br/api/downloads/play-apiyt-mp3?apikey=${apiKey7}&url=${encodeURIComponent(v)}`, 
    name: "NexFuture Play-APIYT-MP3", 
    needsDownloadLink: true 
  },
  // 🔹 Nova: NexFuture Play-Vreden-MP3
  { 
    url: (v) => `https://api.nexfuture.com.br/api/downloads/play-vreden-mp3?apikey=${apiKey7}&query=${encodeURIComponent(v)}`, 
    name: "NexFuture Play-Vreden-MP3", 
    needsDownloadLink: true 
  },
  { 
    url: (v) => `https://api.bronxyshost.com.br/api-bronxys/play?nome_url=${encodeURIComponent(v)}&apikey=Yuki`, 
    name: "Bronxy 1", 
    needsDownloadLink: false 
  },
  { 
    url: (v) => `https://www.apis-anomaki.zone.id/downloader/yta?url=${encodeURIComponent(v)}`, 
    name: "Anomaki Audio", 
    needsDownloadLink: true 
  },
  { 
    url: (v) => `https://gl-api.shop/api/play?query=${encodeURIComponent(v)}&apikey=FabiOfc`, 
    name: "GL API", 
    needsDownloadLink: true 
  },
  // 🔹 Nova API ZenzzXD (versão v2 atualizada)
  { 
    url: (v) => `https://api.zenzxz.my.id/api/downloader/ytmp3v2?url=${encodeURIComponent(v)}`, 
    name: "ZenzzXD v2", 
    needsDownloadLink: true 
  }
];




// Marca o tempo de início
const tempoInicio = Date.now();

const promises = apis.map(api => {
  // Se a API tiver função custom(), usa ela
  if (typeof api.custom === 'function') {
    return api.custom(videoData.url)
      .then(r => r ? r : Promise.reject(api.name))
      .finally(() => console.log(`${api.name} processado`));
  }

  // Se tiver função url(), usa o sendAudio normal
  if (typeof api.url === 'function') {
    return sendAudio(api.url(videoData.url), api.name, api.needsDownloadLink)
      .then(r => r ? r : Promise.reject(api.name))
      .finally(() => console.log(`${api.name} processado`));
  }

  // Se o objeto estiver mal configurado, ignora e registra
  console.warn(`⚠️ API "${api.name}" ignorada (sem url/custom válido).`);
  return Promise.reject(api.name);
});

let resultadoFinal = null;

try {
  // Promise.any retorna a primeira API que conseguir o áudio
  resultadoFinal = await Promise.any(promises);
  console.log(`✅ Sucesso com ${resultadoFinal.apiName}`);
} catch (error) {
  console.error("❌ Nenhuma API conseguiu baixar o áudio.");
}

// Calcula o tempo total
const tempoFinal = ((Date.now() - tempoInicio) / 1000).toFixed(2);

if (resultadoFinal) {
  console.log(`✅ Música pronta via ${resultadoFinal.apiName}, tempo total: ${tempoFinal}s`);
  
  return res.json({
    download: resultadoFinal.downloadLink,
    thumb: videoData.image,
    title: videoData.title,
    duracao: tempoFinal,
    fonte: resultadoFinal.apiName,
    tempo: tempoFinal
  });
} else {
  return res.status(500).json({ error: "Nenhuma API conseguiu baixar o áudio." });
}

   /* const tempoFinal = ((Date.now() - tempoInicio) / 1000).toFixed(2);
    console.log(`✅ Música pronta via ${resultadoFinal.apiName}, tempo total: ${tempoFinal}s`);

    return res.json({
      download: resultadoFinal.downloadLink,
      thumb: videoData.image,
      title: videoData.title,
      duracao: tempoFinal,
      fonte: resultadoFinal.apiName,
      tempo: tempoFinal
    });
*/
  } catch (err) {
    console.error("❌ Erro geral no /play:", err);
    return res.status(500).json({ erro: `💥 *Opa! Algo deu errado...* ${err.message}` });
  } finally {
    global.activeUsers.delete(User);
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