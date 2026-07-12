/** Brazilian Portuguese → European Portuguese string transforms. */
export const PT_PT_REPLACEMENTS = [
  [/\bEnviamos\b/g, 'Enviámos'],
  [/\benviamos\b/g, 'enviámos'],
  [/\bVerifique seu\b/g, 'Verifique o seu'],
  [/\bverifique seu\b/g, 'verifique o seu'],
  [/\bseu e-mail\b/gi, 'o seu e-mail'],
  [/\bsua conta\b/gi, 'a sua conta'],
  [/\bseus\b/gi, 'os seus'],
  [/\bsuas\b/gi, 'as suas'],
  [/\bcadastre-se\b/gi, 'registe-se'],
  [/\bCadastre-se\b/g, 'Registe-se'],
  [/\bcadastro\b/gi, 'registo'],
  [/\bCadastro\b/g, 'Registo'],
  [/\bEntrar no\b/g, 'Iniciar sessão no'],
  [/\bEntrar\b/g, 'Iniciar sessão'],
  [/\bentrar\b/g, 'iniciar sessão'],
  [/\bsenhas\b/gi, 'palavras-passe'],
  [/\bSenhas\b/g, 'Palavras-passe'],
  [/\bsenha\b/gi, 'palavra-passe'],
  [/\bSenha\b/g, 'Palavra-passe'],
  [/\busuários\b/gi, 'utilizadores'],
  [/\bUsuários\b/g, 'Utilizadores'],
  [/\busuário\b/gi, 'utilizador'],
  [/\bUsuário\b/g, 'Utilizador'],
  [/\bcelular\b/gi, 'telemóvel'],
  [/\baplicativos\b/gi, 'aplicações'],
  [/\baplicativo\b/gi, 'aplicação'],
  [/\bAplicativo\b/g, 'Aplicação'],
  [/\btela\b/gi, 'ecrã'],
  [/\bTela\b/g, 'Ecrã'],
  [/\bsalvar\b/gi, 'guardar'],
  [/\bSalvar\b/g, 'Guardar'],
  [/\barquivo\b/gi, 'ficheiro'],
  [/\bArquivo\b/g, 'Ficheiro'],
  [/\bclique\b/gi, 'clique'],
  [/\bGerador de Tags UTM\b/g, 'Gerador de etiquetas UTM'],
  [/\bfliperama\b/gi, 'arcade'],
  [/\braquete\b/gi, 'raqueta'],
  [/\bDe novo\b/g, 'Reiniciar'],
  [/\bde novo\b/g, 'reiniciar'],
  [/\bPressione R — de novo\b/g, 'Prima R — reiniciar'],
  [/\bPulsa R — de novo\b/g, 'Prima R — reiniciar'],
  [/\bJuegos\b/g, 'Jogos'],
  [/\bTablero de juego\b/g, 'Tabuleiro de jogo'],
  [/\bControles:/g, 'Controlos:'],
  [/\bIniciar\/pausa\b/g, 'Iniciar/pausa'],
  [/\bReinicio\b/g, 'Reiniciar'],
  [/\bEspacio\b/g, 'Espaço'],
  [/\bEspacio —/g, 'Espaço —'],
  [/\bPuntuación\b/g, 'Pontuação'],
  [/\bRécord\b/g, 'Recorde'],
  [/\bFin del juego\b/g, 'Fim de jogo'],
  [/\b¡Victoria!/g, 'Vitória!'],
  [/\bEntendido\b/g, 'Entendi'],
  [/\bContinuar\b/g, 'Continuar'],
  [/\bInsira\b/g, 'Introduza'],
  [/\binsira\b/g, 'introduza'],
  [/\bDigite\b/g, 'Escreva'],
  [/\bdigite\b/g, 'escreva'],
  [/\bdireção\b/gi, 'condução'],
  [/\bDireção\b/g, 'Condução'],
  [/\bEconômico\b/g, 'Económico'],
  [/\beconômico\b/g, 'económico'],
  [/\bEsportivo\b/g, 'Desportivo'],
  [/\besportivo\b/g, 'desportivo'],
  [/\bRodovia\b/g, 'Autoestrada'],
  [/\brodovia\b/g, 'autoestrada'],
  [/\bCombustível diesel\b/gi, 'Gasóleo'],
  [/\bcombustível diesel\b/gi, 'gasóleo'],
  [/\banúncio\b/gi, 'publicidade'],
  [/\bAnúncio\b/g, 'Publicidade'],
  [/\bFechar anúncio\b/gi, 'Fechar publicidade'],
  [/\bBloco de anúncio\b/g, 'Bloco publicitário'],
  [/\bCole ou digite texto\b/gi, 'Cole ou escreva o texto'],
  [/\bRecursos da ferramenta\b/g, 'Funcionalidades da ferramenta'],
  [/\bvocê\b/gi, 'o utilizador'],
  [/\bVocê\b/g, 'O utilizador'],
  [/\bNossa pesquisa\b/g, 'A nossa pesquisa'],
  [/\bnossa pesquisa\b/g, 'a nossa pesquisa'],
  [/\bSeu plano\b/g, 'O seu plano'],
  [/\bseu plano\b/g, 'o seu plano'],
  [/\bSeu\b/g, 'O seu'],
  [/\bseu\b/g, 'o seu'],
  [/\bSua\b/g, 'A sua'],
  [/\bsua\b/g, 'a sua'],
  [/\bVoltar para a\b/g, 'Voltar à'],
  [/\bclique\b/gi, 'clique'],
  [/\bDE NOVO\b/g, 'OUTRA VEZ'],
  [/\bDe novo\b/g, 'Outra vez'],
  [/\bde novo\b/g, 'outra vez'],
  [/\bcurtidas\b/gi, 'gostos'],
  [/\bCurtidas\b/g, 'Gostos'],
  [/\batualize\b/gi, 'actualize'],
  [/\bAtualize\b/g, 'Actualize'],
  [/\batualiza\b/gi, 'actualiza'],
  [/\bcontato\b/gi, 'contacto'],
  [/\bContato\b/g, 'Contacto'],
  [/\bBaixar\b/g, 'Transferir'],
  [/\bbaixar\b/g, 'transferir'],
  [/\baplicativo\b/gi, 'aplicação'],
  [/\bAplicativo\b/g, 'Aplicação'],
  [/\bcelular\b/gi, 'telemóvel'],
  [/\busuário\b/gi, 'utilizador'],
  [/\bUsuário\b/g, 'Utilizador'],
  [/\bQuebra-cabeça 15\b/g, 'Puzzle 15'],
  [/\bQuebra-cabeça\b/gi, 'puzzle'],
  [/\bVocê resolveu o quebra-cabeça!/g, 'Resolveu o puzzle!'],
  [/\bVocê resolveu o puzzle!/g, 'Resolveu o puzzle!'],
  [/\bTreine memória\b/g, 'Treine a memória'],
  [/\bJogue Quebra-cabeça 15 online\b/g, 'Jogue Puzzle 15 online'],
  [/\bComo jogar — Quebra-cabeça 15\b/g, 'Como jogar — Puzzle 15'],
  [/\bTabuleiro do quebra-cabeça 15\b/g, 'Tabuleiro do puzzle 15'],
];

export function brToPtPt(value) {
  if (typeof value === 'string') {
    let out = value;
    for (const [pattern, replacement] of PT_PT_REPLACEMENTS) {
      out = out.replace(pattern, replacement);
    }
    return out;
  }
  if (Array.isArray(value)) return value.map(brToPtPt);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, brToPtPt(v)]));
  }
  return value;
}

export const LOCALE_FALLBACK = {
  az: 'tr',
  be: 'ru',
  bg: 'ru',
  bn: 'hi',
  cs: 'pl',
  da: 'de',
  el: 'de',
  'es-419': 'es',
  fa: 'ar',
  fi: 'de',
  fil: 'id',
  he: 'ar',
  hi: 'bn',
  hu: 'pl',
  hy: 'ru',
  id: 'ms',
  ka: 'ru',
  kk: 'ru',
  ms: 'id',
  nb: 'de',
  nl: 'de',
  'pt-pt': 'pt-br',
  ro: 'it',
  sr: 'ru',
  sv: 'de',
  th: 'vi',
  ur: 'ar',
  uz: 'tr',
  ps: 'ar',
  sd: 'ur',
  ug: 'ar',
  dv: 'ar',
  ks: 'ur',
  'ku-arab': 'ar',
  yi: 'de',
  vi: 'id',
};

export function resolveDonor(data, locale, enBlock) {
  const seen = new Set();
  let current = LOCALE_FALLBACK[locale];
  while (current && !seen.has(current)) {
    seen.add(current);
    if (current !== 'en') {
      const block = data[current];
      if (block && JSON.stringify(block) !== JSON.stringify(enBlock)) {
        return structuredClone(block);
      }
    }
    current = LOCALE_FALLBACK[current];
  }
  if (data.ru && JSON.stringify(data.ru) !== JSON.stringify(enBlock)) {
    return structuredClone(data.ru);
  }
  return null;
}
