import fs from 'node:fs';
import path from 'node:path';

const GAME_OVER_ALERT = {
  ru: 'Игра окончена! Ваш счёт: {score}',
  ar: 'انتهت اللعبة! نتيجتك: {score}',
  az: 'Oyun bitdi! Hesabınız: {score}',
  be: 'Гульня скончана! Ваш лік: {score}',
  bg: 'Играта приключи! Вашият резултат: {score}',
  bn: 'গেম শেষ! আপনার স্কোর: {score}',
  cs: 'Konec hry! Váš skóre: {score}',
  da: 'Spillet er slut! Din score: {score}',
  de: 'Spiel vorbei! Dein Punktestand: {score}',
  el: 'Τέλος παιχνιδιού! Η βαθμολογία σας: {score}',
  en: 'Game over! Your score: {score}',
  es: '¡Fin del juego! Tu puntuación: {score}',
  'es-419': '¡Fin del juego! Tu puntuación: {score}',
  fa: 'بازی تمام شد! امتیاز شما: {score}',
  fi: 'Peli ohi! Pisteesi: {score}',
  fil: 'Tapos na ang laro! Ang iyong score: {score}',
  fr: 'Partie terminée ! Votre score : {score}',
  he: 'המשחק נגמר! הניקוד שלך: {score}',
  hi: 'खेल समाप्त! आपका स्कोर: {score}',
  hu: 'Játék vége! A pontszámod: {score}',
  hy: 'Խաղն ավարտված է! Ձեր միավորները՝ {score}',
  id: 'Permainan selesai! Skor Anda: {score}',
  it: 'Partita finita! Il tuo punteggio: {score}',
  ja: 'ゲームオーバー！スコア: {score}',
  ka: 'თამაში დასრულდა! თქვენი ქულა: {score}',
  kk: 'Ойын аяқталды! Сіздің ұпайыңыз: {score}',
  ko: '게임 오버! 점수: {score}',
  ms: 'Permainan tamat! Skor anda: {score}',
  nb: 'Spillet er over! Poengsummen din: {score}',
  nl: 'Spel voorbij! Je score: {score}',
  pl: 'Koniec gry! Twój wynik: {score}',
  'pt-br': 'Fim de jogo! Sua pontuação: {score}',
  'pt-pt': 'Fim de jogo! A sua pontuação: {score}',
  ro: 'Joc terminat! Scorul tău: {score}',
  sr: 'Игра је завршена! Ваш резултат: {score}',
  sv: 'Spelet är slut! Din poäng: {score}',
  th: 'เกมจบแล้ว! คะแนนของคุณ: {score}',
  tr: 'Oyun bitti! Skorunuz: {score}',
  ur: 'کھیل ختم! آپ کا اسکور: {score}',
  uz: "O'yin tugadi! Sizning hisobingiz: {score}",
  vi: 'Trò chơi kết thúc! Điểm của bạn: {score}',
  'zh-cn': '游戏结束！您的得分：{score}',
  ps: 'لوبه پای ته ورسېده! ستاسو نمرې: {score}',
  sd: 'راند ختم! توهان جو اسڪور: {score}',
  ug: 'ئويۇن ئاخىرلاندى! نومۇرىڭىز: {score}',
  dv: 'ގޭމް ނިމިއްޖެ! ތިޔާގެ ސްކޯރް: {score}',
  ks: 'گیم ختم! تہند اسکور: {score}',
  'ku-arab': 'یاری کۆتایی هات! نمرەکەت: {score}',
  yi: 'שפּיל פֿאַרענדיקט! דיין סקאָר: {score}',
};

const filePath = path.join(process.cwd(), 'assembly', 'site', '_data', 'game2048Translations.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

for (const [locale, block] of Object.entries(data)) {
  const text = GAME_OVER_ALERT[locale];
  if (!text) throw new Error(`Missing gameOverAlert for locale: ${locale}`);
  block.game2048.gameOverAlert = text;
}

fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
console.log(`Patched gameOverAlert for ${Object.keys(data).length} locales`);
