/* CVI - Gestione soci: team, ruolo, nickname, note interne ed espulsione (admin) */
(function () {
  "use strict";

  var ROLES = ["socio", "scorer", "caposquadra", "admin"];
  var ROLE_KEYS = {
    socio: "role_socio",
    scorer: "role_scorer",
    caposquadra: "role_capo",
    admin: "role_admin"
  };

  var isAdmin = false;
  var currentUserId = null;
  var hasTeamIdCol = false;
  var teamsList = [];
  var notesByUid = {};
  var notesAvailable = false;
  var messagesAvailable = false;
  var messageRecipient = null;
  var messageModal = null;
  var container = null;
  var bound = false;

  function esc(s) {
    if (s == null) return "";
    var t = String(s);
    var a = String.fromCharCode(38);
    return t.split(a).join(a + "amp;").split("<").join(a + "lt;").split(">").join(a + "gt;").split('"').join(a + "quot;");
  }

  function tName(team) {
    return ((team && (team.nome_team || team.nome)) || "").trim();
  }

  function t(key) {
    return window.CVIMembers && CVIMembers.t ? CVIMembers.t(key) : "";
  }

  var toastTimer = null;
  function toast(message) {
    if (!message) return;
    var el = document.getElementById("cvi-admin-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "cvi-admin-toast";
      el.className = "cvi-admin-toast";
      el.setAttribute("role", "status");
      el.setAttribute("aria-live", "polite");
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove("show"); }, 2600);
  }

  async function checkAdmin() {
    if (!window.CVI || !CVI.supabase) return false;
    var res = await CVI.supabase.auth.getSession();
    var session = res.data && res.data.session;
    if (!session) return false;
    currentUserId = session.user.id;
    var pr = await CVI.supabase.from("profiles").select("is_admin,role").eq("id", currentUserId).maybeSingle();
    var p = pr.data;
    if (!p) return false;
    if (p.is_admin === true) return true;
    return String(p.role || "").toLowerCase() === "admin";
  }

  async function loadTeams() {
    var r = await CVI.supabase.from("teams").select("*");
    teamsList = r.data || [];
    teamsList.sort(function (a, b) {
      return tName(a).localeCompare(tName(b), "it");
    });
  }

  async function loadNotes() {
    notesByUid = {};
    notesAvailable = false;
    var r = await CVI.supabase.from("member_notes").select("user_id,note");
    if (r.error) return;
    notesAvailable = true;
    (r.data || []).forEach(function (n) {
      if (n && n.user_id) notesByUid[String(n.user_id)] = n.note || "";
    });
  }

  async function loadMessagesAvailability() {
    var r = await CVI.supabase.from("member_messages").select("id").limit(1);
    messagesAvailable = !r.error;
  }

  function profilesByUid() {
    var map = {};
    var list = window.CVIMembers ? CVIMembers.getProfiles() : [];
    list.forEach(function (p) { map[String(p.id)] = p; });
    return map;
  }

  function roleOf(p) {
    var r = String((p && p.role) || "").toLowerCase();
    if (ROLES.indexOf(r) >= 0) return r;
    return p && p.is_admin === true ? "admin" : "socio";
  }

  function roleLabel(role) {
    return t(ROLE_KEYS[role]) || role;
  }

  function buildRoleOptions(p) {
    var current = roleOf(p);
    return ROLES.map(function (role) {
      return '<option value="' + role + '"' + (role === current ? " selected" : "") + ">" +
        esc(roleLabel(role)) + "</option>";
    }).join("");
  }

  function buildOptions(p) {
    var curId = p.team_id ? String(p.team_id) : "";
    var curName = (p.team || "").trim().toLowerCase();
    var opts = '<option value="">— ' + esc(t("no_team") || "Nessun team") + ' —</option>';
    teamsList.forEach(function (team) {
      var name = tName(team);
      if (!name) return;
      var id = String(team.id);
      var selected = (curId && curId === id) || (!curId && curName && curName === name.toLowerCase());
      opts += '<option value="' + esc(id) + '" data-name="' + esc(name) + '"' +
        (selected ? " selected" : "") + ">" + esc(name) + "</option>";
    });
    return opts;
  }

  function setTeamBadge(card, team) {
    var box = card.querySelector(".member-team");
    if (!box) return;
    box.innerHTML = team
      ? '<span class="team-badge">' + esc(team) + "</span>"
      : '<span class="member-no-team">' + esc(t("no_team")) + "</span>";
  }

  function setupMessageModal() {
    if (messageModal) return;
    messageModal = document.getElementById("cvi-message-modal");
    if (!messageModal) return;

    var form = document.getElementById("cvi-message-form");
    var closeBtn = document.getElementById("cvi-message-close");
    var cancelBtn = document.getElementById("cvi-message-cancel");
    var sendBtn = document.getElementById("cvi-message-send");
    var statusEl = document.getElementById("cvi-message-status");
    var subjectEl = document.getElementById("cvi-message-subject");
    var bodyEl = document.getElementById("cvi-message-body");

    function closeModal() {
      messageModal.hidden = true;
      document.body.classList.remove("cvi-modal-open");
      messageRecipient = null;
      if (statusEl) statusEl.textContent = "";
    }

    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    if (cancelBtn) cancelBtn.addEventListener("click", closeModal);
    messageModal.addEventListener("click", function (e) {
      if (e.target === messageModal) closeModal();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && messageModal && !messageModal.hidden) closeModal();
    });

    if (form) form.addEventListener("submit", async function (e) {
      e.preventDefault();
      if (!messageRecipient) return;

      var body = bodyEl ? bodyEl.value.trim() : "";
      if (!body) {
        if (statusEl) statusEl.textContent = t("message_body_required") || "Scrivi il testo del messaggio.";
        if (bodyEl) bodyEl.focus();
        return;
      }

      if (sendBtn) sendBtn.disabled = true;
      if (statusEl) statusEl.textContent = "";

      var res = await CVI.supabase.from("member_messages").insert({
        sender_id: currentUserId,
        recipient_id: messageRecipient,
        subject: subjectEl ? subjectEl.value.trim() : "",
        body: body
      });
      if (sendBtn) sendBtn.disabled = false;

      if (res.error) {
        if (statusEl) {
          statusEl.textContent = (t("message_error") || "Errore invio: ") + res.error.message;
        }
        return;
      }

      closeModal();
      if (form) form.reset();
      toast(t("message_sent"));
    });
  }

  function openMessageModal(uid, name) {
    if (!messagesAvailable || !uid) return;
    setupMessageModal();
    if (!messageModal) return;

    messageRecipient = uid;
    var title = document.getElementById("cvi-message-title");
    if (title) title.textContent = t("message_title").replace("{name}", name || "");

    var statusEl = document.getElementById("cvi-message-status");
    if (statusEl) statusEl.textContent = "";
    var subjectEl = document.getElementById("cvi-message-subject");
    if (subjectEl) subjectEl.value = "";
    var bodyEl = document.getElementById("cvi-message-body");
    if (bodyEl) bodyEl.value = "";

    messageModal.hidden = false;
    document.body.classList.add("cvi-modal-open");
    if (bodyEl) bodyEl.focus();
  }

  function bindMessageButton(btn, uid, card) {
    btn.addEventListener("click", function () {
      openMessageModal(uid, card.getAttribute("data-nick") || "");
    });
  }

  async function expelMember(uid, nick) {
    if (!uid) return;
    if (currentUserId && String(uid) === String(currentUserId)) {
      alert("Non puoi espellere te stesso.");
      return;
    }
    var label = nick || "questo socio";
    if (!confirm("Espellere «" + label + "» dal circolo?\n\nVerrà rimosso dall'elenco soci.")) return;
    if (!confirm("Confermi definitivamente l'espulsione di «" + label + "»?")) return;

    try { await CVI.supabase.from("iscrizioni_gare").delete().eq("user_id", uid); } catch (e) {}
    try { await CVI.supabase.from("member_notes").delete().eq("user_id", uid); } catch (e) {}

    var del = await CVI.supabase.from("profiles").delete().eq("id", uid);
    if (del.error) {
      var soft = await CVI.supabase.from("profiles").update({
        team: null, team_id: null,
        nickname: nick ? nick + " (espulso)" : "espulso",
        is_admin: false
      }).eq("id", uid);
      if (soft.error) {
        await CVI.supabase.from("profiles").update({
          team: null,
          nickname: nick ? nick + " (espulso)" : "espulso",
          is_admin: false
        }).eq("id", uid);
      }
      alert("Profilo non eliminato (policy RLS). Marcato come espulso.");
    }

    if (window.CVIMembers) CVIMembers.refresh();
  }

  function bindTeamSelect(sel, uid, card) {
    sel.addEventListener("change", async function () {
      var tid = sel.value || null;
      var opt = sel.options[sel.selectedIndex];
      var teamName = tid && opt ? opt.getAttribute("data-name") : null;
      var payload = { team: teamName || null };
      if (hasTeamIdCol) payload.team_id = tid || null;

      sel.disabled = true;
      var r = await CVI.supabase.from("profiles").update(payload).eq("id", uid);
      if (r.error && hasTeamIdCol) {
        delete payload.team_id;
        r = await CVI.supabase.from("profiles").update(payload).eq("id", uid);
      }
      if (r.error && !teamName) {
        r = await CVI.supabase.from("profiles").update({ team: "" }).eq("id", uid);
      }
      sel.disabled = false;
      if (r.error) {
        alert("Errore: " + r.error.message);
        return;
      }

      if (window.CVIMembers) {
        var patch = { team: teamName || null };
        if (hasTeamIdCol) patch.team_id = tid || null;
        CVIMembers.updateProfile(uid, patch);
      } else {
        card.setAttribute("data-team", teamName || "");
        setTeamBadge(card, teamName);
      }
    });
  }

  function bindRoleSelect(sel, uid, card) {
    sel.addEventListener("change", async function () {
      var role = sel.value;
      if (ROLES.indexOf(role) < 0) return;

      var name = card.getAttribute("data-nick") || "";
      var question = t("role_change_confirm")
        .replace("{name}", name)
        .replace("{role}", roleLabel(role));
      if (!confirm(question)) {
        var p = profilesByUid()[uid];
        sel.value = roleOf(p);
        return;
      }

      var payload = { role: role, is_admin: role === "admin" };
      sel.disabled = true;
      var r = await CVI.supabase.from("profiles").update(payload).eq("id", uid);
      sel.disabled = false;
      if (r.error) {
        alert((t("role_error") || "Errore ruolo: ") + r.error.message);
        return;
      }
      toast(t("role_updated"));
      if (window.CVIMembers) CVIMembers.updateProfile(uid, payload);
    });
  }

  function bindNickButton(btn, uid, card) {
    btn.addEventListener("click", async function () {
      var current = (card.getAttribute("data-nick") || "").replace(/^@/, "");
      var value = prompt(t("reset_nick_prompt").replace("{name}", current), current);
      if (value == null) return;
      value = value.trim();
      if (!value) return;
      if (value.length > 40) value = value.slice(0, 40);

      btn.disabled = true;
      var r = await CVI.supabase.from("profiles").update({ nickname: value }).eq("id", uid);
      btn.disabled = false;
      if (r.error) {
        alert((t("reset_nick_error") || "Errore nickname: ") + r.error.message);
        return;
      }
      toast(t("reset_nick_done"));
      if (window.CVIMembers) CVIMembers.updateProfile(uid, { nickname: value });
    });
  }

  function bindNoteButton(btn, uid, card) {
    btn.addEventListener("click", async function () {
      var current = notesByUid[uid] || "";
      var value = prompt(
        t("note_prompt").replace("{name}", card.getAttribute("data-nick") || ""),
        current
      );
      if (value == null) return;
      value = value.trim();

      btn.disabled = true;
      var r;
      if (value) {
        r = await CVI.supabase.from("member_notes").upsert({
          user_id: uid,
          note: value,
          updated_by: currentUserId,
          updated_at: new Date().toISOString()
        }, { onConflict: "user_id" });
      } else {
        r = await CVI.supabase.from("member_notes").delete().eq("user_id", uid);
      }
      btn.disabled = false;

      if (r.error) {
        alert((t("note_error") || "Errore nota: ") + r.error.message);
        return;
      }
      notesByUid[uid] = value;
      btn.classList.toggle("has-note", !!value);
      btn.title = value || "";
      toast(value ? t("note_saved") : t("note_deleted"));
    });
  }

  function addControls(card, profiles) {
    var uid = card.getAttribute("data-uid");
    var actions = card.querySelector(".member-card-actions");
    if (!uid || !actions || actions.getAttribute("data-ready") === "1") return;
    actions.setAttribute("data-ready", "1");

    if (String(uid) === String(currentUserId)) return;

    var p = profiles[uid] || {};
    card.classList.add("is-admin");

    var html =
      '<select class="member-admin-select member-team-select" aria-label="' +
        esc(t("assign_team") || "Assegna team") + '">' + buildOptions(p) + "</select>" +
      '<select class="member-admin-select member-role-select" aria-label="' +
        esc(t("role_label") || "Ruolo") + '">' + buildRoleOptions(p) + "</select>" +
      '<button type="button" class="member-admin-btn" data-action="nick">' +
        esc(t("reset_nick") || "Reset nick") + "</button>";

    if (notesAvailable) {
      var hasNote = !!notesByUid[uid];
      html += '<button type="button" class="member-admin-btn member-note-btn' +
        (hasNote ? " has-note" : "") + '" data-action="note" title="' +
        esc(notesByUid[uid] || "") + '">' + esc(t("note") || "Nota") + "</button>";
    }

    if (messagesAvailable) {
      html += '<button type="button" class="member-admin-btn" data-action="message">' +
        esc(t("message") || "Messaggio") + "</button>";
    }

    html += '<button type="button" class="member-expel-btn">' +
      esc(t("expel") || "Espelli") + "</button>";

    actions.innerHTML = html;

    var teamSel = actions.querySelector(".member-team-select");
    var roleSel = actions.querySelector(".member-role-select");
    var nickBtn = actions.querySelector('[data-action="nick"]');
    var noteBtn = actions.querySelector('[data-action="note"]');
    var messageBtn = actions.querySelector('[data-action="message"]');
    var expelBtn = actions.querySelector(".member-expel-btn");

    if (teamSel) bindTeamSelect(teamSel, uid, card);
    if (roleSel) bindRoleSelect(roleSel, uid, card);
    if (nickBtn) bindNickButton(nickBtn, uid, card);
    if (noteBtn) bindNoteButton(noteBtn, uid, card);
    if (messageBtn) bindMessageButton(messageBtn, uid, card);
    if (expelBtn) expelBtn.addEventListener("click", function () {
      expelMember(uid, card.getAttribute("data-nick"));
    });
  }

  function augment() {
    if (!isAdmin || !container) return;
    var profiles = profilesByUid();
    container.querySelectorAll(".member-card").forEach(function (card) {
      addControls(card, profiles);
    });
  }

  async function boot() {
    isAdmin = await checkAdmin();
    if (!isAdmin) return;

    var profiles = window.CVIMembers ? CVIMembers.getProfiles() : [];
    hasTeamIdCol = profiles.length > 0 && Object.prototype.hasOwnProperty.call(profiles[0], "team_id");

    await Promise.all([loadTeams(), loadNotes(), loadMessagesAvailability()]);
    setupMessageModal();

    container = document.getElementById("members-container");
    if (!container) return;

    if (!bound) {
      container.addEventListener("cvi:members-rendered", augment);
      bound = true;
    }
    augment();
  }

  var tries = 0;
  var wait = setInterval(function () {
    tries++;
    var ready = window.CVI && CVI.supabase && window.CVIMembers &&
      CVIMembers.getProfiles().length > 0;
    if (ready) {
      clearInterval(wait);
      setTimeout(boot, 300);
    } else if (tries > 100) {
      clearInterval(wait);
    }
  }, 100);
})();
