/* CVI – Iscrizione self-service eventi (serie + singoli)
   Regole: login + nickname profilo, date iscrizione, max posti, evento non passato.
   Dipende da eventi-common.js (CVIEventi) e CVI.supabase. */
(function () {
  "use strict";

  function esc(s) {
    if (window.CVIEventi && CVIEventi.esc) return CVIEventi.esc(s);
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&" + "amp;")
      .replace(/</g, "&" + "lt;")
      .replace(/>/g, "&" + "gt;")
      .replace(/"/g, "&" + "quot;");
  }

  function nowMs() {
    return Date.now();
  }

  function parseTs(iso) {
    if (!iso) return null;
    var t = new Date(iso).getTime();
    return isNaN(t) ? null : t;
  }

  /** Stato iscrizione rispetto a date apertura/chiusura e se l'evento e' passato. */
  function registrationWindow(raw) {
    var n = nowMs();
    /* Evento/serie gia' terminato: niente iscrizioni */
    var endIso = (raw && (raw.data_fine || raw.data_evento)) || null;
    var end = parseTs(endIso);
    if (end) {
      var endDate = new Date(end);
      var onlyDate =
        endDate.getUTCHours() === 0 &&
        endDate.getUTCMinutes() === 0 &&
        endDate.getUTCSeconds() === 0;
      var endLimit = onlyDate ? end + 24 * 60 * 60 * 1000 - 1 : end;
      if (n > endLimit) {
        return { ok: false, reason: "past", message: "Evento terminato: iscrizioni chiuse." };
      }
    }
    var open = parseTs(raw && raw.iscrizioni_apertura);
    var close = parseTs(raw && raw.iscrizioni_chiusura);
    if (open && n < open) {
      return { ok: false, reason: "not_open", message: "Iscrizioni non ancora aperte." };
    }
    if (close && n > close) {
      return { ok: false, reason: "closed", message: "Iscrizioni chiuse." };
    }
    return { ok: true, reason: "open", message: "" };
  }

  function findMyIscrizione(list, user) {
    if (!user || !list || !list.length) return null;
    var nick = String(user.nickname || "")
      .trim()
      .toLowerCase();
    for (var i = 0; i < list.length; i++) {
      var row = list[i];
      if (user.id && row.user_id && String(row.user_id) === String(user.id)) return row;
      if (nick && String(row.nickname || "").trim().toLowerCase() === nick) return row;
    }
    return null;
  }

  function tableFor(kind) {
    return kind === "serie" ? "serie_aperte_iscrizioni" : "eventi_aperti_iscrizioni";
  }

  function idField(kind) {
    return kind === "serie" ? "serie_id" : "evento_id";
  }

  function status(kind, raw, iscrizioni, user) {
    var list = iscrizioni || [];
    var myRow = findMyIscrizione(list, user);
    var max =
      raw && raw.max_iscritti != null && Number(raw.max_iscritti) > 0
        ? Number(raw.max_iscritti)
        : null;
    var win = registrationWindow(raw || {});
    var count = list.length;

    if (myRow) {
      return {
        canRegister: false,
        canUnregister: win.reason === "past" ? false : (win.ok || win.reason === "closed"),
        isRegistered: true,
        message:
          win.reason === "past"
            ? "Evento terminato. Eri iscritto come " + (myRow.nickname || user.nickname || "")
            : "Sei iscritto come " + (myRow.nickname || user.nickname || ""),
        myRow: myRow,
        count: count,
        max: max
      };
    }

    if (!user) {
      return {
        canRegister: false,
        canUnregister: false,
        isRegistered: false,
        message: win.reason === "past" ? "Evento terminato: iscrizioni chiuse." : "Accedi per iscriverti.",
        myRow: null,
        count: count,
        max: max
      };
    }

    if (!user.nickname || !String(user.nickname).trim()) {
      return {
        canRegister: false,
        canUnregister: false,
        isRegistered: false,
        message: "Imposta un nickname nel profilo per iscriverti.",
        myRow: null,
        count: count,
        max: max
      };
    }

    if (!win.ok) {
      return {
        canRegister: false,
        canUnregister: false,
        isRegistered: false,
        message: win.message,
        myRow: null,
        count: count,
        max: max
      };
    }

    if (max != null && count >= max) {
      return {
        canRegister: false,
        canUnregister: false,
        isRegistered: false,
        message: "Posti esauriti (" + count + "/" + max + ").",
        myRow: null,
        count: count,
        max: max
      };
    }

    return {
      canRegister: true,
      canUnregister: false,
      isRegistered: false,
      message: max != null ? count + "/" + max + " iscritti" : count + " iscritti",
      myRow: null,
      count: count,
      max: max
    };
  }

  async function register(kind, eventId, user) {
    if (!window.CVI || !CVI.supabase) throw new Error("Servizio non disponibile");
    if (!user || !user.id) throw new Error("Devi accedere");
    if (!user.nickname || !String(user.nickname).trim()) {
      throw new Error("Imposta un nickname nel profilo");
    }
    var payload = {
      user_id: user.id,
      nickname: String(user.nickname).trim()
    };
    payload[idField(kind)] = eventId;
    var res = await CVI.supabase.from(tableFor(kind)).insert(payload).select("*").maybeSingle();
    if (res.error) {
      if (/duplicate|unique/i.test(res.error.message || "")) {
        throw new Error("Sei già iscritto a questo evento");
      }
      if (/row-level security|policy|permission/i.test(res.error.message || "")) {
        throw new Error(
          "Iscrizione non consentita. Esegui eventi-iscrizioni-self-sql.sql su Supabase oppure contatta un admin."
        );
      }
      if (/relation .* does not exist|schema cache/i.test(res.error.message || "")) {
        throw new Error("Tabelle iscrizioni assenti: esegui eventi-iscrizioni-self-sql.sql su Supabase.");
      }
      throw new Error(res.error.message || String(res.error));
    }
    return res.data;
  }

  async function unregister(kind, eventId, user, myRow) {
    if (!window.CVI || !CVI.supabase) throw new Error("Servizio non disponibile");
    if (!user || !user.id) throw new Error("Devi accedere");
    var q = CVI.supabase.from(tableFor(kind)).delete();
    if (myRow && myRow.id) {
      q = q.eq("id", myRow.id);
    } else {
      q = q.eq(idField(kind), eventId).eq("user_id", user.id);
    }
    var res = await q;
    if (res.error) throw new Error(res.error.message || String(res.error));
    return true;
  }

  async function fetchIscrizioni(kind, eventId) {
    if (!window.CVI || !CVI.supabase) return [];
    var res = await CVI.supabase
      .from(tableFor(kind))
      .select("*")
      .eq(idField(kind), eventId);
    if (res.error) return [];
    return res.data || [];
  }

  function buttonHtml(st, opts) {
    opts = opts || {};
    var cls = opts.className || "evp-btn-iscr";
    if (st.isRegistered && st.canUnregister) {
      return (
        '<button type="button" class="' +
        cls +
        " " +
        cls +
        '--out" data-ev-iscr="out">' +
        (opts.unregisterLabel || "Annulla iscrizione") +
        "</button>"
      );
    }
    if (st.canRegister) {
      return (
        '<button type="button" class="' +
        cls +
        '" data-ev-iscr="in">' +
        (opts.registerLabel || "Iscriviti") +
        "</button>"
      );
    }
    if (st.message && /terminat|chiuse|non ancora/i.test(st.message)) {
      return (
        '<span class="' +
        cls +
        " " +
        cls +
        '--disabled" style="opacity:.65;cursor:default;pointer-events:none">' +
        (st.message.indexOf("terminat") >= 0 ? "Evento terminato" : "Iscrizioni chiuse") +
        "</span>"
      );
    }
    if (!opts.user) {
      return (
        '<a class="' +
        cls +
        " " +
        cls +
        '--login" href="accedi.html">' +
        (opts.loginLabel || "Accedi per iscriverti") +
        "</a>"
      );
    }
    return "";
  }

  window.CVIEventiIscrizione = {
    status: status,
    register: register,
    unregister: unregister,
    fetchIscrizioni: fetchIscrizioni,
    findMyIscrizione: findMyIscrizione,
    registrationWindow: registrationWindow,
    buttonHtml: buttonHtml,
    esc: esc
  };
})();
