import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const dataDir = path.join(root, 'assembly/site/_data');

const locales = JSON.parse(fs.readFileSync(path.join(dataDir, 'locales.json'), 'utf8'));
const login = JSON.parse(fs.readFileSync(path.join(dataDir, 'login.json'), 'utf8'));
const register = JSON.parse(fs.readFileSync(path.join(dataDir, 'registerTranslations.json'), 'utf8'));
const forgot = JSON.parse(fs.readFileSync(path.join(dataDir, 'forgot.json'), 'utf8'));

const FALLBACK = {
  az: 'tr', be: 'ru', bg: 'ru', bn: 'en', cs: 'pl', da: 'de', el: 'en', 'es-419': 'es',
  fa: 'ar', fi: 'de', fil: 'en', he: 'ar', hi: 'en', hu: 'pl', hy: 'ru', id: 'en', ka: 'ru',
  kk: 'ru', ms: 'en', nb: 'de', nl: 'de', 'pt-pt': 'es', ro: 'en', sr: 'ru', sv: 'de',
  th: 'en', ur: 'ar', uz: 'tr', ps: 'ar', sd: 'ur', ug: 'ar', dv: 'ar', ks: 'ur',
  'ku-arab': 'ar', yi: 'de', vi: 'en'
};

/** Auth-only strings (not in login/register). */
const EXTRA = {
  ru: {
    mainTitle: 'Войти в Serpmonn',
    orDivider: 'или',
    vkButton: 'Войти через VK ID',
    registerSuccessTitle: 'Проверьте почту',
    registerSuccessText: 'Мы отправили письмо на <strong>{email}</strong>. Перейдите по ссылке в письме, чтобы подтвердить аккаунт и войти.',
    ogDescription: 'Войдите или зарегистрируйтесь в Serpmonn через VK ID или email.',
    twitterDescription: 'Войдите или зарегистрируйтесь в Serpmonn через VK ID или email.'
  },
  en: {
    mainTitle: 'Sign in to Serpmonn',
    orDivider: 'or',
    vkButton: 'Continue with VK ID',
    registerSuccessTitle: 'Check your inbox',
    registerSuccessText: 'We sent a confirmation email to <strong>{email}</strong>. Open the link in that message to confirm your account and sign in.',
    ogDescription: 'Sign in or register on Serpmonn with VK ID or email.',
    twitterDescription: 'Sign in or register on Serpmonn with VK ID or email.'
  },
  de: {
    mainTitle: 'Bei Serpmonn anmelden',
    orDivider: 'oder',
    vkButton: 'Mit VK ID anmelden',
    registerSuccessTitle: 'Posteingang prüfen',
    registerSuccessText: 'Wir haben eine Bestätigungs-E-Mail an <strong>{email}</strong> gesendet. Öffnen Sie den Link in der Nachricht, um Ihr Konto zu bestätigen und sich anzumelden.',
    ogDescription: 'Melden Sie sich bei Serpmonn an oder registrieren Sie sich mit VK ID oder E-Mail.',
    twitterDescription: 'Melden Sie sich bei Serpmonn an oder registrieren Sie sich mit VK ID oder E-Mail.'
  },
  fr: {
    mainTitle: 'Se connecter à Serpmonn',
    orDivider: 'ou',
    vkButton: 'Continuer avec VK ID',
    registerSuccessTitle: 'Vérifiez votre boîte mail',
    registerSuccessText: 'Nous avons envoyé un e-mail de confirmation à <strong>{email}</strong>. Ouvrez le lien dans ce message pour confirmer votre compte et vous connecter.',
    ogDescription: 'Connectez-vous ou inscrivez-vous sur Serpmonn avec VK ID ou e-mail.',
    twitterDescription: 'Connectez-vous ou inscrivez-vous sur Serpmonn avec VK ID ou e-mail.'
  },
  es: {
    mainTitle: 'Iniciar sesión en Serpmonn',
    orDivider: 'o',
    vkButton: 'Continuar con VK ID',
    registerSuccessTitle: 'Revisa tu correo',
    registerSuccessText: 'Enviamos un correo de confirmación a <strong>{email}</strong>. Abre el enlace del mensaje para confirmar tu cuenta e iniciar sesión.',
    ogDescription: 'Inicia sesión o regístrate en Serpmonn con VK ID o correo electrónico.',
    twitterDescription: 'Inicia sesión o regístrate en Serpmonn con VK ID o correo electrónico.'
  },
  it: {
    mainTitle: 'Accedi a Serpmonn',
    orDivider: 'oppure',
    vkButton: 'Continua con VK ID',
    registerSuccessTitle: 'Controlla la posta',
    registerSuccessText: 'Abbiamo inviato un\'e-mail di conferma a <strong>{email}</strong>. Apri il link nel messaggio per confermare l\'account e accedere.',
    ogDescription: 'Accedi o registrati su Serpmonn con VK ID o e-mail.',
    twitterDescription: 'Accedi o registrati su Serpmonn con VK ID o e-mail.'
  },
  'pt-br': {
    mainTitle: 'Entrar no Serpmonn',
    orDivider: 'ou',
    vkButton: 'Continuar com VK ID',
    registerSuccessTitle: 'Verifique seu e-mail',
    registerSuccessText: 'Enviamos um e-mail de confirmação para <strong>{email}</strong>. Abra o link na mensagem para confirmar sua conta e entrar.',
    ogDescription: 'Entre ou cadastre-se no Serpmonn com VK ID ou e-mail.',
    twitterDescription: 'Entre ou cadastre-se no Serpmonn com VK ID ou e-mail.'
  },
  pl: {
    mainTitle: 'Zaloguj się do Serpmonn',
    orDivider: 'lub',
    vkButton: 'Kontynuuj przez VK ID',
    registerSuccessTitle: 'Sprawdź skrzynkę',
    registerSuccessText: 'Wysłaliśmy e-mail potwierdzający na <strong>{email}</strong>. Otwórz link w wiadomości, aby potwierdzić konto i się zalogować.',
    ogDescription: 'Zaloguj się lub zarejestruj w Serpmonn przez VK ID lub e-mail.',
    twitterDescription: 'Zaloguj się lub zarejestruj w Serpmonn przez VK ID lub e-mail.'
  },
  tr: {
    mainTitle: 'Serpmonn\'a giriş yap',
    orDivider: 'veya',
    vkButton: 'VK ID ile devam et',
    registerSuccessTitle: 'Gelen kutunuzu kontrol edin',
    registerSuccessText: '<strong>{email}</strong> adresine bir onay e-postası gönderdik. Hesabınızı onaylamak ve giriş yapmak için mesajdaki bağlantıyı açın.',
    ogDescription: 'VK ID veya e-posta ile Serpmonn\'a giriş yapın veya kayıt olun.',
    twitterDescription: 'VK ID veya e-posta ile Serpmonn\'a giriş yapın veya kayıt olun.'
  },
  ar: {
    mainTitle: 'تسجيل الدخول إلى Serpmonn',
    orDivider: 'أو',
    vkButton: 'المتابعة عبر VK ID',
    registerSuccessTitle: 'تحقق من بريدك',
    registerSuccessText: 'أرسلنا رسالة تأكيد إلى <strong>{email}</strong>. افتح الرابط في الرسالة لتأكيد حسابك وتسجيل الدخول.',
    ogDescription: 'سجّل الدخول أو أنشئ حسابًا على Serpmonn عبر VK ID أو البريد الإلكتروني.',
    twitterDescription: 'سجّل الدخول أو أنشئ حسابًا على Serpmonn عبر VK ID أو البريد الإلكتروني.'
  },
  'zh-cn': {
    mainTitle: '登录 Serpmonn',
    orDivider: '或',
    vkButton: '使用 VK ID 继续',
    registerSuccessTitle: '请查收邮件',
    registerSuccessText: '我们已向 <strong>{email}</strong> 发送确认邮件。请打开邮件中的链接以确认账户并登录。',
    ogDescription: '使用 VK ID 或邮箱登录或注册 Serpmonn。',
    twitterDescription: '使用 VK ID 或邮箱登录或注册 Serpmonn。'
  },
  ja: {
    mainTitle: 'Serpmonn にサインイン',
    orDivider: 'または',
    vkButton: 'VK ID で続行',
    registerSuccessTitle: '受信トレイを確認',
    registerSuccessText: '<strong>{email}</strong> に確認メールを送信しました。メール内のリンクを開いてアカウントを確認し、サインインしてください。',
    ogDescription: 'VK ID またはメールで Serpmonn にサインインまたは登録。',
    twitterDescription: 'VK ID またはメールで Serpmonn にサインインまたは登録。'
  },
  ko: {
    mainTitle: 'Serpmonn 로그인',
    orDivider: '또는',
    vkButton: 'VK ID로 계속',
    registerSuccessTitle: '받은편지함을 확인하세요',
    registerSuccessText: '<strong>{email}</strong>(으)로 확인 이메일을 보냈습니다. 메시지의 링크를 열어 계정을 확인하고 로그인하세요.',
    ogDescription: 'VK ID 또는 이메일로 Serpmonn에 로그인하거나 가입하세요.',
    twitterDescription: 'VK ID 또는 이메일로 Serpmonn에 로그인하거나 가입하세요.'
  },
  hi: {
    mainTitle: 'Serpmonn में साइन इन करें',
    orDivider: 'या',
    vkButton: 'VK ID से जारी रखें',
    registerSuccessTitle: 'अपना इनबॉक्स देखें',
    registerSuccessText: 'हमने <strong>{email}</strong> पर पुष्टि ईमेल भेजा है। खाता पुष्टि करने और साइन इन करने के लिए संदेश में लिंक खोलें।',
    ogDescription: 'VK ID या ईमेल से Serpmonn में साइन इन या पंजीकरण करें।',
    twitterDescription: 'VK ID या ईमेल से Serpmonn में साइन इन या पंजीकरण करें।'
  },
  nl: {
    mainTitle: 'Inloggen bij Serpmonn',
    orDivider: 'of',
    vkButton: 'Doorgaan met VK ID',
    registerSuccessTitle: 'Controleer je inbox',
    registerSuccessText: 'We hebben een bevestigingsmail gestuurd naar <strong>{email}</strong>. Open de link in het bericht om je account te bevestigen en in te loggen.',
    ogDescription: 'Log in of registreer op Serpmonn met VK ID of e-mail.',
    twitterDescription: 'Log in of registreer op Serpmonn met VK ID of e-mail.'
  },
  sv: {
    mainTitle: 'Logga in på Serpmonn',
    orDivider: 'eller',
    vkButton: 'Fortsätt med VK ID',
    registerSuccessTitle: 'Kontrollera inkorgen',
    registerSuccessText: 'Vi skickade ett bekräftelsemejl till <strong>{email}</strong>. Öppna länken i meddelandet för att bekräfta kontot och logga in.',
    ogDescription: 'Logga in eller registrera dig på Serpmonn med VK ID eller e-post.',
    twitterDescription: 'Logga in eller registrera dig på Serpmonn med VK ID eller e-post.'
  },
  da: {
    mainTitle: 'Log ind på Serpmonn',
    orDivider: 'eller',
    vkButton: 'Fortsæt med VK ID',
    registerSuccessTitle: 'Tjek din indbakke',
    registerSuccessText: 'Vi sendte en bekræftelsesmail til <strong>{email}</strong>. Åbn linket i beskeden for at bekræfte din konto og logge ind.',
    ogDescription: 'Log ind eller registrer dig på Serpmonn med VK ID eller e-mail.',
    twitterDescription: 'Log ind eller registrer dig på Serpmonn med VK ID eller e-mail.'
  },
  nb: {
    mainTitle: 'Logg inn på Serpmonn',
    orDivider: 'eller',
    vkButton: 'Fortsett med VK ID',
    registerSuccessTitle: 'Sjekk innboksen',
    registerSuccessText: 'Vi sendte en bekreftelses-e-post til <strong>{email}</strong>. Åpne lenken i meldingen for å bekrefte kontoen og logge inn.',
    ogDescription: 'Logg inn eller registrer deg på Serpmonn med VK ID eller e-post.',
    twitterDescription: 'Logg inn eller registrer deg på Serpmonn med VK ID eller e-post.'
  },
  fi: {
    mainTitle: 'Kirjaudu Serpmonniin',
    orDivider: 'tai',
    vkButton: 'Jatka VK ID:llä',
    registerSuccessTitle: 'Tarkista postilaatikkosi',
    registerSuccessText: 'Lähetimme vahvistussähköpostin osoitteeseen <strong>{email}</strong>. Avaa viestin linkki vahvistaaksesi tilin ja kirjautuaksesi.',
    ogDescription: 'Kirjaudu tai rekisteröidy Serpmonniin VK ID:llä tai sähköpostilla.',
    twitterDescription: 'Kirjaudu tai rekisteröidy Serpmonniin VK ID:llä tai sähköpostilla.'
  },
  cs: {
    mainTitle: 'Přihlásit se do Serpmonn',
    orDivider: 'nebo',
    vkButton: 'Pokračovat přes VK ID',
    registerSuccessTitle: 'Zkontrolujte e-mail',
    registerSuccessText: 'Odeslali jsme potvrzovací e-mail na <strong>{email}</strong>. Otevřete odkaz ve zprávě a potvrďte účet.',
    ogDescription: 'Přihlaste se nebo zaregistrujte na Serpmonn přes VK ID nebo e-mail.',
    twitterDescription: 'Přihlaste se nebo zaregistrujte na Serpmonn přes VK ID nebo e-mail.'
  },
  hu: {
    mainTitle: 'Bejelentkezés a Serpmonn-ba',
    orDivider: 'vagy',
    vkButton: 'Folytatás VK ID-val',
    registerSuccessTitle: 'Ellenőrizze a postaládáját',
    registerSuccessText: 'Megerősítő e-mailt küldtünk a következő címre: <strong>{email}</strong>. Nyissa meg az üzenet linkjét a fiók megerősítéséhez.',
    ogDescription: 'Jelentkezzen be vagy regisztráljon a Serpmonn-on VK ID-val vagy e-maillel.',
    twitterDescription: 'Jelentkezzen be vagy regisztráljon a Serpmonn-on VK ID-val vagy e-maillel.'
  },
  ro: {
    mainTitle: 'Conectează-te la Serpmonn',
    orDivider: 'sau',
    vkButton: 'Continuă cu VK ID',
    registerSuccessTitle: 'Verifică-ți e-mailul',
    registerSuccessText: 'Am trimis un e-mail de confirmare la <strong>{email}</strong>. Deschide linkul din mesaj pentru a confirma contul.',
    ogDescription: 'Conectează-te sau înregistrează-te pe Serpmonn cu VK ID sau e-mail.',
    twitterDescription: 'Conectează-te sau înregistrează-te pe Serpmonn cu VK ID sau e-mail.'
  },
  el: {
    mainTitle: 'Σύνδεση στο Serpmonn',
    orDivider: 'ή',
    vkButton: 'Συνέχεια με VK ID',
    registerSuccessTitle: 'Ελέγξτε τα εισερχόμενά σας',
    registerSuccessText: 'Στείλαμε email επιβεβαίωσης στο <strong>{email}</strong>. Ανοίξτε τον σύνδεσμο στο μήνυμα για να επιβεβαιώσετε τον λογαριασμό.',
    ogDescription: 'Συνδεθείτε ή εγγραφείτε στο Serpmonn με VK ID ή email.',
    twitterDescription: 'Συνδεθείτε ή εγγραφείτε στο Serpmonn με VK ID ή email.'
  },
  he: {
    mainTitle: 'התחברות ל-Serpmonn',
    orDivider: 'או',
    vkButton: 'המשך עם VK ID',
    registerSuccessTitle: 'בדוק את תיבת הדואר',
    registerSuccessText: 'שלחנו אימייל אישור ל-<strong>{email}</strong>. פתח את הקישור בהודעה כדי לאשר את החשבון ולהתחבר.',
    ogDescription: 'התחבר או הירשם ל-Serpmonn עם VK ID או אימייל.',
    twitterDescription: 'התחבר או הירשם ל-Serpmonn עם VK ID או אימייל.'
  },
  fa: {
    mainTitle: 'ورود به Serpmonn',
    orDivider: 'یا',
    vkButton: 'ادامه با VK ID',
    registerSuccessTitle: 'صندوق ورودی را بررسی کنید',
    registerSuccessText: 'ایمیل تأیید به <strong>{email}</strong> ارسال شد. پیوند داخل پیام را باز کنید تا حساب تأیید شود.',
    ogDescription: 'با VK ID یا ایمیل در Serpmonn وارد شوید یا ثبت‌نام کنید.',
    twitterDescription: 'با VK ID یا ایمیل در Serpmonn وارد شوید یا ثبت‌نام کنید.'
  },
  id: {
    mainTitle: 'Masuk ke Serpmonn',
    orDivider: 'atau',
    vkButton: 'Lanjutkan dengan VK ID',
    registerSuccessTitle: 'Periksa kotak masuk',
    registerSuccessText: 'Kami mengirim email konfirmasi ke <strong>{email}</strong>. Buka tautan di pesan untuk mengonfirmasi akun dan masuk.',
    ogDescription: 'Masuk atau daftar di Serpmonn dengan VK ID atau email.',
    twitterDescription: 'Masuk atau daftar di Serpmonn dengan VK ID atau email.'
  },
  vi: {
    mainTitle: 'Đăng nhập Serpmonn',
    orDivider: 'hoặc',
    vkButton: 'Tiếp tục với VK ID',
    registerSuccessTitle: 'Kiểm tra hộp thư',
    registerSuccessText: 'Chúng tôi đã gửi email xác nhận tới <strong>{email}</strong>. Mở liên kết trong thư để xác nhận tài khoản và đăng nhập.',
    ogDescription: 'Đăng nhập hoặc đăng ký Serpmonn bằng VK ID hoặc email.',
    twitterDescription: 'Đăng nhập hoặc đăng ký Serpmonn bằng VK ID hoặc email.'
  },
  th: {
    mainTitle: 'เข้าสู่ระบบ Serpmonn',
    orDivider: 'หรือ',
    vkButton: 'ดำเนินการต่อด้วย VK ID',
    registerSuccessTitle: 'ตรวจสอบกล่องจดหมาย',
    registerSuccessText: 'เราส่งอีเมลยืนยันไปที่ <strong>{email}</strong> แล้ว เปิดลิงก์ในข้อความเพื่อยืนยันบัญชีและเข้าสู่ระบบ',
    ogDescription: 'เข้าสู่ระบบหรือลงทะเบียน Serpmonn ด้วย VK ID หรืออีเมล',
    twitterDescription: 'เข้าสู่ระบบหรือลงทะเบียน Serpmonn ด้วย VK ID หรืออีเมล'
  },
  ms: {
    mainTitle: 'Log masuk ke Serpmonn',
    orDivider: 'atau',
    vkButton: 'Teruskan dengan VK ID',
    registerSuccessTitle: 'Semak peti masuk',
    registerSuccessText: 'Kami menghantar e-mel pengesahan ke <strong>{email}</strong>. Buka pautan dalam mesej untuk mengesahkan akaun dan log masuk.',
    ogDescription: 'Log masuk atau daftar di Serpmonn dengan VK ID atau e-mel.',
    twitterDescription: 'Log masuk atau daftar di Serpmonn dengan VK ID atau e-mel.'
  },
  fil: {
    mainTitle: 'Mag-sign in sa Serpmonn',
    orDivider: 'o',
    vkButton: 'Magpatuloy gamit ang VK ID',
    registerSuccessTitle: 'Tingnan ang inbox',
    registerSuccessText: 'Nagpadala kami ng confirmation email sa <strong>{email}</strong>. Buksan ang link sa mensahe para kumpirmahin ang account at mag-sign in.',
    ogDescription: 'Mag-sign in o mag-register sa Serpmonn gamit ang VK ID o email.',
    twitterDescription: 'Mag-sign in o mag-register sa Serpmonn gamit ang VK ID o email.'
  },
  bg: {
    mainTitle: 'Вход в Serpmonn',
    orDivider: 'или',
    vkButton: 'Продължи с VK ID',
    registerSuccessTitle: 'Проверете пощата',
    registerSuccessText: 'Изпратихме имейл за потвърждение на <strong>{email}</strong>. Отворете връзката в съобщението, за да потвърдите акаунта.',
    ogDescription: 'Влезте или се регистрирайте в Serpmonn с VK ID или имейл.',
    twitterDescription: 'Влезте или се регистрирайте в Serpmonn с VK ID или имейл.'
  },
  sr: {
    mainTitle: 'Пријава на Serpmonn',
    orDivider: 'или',
    vkButton: 'Настави са VK ID',
    registerSuccessTitle: 'Проверите пошту',
    registerSuccessText: 'Послали смо потврдни имејл на <strong>{email}</strong>. Отворите везу у поруци да потврдите налог.',
    ogDescription: 'Пријавите се или региструјте на Serpmonn преко VK ID или имејла.',
    twitterDescription: 'Пријавите се или региструјте на Serpmonn преко VK ID или имејла.'
  },
  be: {
    mainTitle: 'Уваход у Serpmonn',
    orDivider: 'або',
    vkButton: 'Працягнуць праз VK ID',
    registerSuccessTitle: 'Праверце пошту',
    registerSuccessText: 'Мы адправілі ліст на <strong>{email}</strong>. Адкрыйце спасылку ў лісце, каб пацвердзіць уліковы запіс.',
    ogDescription: 'Увайдзіце або зарэгіструйцеся ў Serpmonn праз VK ID або email.',
    twitterDescription: 'Увайдзіце або зарэгіструйцеся ў Serpmonn праз VK ID або email.'
  },
  kk: {
    mainTitle: 'Serpmonn-ға кіру',
    orDivider: 'немесе',
    vkButton: 'VK ID арқылы жалғастыру',
    registerSuccessTitle: 'Поштаны тексеріңіз',
    registerSuccessText: '<strong>{email}</strong> мекенжайына растау хатын жібердік. Аккаунтты растау үшін хабардағы сілтемені ашыңыз.',
    ogDescription: 'VK ID немесе email арқылы Serpmonn-ға кіріңіз немесе тіркеліңіз.',
    twitterDescription: 'VK ID немесе email арқылы Serpmonn-ға кіріңіз немесе тіркеліңіз.'
  },
  uz: {
    mainTitle: 'Serpmonn\'ga kirish',
    orDivider: 'yoki',
    vkButton: 'VK ID orqali davom etish',
    registerSuccessTitle: 'Pochtangizni tekshiring',
    registerSuccessText: '<strong>{email}</strong> manziliga tasdiqlash xati yubordik. Hisobni tasdiqlash uchun xabardagi havolani oching.',
    ogDescription: 'VK ID yoki email orqali Serpmonn\'ga kiring yoki ro\'yxatdan o\'ting.',
    twitterDescription: 'VK ID yoki email orqali Serpmonn\'ga kiring yoki ro\'yxatdan o\'ting.'
  },
  az: {
    mainTitle: 'Serpmonn-a daxil ol',
    orDivider: 'və ya',
    vkButton: 'VK ID ilə davam et',
    registerSuccessTitle: 'Poçtunuzu yoxlayın',
    registerSuccessText: '<strong>{email}</strong> ünvanına təsdiq e-poçtu göndərdik. Hesabı təsdiqləmək üçün mesajdakı linki açın.',
    ogDescription: 'VK ID və ya e-poçt ilə Serpmonn-a daxil olun və ya qeydiyyatdan keçin.',
    twitterDescription: 'VK ID və ya e-poçt ilə Serpmonn-a daxil olun və ya qeydiyyatdan keçin.'
  },
  hy: {
    mainTitle: 'Մուտք Serpmonn',
    orDivider: 'կամ',
    vkButton: 'Շարունակել VK ID-ով',
    registerSuccessTitle: 'Ստուգեք փոստարկղը',
    registerSuccessText: 'Հաստատման նամակ ենք ուղարկել <strong>{email}</strong> հասցեին։ Բացեք հղումը հաշիվը հաստատելու համար։',
    ogDescription: 'Մուտք գործեք կամ գրանցվեք Serpmonn-ում VK ID-ով կամ էլ. փոստով։',
    twitterDescription: 'Մուտք գործեք կամ գրանցվեք Serpmonn-ում VK ID-ով կամ էլ. փոստով։'
  },
  ka: {
    mainTitle: 'შესვლა Serpmonn-ში',
    orDivider: 'ან',
    vkButton: 'გაგრძელება VK ID-ით',
    registerSuccessTitle: 'შეამოწმეთ ფოსტა',
    registerSuccessText: 'დადასტურების წერილი გამოვგზავნეთ <strong>{email}</strong>-ზე. ანგარიშის დასადასტურებლად გახსენით ბმული.',
    ogDescription: 'შედით ან დარეგისტრირდით Serpmonn-ზე VK ID-ით ან ელფოსტით.',
    twitterDescription: 'შედით ან დარეგისტრირდით Serpmonn-ზე VK ID-ით ან ელფოსტით.'
  },
  bn: {
    mainTitle: 'Serpmonn-এ সাইন ইন',
    orDivider: 'অথবা',
    vkButton: 'VK ID দিয়ে চালিয়ে যান',
    registerSuccessTitle: 'ইনবক্স দেখুন',
    registerSuccessText: 'আমরা <strong>{email}</strong>-এ নিশ্চিতকরণ ইমেইল পাঠিয়েছি। অ্যাকাউন্ট নিশ্চিত করতে বার্তার লিঙ্ক খুলুন।',
    ogDescription: 'VK ID বা ইমেইল দিয়ে Serpmonn-এ সাইন ইন বা নিবন্ধন করুন।',
    twitterDescription: 'VK ID বা ইমেইল দিয়ে Serpmonn-এ সাইন ইন বা নিবন্ধন করুন।'
  },
  ur: {
    mainTitle: 'Serpmonn میں سائن ان',
    orDivider: 'یا',
    vkButton: 'VK ID کے ساتھ جاری رکھیں',
    registerSuccessTitle: 'ان باکس چیک کریں',
    registerSuccessText: 'ہم نے <strong>{email}</strong> پر تصدیقی ای میل بھیجی ہے۔ اکاؤنٹ کی تصدیق کے لیے پیغام میں لنک کھولیں۔',
    ogDescription: 'VK ID یا ای میل سے Serpmonn میں سائن ان یا رجسٹر کریں۔',
    twitterDescription: 'VK ID یا ای میل سے Serpmonn میں سائن ان یا رجسٹر کریں۔'
  },
  'pt-pt': {
    mainTitle: 'Iniciar sessão no Serpmonn',
    orDivider: 'ou',
    vkButton: 'Continuar com VK ID',
    registerSuccessTitle: 'Verifique o e-mail',
    registerSuccessText: 'Enviámos um e-mail de confirmação para <strong>{email}</strong>. Abra a ligação na mensagem para confirmar a conta.',
    ogDescription: 'Inicie sessão ou registe-se no Serpmonn com VK ID ou e-mail.',
    twitterDescription: 'Inicie sessão ou registe-se no Serpmonn com VK ID ou e-mail.'
  },
  'es-419': {
    mainTitle: 'Iniciar sesión en Serpmonn',
    orDivider: 'o',
    vkButton: 'Continuar con VK ID',
    registerSuccessTitle: 'Revisá tu correo',
    registerSuccessText: 'Enviamos un correo de confirmación a <strong>{email}</strong>. Abrí el enlace del mensaje para confirmar tu cuenta.',
    ogDescription: 'Iniciá sesión o registrate en Serpmonn con VK ID o correo.',
    twitterDescription: 'Iniciá sesión o registrate en Serpmonn con VK ID o correo.'
  },
  ps: {
    mainTitle: 'Serpmonn ته ننوتل',
    orDivider: 'یا',
    vkButton: 'د VK ID سره دوام ورکړئ',
    registerSuccessTitle: 'خپل ان باکس وګورئ',
    registerSuccessText: 'موږ <strong>{email}</strong> ته تایید بریښنالیک ولېږه. د حساب تایید لپاره په پیغام کې لینک پرانیزئ.',
    ogDescription: 'د VK ID یا بریښنالیک له لارې Serpmonn ته ننوځئ یا نوم لیکنه وکړئ.',
    twitterDescription: 'د VK ID یا بریښنالیک له لارې Serpmonn ته ننوځئ یا نوم لیکنه وکړئ.'
  },
  sd: {
    mainTitle: 'Serpmonn ۾ لاگ ان',
    orDivider: 'يا',
    vkButton: 'VK ID سان جاري رکو',
    registerSuccessTitle: 'ان باکس چيڪ ڪريو',
    registerSuccessText: 'اسان <strong>{email}</strong> تي تصديقي اي ميل موڪلي آهي. اڪائونٽ جي تصديق لاءِ پيغام ۾ لنڪ کوليو.',
    ogDescription: 'VK ID يا اي ميل سان Serpmonn ۾ لاگ ان يا رجسٽر ڪريو.',
    twitterDescription: 'VK ID يا اي ميل سان Serpmonn ۾ لاگ ان يا رجسٽر ڪريو.'
  },
  ug: {
    mainTitle: 'Serpmonn غا كىرىش',
    orDivider: 'ياكى',
    vkButton: 'VK ID ئارقىلىق داۋاملاشتۇرۇش',
    registerSuccessTitle: 'خەت ساندۇقىنى تەكشۈرۈڭ',
    registerSuccessText: 'بىز <strong>{email}</strong> غا جەزملەشتۈرۈش خەتى يوللىدۇق. ھېساباتنى جەزملەشتۈرۈش ئۈچۈن ئۇلانمىنى ئېچىڭ.',
    ogDescription: 'VK ID ياكى ئېلخەت ئارقىلىق Serpmonn غا كىرىڭ ياكى تىزىملىتىڭ.',
    twitterDescription: 'VK ID ياكى ئېلخەت ئارقىلىق Serpmonn غا كىرىڭ ياكى تىزىملىتىڭ.'
  },
  dv: {
    mainTitle: 'Serpmonn އަށް ލޮގް އިން',
    orDivider: 'ނުވަތަ',
    vkButton: 'VK ID މެދުވެރިކޮށް ކުރިއަށް',
    registerSuccessTitle: 'އިންބޮކްސް ޗެކް ކޮށްލައްވާ',
    registerSuccessText: 'އަޅުގަނޑުމެން <strong>{email}</strong> އަށް ކޮންފަރމޭޝަން އީމެއިލް ފޮނުވައިފި. އެކައުންޓް ކޮންފަރމް ކުރުމަށް ލިންކް ބޭނުން ކުރައްވާ.',
    ogDescription: 'VK ID ނުވަތަ އީމެއިލް މެދުވެރިކޮށް Serpmonn އަށް ލޮގް އިން ނުވަތަ ރެޖިސްޓަރ ކުރައްވާ.',
    twitterDescription: 'VK ID ނުވަތަ އީމެއިލް މެދުވެރިކޮށް Serpmonn އަށް ލޮގް އިން ނުވަތަ ރެޖިސްޓަރ ކުރައްވާ.'
  },
  ks: {
    mainTitle: 'Serpmonn مَنٛز لاگ اِن',
    orDivider: 'یا',
    vkButton: 'VK ID سٟتۍ جاری تھأیو',
    registerSuccessTitle: 'ان باکس چیک کٔرِو',
    registerSuccessText: 'اسٕہ <strong>{email}</strong> پٮ۪ٹھ تصدیقی ای میل موکلٕ۔ اکاؤنٹ تصدیق کرنٕہ باپتھ پیغامس مَنٛز لنک کُھولیو.',
    ogDescription: 'VK ID یا ای میل سٟتۍ Serpmonn مَنٛز لاگ اِن یا رجسٹر کٔرِو.',
    twitterDescription: 'VK ID یا ای میل سٟتۍ Serpmonn مَنٛز لاگ اِن یا رجسٹر کٔرِو.'
  },
  'ku-arab': {
    mainTitle: 'چوونەژوورەوەی Serpmonn',
    orDivider: 'یان',
    vkButton: 'بەردەوامبوون بە VK ID',
    registerSuccessTitle: 'سندوقی نامەکەت بپشکنە',
    registerSuccessText: 'ئیمەیڵی پشتڕاستکردنەوەمان نارد بۆ <strong>{email}</strong>. بەستەرەکە لە نامەکەدا بکەرەوە بۆ پشتڕاستکردنەوەی هەژمار.',
    ogDescription: 'بە VK ID یان ئیمەیڵ بچۆرە ژوورەوە یان خۆت تۆمار بکە لە Serpmonn.',
    twitterDescription: 'بە VK ID یان ئیمەیڵ بچۆرە ژوورەوە یان خۆت تۆمار بکە لە Serpmonn.'
  },
  yi: {
    mainTitle: 'אַריינלאָגן אין Serpmonn',
    orDivider: 'אָדער',
    vkButton: 'פֿאָרזעצן מיט VK ID',
    registerSuccessTitle: 'טשעקט אײַער בראָשורע',
    registerSuccessText: 'מיר האָבן געשיקט אַ באַשטעטיקונג־בליצבארד צו <strong>{email}</strong>. עפֿנט דעם לינק אין דער מעלדונג צו באַשטעטיקן אייער אקאונט.',
    ogDescription: 'לאָגט זיך אַריין אָדער רעגיסטרירט זיך אויף Serpmonn מיט VK ID אָדער email.',
    twitterDescription: 'לאָגט זיך אַריין אָדער רעגיסטרירט זיך אויף Serpmonn מיט VK ID אָדער email.'
  }
};

function pickExtra(locale) {
  if (EXTRA[locale]) return EXTRA[locale];
  const fb = FALLBACK[locale];
  if (fb && EXTRA[fb]) return EXTRA[fb];
  return EXTRA.en;
}

function pickBlock(store, locale) {
  if (store[locale]) return store[locale];
  const fb = FALLBACK[locale];
  if (fb && store[fb]) return store[fb];
  return store.en;
}

function stripColon(value) {
  return String(value || '').replace(/:\s*$/, '');
}

const output = {};

for (const locale of locales) {
  const l = pickBlock(login, locale).login;
  const r = pickBlock(register, locale).register;
  const f = pickBlock(forgot, locale).forgot;
  const e = pickExtra(locale);

  const pageTitle = l.ogTitle || `${stripColon(l.form.submitButton)} — Serpmonn`;

  output[locale] = {
    pageTitle,
    mainTitle: e.mainTitle,
    tabLogin: stripColon(l.form.submitButton),
    tabRegister: r.title,
    orDivider: e.orDivider,
    vkButton: e.vkButton,
    emailLabel: stripColon(l.form.emailLabel) || r.emailLabel,
    passwordLabel: stripColon(l.form.passwordLabel) || r.passwordLabel,
    togglePasswordAria: l.form.togglePasswordAria,
    loginSubmit: stripColon(l.form.submitButton),
    registerSubmit: r.formTitle,
    forgotPassword: l.forgotPasswordLink,
    registerSuccessTitle: e.registerSuccessTitle,
    registerSuccessText: e.registerSuccessText,
    backToLogin: f.backToLogin,
    ogTitle: pageTitle,
    ogDescription: e.ogDescription,
    twitterDescription: e.twitterDescription
  };
}

const outPath = path.join(dataDir, 'authTranslations.json');
fs.writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Generated ${outPath} (${locales.length} locales)`);
