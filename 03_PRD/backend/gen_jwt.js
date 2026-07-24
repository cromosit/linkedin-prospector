// gen_jwt.js – gera um token JWT para testes no LinkedIn Prospector
// ---------------------------------------------------------------
// Este script lê o JWT_SECRET do .env e cria um token assinado
// contendo o "userId" de um usuário existente (ex.: admin).
// Substitua o valor de USER_ID pelo ID real de um usuário em auth.users.
// ---------------------------------------------------------------
require('dotenv').config();
const jwt = require('jsonwebtoken');

// ---------------------------------------------------------------
// 1️⃣ Defina o ID do usuário que receberá o token.
// Copie o "id" de um registro da tabela auth.users no Supabase.
// ---------------------------------------------------------------
const USER_ID = "00000000-0000-0000-0000-000000000000"; // <--- troque aqui

if (!process.env.JWT_SECRET) {
  console.error('⚠️  JWT_SECRET não encontrado no .env');
  process.exit(1);
}

// ---------------------------------------------------------------
// 2️⃣ Cria o token (válido por 1 hora).
// ---------------------------------------------------------------
const token = jwt.sign(
  { userId: USER_ID },          // payload
  process.env.JWT_SECRET,       // secret
  { expiresIn: '1h' }           // expiração
);

console.log('🔐 JWT:', token);
