(function(){
	try{
		var lang=(localStorage.getItem('spn_lang')||(document.documentElement.lang||'ru')).toLowerCase();
		var dict={
			ru:{
				cookieText:'Этот сайт использует куки для улучшения работы. Продолжая, вы соглашаетесь с нашей',
				cookieAccept:'Принять', cookieDecline:'Отклонить', privacy:'политикой конфиденциальности'
			},
			en:{
				cookieText:'This site uses cookies to improve your experience. By using it, you agree with our',
				cookieAccept:'Accept', cookieDecline:'Decline', privacy:'privacy policy'
			},
			'zh-cn':{
				cookieText:'本网站使用 Cookie 以提升体验。继续使用即表示您同意我们的',
				cookieAccept:'接受', cookieDecline:'拒绝', privacy:'隐私政策'
			}
		};
		var t=dict[lang]||dict.ru;
		document.addEventListener('DOMContentLoaded',function(){
			var cc=document.getElementById('cookie-consent');
			if(cc){
				var p=cc.querySelector('p');
				var a=cc.querySelector('a');
				var accept=document.getElementById('accept-cookies');
				var decline=document.getElementById('decline-cookies');
				if(p&&a){ if(p.firstChild) p.firstChild.nodeValue=t.cookieText+' '; a.textContent=t.privacy; }
				if(accept) accept.textContent=t.cookieAccept;
				if(decline) decline.textContent=t.cookieDecline;
			}
		});
	}catch(e){console.warn('[i18n-overlay]',e)}
})();