const express = require('express');
const router = express.Router();
const axios = require('axios');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');

// ==========================================
// ROTA 1: Iniciar login com LinkedIn
// Quando o usuário clica em "Entrar com LinkedIn", 
// ele é redirecionado para esta URL
// ==========================================
router.get('/linkedin', (req, res) => {
  
  // Monta a URL de autorização do LinkedIn
  // É aqui que o LinkedIn pergunta ao usuário se ele quer compartilhar dados
  const linkedinAuthUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
  
  linkedinAuthUrl.searchParams.set('response_type', 'code');
  linkedinAuthUrl.searchParams.set('client_id', process.env.LINKEDIN_CLIENT_ID);
  linkedinAuthUrl.searchParams.set('redirect_uri', process.env.LINKEDIN_REDIRECT_URI);
  
  // Scopes = permissões que você está pedindo ao usuário
  // openid, profile, email = dados básicos do perfil
  linkedinAuthUrl.searchParams.set('scope', 'openid profile email');
  
  // State = código de segurança para evitar ataques
  const state = Math.random().toString(36).substring(7);
  linkedinAuthUrl.searchParams.set('state', state);

  // Redireciona o usuário para o LinkedIn
  res.redirect(linkedinAuthUrl.toString());
});

// ==========================================
// ROTA 2: Callback — LinkedIn retorna aqui após autorização
// O LinkedIn redireciona o usuário de volta para cá
// trazendo um "código de autorização" temporário
// ==========================================
router.get('/linkedin/callback', async (req, res) => {
  const { code, error } = req.query;

  // Se o usuário negou o acesso
  if (error) {
    return res.redirect(`${process.env.FRONTEND_URL}?erro=acesso_negado`);
  }

  try {
    // PASSO 1: Troca o código temporário por um token de acesso real
    // Token de acesso = a "chave" que permite buscar dados do LinkedIn
    const tokenResponse = await axios.post(
      'https://www.linkedin.com/oauth/v2/accessToken',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: process.env.LINKEDIN_REDIRECT_URI,
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const { access_token } = tokenResponse.data;

    // PASSO 2: Usa o token para buscar os dados do perfil
    const profileResponse = await axios.get('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const profile = profileResponse.data;
    // profile contém: sub (ID), name, email, picture, headline

    // PASSO 3: Salva ou atualiza o usuário no banco de dados
    const { data: user, error: dbError } = await supabase
      .from('users')
      .upsert({ // upsert = insere se não existe, atualiza se já existe
        linkedin_id: profile.sub,
        name: profile.name,
        email: profile.email || null,
        headline: profile.headline || null,
        profile_picture: profile.picture || null,
        access_token: access_token,
        updated_at: new Date().toISOString()
      }, { onConflict: 'linkedin_id' })
      .select()
      .single();

    if (dbError) throw dbError;

    // PASSO 4: Também salva como LEAD (pessoa inbound que veio até você)
    await supabase
      .from('leads')
      .upsert({
        linkedin_id: profile.sub,
        name: profile.name,
        email: profile.email || null,
        headline: profile.headline || null,
        profile_picture: profile.picture || null,
        source: 'linkedin_login',
        status: 'novo',
        temperature: 'quente', // Quem faz login está interessado = quente
        updated_at: new Date().toISOString()
      }, { onConflict: 'linkedin_id' });

    // PASSO 5: Gera o JWT (token de sessão do SEU sistema)
    // Este é o token que o frontend vai usar para se autenticar
    const sessionToken = jwt.sign(
      {
        userId: user.id,
        linkedinId: profile.sub,
        name: profile.name,
        email: profile.email
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' } // Expira em 7 dias
    );

    // PASSO 6: Redireciona para o frontend com o token
    res.redirect(`${process.env.FRONTEND_URL}/auth/sucesso?token=${sessionToken}`);

  } catch (err) {
    console.error('Erro no callback LinkedIn:', err.message);
    res.redirect(`${process.env.FRONTEND_URL}?erro=falha_autenticacao`);
  }
});

// ==========================================
// ROTA 3: Retorna dados do usuário logado
// O frontend chama esta rota para saber quem está logado
// ==========================================
router.get('/me', require('../middleware/auth'), async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, headline, profile_picture, created_at')
      .eq('id', req.user.userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
