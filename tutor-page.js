/* CVI – pagina Tutor: elenco, candidatura, richieste sessione */
(function () {
  "use strict";

  var MATERIE = {
    regole: "Regole",
    tecnica: "Tecnica",
    partenza: "Partenze",
    setup: "Setup",
    altro: "Altro"
  };
  var STATI_SESS = {
    in_attesa: "In attesa",
    accettata: "Accettata",
    rifiutata: "Rifiutata",
    annullata: "Annullata",
    conclusa: "Conclusa"
  };

  var currentUserId = null;
  var myTutor = null;
  var tutors = [];
  var profiles = {};

  function esc(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function waitCVI() {
    return new Promise(function (resolve) {
      var n = 0;
      (function tick() {
        if (window.CVI && CVI.supabase) return resolve(true);
        if (++n > 100) return resolve(false);
        setTimeout(tick, 50);
      })();
    });
  }

  async function getUserId() {
    try {
      var res = await CVI.supabase.auth.getSession();
      var s = res.data && res.data.session;
      return s && s.user ? s.user.id : null;
    } catch (e) {
      return null;
    }
  }

  function materieBadges(arr) {
    return (arr || [])
      .map(function (m) {
        return '<span class="tu-badge">' + esc(MATERIE[m] || m) + "</span>";
      })
      .join("");
  }

  function selectedMaterie() {
    var out = [];
    document.querySelectorAll("#tu-materie-checks input:checked").forEach(function (c) {
      out.push(c.value);
    });
    return out;
  }

  async function loadProfiles(ids) {
    if (!ids.length) return;
    var r = await CVI.supabase.from("profiles").select("id,nickname,team").in("id", ids);
    (r.data || []).forEach(function (p) {
      profiles[p.id] = p;
    });
  }

  async function loadMyTutor() {
    if (!currentUserId) return;
    var r = await CVI.supabase.from("tutor").select("*").eq("user_id", currentUserId).maybeSingle();
    myTutor = r.data || null;
    var box = document.getElementById("tu-my-status");
    if (!box) return;
    if (!myTutor) {
      box.textContent = "";
      return;
    }
    var st = myTutor.stato;
    if (st === "in_attesa") {
      box.style.color = "#fbbf24";
      box.textContent = "La tua candidatura tutor è in attesa di approvazione admin.";
    } else if (st === "approvato") {
      box.style.color = "#34d399";
      box.textContent =
        "Sei tutor approvato" +
        (myTutor.disponibile ? " e disponibile." : " (in pausa — non ricevi nuove richieste).");
    } else if (st === "rifiutato") {
      box.style.color = "#f87171";
      box.textContent = "Candidatura non approvata. Puoi aggiornare i dati e riprovare (contatta l'admin).";
    } else if (st === "sospeso") {
      box.style.color = "#f87171";
      box.textContent = "Il tuo profilo tutor è sospeso dall'admin.";
    }
  }

  async function loadTutors() {
    var list = document.getElementById("tu-list");
    if (!list) return;
    list.innerHTML = '<p class="tu-empty">Caricamento…</p>';
    try {
      var r = await CVI.supabase
        .from("tutor")
        .select("*")
        .eq("stato", "approvato")
        .order("created_at", { ascending: true });
      if (r.error) throw r.error;
      tutors = r.data || [];
      var ids = tutors.map(function (t) {
        return t.user_id;
      });
      await loadProfiles(ids);
      renderList();
    } catch (e) {
      var msg = e.message || e;
      if (/relation|42P01/i.test(String(msg))) {
        list.innerHTML =
          '<p class="tu-empty" style="color:#f87171">Tabelle tutor non create. Esegui <code>tutor-sql.sql</code> su Supabase.</p>';
      } else {
        list.innerHTML = '<p class="tu-empty" style="color:#f87171">' + esc(msg) + "</p>";
      }
    }
  }

  function renderList() {
    var list = document.getElementById("tu-list");
    var filter = (document.getElementById("tu-filter") || {}).value || "all";
    var rows = tutors.filter(function (t) {
      if (!t.disponibile) return false;
      if (filter === "all") return true;
      return (t.materie || []).indexOf(filter) >= 0;
    });
    if (!rows.length) {
      list.innerHTML =
        '<p class="tu-empty">Nessun tutor disponibile' +
        (filter !== "all" ? " per questa materia" : "") +
        ".</p>";
      return;
    }
    list.innerHTML = rows
      .map(function (t) {
        var p = profiles[t.user_id] || {};
        var nick = p.nickname || "Tutor";
        var isMe = currentUserId && String(t.user_id) === String(currentUserId);
        return (
          '<article class="tu-card" data-id="' +
          esc(t.id) +
          '">' +
          '<h3 class="tu-name">' +
          esc(nick) +
          "</h3>" +
          (p.team ? '<div class="tu-team">' + esc(p.team) + "</div>" : "") +
          '<div class="tu-badges">' +
          materieBadges(t.materie) +
          "</div>" +
          (t.bio ? '<p class="tu-bio">' + esc(t.bio) + "</p>" : "") +
          (t.disponibilita_note
            ? '<p class="tu-note">📅 ' + esc(t.disponibilita_note) + "</p>"
            : "") +
          '<div class="tu-actions">' +
          (isMe
            ? '<span style="color:#94a3b8;font-size:.85rem">Sei tu</span>'
            : '<button type="button" class="btn-primary tu-richiedi" data-id="' +
              esc(t.id) +
              '" data-uid="' +
              esc(t.user_id) +
              '">Richiedi sessione</button>') +
          "</div></article>"
        );
      })
      .join("");

    list.querySelectorAll(".tu-richiedi").forEach(function (btn) {
      btn.onclick = function () {
        richiediSessione(btn.getAttribute("data-id"), btn.getAttribute("data-uid"));
      };
    });
  }

  async function richiediSessione(tutorId, tutorUserId) {
    var t = tutors.find(function (x) {
      return String(x.id) === String(tutorId);
    });
    if (!t || !currentUserId) return;
    if (String(tutorUserId) === String(currentUserId)) {
      alert("Non puoi richiedere una sessione a te stesso.");
      return;
    }
    var mats = t.materie && t.materie.length ? t.materie : ["altro"];
    var scelta =
      mats.length === 1
        ? mats[0]
        : prompt(
            "Materia (scrivi una):\n" + mats.map(function (m) {
              return m + " = " + (MATERIE[m] || m);
            }).join("\n"),
            mats[0]
          );
    if (!scelta) return;
    scelta = String(scelta).trim().toLowerCase();
    if (mats.indexOf(scelta) < 0 && !MATERIE[scelta]) {
      alert("Materia non valida.");
      return;
    }
    var msg = prompt("Messaggio per il tutor (opzionale):", "") || "";
    var data = prompt("Data/ora proposta (opzionale, es. 2026-10-25 21:00):", "") || "";
    var dataOra = null;
    if (data.trim()) {
      var d = new Date(data.replace(" ", "T"));
      if (!isNaN(d.getTime())) dataOra = d.toISOString();
    }
    try {
      var ins = await CVI.supabase.from("tutor_sessioni").insert({
        tutor_id: tutorId,
        tutor_user_id: tutorUserId,
        allievo_id: currentUserId,
        materia: scelta,
        data_ora: dataOra,
        messaggio_allievo: msg.trim() || null,
        stato: "in_attesa"
      });
      if (ins.error) throw ins.error;
      alert("Richiesta inviata. Il tutor potrà accettarla o rifiutarla.");
      loadSessioni();
    } catch (e) {
      alert("Errore: " + (e.message || e));
    }
  }

  async function loadSessioni() {
    var ul = document.getElementById("tu-sessioni");
    if (!ul || !currentUserId) return;
    try {
      var r = await CVI.supabase
        .from("tutor_sessioni")
        .select("*")
        .or("allievo_id.eq." + currentUserId + ",tutor_user_id.eq." + currentUserId)
        .order("created_at", { ascending: false })
        .limit(30);
      if (r.error) throw r.error;
      var rows = r.data || [];
      if (!rows.length) {
        ul.innerHTML = '<li class="tu-empty" style="border:0">Nessuna sessione.</li>';
        return;
      }
      var uids = [];
      rows.forEach(function (s) {
        uids.push(s.allievo_id);
        uids.push(s.tutor_user_id);
      });
      await loadProfiles(uids);

      ul.innerHTML = rows
        .map(function (s) {
          var isTutor = String(s.tutor_user_id) === String(currentUserId);
          var other = isTutor ? profiles[s.allievo_id] : profiles[s.tutor_user_id];
          var nick = (other && other.nickname) || "?";
          var role = isTutor ? "Allievo: " : "Tutor: ";
          var actions = "";
          if (isTutor && s.stato === "in_attesa") {
            actions =
              '<span><button type="button" class="btn-sm tu-acc" data-id="' +
              esc(s.id) +
              '">Accetta</button> ' +
              '<button type="button" class="btn-danger-sm tu-rif" data-id="' +
              esc(s.id) +
              '">Rifiuta</button></span>';
          } else if (!isTutor && s.stato === "in_attesa") {
            actions =
              '<button type="button" class="btn-ghost tu-ann" data-id="' +
              esc(s.id) +
              '">Annulla</button>';
          } else if (s.stato === "accettata" && isTutor) {
            actions =
              '<button type="button" class="btn-sm tu-end" data-id="' +
              esc(s.id) +
              '">Segna conclusa</button>';
          }
          return (
            "<li><span><strong>" +
            esc(STATI_SESS[s.stato] || s.stato) +
            "</strong> · " +
            esc(MATERIE[s.materia] || s.materia) +
            " · " +
            role +
            esc(nick) +
            (s.data_ora
              ? " · " + new Date(s.data_ora).toLocaleString("it-IT")
              : "") +
            (s.messaggio_allievo ? "<br><em>" + esc(s.messaggio_allievo) + "</em>" : "") +
            "</span>" +
            actions +
            "</li>"
          );
        })
        .join("");

      ul.querySelectorAll(".tu-acc").forEach(function (b) {
        b.onclick = function () {
          updateSessione(b.getAttribute("data-id"), "accettata");
        };
      });
      ul.querySelectorAll(".tu-rif").forEach(function (b) {
        b.onclick = function () {
          updateSessione(b.getAttribute("data-id"), "rifiutata");
        };
      });
      ul.querySelectorAll(".tu-ann").forEach(function (b) {
        b.onclick = function () {
          updateSessione(b.getAttribute("data-id"), "annullata");
        };
      });
      ul.querySelectorAll(".tu-end").forEach(function (b) {
        b.onclick = function () {
          updateSessione(b.getAttribute("data-id"), "conclusa");
        };
      });
    } catch (e) {
      ul.innerHTML = "<li style=\"color:#f87171\">" + esc(e.message || e) + "</li>";
    }
  }

  async function updateSessione(id, stato) {
    try {
      var r = await CVI.supabase
        .from("tutor_sessioni")
        .update({ stato: stato, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (r.error) throw r.error;
      loadSessioni();
    } catch (e) {
      alert(e.message || e);
    }
  }

  async function saveCandidatura() {
    var msg = document.getElementById("tu-candida-msg");
    var materie = selectedMaterie();
    if (!materie.length) {
      if (msg) {
        msg.style.color = "#f87171";
        msg.textContent = "Seleziona almeno una materia.";
      }
      return;
    }
    var bio = ((document.getElementById("tu-bio") || {}).value || "").trim();
    var disp = ((document.getElementById("tu-disp") || {}).value || "").trim();
    var max = parseInt((document.getElementById("tu-max") || {}).value, 10);
    if (isNaN(max) || max < 1) max = 3;

    try {
      if (myTutor) {
        var payload = {
          bio: bio || null,
          materie: materie,
          disponibilita_note: disp || null,
          max_allievi: max,
          updated_at: new Date().toISOString()
        };
        // se rifiutato, rimetti in attesa
        if (myTutor.stato === "rifiutato") payload.stato = "in_attesa";
        var up = await CVI.supabase.from("tutor").update(payload).eq("id", myTutor.id);
        if (up.error) throw up.error;
      } else {
        var ins = await CVI.supabase.from("tutor").insert({
          user_id: currentUserId,
          bio: bio || null,
          materie: materie,
          disponibilita_note: disp || null,
          max_allievi: max,
          stato: "in_attesa",
          disponibile: true
        });
        if (ins.error) throw ins.error;
      }
      if (msg) {
        msg.style.color = "#34d399";
        msg.textContent = "Candidatura salvata. In attesa di approvazione admin.";
      }
      document.getElementById("tu-candida-box").style.display = "none";
      await loadMyTutor();
    } catch (e) {
      if (msg) {
        msg.style.color = "#f87171";
        msg.textContent = e.message || e;
      }
    }
  }

  function wire() {
    var filt = document.getElementById("tu-filter");
    if (filt) filt.onchange = renderList;

    var btn = document.getElementById("tu-btn-candida");
    if (btn)
      btn.onclick = function () {
        var box = document.getElementById("tu-candida-box");
        if (!box) return;
        box.style.display = box.style.display === "none" ? "block" : "none";
        if (myTutor) {
          document.getElementById("tu-bio").value = myTutor.bio || "";
          document.getElementById("tu-disp").value = myTutor.disponibilita_note || "";
          document.getElementById("tu-max").value = myTutor.max_allievi || 3;
          document.querySelectorAll("#tu-materie-checks input").forEach(function (c) {
            c.checked = (myTutor.materie || []).indexOf(c.value) >= 0;
          });
        }
      };

    var save = document.getElementById("tu-candida-save");
    if (save) save.onclick = saveCandidatura;
    var cancel = document.getElementById("tu-candida-cancel");
    if (cancel)
      cancel.onclick = function () {
        document.getElementById("tu-candida-box").style.display = "none";
      };
  }

  async function boot() {
    var ok = await waitCVI();
    if (!ok) return;
    currentUserId = await getUserId();
    var gate = document.getElementById("tu-auth-gate");
    var app = document.getElementById("tu-app");
    if (!currentUserId) {
      if (gate) gate.style.display = "block";
      if (app) app.style.display = "none";
      return;
    }
    if (gate) gate.style.display = "none";
    if (app) app.style.display = "block";
    wire();
    await loadMyTutor();
    await loadTutors();
    await loadSessioni();
  }

  boot();
})();
