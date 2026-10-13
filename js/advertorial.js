/* Portal / publirreportaje: fechas dinámicas, reenvío de UTMs, botón fijo, menú, búsqueda,
   compartir y eventos de conversión (Google Analytics 4, Google Ads y Taboola). */
(function () {
  'use strict';

  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

  // Fecha de hoy en la zona horaria de Bogotá (no depende del caché del servidor).
  function hojeColombia() {
    try {
      var parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Bogota', year: 'numeric', month: 'numeric', day: 'numeric'
      }).formatToParts(new Date());
      var get = function (t) { for (var i = 0; i < parts.length; i++) if (parts[i].type === t) return +parts[i].value; };
      return new Date(get('year'), get('month') - 1, get('day'));
    } catch (e) {
      var d = new Date();
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }
  }

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function curta(d) { return pad(d.getDate()) + ' de ' + MESES[d.getMonth()]; }
  function somaDias(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }

  function atualizarDatas() {
    var hoje = hojeColombia();
    var valores = {
      hoje: curta(hoje),
      ontem: curta(somaDias(hoje, -1)),
      amanha: curta(somaDias(hoje, 1)),
      hoje_extenso: DIAS[hoje.getDay()] + ', ' + curta(hoje) + ' de ' + hoje.getFullYear(),
      data: pad(hoje.getDate()) + '/' + pad(hoje.getMonth() + 1) + '/' + hoje.getFullYear(),
      dia_semana: DIAS[hoje.getDay()],
      dia: pad(hoje.getDate()),
      mes: MESES[hoje.getMonth()],
      ano: '' + hoje.getFullYear()
    };
    var els = document.querySelectorAll('.adv-date[data-date]');
    for (var i = 0; i < els.length; i++) {
      var v = valores[els[i].getAttribute('data-date')];
      if (v && els[i].textContent !== v) els[i].textContent = v;
    }
  }

  // Lleva los parámetros de la URL actual (utm_*, click_id/tblci de Taboola, fbclid, gclid...) a los enlaces de compra.
  function repassarParametros() {
    if (!document.body.hasAttribute('data-pass-params') || !location.search) return;
    var atuais = new URLSearchParams(location.search);
    atuais.delete('prueba_tags');
    var links = document.querySelectorAll('a[data-cta]');
    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute('href');
      if (!href || href.charAt(0) === '#' || /^(mailto|tel|javascript):/i.test(href)) continue;
      try {
        var u = new URL(href, location.href);
        atuais.forEach(function (valor, chave) {
          if (!u.searchParams.has(chave)) u.searchParams.set(chave, valor);
        });
        links[i].setAttribute('href', u.toString());
      } catch (e) { /* enlace inválido: se deja igual */ }
    }
  }

  // El botón fijo aparece cuando el lector baja un poco por la página.
  function botaoFixo() {
    var bar = document.querySelector('[data-sticky]');
    if (!bar) return;
    document.body.style.paddingBottom = (bar.offsetHeight + 8) + 'px';
    var visivel = false;
    function check() {
      var mostrar = window.scrollY > Math.min(600, document.documentElement.scrollHeight * 0.15);
      if (mostrar !== visivel) {
        visivel = mostrar;
        bar.classList.toggle('is-visible', mostrar);
      }
    }
    window.addEventListener('scroll', check, { passive: true });
    check();
  }

  // Menú lateral y búsqueda en la parte superior.
  function menuEBusca() {
    var drawer = document.querySelector('[data-drawer]');
    if (drawer) {
      var abrir = function () { drawer.classList.add('is-open'); document.documentElement.style.overflow = 'hidden'; };
      var fechar = function () { drawer.classList.remove('is-open'); document.documentElement.style.overflow = ''; };
      document.querySelectorAll('[data-drawer-open]').forEach(function (b) { b.addEventListener('click', abrir); });
      document.querySelectorAll('[data-drawer-close]').forEach(function (b) { b.addEventListener('click', fechar); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') fechar(); });
    }
    var form = document.querySelector('[data-search]');
    var btn = document.querySelector('[data-search-open]');
    if (form && btn) {
      btn.addEventListener('click', function () {
        form.hidden = !form.hidden;
        if (!form.hidden) form.querySelector('input').focus();
      });
    }
  }

  // Compartir: abre en ventana pequeña; "copiar enlace" copia al portapapeles.
  function compartilhar() {
    document.querySelectorAll('[data-share]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var net = a.getAttribute('data-share');
        e.preventDefault();
        if (net === 'copy') {
          var url = location.href.split('#')[0];
          var ok = function () { a.classList.add('is-copied'); setTimeout(function () { a.classList.remove('is-copied'); }, 1500); };
          if (navigator.clipboard) navigator.clipboard.writeText(url).then(ok, function () { prompt('Copia el enlace:', url); });
          else prompt('Copia el enlace:', url);
          return;
        }
        if (net === 'whatsapp' && /Android|iPhone|iPad/i.test(navigator.userAgent)) {
          location.href = a.href;
          return;
        }
        window.open(a.href, 'share', 'width=620,height=540,noopener');
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Seguimiento                                                           */
  /* ------------------------------------------------------------------ */

  var T = window.ADV_TRACK || null;
  var teste = /[?&]prueba_tags=1\b/.test(location.search);
  var painel = null;

  function registrar(texto, ok) {
    if (window.console) console.info('[seguimiento] ' + texto);
    if (!teste) return;
    if (!painel) {
      painel = document.createElement('div');
      painel.setAttribute('style', 'position:fixed;z-index:9999;right:10px;top:10px;width:min(340px,calc(100vw - 20px));max-height:50vh;overflow:auto;background:#111;color:#eee;font:12px/1.45 ui-monospace,Menlo,Consolas,monospace;padding:10px 12px;border-radius:8px;box-shadow:0 8px 30px rgba(0,0,0,.4)');
      painel.innerHTML = '<strong style="color:#fff">Prueba de etiquetas</strong> <span style="color:#999">(?prueba_tags=1)</span>';
      document.body.appendChild(painel);
    }
    var linha = document.createElement('div');
    linha.style.marginTop = '4px';
    linha.style.color = ok === false ? '#ff8a80' : ok === true ? '#9be7a8' : '#ddd';
    linha.textContent = new Date().toLocaleTimeString('es-CO') + '  ' + texto;
    painel.appendChild(linha);
  }

  function enviar(gaNome, tbNome, extra) {
    if (!T) return;
    var params = { pagina: T.page || location.pathname };
    if (extra) for (var k in extra) params[k] = extra[k];
    if ((T.ga || T.ads) && typeof window.gtag === 'function') {
      if (T.ga && gaNome) {
        window.gtag('event', gaNome, Object.assign({ transport_type: 'beacon' }, params));
        registrar('Google Analytics → ' + gaNome, true);
      }
      if (T.ads && gaNome === T.gaEvent) {
        window.gtag('event', 'conversion', { send_to: T.ads, transport_type: 'beacon' });
        registrar('Google Ads → conversión ' + T.ads, true);
      }
    }
    if (T.tb && tbNome) {
      window._tfa = window._tfa || [];
      window._tfa.push({ notify: 'event', name: tbNome, id: T.tb });
      registrar('Taboola → ' + tbNome, true);
    }
  }

  var convertido = false;
  function converter(origem) {
    if (convertido || !T || T.on === 'none') return;
    convertido = true;
    enviar(T.gaEvent, T.tbEvent, { origem: origem });
  }

  function rastreamento() {
    if (!T) {
      if (teste) registrar('Ningún ID configurado (o página en borrador): no se envía nada.', false);
      return;
    }
    if (teste) {
      registrar('Página: ' + (T.page || 'portal'));
      if (T.ga) registrar('GA4 configurado: ' + T.ga + (T.tb ? '' : ''), true);
      if (T.ads) registrar('Google Ads configurado: ' + T.ads, true);
      if (T.tb) registrar('Taboola configurado: cuenta ' + T.tb + (T.tbView ? ' (page_view enviado)' : ''), true);
      setTimeout(function () {
        var nomes = (performance.getEntriesByType ? performance.getEntriesByType('resource') : []).map(function (r) { return r.name; }).join(' ');
        if (T.ga || T.ads) registrar(/googletagmanager\.com\/gtag/.test(nomes) ? 'Script de Google cargado' : 'Script de Google NO cargó (¿bloqueador de anuncios?)', /googletagmanager\.com\/gtag/.test(nomes));
        if (T.tb) registrar(/tfa\.js/.test(nomes) ? 'Script de Taboola cargado' : 'Script de Taboola NO cargó (¿bloqueador de anuncios?)', /tfa\.js/.test(nomes));
      }, 2500);
    }

    if (T.page) enviar('ver_articulo', null);

    if (T.on === 'load') converter('abrio_pagina');

    if (T.on === 'click') {
      document.addEventListener('click', function (e) {
        var a = e.target.closest && e.target.closest('a[data-cta]');
        if (!a) return;
        var href = a.href;
        var jaConvertido = convertido;
        converter(a.classList.contains('adv-btn') ? 'boton' : a.querySelector('img') ? 'imagen' : 'link');
        // Misma pestaña: espera un instante para que salgan los eventos antes de cambiar de página.
        var novaAba = a.target === '_blank' || e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1;
        if (!jaConvertido && !novaAba && href && href.charAt(0) !== '#') {
          e.preventDefault();
          setTimeout(function () { location.href = href; }, teste ? 2500 : 350);
        }
      });
    }

    if (T.read && T.page) {
      var art = document.querySelector('[data-article]');
      var lido = false;
      var checar = function () {
        if (lido || !art) return;
        var r = art.getBoundingClientRect();
        if (window.innerHeight - r.top >= r.height * 0.5) {
          lido = true;
          enviar('lectura_50', 'lectura_50');
          window.removeEventListener('scroll', checar);
        }
      };
      window.addEventListener('scroll', checar, { passive: true });
    }
  }

  function iniciar() {
    atualizarDatas();
    repassarParametros();
    botaoFixo();
    menuEBusca();
    compartilhar();
    rastreamento();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
