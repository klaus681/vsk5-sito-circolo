/* CVI – loader: core condiviso locale (nessuna dipendenza da CDN esterni) */
document.write('<link rel="stylesheet" href="nav-dropdown-fix.css?v=2">');
document.write('<script src="cvi-core.js?v=7"><\/script>');
/* Extra: nazionalità profilo */
document.write('<script src="profilo-nazionalita.js?v=2"><\/script>');
/* Extra: bandiere in classifica / membri / iscritti */
document.write('<script src="cvi-flags.js?v=2"><\/script>');
document.write('<script src="cvi-flags-ui.js?v=3"><\/script>');
/* Extra: regolamento dinamico da admin */
document.write('<script src="regolamento-dynamic.js?v=1"><\/script>');
/* Extra: voce Tornei nel menu Gare & Eventi */
document.write('<script src="tornei-nav.js?v=1"><\/script>');
/* Extra: voce Tutor nel menu */
document.write('<script src="tutor-nav.js?v=2"><\/script>');
/* Extra: traduzioni menu */
document.write('<script src="nav-i18n.js?v=2"><\/script>');
/* Extra: voce Messaggi nel menu + badge non letti */
document.write('<script src="messaggi-nav.js?v=1"><\/script>');
/* Extra: banner torneo + allenamento in riga dedicata */
document.write('<script src="tornei-home.js?v=6"><\/script>');
document.write('<script src="allenamenti-home.js?v=4"><\/script>');
/* Extra: sfondi home personalizzati da admin */
document.write('<script src="home-sfondi.js?v=2"><\/script>');
/* Extra: link Privacy nel footer */
document.write('<script src="privacy-link.js?v=2"><\/script>');
/* Extra: banner account in attesa/sospeso/bannato */
document.write('<script src="membership-banner.js?v=3"><\/script>');
/* Extra: blocco registrazione email bannate */
if (/unisciti\.html/i.test(location.pathname || location.href)) {
  document.write('<script src="ban-register-guard.js?v=1"><\/script>');
}
