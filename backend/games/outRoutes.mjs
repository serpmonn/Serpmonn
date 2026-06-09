// Партнёрские ссылки — редирект через /out?game=...
// Пользователь видит мгновенный переход, партнёр видит Referer: serpmonn.ru

const GAME_LINKS = {
  'atomic-heart':          'https://rzekl.com/g/ky2n1t1o3k7c9ceea34447ed6832c6937d428ecd/?erid=5jtCeReNwxHpfQTFQqS8mWE',
  'lost-ark':              'https://ficca2021.com/g/xv8wkx2q4t7c9ceea3443cb67d624d0197bfefde/?erid=25H8d7vbP8SRTvJ4WQksxm',
  'allods-online':         'https://codeaven.com/g/pw3myei9ht7c9ceea344a4713a8ace3ce163585e/?erid=5jtCeReNwxHpfQTGQVAJcnX',
  'amazing-online':        'https://rzekl.com/g/txwwmat2wx7c9ceea344c065b8a873cafad31500/?erid=2bL9aMPo2e49hMef4pfym3SuLK',
  'evolve-rp':             'https://xmknb.com/g/ilvfzhs26x7c9ceea34461e800f2bd/?erid=2bL9aMPo2e49hMef4piV5BfNfR',
  'nextrp':                'https://zmgig.com/g/yog728vijm7c9ceea344f0d389d68db1cf1bbd51/?erid=MvGzQC98w3Z1gMq1oSV73txX',
  'malinovka':             'https://xcdus.com/g/c5e9n6r3ew7c9ceea344c5c964748a/?erid=MvGzQC98w3Z1gMq1pRgkzi9d',
  'lineage-2-essence':     'https://rzekl.com/g/7lgnbu225t7c9ceea3444cb8738d24/?erid=MvGzQC98w3Z1gMq1oSV73uLi',
  'lineage-2':             'https://twnfz.com/g/f15f0db8437c9ceea344d8792ef979/?erid=5jtCeReLm1S3Xx3Lf3au61G',
  'lineage-2-legacy':      'https://dhwnh.com/g/4z1liq0shk7c9ceea34426d3115512/?erid=2bL9aMPo2e49hMef4pfzSMbrkc',
  'black-desert':          'https://rzekl.com/g/fy90i94aoa7c9ceea3443fcec4d4a3/?erid=MvGzQC98w3Z1gMq1oS2xNYhq',
  'warface':               'https://dorinebeaumont.com/g/jmyq21wgw87c9ceea344a78ad6f5e61bedefe48e/?erid=5jtCeReNwxHpfQTEujFRZrz',
  'gta5rp':                'https://tywhh.com/g/q10rxle26a7c9ceea34443269ad76debd4fd1b95/?erid=2bL9aMPo2e49hMef4piUr6ZhiU',
  'ragnarok-online-prime': 'https://zallj.com/g/7pfesw5toq7c9ceea344dae6a8f6c8/?erid=2bL9aMPo2e49hMef4pdz7j98Qe',
};

// Разрешённые домены (Admitad-сеть)
const ALLOWED_HOSTS = new Set([
  'rzekl.com', 'ficca2021.com', 'codeaven.com', 'xmknb.com',
  'zmgig.com', 'xcdus.com', 'twnfz.com', 'dhwnh.com',
  'dorinebeaumont.com', 'tywhh.com', 'zallj.com',
]);

export function outRoutes(app) {
  // GET /out?game=gta5rp
  app.get('/out', (req, res) => {
    const { game } = req.query;
    const dest = GAME_LINKS[game];

    if (!dest) {
      return res.status(404).send('Game not found');
    }

    const host = new URL(dest).hostname;
    if (!ALLOWED_HOSTS.has(host)) {
      return res.status(403).send('Forbidden');
    }

    // Логируем клик
    console.log(`[affiliate/out] game=${game} ip=${req.ip} ua=${req.headers['user-agent']?.slice(0, 80)}`);

    // Мгновенный 302-редирект — браузер передаёт Referer: serpmonn.ru
    res.redirect(302, dest);
  });
}
