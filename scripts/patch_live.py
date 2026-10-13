#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from pathlib import Path

def patch_index_html():
    p = Path("index.html")
    t = p.read_text(encoding="utf-8")
    changed = False

    css = """
    .badge-live {
      display: inline-block; font-size: 0.72rem; font-weight: 800; padding: 0.2rem 0.6rem;
      border-radius: 999px; text-transform: uppercase; letter-spacing: 0.05em;
      background: rgba(239,68,68,0.2); color: #f87171; border: 1px solid rgba(248,113,113,0.45);
      animation: live-pulse 1.5s ease-in-out infinite;
    }
    @keyframes live-pulse { 0%,100%{ opacity:1 } 50%{ opacity:0.55 } }
    .next-regata-card.is-live {
      border-color: rgba(248,113,113,0.45);
      box-shadow: 0 0 0 1px rgba(248,113,113,0.2), 0 8px 28px rgba(239,68,68,0.12);
    }
    .btn-segui-live {
      display: inline-flex; align-items: center; gap: 0.35rem; margin-top: 0.75rem;
      background: #ef4444; color: #fff; font-weight: 800; font-size: 0.88rem;
      padding: 0.5rem 1rem; border-radius: 8px; text-decoration: none;
      box-shadow: 0 4px 14px rgba(239,68,68,0.35);
    }
    .btn-segui-live:hover { background: #f87171; color: #fff; }
"""
    needle_css = "    .badge-stato.is-conclusa { background: rgba(148,163,184,0.2); color: #94a3b8; }\n  </style>"
    if ".badge-live" not in t and needle_css in t:
        t = t.replace(needle_css, "    .badge-stato.is-conclusa { background: rgba(148,163,184,0.2); color: #94a3b8; }\n" + css + "  </style>")
        changed = True
        print("+ CSS badge-live")

    nav = '<li><a href="classifiche.html" data-i18n="nav_classifiche">Classifiche</a></li>'
    nav_new = '<li><a href="live.html">Live</a></li>\n            <li><a href="classifiche.html" data-i18n="nav_classifiche">Classifiche</a></li>'
    if 'href="live.html">Live' not in t and nav in t:
        t = t.replace(nav, nav_new, 1)
        changed = True
        print("+ nav Live desktop")

    mob = '<a href="gare.html">\u2192 Calendario</a>\n      <a href="classifiche.html">\u2192 Classifiche</a>'
    mob_new = '<a href="gare.html">\u2192 Calendario</a>\n      <a href="live.html">\u2192 Live</a>\n      <a href="classifiche.html">\u2192 Classifiche</a>'
    if "\u2192 Live" not in t and mob in t:
        t = t.replace(mob, mob_new, 1)
        changed = True
        print("+ nav Live mobile")

    if 'id="regata-badge-live"' not in t:
        old = '<span class="badge-stato" id="regata-badge-stato" style="display:none"></span>'
        new = old + '\n            <span class="badge-live" id="regata-badge-live" style="display:none">\u25cf LIVE</span>'
        if old in t:
            t = t.replace(old, new, 1)
            changed = True
            print("+ badge-live span")

    if 'id="regata-live-btn"' not in t:
        old = '<span id="regata-descrizione">--</span>\n        </div>\n      </a>'
        new = '<span id="regata-descrizione">--</span>\n        </div>\n        <span class="btn-segui-live" id="regata-live-btn" style="display:none">\u25cf Segui LIVE</span>\n      </a>'
        if old in t:
            t = t.replace(old, new, 1)
            changed = True
            print("+ Segui LIVE button")

    import re
    t2 = re.sub(r"index-inline\.js(\?v=\d+)?", "index-inline.js?v=6", t)
    if t2 != t:
        t = t2
        changed = True
        print("+ cache bust v=6")

    p.write_text(t, encoding="utf-8")
    print("index.html changed=", changed, "size=", len(t))
    return changed


def patch_index_inline():
    p = Path("index-inline.js")
    t = p.read_text(encoding="utf-8")
    changed = False

    if "badgeLive" not in t:
        old = "  const badgeStato = document.getElementById('regata-badge-stato');"
        new = "  const badgeStato = document.getElementById('regata-badge-stato');\n  const badgeLive = document.getElementById('regata-badge-live');\n  const liveBtnEl = document.getElementById('regata-live-btn');"
        if old in t:
            t = t.replace(old, new, 1)
            changed = True
            print("+ badgeLive vars")

        old2 = "    card.href = (inLive || st2.key === 'corso' || st2.key === 'chiuse') ? ('live.html?id=' + gara.id) : 'gare.html';\n  }\n}"
        new2 = "    card.href = (inLive || st2.key === 'corso' || st2.key === 'chiuse') ? ('live.html?id=' + encodeURIComponent(gara.id)) : 'gare.html';\n    card.classList.toggle('is-live', !!(inLive || st2.key === 'corso'));\n    if (badgeLive) badgeLive.style.display = (inLive || st2.key === 'corso') ? '' : 'none';\n    if (liveBtnEl) liveBtnEl.style.display = (inLive || st2.key === 'corso' || st2.key === 'chiuse') ? '' : 'none';\n  }\n}"
        if old2 in t:
            t = t.replace(old2, new2, 1)
            changed = True
            print("+ live badge/btn logic")

    p.write_text(t, encoding="utf-8")
    print("index-inline.js changed=", changed, "size=", len(t))
    return changed


def patch_gare():
    p = Path("gare.html")
    t = p.read_text(encoding="utf-8")
    changed = False

    css = (
        "\n.badge-live{display:inline-block;background:rgba(239,68,68,.2);color:#f87171;"
        "border:1px solid rgba(248,113,113,.45);font-size:.72rem;font-weight:800;"
        "padding:.2rem .55rem;border-radius:999px;text-transform:uppercase;"
        "letter-spacing:.04em;animation:live-pulse 1.5s ease-in-out infinite}"
        "\n@keyframes live-pulse{0%,100%{opacity:1}50%{opacity:.55}}"
        "\n.btn-live-gara{display:inline-flex;align-items:center;background:#ef4444;color:#fff;"
        "padding:.55rem 1.15rem;border-radius:8px;font-weight:800;font-size:.88rem;"
        "text-decoration:none;box-shadow:0 4px 12px rgba(239,68,68,.3)}"
        "\n.btn-live-gara:hover{background:#f87171;color:#fff}"
        "\n.gara-card.is-live{border-color:rgba(248,113,113,.4);box-shadow:0 0 0 1px rgba(248,113,113,.15)}\n"
    )
    needle = ".admin-card-actions{display:flex;gap:.4rem;margin-left:auto}"
    if ".badge-live{" not in t and needle in t:
        t = t.replace(needle, needle + css)
        changed = True
        print("+ gare CSS")

    nav = '<li><a href="classifiche.html" data-i18n="nav_classifiche">Classifiche</a></li>'
    if 'href="live.html">Live' not in t and nav in t:
        t = t.replace(nav, '<li><a href="live.html">Live</a></li>\n<li><a href="classifiche.html" data-i18n="nav_classifiche">Classifiche</a></li>', 1)
        changed = True
        print("+ gare nav Live")

    mob = '<div class="mobile-dropdown"><a href="gare.html">\u2192 Calendario</a><a href="classifiche.html">\u2192 Classifiche</a></div>'
    if "\u2192 Live" not in t and mob in t:
        t = t.replace(
            mob,
            '<div class="mobile-dropdown"><a href="gare.html">\u2192 Calendario</a><a href="live.html">\u2192 Live</a><a href="classifiche.html">\u2192 Classifiche</a></div>',
            1,
        )
        changed = True
        print("+ gare mobile Live")

    if "function inLiveWindowGara" not in t:
        old = "function isGaraConclusa(dataGara){if(!dataGara)return false;return new Date(dataGara).getTime()<Date.now()}"
        helper = (
            old
            + "\nfunction inLiveWindowGara(g){if(!g||!g.data_gara)return false;var start=new Date(g.data_gara).getTime();"
            "if(isNaN(start))return false;var nr=Math.min(3,Math.max(1,parseInt(g.num_regate,10)||1));"
            "var durataMs=Math.max(2,nr*1.5)*60*60*1000;var now=Date.now();"
            "return now>=start-6*60*60*1000&&now<=start+durataMs+2*60*60*1000}"
            + "\nfunction statoKeyGara(g){if(!g||!g.data_gara)return'none';var start=new Date(g.data_gara).getTime();"
            "if(isNaN(start))return'none';var now=Date.now();var nr=Math.min(3,Math.max(1,parseInt(g.num_regate,10)||1));"
            "var durataMs=Math.max(2,nr*1.5)*60*60*1000;if(now>=start+durataMs)return'conclusa';"
            "if(now>=start)return'corso';return'upcoming'}"
        )
        if old in t:
            t = t.replace(old, helper, 1)
            changed = True
            print("+ inLiveWindowGara helpers")

    old_card = 'return`<div class="gara-card${conclusa?\' is-conclusa\':\'\''}" data-gara-id="${g.id}">'
    if "inLiveWindowGara(g);const stKey" not in t and old_card in t:
        new_card = (
            "const live=inLiveWindowGara(g);const stKey=statoKeyGara(g);"
            + 'return`<div class="gara-card${conclusa?\' is-conclusa\':\'\''}${live||stKey===\'corso\'?\' is-live\':\'\''}" data-gara-id="${g.id}">'
        )
        t = t.replace(old_card, new_card, 1)
        changed = True
        print("+ gara-card is-live")

    oldb = '<span class="badge-regate">${badgeRegate(nr)}</span>${conclusa?'
    if "\u25cf LIVE" not in t and oldb in t:
        newb = (
            '<span class="badge-regate">${badgeRegate(nr)}</span>'
            + "${live||stKey==='corso'?`<span class=\"badge-live\">\u25cf LIVE</span>`:''}${conclusa?"
        )
        t = t.replace(oldb, newb, 1)
        changed = True
        print("+ LIVE badge on cards")

    olda = '<div class="gara-actions">${renderActionButton(g.id,conclusa,g.data_gara)}'
    if 'href="live.html?id=${encodeURIComponent' not in t and olda in t:
        newa = (
            '<div class="gara-actions">'
            + "${(live||stKey==='corso')?`<a class=\"btn-live-gara\" href=\"live.html?id=${encodeURIComponent(g.id)}\">\u25cf Segui LIVE</a>`:''}"
            + "${renderActionButton(g.id,conclusa,g.data_gara)}"
        )
        t = t.replace(olda, newa, 1)
        changed = True
        print("+ Segui LIVE button on cards")

    p.write_text(t, encoding="utf-8")
    print("gare.html changed=", changed, "size=", len(t))
    return changed


if __name__ == "__main__":
    a = patch_index_html()
    b = patch_index_inline()
    c = patch_gare()
    print("DONE any_change=", a or b or c)
