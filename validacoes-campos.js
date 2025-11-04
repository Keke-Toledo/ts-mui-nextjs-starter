// 🔧 VALIDAÇÕES DE CAMPOS - Sistema de Manutenção
// Data: 03/11/2025
// Configurações de campos protegidos, desnormalizados e calculados

/**
 * 🔐 CONFIGURAÇÃO DE CAMPOS PROTEGIDOS
 *
 * Tipos de campos:
 * 1. readonly: NUNCA podem ser editados (chaves primárias, timestamps de criação)
 * 2. desnormalizados: Podem editar mas com AVISO (dados copiados de outras coleções)
 * 3. calculados: Podem editar mas com AVISO + sugestão de recálculo
 * 4. referencias: Validar se ID existe na coleção referenciada
 */

const CamposProtegidos = {
  // 🔒 CAMPOS SOMENTE LEITURA (NUNCA EDITAR)
  readonly: [
    'id',
    'created_at',
    'created_by',
    'empresa_id',    // ⚠️ Multi-tenant - nunca mudar!
    'grupo_id',      // ⚠️ Multi-tenant - nunca mudar!
    'said_emb_id',   // IDs gerados automaticamente
    'lanc_roca_id',
    'rom_no',        // Número de romaneio (gerado)
    'vend_id',
    'ped_id',
    'cheq_id'
  ],

  // ⚠️ CAMPOS DESNORMALIZADOS (AVISO ao editar)
  desnormalizados: [
    'pessoa_nome',
    'pess_nome',
    'prod_descricao',
    'prod_descricao_completa',
    'destino_nome',
    'origem_nome',
    'motorista_nome',
    'empresa_nome',
    'clas_descricao',
    'uni_descricao',
    'embalagem_nome',
    'forma_pagamento_descricao',
    'tipo_cheque_descricao',
    'conta_descricao'
  ],

  // 🧮 CAMPOS CALCULADOS (AVISO + sugestão de recalcular)
  calculados: [
    'vend_valor_total',
    'vend_valor_liquido',
    'rom_valor_total',
    'said_emb_valor_total',
    'lanc_roca_valor_total',
    'esto_qtde_atual',
    'esto_qtde_disponivel',
    'esto_qtde_reservada',
    'cheq_valor_total',
    'lanc_fin_valor',
    'subtotal',
    'total_itens',
    'total_quantidade'
  ],

  // 🎯 CAMPOS DE REFERÊNCIA (validar se ID existe)
  referencias: {
    'pessoa_id': 'pessoas',
    'produtor_id': 'pessoas',
    'motorista_id': 'pessoas',
    'destinatario_id': 'pessoas',
    'prod_id': 'produtos',
    'produto_id': 'produtos',
    'clas_id': 'classificacoes',
    'uni_id': 'unidades',
    'embalagem_id': 'produtos',
    'forma_pagamento_id': 'formas_pagamento',
    'tipo_cheque_id': 'tipos_cheque',
    'conta_id': 'contas'
  }
};

/**
 * 🗂️ COLEÇÕES PERMITIDAS E PROIBIDAS
 */
const ColecoesConfig = {
  // ✅ COLEÇÕES PERMITIDAS (iniciais)
  permitidas: [
    { id: 'vendas', nome: 'Vendas', icon: '🛒' },
    { id: 'romaneios', nome: 'Romaneios', icon: '🚛' },
    { id: 'lancamentos_roca', nome: 'Lançamentos Roça', icon: '🌾' },
    { id: 'regua', nome: 'Réguas', icon: '📏' },
    { id: 'estoque_embalagem', nome: 'Estoque Embalagem', icon: '📦' },
    { id: 'historico_movimentacoes', nome: 'Histórico Movimentações', icon: '📊' },
    { id: 'saidas_embalagens', nome: 'Saídas Embalagens', icon: '📤' },
    { id: 'cheques', nome: 'Cheques', icon: '💰' },
    { id: 'lancamentos_financeiros', nome: 'Lançamentos Financeiros', icon: '💵' },
    { id: 'pessoas', nome: 'Pessoas', icon: '👥' },
    { id: 'produtos', nome: 'Produtos', icon: '🌱' },
    { id: 'ordem_carga', nome: 'Ordem de Carga', icon: '📋' },
    { id: 'pedidos', nome: 'Pedidos', icon: '📝' }
  ],

  // ❌ COLEÇÕES PROIBIDAS (NUNCA editar manualmente)
  proibidas: [
    'usuarios',              // Usar tela específica
    'empresas',              // Usar tela específica
    'grupos_empresas',       // Usar tela específica
    'auditoria',             // NUNCA editar logs!
    'permissoes_granulares', // Usar tela específica
    'modulos',               // Sistema
    'configuracoes'          // Sistema
  ]
};

/**
 * 🔍 VERIFICAR TIPO DE CAMPO
 *
 * @param {string} campo - Nome do campo
 * @returns {object} { tipo, aviso, badge, icon, color }
 */
function verificarTipoCampo(campo) {
  // 🔒 READONLY
  if (CamposProtegidos.readonly.includes(campo)) {
    return {
      tipo: 'readonly',
      aviso: '🔒 Campo protegido - não pode ser editado',
      badge: 'Somente Leitura',
      icon: '🔒',
      color: '#dc3545', // Vermelho
      disabled: true
    };
  }

  // ⚠️ DESNORMALIZADO
  if (CamposProtegidos.desnormalizados.includes(campo)) {
    return {
      tipo: 'desnormalizado',
      aviso: '⚠️ Campo DESNORMALIZADO - valor copiado de outra coleção.\nAo editar aqui, NÃO atualiza a origem!\nEdite apenas se for correção urgente.',
      badge: 'Desnormalizado',
      icon: '⚠️',
      color: '#fd7e14', // Laranja
      disabled: false
    };
  }

  // 🧮 CALCULADO
  if (CamposProtegidos.calculados.includes(campo)) {
    return {
      tipo: 'calculado',
      aviso: '🧮 Campo CALCULADO - valor gerado automaticamente.\nAo editar manualmente, pode ficar inconsistente!\nConsidere usar "Ações Rápidas" para recalcular.',
      badge: 'Calculado',
      icon: '🧮',
      color: '#0dcaf0', // Ciano
      disabled: false
    };
  }

  // 🎯 REFERÊNCIA
  if (CamposProtegidos.referencias[campo]) {
    const colecaoRef = CamposProtegidos.referencias[campo];
    return {
      tipo: 'referencia',
      aviso: `🎯 Campo de REFERÊNCIA - deve existir em "${colecaoRef}".\nSerá validado ao salvar.`,
      badge: `Ref: ${colecaoRef}`,
      icon: '🎯',
      color: '#6f42c1', // Roxo
      disabled: false,
      colecao_referencia: colecaoRef
    };
  }

  // ✅ CAMPO NORMAL (pode editar livremente)
  return {
    tipo: 'normal',
    aviso: null,
    badge: null,
    icon: null,
    color: '#198754', // Verde
    disabled: false
  };
}

/**
 * 🔍 VALIDAR COLEÇÃO
 *
 * @param {string} colecao - Nome da coleção
 * @returns {object} { permitida, motivo }
 */
function validarColecao(colecao) {
  // Verificar se está na lista de proibidas
  if (ColecoesConfig.proibidas.includes(colecao)) {
    return {
      permitida: false,
      motivo: `Coleção "${colecao}" não pode ser editada manualmente. Use a tela específica do sistema.`
    };
  }

  // Verificar se está na lista de permitidas
  const permitida = ColecoesConfig.permitidas.find(c => c.id === colecao);
  if (!permitida) {
    return {
      permitida: false,
      motivo: `Coleção "${colecao}" não está na lista de coleções permitidas para edição.`
    };
  }

  return {
    permitida: true,
    motivo: null
  };
}

/**
 * 🔍 VALIDAR VALOR DE CAMPO
 *
 * @param {string} campo - Nome do campo
 * @param {any} valor - Valor a validar
 * @param {string} colecao - Coleção do documento
 * @returns {object} { valido, erro }
 */
function validarValorCampo(campo, valor, colecao) {
  const tipoCampo = verificarTipoCampo(campo);

  // 1️⃣ READONLY - não pode editar
  if (tipoCampo.tipo === 'readonly') {
    return {
      valido: false,
      erro: 'Campo protegido não pode ser editado'
    };
  }

  // 2️⃣ CAMPO VAZIO (null/undefined/empty string)
  if (valor === null || valor === undefined || valor === '') {
    // Permitir vazio para campos opcionais
    if (!campo.includes('_id') && !campo.includes('_at')) {
      return { valido: true, erro: null };
    }
    return {
      valido: false,
      erro: 'Campo obrigatório não pode ficar vazio'
    };
  }

  // 3️⃣ VALIDAR NÚMEROS (campos com valor, qtde, preco)
  if (campo.includes('valor') || campo.includes('qtde') || campo.includes('preco')) {
    const numero = parseFloat(valor);
    if (isNaN(numero)) {
      return {
        valido: false,
        erro: 'Valor deve ser um número válido'
      };
    }
  }

  // 4️⃣ VALIDAR DATAS (campos _at, _data)
  if (campo.includes('_at') || campo.includes('_data')) {
    try {
      const data = new Date(valor);
      if (isNaN(data.getTime())) {
        return {
          valido: false,
          erro: 'Data inválida'
        };
      }
    } catch (e) {
      return {
        valido: false,
        erro: 'Formato de data inválido'
      };
    }
  }

  // 5️⃣ VALIDAR BOOLEAN (campos com ativo, pago, etc)
  if (campo.includes('ativo') || campo.includes('pago') || campo.includes('cancelado')) {
    if (typeof valor !== 'boolean' && valor !== 'true' && valor !== 'false') {
      return {
        valido: false,
        erro: 'Valor deve ser true ou false'
      };
    }
  }

  // ✅ CAMPO VÁLIDO
  return { valido: true, erro: null };
}

/**
 * 🎨 GERAR BADGE HTML PARA CAMPO
 *
 * @param {string} campo - Nome do campo
 * @returns {string} HTML do badge
 */
function gerarBadgeCampo(campo) {
  const info = verificarTipoCampo(campo);

  if (!info.badge) {
    return ''; // Sem badge para campos normais
  }

  return `<span class="badge ms-2" style="background-color: ${info.color}; font-size: 0.7rem;">
    ${info.icon} ${info.badge}
  </span>`;
}

/**
 * 📊 GERAR ESTATÍSTICAS DE CAMPOS
 *
 * @param {object} documento - Documento a analisar
 * @returns {object} { total, readonly, desnormalizados, calculados, referencias, normais }
 */
function gerarEstatisticasCampos(documento) {
  const campos = Object.keys(documento);
  const stats = {
    total: campos.length,
    readonly: 0,
    desnormalizados: 0,
    calculados: 0,
    referencias: 0,
    normais: 0
  };

  campos.forEach(campo => {
    const tipo = verificarTipoCampo(campo).tipo;
    if (tipo === 'readonly') stats.readonly++;
    else if (tipo === 'desnormalizado') stats.desnormalizados++;
    else if (tipo === 'calculado') stats.calculados++;
    else if (tipo === 'referencia') stats.referencias++;
    else stats.normais++;
  });

  return stats;
}

// 🌐 EXPORTAR FUNÇÕES E CONFIGS
window.CamposProtegidos = CamposProtegidos;
window.ColecoesConfig = ColecoesConfig;
window.verificarTipoCampo = verificarTipoCampo;
window.validarColecao = validarColecao;
window.validarValorCampo = validarValorCampo;
window.gerarBadgeCampo = gerarBadgeCampo;
window.gerarEstatisticasCampos = gerarEstatisticasCampos;

console.log('✅ [Validações] Módulo carregado - Campos protegidos configurados');
