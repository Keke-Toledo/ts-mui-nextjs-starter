// 📝 EDITOR DE DOCUMENTOS - Sistema de Manutenção
// Data: 03/11/2025
// Lógica de busca, listagem, edição e auditoria

/**
 * 🔍 BUSCAR DOCUMENTOS COM FILTROS
 *
 * @param {string} empresaId - ID da empresa
 * @param {string} colecao - Nome da coleção
 * @param {Date} dataInicio - Data inicial
 * @param {Date} dataFim - Data final
 * @returns {Promise<Array>} Lista de documentos
 */
async function buscarDocumentos(empresaId, colecao, dataInicio, dataFim) {
  try {
    console.log('🔍 [Editor] Buscando documentos...', { empresaId, colecao, dataInicio, dataFim });

    // Validar coleção
    const validacao = validarColecao(colecao);
    if (!validacao.permitida) {
      throw new Error(validacao.motivo);
    }

    // Montar query base
    let query = firebase.firestore().collection(colecao);
    console.log(`📊 [Editor] Coleção: ${colecao}`);

    // Filtro por empresa (OBRIGATÓRIO para multi-tenant)
    query = query.where('empresa_id', '==', empresaId);
    console.log(`🏢 [Editor] Filtro empresa_id: ${empresaId}`);

    // Filtro por data de criação (se fornecido)
    // IMPORTANTE: O sistema usa 'criado_em' (português) e não 'created_at'
    if (dataInicio && dataFim) {
      const inicioTimestamp = firebase.firestore.Timestamp.fromDate(dataInicio);
      const fimTimestamp = firebase.firestore.Timestamp.fromDate(dataFim);

      console.log(`📅 [Editor] Filtro data: ${dataInicio.toLocaleDateString()} a ${dataFim.toLocaleDateString()}`);

      // Tentar filtrar por 'criado_em' (padrão do sistema)
      try {
        query = query
          .where('criado_em', '>=', inicioTimestamp)
          .where('criado_em', '<=', fimTimestamp)
          .orderBy('criado_em', 'desc');

        console.log(`✅ [Editor] Filtro por data aplicado em 'criado_em' (com ordenação)`);
      } catch (err) {
        console.warn(`⚠️ [Editor] Erro ao usar 'criado_em', tentando 'created_at':`, err);

        // Fallback para 'created_at' (se existir)
        try {
          query = query
            .where('created_at', '>=', inicioTimestamp)
            .where('created_at', '<=', fimTimestamp)
            .orderBy('created_at', 'desc');

          console.log(`✅ [Editor] Filtro por data aplicado em 'created_at' (com ordenação)`);
        } catch (err2) {
          console.warn(`⚠️ [Editor] Não foi possível filtrar por data:`, err2);
        }
      }
    } else {
      console.log(`📅 [Editor] Sem filtro de data - buscando todos os documentos da empresa`);

      // Tentar ordenar por 'criado_em' (se existir)
      try {
        query = query.orderBy('criado_em', 'desc');
        console.log(`✅ [Editor] Ordenação por 'criado_em' aplicada`);
      } catch (err) {
        console.warn(`⚠️ [Editor] Não foi possível ordenar (sem índice ou campo inexistente)`);
      }
    }

    // Limitar a 100 documentos (evitar sobrecarregar)
    query = query.limit(100);
    console.log('🔢 [Editor] Limite: 100 documentos');

    // Executar query
    console.log('⏳ [Editor] Executando query no Firestore...');
    const snapshot = await query.get();
    console.log(`📦 [Editor] Snapshot retornou ${snapshot.size} documentos`);

    // DEBUG: Se não encontrou nada, tentar query SEM filtro de empresa (só para teste)
    if (snapshot.size === 0) {
      console.warn('⚠️ [Editor] Nenhum documento encontrado. Testando query SEM filtro empresa...');
      const testQuery = firebase.firestore().collection(colecao).limit(5);
      const testSnapshot = await testQuery.get();
      console.log(`🧪 [Editor] Query SEM filtro retornou ${testSnapshot.size} documentos`);

      if (testSnapshot.size > 0) {
        console.log('📋 [Editor] Primeiros documentos da coleção (TODOS):');
        testSnapshot.forEach(doc => {
          const data = doc.data();
          const dataField = data.criado_em || data.created_at || 'sem data';
          console.log(`  - ID: ${doc.id}, empresa_id: ${data.empresa_id}, criado_em: ${dataField}`);
        });
        console.warn('⚠️ [Editor] Existem documentos na coleção, mas NENHUM para a empresa:', empresaId);
        console.warn('⚠️ [Editor] Verifique se o empresa_id está correto nos documentos!');
      } else {
        console.warn('⚠️ [Editor] A coleção está completamente VAZIA!');
      }
    }

    // Converter para array de objetos
    const documentos = [];
    snapshot.forEach(doc => {
      documentos.push({
        id: doc.id,
        ...doc.data()
      });
    });

    console.log(`✅ [Editor] ${documentos.length} documentos processados`);

    // Debug: mostrar IDs dos primeiros documentos
    if (documentos.length > 0) {
      console.log(`📋 [Editor] Primeiros IDs:`, documentos.slice(0, 3).map(d => d.id));
    }

    return documentos;

  } catch (error) {
    console.error('❌ [Editor] Erro ao buscar documentos:', error);
    console.error('❌ [Editor] Stack:', error.stack);
    throw error;
  }
}

/**
 * 📄 RENDERIZAR LISTA DE DOCUMENTOS
 *
 * @param {Array} documentos - Lista de documentos
 * @param {string} colecao - Nome da coleção
 */
function renderizarListaDocumentos(documentos, colecao) {
  const container = document.getElementById('lista-documentos');

  if (!documentos || documentos.length === 0) {
    container.innerHTML = `
      <div class="alert alert-info">
        <i class="fas fa-info-circle me-2"></i>
        Nenhum documento encontrado com os filtros selecionados.
      </div>
    `;
    return;
  }

  // Gerar HTML para cada documento
  const html = documentos.map((doc, index) => {
    // Campos principais para preview (adaptar por coleção)
    const camposPreview = gerarCamposPreview(doc, colecao);

    return `
      <div class="card mb-3 documento-card" data-doc-id="${doc.id}">
        <div class="card-body">
          <div class="row align-items-center">
            <div class="col-md-1">
              <div class="badge bg-secondary" style="font-size: 1rem;">
                #${index + 1}
              </div>
            </div>
            <div class="col-md-9">
              <h6 class="mb-1">
                <i class="fas fa-file-alt text-primary me-2"></i>
                ID: <code>${doc.id}</code>
              </h6>
              <div class="small text-muted">
                ${camposPreview}
              </div>
            </div>
            <div class="col-md-2 text-end">
              <button class="btn btn-primary btn-sm me-2" onclick="abrirModalEdicao('${doc.id}', '${colecao}')">
                <i class="fas fa-edit me-1"></i> Editar
              </button>
              <button class="btn btn-secondary btn-sm" onclick="verDocumentoJSON('${doc.id}', '${colecao}')">
                <i class="fas fa-code me-1"></i> JSON
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = html;
}

/**
 * 📋 GERAR PREVIEW DE CAMPOS (adaptar por coleção)
 *
 * @param {object} doc - Documento
 * @param {string} colecao - Nome da coleção
 * @returns {string} HTML do preview
 */
function gerarCamposPreview(doc, colecao) {
  // Data de criação (sempre mostrar)
  const dataCriacao = doc.created_at?.toDate
    ? doc.created_at.toDate().toLocaleString('pt-BR')
    : 'N/A';

  // Campos específicos por coleção
  let camposEspecificos = '';

  switch (colecao) {
    case 'vendas':
      camposEspecificos = `
        <strong>Pessoa:</strong> ${doc.pessoa_nome || 'N/A'} •
        <strong>Valor:</strong> R$ ${(doc.vend_valor_total || 0).toFixed(2)}
      `;
      break;
    case 'romaneios':
      camposEspecificos = `
        <strong>Nº:</strong> ${doc.rom_no || 'N/A'} •
        <strong>Destinatário:</strong> ${doc.destinatario_nome || 'N/A'} •
        <strong>Valor:</strong> R$ ${(doc.rom_valor_total || 0).toFixed(2)}
      `;
      break;
    case 'lancamentos_roca':
      camposEspecificos = `
        <strong>Produtor:</strong> ${doc.produtor_nome || 'N/A'} •
        <strong>Produto:</strong> ${doc.prod_descricao || 'N/A'}
      `;
      break;
    case 'pessoas':
      camposEspecificos = `
        <strong>Nome:</strong> ${doc.pess_nome || 'N/A'} •
        <strong>Tipo:</strong> ${(doc.pess_tipo || []).join(', ')}
      `;
      break;
    default:
      // Preview genérico - mostrar até 3 campos principais
      const campos = Object.keys(doc).filter(k =>
        !k.includes('_id') && !k.includes('_at') && k !== 'id' && k !== 'ativo'
      ).slice(0, 3);
      camposEspecificos = campos.map(campo => `<strong>${campo}:</strong> ${doc[campo]}`).join(' • ');
  }

  return `
    <div>
      <i class="fas fa-calendar text-muted me-1"></i> ${dataCriacao}
    </div>
    <div class="mt-1">
      ${camposEspecificos}
    </div>
  `;
}

/**
 * ✏️ ABRIR MODAL DE EDIÇÃO
 *
 * @param {string} docId - ID do documento
 * @param {string} colecao - Nome da coleção
 */
async function abrirModalEdicao(docId, colecao) {
  try {
    console.log('✏️ [Editor] Abrindo modal de edição:', { docId, colecao });

    // Buscar documento
    const docRef = firebase.firestore().collection(colecao).doc(docId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      alert('Documento não encontrado!');
      return;
    }

    const documento = { id: docSnap.id, ...docSnap.data() };

    // Gerar estatísticas de campos
    const stats = gerarEstatisticasCampos(documento);

    // Renderizar modal
    renderizarModalEdicao(documento, colecao, stats);

    // Abrir modal (Bootstrap 5)
    const modal = new bootstrap.Modal(document.getElementById('modalEdicao'));
    modal.show();

  } catch (error) {
    console.error('❌ [Editor] Erro ao abrir modal:', error);
    alert('Erro ao abrir documento: ' + error.message);
  }
}

/**
 * 🎨 RENDERIZAR MODAL DE EDIÇÃO
 *
 * @param {object} documento - Documento completo
 * @param {string} colecao - Nome da coleção
 * @param {object} stats - Estatísticas de campos
 */
function renderizarModalEdicao(documento, colecao, stats) {
  const modalTitle = document.getElementById('modalEdicaoLabel');
  const modalBody = document.getElementById('modalEdicaoBody');

  // Título
  modalTitle.innerHTML = `
    <i class="fas fa-edit me-2"></i>
    Editar Documento
    <span class="badge bg-primary ms-2">${colecao}</span>
    <span class="badge bg-secondary ms-1">${documento.id}</span>
  `;

  // Estatísticas
  const statsHtml = `
    <div class="alert alert-info mb-3">
      <strong>📊 Estatísticas:</strong>
      ${stats.total} campos •
      ${stats.readonly} 🔒 protegidos •
      ${stats.desnormalizados} ⚠️ desnormalizados •
      ${stats.calculados} 🧮 calculados •
      ${stats.referencias} 🎯 referências
    </div>
  `;

  // Campos do documento
  const camposHtml = Object.keys(documento)
    .sort((a, b) => {
      // Ordenar: readonly primeiro, depois normais, depois desnormalizados/calculados
      const tipoA = verificarTipoCampo(a).tipo;
      const tipoB = verificarTipoCampo(b).tipo;
      const ordem = { readonly: 0, normal: 1, referencia: 2, desnormalizado: 3, calculado: 4 };
      return (ordem[tipoA] || 5) - (ordem[tipoB] || 5);
    })
    .map(campo => {
      const valor = documento[campo];
      const info = verificarTipoCampo(campo);
      const badge = gerarBadgeCampo(campo);

      // Converter valor para exibição
      let valorDisplay = valor;
      if (valor && valor.toDate) {
        // Timestamp do Firebase
        valorDisplay = valor.toDate().toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
      } else if (typeof valor === 'object' && valor !== null) {
        // Objeto - converter para JSON
        valorDisplay = JSON.stringify(valor, null, 2);
      } else if (typeof valor === 'boolean') {
        valorDisplay = valor ? 'true' : 'false';
      }

      // Tipo de input
      let inputType = 'text';
      let inputElement = 'input';

      if (campo.includes('_at') || campo.includes('_data')) {
        inputType = 'datetime-local';
      } else if (campo.includes('valor') || campo.includes('qtde') || campo.includes('preco')) {
        inputType = 'number';
      } else if (campo.includes('ativo') || campo.includes('pago')) {
        inputElement = 'select';
      } else if (typeof valor === 'object') {
        inputElement = 'textarea';
      }

      // HTML do campo
      if (inputElement === 'select') {
        return `
          <div class="mb-3">
            <label class="form-label">
              ${campo}
              ${badge}
            </label>
            <select class="form-control" data-campo="${campo}" ${info.disabled ? 'disabled' : ''}>
              <option value="true" ${valorDisplay === true || valorDisplay === 'true' ? 'selected' : ''}>true</option>
              <option value="false" ${valorDisplay === false || valorDisplay === 'false' ? 'selected' : ''}>false</option>
            </select>
            ${info.aviso ? `<small class="text-muted d-block mt-1">${info.aviso}</small>` : ''}
          </div>
        `;
      } else if (inputElement === 'textarea') {
        return `
          <div class="mb-3">
            <label class="form-label">
              ${campo}
              ${badge}
            </label>
            <textarea class="form-control font-monospace" data-campo="${campo}" rows="4" ${info.disabled ? 'disabled' : ''}>${valorDisplay}</textarea>
            ${info.aviso ? `<small class="text-muted d-block mt-1">${info.aviso}</small>` : ''}
          </div>
        `;
      } else {
        return `
          <div class="mb-3">
            <label class="form-label">
              ${campo}
              ${badge}
            </label>
            <input type="${inputType}" class="form-control" data-campo="${campo}" value="${valorDisplay || ''}" ${info.disabled ? 'disabled' : ''} step="any">
            ${info.aviso ? `<small class="text-muted d-block mt-1">${info.aviso}</small>` : ''}
          </div>
        `;
      }
    }).join('');

  // Motivo da alteração
  const motivoHtml = `
    <div class="mb-3">
      <label class="form-label">
        <strong>📝 Motivo da Alteração (OBRIGATÓRIO)</strong>
        <span class="badge bg-danger ms-2">Obrigatório</span>
      </label>
      <textarea class="form-control" id="motivoAlteracao" rows="2" placeholder="Ex: Correção de cálculo de rateio incorreto" required></textarea>
    </div>
  `;

  // Botões
  const botoesHtml = `
    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
      <i class="fas fa-times me-1"></i> Cancelar
    </button>
    <button type="button" class="btn btn-success" onclick="salvarDocumento('${documento.id}', '${colecao}')">
      <i class="fas fa-save me-1"></i> Salvar com Auditoria
    </button>
  `;

  // Montar body completo
  modalBody.innerHTML = statsHtml + camposHtml + motivoHtml;
  document.getElementById('modalEdicaoFooter').innerHTML = botoesHtml;
}

/**
 * 💾 SALVAR DOCUMENTO COM AUDITORIA
 *
 * @param {string} docId - ID do documento
 * @param {string} colecao - Nome da coleção
 */
async function salvarDocumento(docId, colecao) {
  try {
    console.log('💾 [Editor] Salvando documento:', { docId, colecao });

    // 1️⃣ VALIDAR MOTIVO
    const motivo = document.getElementById('motivoAlteracao').value.trim();
    if (!motivo) {
      alert('⚠️ Motivo da alteração é obrigatório!');
      return;
    }

    // 2️⃣ COLETAR CAMPOS EDITÁVEIS
    const campos = document.querySelectorAll('[data-campo]:not([disabled])');
    const alteracoes = {};
    const camposAlterados = [];

    for (const campo of campos) {
      const nomeCampo = campo.getAttribute('data-campo');
      let novoValor = campo.value;

      // Converter tipos
      if (campo.type === 'number') {
        novoValor = parseFloat(novoValor);
      } else if (campo.tagName === 'SELECT') {
        novoValor = novoValor === 'true';
      } else if (campo.tagName === 'TEXTAREA' && novoValor.startsWith('{')) {
        try {
          novoValor = JSON.parse(novoValor);
        } catch (e) {
          console.warn('Não foi possível parsear JSON:', nomeCampo);
        }
      } else if (campo.type === 'datetime-local') {
        novoValor = firebase.firestore.Timestamp.fromDate(new Date(novoValor));
      }

      // Validar campo
      const validacao = validarValorCampo(nomeCampo, novoValor, colecao);
      if (!validacao.valido) {
        alert(`❌ Erro no campo "${nomeCampo}": ${validacao.erro}`);
        return;
      }

      alteracoes[nomeCampo] = novoValor;
      camposAlterados.push(nomeCampo);
    }

    // 3️⃣ ADICIONAR CAMPOS DE AUDITORIA
    alteracoes.updated_at = firebase.firestore.FieldValue.serverTimestamp();
    alteracoes.updated_by = window.usuarioAtual?.email || 'sistema';

    // 4️⃣ CONFIRMAR COM USUÁRIO
    const confirmacao = confirm(`
🔧 CONFIRMAR ALTERAÇÃO

📁 Coleção: ${colecao}
📄 Documento: ${docId}
📝 Campos alterados: ${camposAlterados.length}
✍️ Motivo: ${motivo}

⚠️ Esta ação será registrada em auditoria.

Deseja continuar?
    `);

    if (!confirmacao) {
      console.log('❌ [Editor] Alteração cancelada pelo usuário');
      return;
    }

    // 5️⃣ SALVAR NO FIRESTORE
    const docRef = firebase.firestore().collection(colecao).doc(docId);
    await docRef.update(alteracoes);

    // 6️⃣ REGISTRAR AUDITORIA
    await registrarAuditoriaManutencao({
      colecao,
      doc_id: docId,
      campos_alterados: camposAlterados,
      alteracoes,
      motivo,
      usuario: window.usuarioAtual?.email || 'sistema',
      usuario_nome: window.usuarioAtual?.nome || 'Sistema'
    });

    console.log('✅ [Editor] Documento salvo com sucesso!');

    // 7️⃣ FECHAR MODAL E RECARREGAR LISTA
    bootstrap.Modal.getInstance(document.getElementById('modalEdicao')).hide();

    alert('✅ Documento atualizado com sucesso!\n\n📋 Auditoria registrada.');

    // Recarregar lista (buscar novamente)
    document.getElementById('btnBuscar').click();

  } catch (error) {
    console.error('❌ [Editor] Erro ao salvar documento:', error);
    alert('❌ Erro ao salvar: ' + error.message);
  }
}

/**
 * 📜 REGISTRAR AUDITORIA DE MANUTENÇÃO
 *
 * @param {object} dados - Dados da auditoria
 */
async function registrarAuditoriaManutencao(dados) {
  try {
    const auditoriaRef = firebase.firestore().collection('auditoria').doc();

    await auditoriaRef.set({
      tipo: 'MANUTENCAO_MANUAL',
      colecao: dados.colecao,
      doc_id: dados.doc_id,
      campos_alterados: dados.campos_alterados,
      alteracoes: dados.alteracoes,
      motivo: dados.motivo,
      usuario: dados.usuario,
      usuario_nome: dados.usuario_nome,
      empresa_id: window.empresaAtual?.id || null,
      created_at: firebase.firestore.FieldValue.serverTimestamp(),
      gravidade: 'ALTA' // Manutenção manual é sempre alta gravidade
    });

    console.log('✅ [Auditoria] Registro criado com sucesso');
  } catch (error) {
    console.error('❌ [Auditoria] Erro ao registrar:', error);
    // Não bloquear a operação se auditoria falhar
  }
}

/**
 * 📄 VER DOCUMENTO EM JSON
 *
 * @param {string} docId - ID do documento
 * @param {string} colecao - Nome da coleção
 */
async function verDocumentoJSON(docId, colecao) {
  try {
    const docRef = firebase.firestore().collection(colecao).doc(docId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      alert('Documento não encontrado!');
      return;
    }

    const documento = { id: docSnap.id, ...docSnap.data() };

    // Converter Timestamps para strings
    const documentoLimpo = JSON.parse(JSON.stringify(documento, (key, value) => {
      if (value && value._seconds) {
        return new Date(value._seconds * 1000).toISOString();
      }
      return value;
    }));

    // Mostrar em modal
    alert(`📄 DOCUMENTO JSON\n\nColeção: ${colecao}\nID: ${docId}\n\n${JSON.stringify(documentoLimpo, null, 2)}`);

  } catch (error) {
    console.error('❌ [Editor] Erro ao ver JSON:', error);
    alert('Erro ao carregar JSON: ' + error.message);
  }
}

// 🌐 EXPORTAR FUNÇÕES
window.buscarDocumentos = buscarDocumentos;
window.renderizarListaDocumentos = renderizarListaDocumentos;
window.abrirModalEdicao = abrirModalEdicao;
window.salvarDocumento = salvarDocumento;
window.verDocumentoJSON = verDocumentoJSON;

console.log('✅ [Editor] Módulo carregado - Funções de edição disponíveis');
