const jwt = require('jsonwebtoken');

// Middleware = um "porteiro" que verifica se o usuário tem permissão
// antes de deixar passar para a rota desejada
const authMiddleware = (req, res, next) => {
  try {
    // Pega o token do cabeçalho da requisição
    // Token = uma "senha temporária" gerada quando o usuário faz login
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Token não fornecido. Faça login novamente.'
      });
    }

    const token = authHeader.split(' ')[1];

    // 💡 BYPASS DE SEGURANÇA LOCAL PARA A EXTENSÃO
    if (token === 'bypass-local-dev-token') {
      req.user = { userId: '550e8400-e29b-41d4-a716-446655440000', email: 'contato@cromosit.com', name: 'Samuel (Master)' };
      return next();
    }

    // Verifica se o token é válido e não expirou
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Adiciona os dados do usuário na requisição para usar nas rotas
    req.user = decoded;

    next(); // Libera a passagem para a rota
  } catch (error) {
    return res.status(401).json({
      error: 'Token inválido ou expirado. Faça login novamente.'
    });
  }
};

module.exports = authMiddleware;
