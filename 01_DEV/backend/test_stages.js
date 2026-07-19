const supabase = require('./config/supabase');

async function testar() {
  console.log('Iniciando teste de inserção em pipeline_stages...');
  try {
    const { data: pipelines, error: errP } = await supabase.from('pipelines').select('id').limit(1);
    if (errP) {
      console.error('Erro ao buscar pipelines:', errP.message);
      return;
    }
    if (!pipelines || pipelines.length === 0) {
      console.log('Nenhum pipeline encontrado no banco para rodar o teste.');
      return;
    }
    
    const pipelineId = pipelines[0].id;
    console.log(`Pipeline ID para teste: ${pipelineId}`);
    
    const { data, error } = await supabase
      .from('pipeline_stages')
      .insert({
        name: 'Etapa Teste Antigravity',
        color: '#1d8fe8',
        position: 99,
        pipeline_id: pipelineId
      })
      .select();
      
    if (error) {
      console.error('❌ ERRO NO SUPABASE:', error.message);
    } else {
      console.log('✅ SUCESSO! Etapa criada:', data);
      await supabase.from('pipeline_stages').delete().eq('name', 'Etapa Teste Antigravity');
      console.log('Limpeza de teste concluída.');
    }
  } catch (e) {
    console.error('Erro inesperado no teste:', e.message);
  }
}

testar();
