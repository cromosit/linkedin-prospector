require('dotenv').config();
const supabase = require('./config/supabase');
const crypto = require('crypto');

const hashPassword = (password) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

async function seed() {
  const email = 'samuell.betim@gmail.com';
  const password = 'Alpha@2026@@';
  const name = 'Samuel Betim Quintino';

  console.log('🚀 Iniciando cadastro manual do usuário mestre...');

  const { data: user, error } = await supabase
    .from('users')
    .upsert({
      name,
      email,
      password_hash: hashPassword(password),
      company: 'Cromosit IT',
      role: 'CEO',
      lgpd_accepted: true,
      lgpd_consent_at: new Date().toISOString()
    }, { onConflict: 'email' })
    .select()
    .single();

  if (error) {
    console.error('❌ Erro:', error.message);
  } else {
    console.log('✅ Usuário configurado com sucesso! ID:', user.id);
    console.log('📧 E-mail:', email);
    console.log('🔑 Senha:', password);
    console.log('\nAgora você já pode fazer login no sistema!');
  }
}

seed();
