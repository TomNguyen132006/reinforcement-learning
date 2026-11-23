const mod = await import('./film.js');
await document.fonts.load('44px PH');
const F = await mod.build();
const ctx = document.getElementById('c').getContext('2d');
window.DUR = F.dur; window.EV = [...F.ev, { t: 0, type: 'meta', F: mod.F }]; window.SUBS = F.subs || [];
window.render = t => F.render(ctx, t);
window.READY = true;
