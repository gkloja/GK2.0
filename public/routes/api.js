const express = require('express');
const router = express.Router();
const { cekKey } = require('../database/db'); 

router.get('/json-no-text', async (req, res) => {
var apikey = req.query.apikey;
if (apikey === undefined) return res.status(404).send({
status: 404,
mensagem: `faltou a apikey`
});
const check = await cekKey(apikey);
if (!check) return res.status(403).send({
status: 403,
message: `apikey ${apikey} não é válida, crie seu registro em nossa plataforma!`
})
res.send({
status: true,
resultado: "funcionou ✓"
})
})

router.get('/json', async (req, res) => {
var apikey = req.query.apikey;
var texto = req.query.apikey;
if (apikey === undefined) return res.status(404).send({
status: 404,
mensagem: `faltou a apikey`
});

if (texto === undefined) return res.status(404).send({
status: 404,
mensagem: `faltou colocar o texto`
});
const check = await cekKey(apikey);
if (!check) return res.status(403).send({
status: 403,
message: `apikey ${apikey} não é válida, crie seu registro em nossa plataforma!`
})
res.send({
status: true,
texto: texto,
resultado: "funcionou ✓"
})
})

module.exports = router;
