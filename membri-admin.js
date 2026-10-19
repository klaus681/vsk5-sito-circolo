/* CVI - Gestione soci: team + espulsione (admin) integrata nelle card */
(function () {
  "use strict";

  var isAdmin = false;
  var currentUserId = null;
  var hasTeamIdCol = false;
  var teamsList = [];
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

  function profilesByUid() {
    var map = {};
    var list = window.CVIMembers ? CVIMembers.getProfiles() : [];
    list.forEach(function (p) { map[String(p.id)] = p; });
    return map;
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

  function addControls(card, profiles) {
    var uid = card.getAttribute("data-uid");
    var actions = card.querySelector(".member-card-actions");
    if (!uid || !actions || actions.getAttribute("data-ready") === "1") return;
    actions.setAttribute("data-ready", "1");

    if (String(uid) === String(currentUserId)) return;

    var p = profiles[uid] || {};
    card.classList.add("is-admin");
    actions.innerHTML =
      '<select class="member-admin-select" aria-label="' + esc(t("assign_team") || "Assegna team") + '">' +
        buildOptions(p) +
      "</select>" +
      '<button type="button" class="member-expel-btn">' + esc(t("expel") || "Espelli") + "</button>";

    var sel = actions.querySelector(".member-admin-select");
    var btn = actions.querySelector(".member-expel-btn");

    if (sel) {
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

    if (btn) {
      btn.addEventListener("click", function () {
        expelMember(uid, card.getAttribute("data-nick"));
      });
    }
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

    await loadTeams();
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
