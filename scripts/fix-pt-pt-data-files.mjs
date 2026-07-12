#!/usr/bin/env node
/**
 * Fix pt-pt in 11 _data files: EU Portuguese from pt-br + cookies guide from en.
 */
import fs from 'fs';
import path from 'path';
import { brToPtPt } from './pt-pt-eu.mjs';

const dataDir = '/var/www/serpmonn.ru/assembly/site/_data';

const FILES_FROM_PT_BR = [
  'depreciationCalculator.json',
  'fuelCalculator.json',
  'gameFifteenTranslations.json',
  'gameTypingTranslations.json',
  'localesNews.json',
  'searchTranslations.json',
  'success.json',
  'unitConverter.json',
  'updatesAug25Sep15.json',
  'wordCounter.json',
];

/** Manual EU-PT patches after brToPtPt (path not needed — string-level). */
const EXTRA_STRING_REPLACEMENTS = [
  [/Navegue pelos resultados da pesquisa e encontre as informações de que precisa de forma rápida e fácil\. A nossa pesquisa ajuda o utilizador a encontrar os recursos mais relevantes e úteis na web\./g,
    'Navegue pelos resultados da pesquisa e encontre rapidamente a informação de que precisa. A nossa pesquisa ajuda-o a encontrar os recursos mais relevantes e úteis na Web.'],
  [/Obrigado! O seu plano Serpmonn AI Pro será ativado em poucos segundos após o processamento do pagamento\. Se o acesso não for atualizado imediatamente, aguarde um pouco e actualize a página de busca com IA\./g,
    'Obrigado! O seu plano Serpmonn AI Pro será activado em poucos segundos após o processamento do pagamento. Se o acesso não for actualizado de imediato, aguarde um momento e actualize a página de pesquisa com IA.'],
  [/Materiais de referência, instruções e guias sobre o Serpmonn e as tecnologias ao seu redor\./g,
    'Materiais de referência, instruções e guias sobre o Serpmonn e as tecnologias envolvidas.'],
  [/6 novos mini-jogos, curtidas com autorização, SEO\/localização, anúncios e correções de bugs\./g,
    '6 novos mini-jogos, gostos com autorização, SEO/localização, publicidade e correcções de erros.'],
];

function applyExtraReplacements(value) {
  if (typeof value !== 'string') return value;
  let out = value;
  for (const [pattern, replacement] of EXTRA_STRING_REPLACEMENTS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

function deepMapStrings(obj, fn) {
  if (typeof obj === 'string') return fn(obj);
  if (Array.isArray(obj)) return obj.map((v) => deepMapStrings(v, fn));
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, deepMapStrings(v, fn)])
    );
  }
  return obj;
}

function translateTree(obj, map) {
  return deepMapStrings(obj, (s) => map[s] ?? s);
}

const COOKIES_EN_TO_PT_PT = {
  'What are Cookies: Complete Guide to Management and Security':
    'O que são cookies: guia completo de gestão e segurança',
  'Complete guide to cookie files: what they are, why they are needed, how to manage and clean them. Everything about security and privacy on the internet.':
    'Guia completo sobre ficheiros cookie: o que são, para que servem, como gerir e limpar. Tudo sobre segurança e privacidade na Internet.',
  'Everything about cookie files: types, purpose, management and cleaning. How to protect your privacy on the internet.':
    'Tudo sobre ficheiros cookie: tipos, finalidade, gestão e limpeza. Como proteger a sua privacidade na Internet.',
  'Cookies: Complete Guide for Users': 'Cookies: guia completo para utilizadores',
  'Everything you need to know about cookie files, management and security':
    'Tudo o que precisa de saber sobre ficheiros cookie, gestão e segurança',
  Security: 'Segurança',
  'October 29, 2024': '29 de outubro de 2024',
  '12 min read': '12 min de leitura',
  'Every time you visit a website, you are greeted with a message about cookie usage. But what are they really? In this guide, we will analyze everything about cookie files: from basics to advanced security settings.':
    'Sempre que visita um site, é recebido por uma mensagem sobre a utilização de cookies. Mas o que são afinal? Neste guia, analisamos tudo sobre ficheiros cookie: desde o básico até definições avançadas de segurança.',
  '🍪 What are Cookie Files?': '🍪 O que são ficheiros cookie?',
  '<strong>Cookies</strong> are small text files that websites save on your device. They contain information about your actions on the internet and help websites "remember" you.':
    '<strong>Cookies</strong> são pequenos ficheiros de texto que os sites guardam no seu dispositivo. Contêm informação sobre as suas acções na Internet e ajudam os sites a «recordar» o utilizador.',
  '💡 Simple Analogy': '💡 Analogia simples',
  'Imagine that cookies are a business card you leave at a cafe. On your next visit, the waiter recognizes you and remembers what coffee you prefer.':
    'Imagine que os cookies são um cartão de visita que deixa num café. Na visita seguinte, o empregado reconhece-o e lembra-se do café que prefere.',
  Identification: 'Identificação',
  'The website recognizes you on subsequent visits': 'O site reconhece-o em visitas posteriores',
  'Shopping Cart': 'Carrinho de compras',
  'Saves items even if you leave the website': 'Guarda artigos mesmo que saia do site',
  Settings: 'Definições',
  'Remembers language, currency and other preferences': 'Recorda idioma, moeda e outras preferências',
  '🔧 How Do Cookies Work?': '🔧 Como funcionam os cookies?',
  'First Visit to a Website': 'Primeira visita a um site',
  'When you first visit a website, the server sends a cookie file to your browser.':
    'Quando visita um site pela primeira vez, o servidor envia um ficheiro cookie para o seu navegador.',
  'Information Storage': 'Armazenamento de informação',
  'The browser saves cookies on your device. This usually happens in a special folder.':
    'O navegador guarda cookies no seu dispositivo. Isto acontece normalmente numa pasta especial.',
  'Subsequent Visits': 'Visitas posteriores',
  'On your next visit, the browser sends cookies back to the server so the website can "recognize" you.':
    'Na visita seguinte, o navegador envia os cookies de volta ao servidor para o site o poder «reconhecer».',
  'Cookie File Example:': 'Exemplo de ficheiro cookie:',
  '📊 Types of Cookie Files': '📊 Tipos de ficheiros cookie',
  'Cookie Type': 'Tipo de cookie',
  Purpose: 'Finalidade',
  Lifetime: 'Duração',
  Example: 'Exemplo',
  '<strong>Session</strong>': '<strong>Sessão</strong>',
  'Stored only during browser session': 'Armazenados apenas durante a sessão do navegador',
  'Until browser is closed': 'Até fechar o navegador',
  'Shopping cart': 'Carrinho de compras',
  '<strong>Persistent</strong>': '<strong>Persistentes</strong>',
  'Saved after browser is closed': 'Guardados após fechar o navegador',
  'Days to years': 'Dias a anos',
  'Language settings': 'Definições de idioma',
  '<strong>Third-party</strong>': '<strong>Terceiros</strong>',
  'Set by other domains': 'Definidos por outros domínios',
  Variable: 'Variável',
  'Advertising trackers': 'Rastreadores publicitários',
  '<strong>First-party</strong>': '<strong>Próprios</strong>',
  'Set by the visited website': 'Definidos pelo site visitado',
  'Authorization data': 'Dados de autorização',
  '<strong>Supercookies</strong>': '<strong>Supercookies</strong>',
  'Hard-to-remove cookies': 'Cookies difíceis de remover',
  Permanent: 'Permanentes',
  'Tracking systems': 'Sistemas de rastreamento',
  '⚠️ Attention: Third-party Cookies': '⚠️ Atenção: cookies de terceiros',
  'Third-party cookies are often used to track your activity across different websites. Modern browsers are gradually phasing out their support to protect privacy.':
    'Os cookies de terceiros são frequentemente usados para rastrear a sua actividade em diferentes sites. Os navegadores modernos estão gradualmente a eliminar o suporte para proteger a privacidade.',
  '🧹 Why Clean Cookies?': '🧹 Porquê limpar cookies?',
  'Protection against session theft and unauthorized access':
    'Protecção contra roubo de sessão e acesso não autorizado',
  Privacy: 'Privacidade',
  'Removal of tracking cookies and browsing history':
    'Remoção de cookies de rastreamento e histórico de navegação',
  'Free Up Space': 'Libertar espaço',
  'Cookies take up space on your device': 'Os cookies ocupam espaço no seu dispositivo',
  '📋 Situations When You Need to Clean Cookies:':
    '📋 Situações em que precisa de limpar cookies:',
  '<strong>Login problems</strong> on websites': '<strong>Problemas de início de sessão</strong> em sites',
  '<strong>Slow performance</strong> of the browser': '<strong>Desempenho lento</strong> do navegador',
  '<strong>Incorrect display</strong> of websites': '<strong>Apresentação incorrecta</strong> de sites',
  '<strong>Selling or transferring</strong> the device': '<strong>Venda ou transferência</strong> do dispositivo',
  '<strong>Suspicious activity</strong> on accounts': '<strong>Actividade suspeita</strong> em contas',
  '🔧 How to Clean Cookies': '🔧 Como limpar cookies',
  '🌐 Google Chrome': '🌐 Google Chrome',
  'Open <strong>Settings</strong> → <strong>Privacy and Security</strong>':
    'Abra <strong>Definições</strong> → <strong>Privacidade e segurança</strong>',
  'Select <strong>Cookies and Site Data</strong>': 'Seleccione <strong>Cookies e dados de sites</strong>',
  'Click <strong>Delete All Cookies</strong>': 'Clique em <strong>Eliminar todos os cookies</strong>',
  'Confirm the action': 'Confirme a acção',
  '🦊 Mozilla Firefox': '🦊 Mozilla Firefox',
  'Go to <strong>Settings</strong> → <strong>Privacy & Security</strong>':
    'Vá a <strong>Definições</strong> → <strong>Privacidade e segurança</strong>',
  'In the "Cookies and Site Data" section, click <strong>Delete Data</strong>':
    'Na secção «Cookies e dados de sites», clique em <strong>Eliminar dados</strong>',
  'Check <strong>Cookies and Site Data</strong>': 'Marque <strong>Cookies e dados de sites</strong>',
  'Click <strong>Delete</strong>': 'Clique em <strong>Eliminar</strong>',
  '🅰️ Apple Safari': '🅰️ Apple Safari',
  'Open <strong>Safari Settings</strong>': 'Abra <strong>Definições do Safari</strong>',
  'Go to the <strong>Privacy</strong> tab': 'Vá ao separador <strong>Privacidade</strong>',
  'Click <strong>Manage Website Data</strong>': 'Clique em <strong>Gerir dados de websites</strong>',
  'Select sites and click <strong>Remove</strong> or <strong>Remove All</strong>':
    'Seleccione sites e clique em <strong>Remover</strong> ou <strong>Remover tudo</strong>',
  '💡 Professional Advice': '💡 Conselho profissional',
  'Use incognito/private browsing mode. In this mode, cookies are automatically deleted after closing the window.':
    'Utilize o modo de navegação anónima/privada. Neste modo, os cookies são eliminados automaticamente ao fechar a janela.',
  '⚡ Quick Cleanup with Keyboard Shortcuts:': '⚡ Limpeza rápida com atalhos de teclado:',
  '<strong>Ctrl+Shift+Delete</strong> (Windows/Linux) - opens the history cleanup window':
    '<strong>Ctrl+Shift+Delete</strong> (Windows/Linux) — abre a janela de limpeza do histórico',
  '<strong>Cmd+Shift+Delete</strong> (Mac) - similar function in macOS':
    '<strong>Cmd+Shift+Delete</strong> (Mac) — função semelhante no macOS',
  '🎛️ Cookie Management: Best Practices': '🎛️ Gestão de cookies: boas práticas',
  'Block Third-party Cookies': 'Bloquear cookies de terceiros',
  'Enable third-party cookie blocking in your browser settings. This will significantly improve your privacy.':
    'Active o bloqueio de cookies de terceiros nas definições do navegador. Isto melhorará significativamente a sua privacidade.',
  'Use Whitelist': 'Utilizar lista branca',
  'Allow cookies only for trusted websites that you frequently visit.':
    'Permita cookies apenas em sites de confiança que visita frequentemente.',
  'Regular Cleanup': 'Limpeza regular',
  'Set a reminder to clean cookies every 1-3 months depending on activity.':
    'Defina um lembrete para limpar cookies a cada 1–3 meses, consoante a actividade.',
  'Management Extensions': 'Extensões de gestão',
  'Use extensions like "Cookie AutoDelete" for automatic management.':
    'Utilize extensões como «Cookie AutoDelete» para gestão automática.',
  '🛡️ Extensions for Cookie Management': '🛡️ Extensões para gestão de cookies',
  '<strong>Cookie AutoDelete</strong> - automatically deletes cookies from closed tabs':
    '<strong>Cookie AutoDelete</strong> — elimina automaticamente cookies de separadores fechados',
  '<strong>uBlock Origin</strong> - blocks trackers and advertising cookies':
    '<strong>uBlock Origin</strong> — bloqueia rastreadores e cookies publicitários',
  '<strong>Privacy Badger</strong> - automatically blocks invisible trackers':
    '<strong>Privacy Badger</strong> — bloqueia automaticamente rastreadores invisíveis',
  '🔐 Cookie Security': '🔐 Segurança de cookies',
  '🚨 Dangerous Types of Attacks': '🚨 Tipos perigosos de ataques',
  '<strong>Cookie interception</strong> through unsecured networks':
    '<strong>Interceptação de cookies</strong> através de redes não seguras',
  '<strong>XSS attacks</strong> - cookie theft through website vulnerabilities':
    '<strong>Ataques XSS</strong> — roubo de cookies através de vulnerabilidades do site',
  '<strong>Session hijacking</strong> - unauthorized access to sessions':
    '<strong>Sequestro de sessão</strong> — acesso não autorizado a sessões',
  '🛡️ Protection Measures:': '🛡️ Medidas de protecção:',
  'Protection Measure': 'Medida de protecção',
  'How it works': 'Como funciona',
  Effectiveness: 'Eficácia',
  '<strong>HTTPS</strong>': '<strong>HTTPS</strong>',
  'Encrypts cookie transmission': 'Encripta a transmissão de cookies',
  High: 'Alta',
  '<strong>HttpOnly flag</strong>': '<strong>Flag HttpOnly</strong>',
  'Prevents access to cookies via JavaScript': 'Impede acesso a cookies via JavaScript',
  '<strong>Secure flag</strong>': '<strong>Flag Secure</strong>',
  'Transmission only via HTTPS': 'Transmissão apenas via HTTPS',
  '<strong>SameSite attribute</strong>': '<strong>Atributo SameSite</strong>',
  'Prevents sending cookies from other sites': 'Impede o envio de cookies de outros sites',
  'Very high': 'Muito alta',
  '📋 Cookie Security Checklist': '📋 Lista de verificação de segurança de cookies',
  'I block third-party cookies in browser settings':
    'Bloqueio cookies de terceiros nas definições do navegador',
  'Regularly clean cookies (every 1-3 months)': 'Limpo cookies regularmente (a cada 1–3 meses)',
  'Use incognito mode for sensitive activities':
    'Utilizo modo anónimo para actividades sensíveis',
  'Check that important sites use HTTPS': 'Verifico que sites importantes usam HTTPS',
  'Installed extensions for cookie management': 'Tenho extensões instaladas para gestão de cookies',
  '❓ Frequently Asked Questions': '❓ Perguntas frequentes',
  '🤔 Will cleaning cookies cause problems with websites?':
    '🤔 Limpar cookies causará problemas nos sites?',
  '<strong>Yes, temporarily.</strong> After cleaning cookies, you will need to log in again to websites where you were authorized. Settings (language, theme) will also be reset.':
    '<strong>Sim, temporariamente.</strong> Após limpar cookies, terá de iniciar sessão novamente nos sites onde estava autenticado. As definições (idioma, tema) também serão repostas.',
  '🔒 Can cookies contain viruses?': '🔒 Os cookies podem conter vírus?',
  '<strong>No.</strong> Cookies are simple text files that cannot contain executable code. However, they can be used for tracking and session theft.':
    '<strong>Não.</strong> Os cookies são ficheiros de texto simples que não podem conter código executável. No entanto, podem ser usados para rastreamento e roubo de sessão.',
  '📱 Do I need to clean cookies on mobile devices?':
    '📱 Preciso de limpar cookies em dispositivos móveis?',
  '<strong>Yes.</strong> Mobile browsers also use cookies, and they should be periodically cleaned to free up space and protect privacy.':
    '<strong>Sim.</strong> Os navegadores móveis também usam cookies e devem ser limpos periodicamente para libertar espaço e proteger a privacidade.',
  '⚡ Do cookies slow down browser performance?':
    '⚡ Os cookies abrandam o desempenho do navegador?',
  '<strong>They can.</strong> A large number of cookies can slightly slow down browser performance, especially on older devices.':
    '<strong>Podem.</strong> Um grande número de cookies pode abrandar ligeiramente o navegador, especialmente em dispositivos mais antigos.',
  '🌍 What is GDPR and cookies?': '🌍 O que é o RGPD e os cookies?',
  '<strong>GDPR</strong> is a European data protection regulation that requires websites to obtain your consent before setting cookies.':
    'O <strong>RGPD</strong> é um regulamento europeu de protecção de dados que exige que os sites obtenham o seu consentimento antes de definir cookies.',
  '🎯 Key Takeaways:': '🎯 Conclusões principais:',
  'Cookies are necessary for convenient internet work':
    'Os cookies são necessários para uma utilização conveniente da Internet',
  'Regular cleaning improves security and privacy':
    'A limpeza regular melhora a segurança e a privacidade',
  'Blocking third-party cookies protects against tracking':
    'Bloquear cookies de terceiros protege contra rastreamento',
  'Use modern browsers with enhanced privacy protection':
    'Utilize navegadores modernos com protecção de privacidade reforçada',
  'Always read cookie usage policies on websites':
    'Leia sempre as políticas de utilização de cookies nos sites',
  'Table of Contents': 'Índice',
  'What are cookies?': 'O que são cookies?',
  'How do cookies work?': 'Como funcionam os cookies?',
  'Types of cookie files': 'Tipos de ficheiros cookie',
  'Why clean cookies?': 'Porquê limpar cookies?',
  'How to clean cookies': 'Como limpar cookies',
  'Cookie management': 'Gestão de cookies',
  'Frequently asked questions': 'Perguntas frequentes',
  'Share article': 'Partilhar artigo',
  Telegram: 'Telegram',
  VKontakte: 'VKontakte',
  Comments: 'Comentários',
  'Leave your feedback': 'Deixe o seu feedback',
  'Your name:': 'O seu nome:',
  'Your comment:': 'O seu comentário:',
  Submit: 'Enviar',
  'No comments yet. Be the first!': 'Ainda não há comentários. Seja o primeiro!',
  'Subscribe on Telegram': 'Subscrever no Telegram',
  'Subscribe on VK': 'Subscrever no VK',
  '↑ Top': '↑ Topo',
};

function fixFromPtBr(file) {
  const filePath = path.join(dataDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!data['pt-br']) {
    console.warn(`skip ${file}: no pt-br`);
    return false;
  }
  let ptPt = brToPtPt(structuredClone(data['pt-br']));
  ptPt = deepMapStrings(ptPt, applyExtraReplacements);
  data['pt-pt'] = ptPt;
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
  return true;
}

function fixCookiesGuide() {
  const filePath = path.join(dataDir, 'cookiesCompleteGuide.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!data.en) throw new Error('cookiesCompleteGuide: missing en block');
  data['pt-pt'] = translateTree(structuredClone(data.en), COOKIES_EN_TO_PT_PT);
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

let fixed = 0;
for (const file of FILES_FROM_PT_BR) {
  if (fixFromPtBr(file)) {
    fixed++;
    console.log('pt-pt updated:', file);
  }
}
fixCookiesGuide();
console.log('pt-pt updated: cookiesCompleteGuide.json (from en, EU-PT)');
console.log(`Done: ${fixed + 1} files`);
