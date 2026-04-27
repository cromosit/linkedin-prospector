require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const leads = [
  {
    name: "Larissa Casanova",
    company: "Vale",
    headline: "Consultora SAP MM",
    linkedin_url: "https://www.linkedin.com/in/larissacasanova",
    connection_degree: "2",
    ai_message: "Olá Larissa, vi sua atuação com SAP MM na Vale. Sabemos que o volume de processos de suprimentos no S/4HANA exige uma agilidade que a dependência do time ABAP nem sempre permite. Na Cromosit, criamos o treinamento ABAP para Funcional para dar autonomia de debug e leitura de código. Para compras via PIX hoje, conseguimos fazer por R$ 1.650,00 (R$ 300 de desconto). Confira: https://cromosit.com/ecommerce/course/abap-para-funcional-s-4hana-2-0/121"
  },
  {
    name: "Vitor Leonel",
    company: "Vale",
    headline: "Consultor SAP MM",
    linkedin_url: "https://www.linkedin.com/in/vitorleonel",
    connection_degree: "2",
    ai_message: "Olá Vitor, vi que você atua com SAP MM na Vale. Com o S/4HANA, a autonomia técnica do funcional para debugar e entender o código ABAP se tornou um diferencial crítico para não travar os processos de suprimentos. Na Cromosit, focamos justamente nessa independência. Temos uma condição de R$ 1.650,00 no PIX para esta turma. Confira: https://cromosit.com/ecommerce/course/abap-para-funcional-s-4hana-2-0/121"
  },
  {
    name: "Bruno Cunha",
    company: "Vale",
    headline: "Consultor SAP PM",
    linkedin_url: "https://www.linkedin.com/in/bruno-cunha-sap",
    connection_degree: "3",
    ai_message: "Olá Bruno, notei sua atuação no SAP PM da Vale. A manutenção exige respostas rápidas e, muitas vezes, esperar o time ABAP para um simples debug atrasa tudo. Nosso treinamento ABAP para Funcional dá essa autonomia. Conseguimos fazer por R$ 1.650,00 via PIX hoje. Veja os detalhes: https://cromosit.com/ecommerce/course/abap-para-funcional-s-4hana-2-0/121"
  },
  {
    name: "Maria Flávia Lira Alves",
    company: "Petrobras",
    headline: "Gestão de Projetos SAP S/4HANA",
    linkedin_url: "https://www.linkedin.com/in/mariaflavialira",
    connection_degree: "2",
    ai_message: "Olá Maria Flávia, vi que está à frente de projetos S/4HANA na Petrobras. Em implementações dessa magnitude, a autonomia técnica do funcional garante o cronograma, evitando filas de espera por desenvolvedores. Nosso curso dá essa independência. Temos uma condição especial de R$ 1.650,00 no PIX para esta semana. Detalhes: https://cromosit.com/ecommerce/course/abap-para-funcional-s-4hana-2-0/121"
  },
  {
    name: "Tatiana Nascimento",
    company: "Petrobras/TCS",
    headline: "Consultora SAP MM Sênior",
    linkedin_url: "https://www.linkedin.com/in/tatiananascimento",
    connection_degree: "1",
    ai_message: "Olá Tatiana, vi sua atuação em MM na Petrobras/TCS. Sabemos que em grandes consultorias a versatilidade é chave. Ter autonomia técnica para debugar no S/4HANA sem depender de um ABAP sênior valoriza muito seu perfil e acelera os chamados. O curso está por R$ 1.650,00 no PIX hoje. Saiba mais: https://cromosit.com/ecommerce/course/abap-para-funcional-s-4hana-2-0/121"
  },
  {
    name: "Marcelo Pereira",
    company: "Gerdau",
    headline: "Global Process Owner - SAP SD",
    linkedin_url: "https://www.linkedin.com/in/marcelopereira-sd",
    connection_degree: "2",
    ai_message: "Olá Marcelo, como dono de processos de International Trade na Gerdau, você sabe como a 'caixa preta' do SD pode atrasar decisões. Ter autonomia para debugar no S/4HANA muda o jogo. O valor é 12x de R$ 195, mas via PIX liberamos por R$ 1.650,00 hoje. Saiba mais: https://cromosit.com/ecommerce/course/abap-para-funcional-s-4hana-2-0/121"
  },
  {
    name: "Sabrina Roszko",
    company: "Gerdau",
    headline: "Especialista Tributária SAP",
    linkedin_url: "https://www.linkedin.com/in/sabrinaroszko",
    connection_degree: "2",
    ai_message: "Olá Sabrina, vi sua atuação como especialista tributária na Gerdau. Sabemos o quanto o Tax no S/4HANA é complexo e como o funcional sofre quando não consegue debugar uma nota ou um cálculo. Nosso treinamento foca em dar essa independência técnica. Condição especial no PIX: R$ 1.650,00. Confira: https://cromosit.com/ecommerce/course/abap-para-funcional-s-4hana-2-0/121"
  },
  {
    name: "Amadeu Souza",
    company: "Gerdau",
    headline: "IT Digital Leader",
    linkedin_url: "https://www.linkedin.com/in/amadeusouza",
    connection_degree: "3",
    ai_message: "Olá Amadeu, como IT Digital Leader na Gerdau, você sabe que a eficiência dos projetos S/4HANA depende da versatilidade do time. Consultores funcionais que sabem ler código e debugar reduzem drasticamente o gargalo de desenvolvimento. Nosso curso é focado nisso. Valor especial no PIX: R$ 1.650,00. Link: https://cromosit.com/ecommerce/course/abap-para-funcional-s-4hana-2-0/121"
  },
  {
    name: "Vitória Carolina Agdo",
    company: "Capgemini",
    headline: "Consultora SAP SD/MM",
    linkedin_url: "https://www.linkedin.com/in/vitoriacarolina",
    connection_degree: "2",
    ai_message: "Olá Vitória, vi seu perfil focado em SD/MM na Capgemini. Em consultorias, a agilidade na entrega é tudo. Ter autonomia técnica para debugar no S/4HANA sem depender de um ABAP sênior valoriza muito seu perfil. O curso está por R$ 1.650,00 no PIX esta semana. Saiba mais: https://cromosit.com/ecommerce/course/abap-para-funcional-s-4hana-2-0/121"
  },
  {
    name: "Diógenes Souza",
    company: "Freelance",
    headline: "Consultor SAP SD Sênior",
    linkedin_url: "https://www.linkedin.com/in/diogenessouza",
    connection_degree: "2",
    ai_message: "Olá Diógenes, como consultor SD Sênior, você sabe que o mercado de S/4HANA exige cada vez mais que o funcional entenda a fundo o que está acontecendo no código. Autonomia para debugar é o que separa os especialistas. Temos uma vaga com desconto de R$ 300 no PIX, saindo por R$ 1.650,00. Confira: https://cromosit.com/ecommerce/course/abap-para-funcional-s-4hana-2-0/121"
  }
];

async function importLeads() {
  console.log('🚀 Importando 10 leads de elite para o Supabase...');
  
  for (const lead of leads) {
    const { data, error } = await supabase
      .from('leads')
      .upsert({
        ...lead,
        status: 'novo',
        temperature: 'frio',
        source: 'importacao_elite'
      }, { onConflict: 'linkedin_url' });

    if (error) {
      console.error(`❌ Erro ao importar ${lead.name}:`, error.message);
    } else {
      console.log(`✅ ${lead.name} importado com sucesso!`);
    }
  }
  console.log('\n✨ Importação concluída! Verifique seu CRM.');
}

importLeads();
