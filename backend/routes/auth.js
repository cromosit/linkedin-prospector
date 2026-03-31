const express = require('express');
const router = express.Router();
const axios = require('axios');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');

// ==========================================
// ROTA 1: Iniciar login com LinkedIn
// ==========================================
router.get('/linkedin', (req, res) => {
  const linkedinAuthUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
  linkedinAuthUrl.searchParams.set('response_type', 'code');
  linkedinAuthUrl.searchParams.set('client_id', process.env.LINKEDIN_CLIENT_ID);
  linkedinAuthUrl.searchParams.set('redirect_uri', process.env.LINKEDIN_REDIRECT_URI);
  linkedinAuthUrl.searchParams.set('scope', 'openid profile email');
  const state = Math.random().toString(36).substring(7);
  linkedinAuthUrl.searchParams.set('state', state);
  res.redirect(linkedinAuthUrl.toString());
});

// ==========================================
// ROTA 2: Callback — LinkedIn retorna aqui após autorização
// ==========================================
router.get('/linkedin/callback', async (req, res) => {
  const { code, error } = req.query;

  // .trim() evita caracteres invisíveis vindos do Railway no FRONTEND_URL
  const frontendUrl = (process.env.FRONTEND_URL || '').trim();
  console.log('🔐 Callback LinkedIn. FRONTEND_URL:', JSON.stringify(frontendUrl));

  if (error) {
    return res.redirect(`${frontendUrl}?erro=acesso_negado`);
  }

  try {
    // PASSO 1: Troca código por token
    console.log('🔄 Passo 1: trocando código pelo token do LinkedIn...');
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
    console.log('✅ Passo 1: token obtido');

    // PASSO 2: Busca perfil
    console.log('🔄 Passo 2: buscando perfil LinkedIn...');
    const profileResponse = await axios.get('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    const profile = profileResponse.data;
    console.log('✅ Passo 2: perfil obtido -', profile.name);

    // PASSO 3: Salva usuário no Supabase
    console.log('🔄 Passo 3: salvando usuário no Supabase...');
    const { data: user, error: dbError } = await supabase
      .from('users')
      .upsert({
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

    if (dbError) {
      console.error('❌ Passo 3 — erro Supabase users:', JSON.stringify(dbError));
      throw dbError;
    }
    console.log('✅ Passo 3: usuário salvo, ID:', user.id);

    // PASSO 4: Salva como lead
    console.log('🔄 Passo 4: salvando lead...');
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
        temperature: 'quente',
        updated_at: new Date().toISOString()
      }, { onConflict: 'linkedin_id' });
    console.log('✅ Passo 4: lead salvo');

    // PASSO 5: Gera JWT
    const sessionToken = jwt.sign(
      { userId: user.id, linkedinId: profile.sub, name: profile.name, email: profile.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // PASSO 6: Redireciona para o frontend
    const redirectUrl = `${frontendUrl}/auth/sucesso?token=${sessionToken}`;
    console.log('✅ Login completo! Redirecionando para:', redirectUrl.substring(0, 80) + '...');
    res.redirect(redirectUrl);

  } catch (err) {
    console.error('❌ Erro no callback LinkedIn:', err.message);
    console.error('❌ Causa:', err.cause || err.stack);
    res.redirect(`${frontendUrl}?erro=falha_autenticacao`);
  }
});

// ==========================================
// ROTA 3: Retorna dados do usuário logado
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
