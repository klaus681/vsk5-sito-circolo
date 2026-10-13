/* CVI - Gestione soci: team + espulsione (admin) + team_id */
(function () {
  var isAdmin = false;
  var currentUserId = null;
  var hasTeamIdCol = false;
  var teamsList = [];

  function esc(s) {
    if (s == null) return "";
    var t = String(s);
    var a = String.fromCharCode(38);
    return t.split(a).join(a + "amp;").split("<").join(a + "lt;").split(">").join(a + "gt;").split('"').join(a + "quot;");
  }

  function tName(t) {
    return ((t && (t.nome_team || t.nome)) || "").trim();
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
    if (String(p.role || "").toLowerCase() === "admin") return true;
    return false;
  }

  async function loadTeams() {
    var r = await CVI.supabase.from("teams").select("*");
    teamsList = r.data || [];
    teamsList.sort(function (a, b) {
      return tName(a).localeCompare(tName(b), "it");
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
    init();
  }

  async function init() {
    isAdmin = await checkAdmin();
    var container =
      document.getElementById("membri-list") ||
      document.getElementById("members-list") ||
      document.getElementById("members-container") ||
      document.querySelector(".members-list");
    if (!container || !isAdmin) return;

    await loadTeams();
    var pr = await CVI.supabase.from("profiles").select("*");
    if (pr.error || !pr.data) return;
    var profiles = pr.data;
    hasTeamIdCol = profiles.length > 0 && Object.prototype.hasOwnProperty.call(profiles[0], "team_id");

    var list = profiles.filter(function (p) {
      var nick = (p.nickname || "").toLowerCase();
      if (nick.indexOf("espulso") >= 0) return false;
      if (p.expelled === true || p.attivo === false) return false;
      return true;
    });
    list.sort(function (a, b) {
      return (a.nickname || a.nome || "").toLowerCase().localeCompare((b.nickname || b.nome || "").toLowerCase(), "it");
    });

    var html =
      '<div class="admin-hint" style="margin-bottom:1rem;padding:0.65rem 0.9rem;background:rgba(56,189,248,0.08);border:1px solid rgba(56,189,248,0.25);border-radius:8px;font-size:0.85rem;color:#94a3b8">Modalita admin: assegna team' +
      (hasTeamIdCol ? " (team_id attivo)" : "") +
      ' o <strong style="color:#f87171">espelli</strong>.</div>';
    html += '<table class="rank-table members-admin-table"><thead><tr><th>Skipper</th><th>Nome</th><th>Team</th><th>Assegna team</th><th>Azioni</th></tr></thead><tbody>';

    list.forEach(function (p) {
      var nick = p.nickname || "—";
      var nome = [p.nome, p.cognome].filter(Boolean).join(" ");
      var team = (p.team || "").trim();
      if (!team && p.team_id) {
        var ot = teamsList.find(function (x) { return String(x.id) === String(p.team_id); });
        if (ot) team = tName(ot);
      }
      var isSelf = currentUserId && String(p.id) === String(currentUserId);
      var curId = p.team_id ? String(p.team_id) : "";
      var curName = team.toLowerCase();
      var opts = '<option value="">— Nessun team —</option>' +
        teamsList.map(function (t) {
          var n = tName(t);
          var id = String(t.id);
          var sel = (curId && curId === id) || (!curId && curName && curName === n.toLowerCase());
          return '<option value="' + esc(id) + '" data-name="' + esc(n) + '"' + (sel ? " selected" : "") + '>' + esc(n) + '</option>';
        }).join("");

      html += '<tr data-uid="' + p.id + '">' +
        '<td><strong>' + esc(nick) + '</strong>' + (p.is_admin ? ' <span style="font-size:0.7rem;color:#38bdf8">admin</span>' : '') + '</td>' +
        '<td>' + esc(nome) + '</td>' +
        '<td>' + (team ? '<span class="team">' + esc(team) + '</span>' : '—') + '</td>' +
        '<td><select class="membri-team-select" data-uid="' + p.id + '" style="background:#0b0f19;color:#fff;border:1px solid rgba(56,189,248,0.35);border-radius:6px;padding:0.3rem 0.5rem;font-size:0.8rem;font-family:inherit;max-width:160px">' + opts + '</select></td>' +
        '<td>' + (isSelf
          ? '<span style="font-size:0.78rem;color:#64748b">—</span>'
          : '<button type="button" class="membri-expel-btn" data-uid="' + p.id + '" data-nick="' + esc(nick) + '" style="background:transparent;color:#f87171;border:1px solid rgba(248,113,113,0.45);padding:0.3rem 0.6rem;border-radius:6px;font-size:0.78rem;font-weight:600;cursor:pointer;font-family:inherit">Espelli</button>') +
        '</td></tr>';
    });
    html += '</tbody></table>';
    container.innerHTML = html;

    container.querySelectorAll(".membri-team-select").forEach(function (sel) {
      sel.addEventListener("change", async function () {
        var uid = sel.getAttribute("data-uid");
        var tid = sel.value || null;
        var opt = sel.options[sel.selectedIndex];
        var tname = tid && opt ? opt.getAttribute("data-name") : null;
        sel.disabled = true;
        var payload = { team: tname || null };
        if (hasTeamIdCol) payload.team_id = tid || null;
        var r = await CVI.supabase.from("profiles").update(payload).eq("id", uid);
        if (r.error && hasTeamIdCol) {
          delete payload.team_id;
          r = await CVI.supabase.from("profiles").update(payload).eq("id", uid);
        }
        if (r.error && !tname) {
          r = await CVI.supabase.from("profiles").update({ team: "" }).eq("id", uid);
        }
        sel.disabled = false;
        if (r.error) { alert("Errore: " + r.error.message); return; }
        var tr = sel.closest("tr");
        if (tr) {
          var teamCell = tr.children[2];
          if (teamCell) teamCell.innerHTML = tname ? '<span class="team">' + esc(tname) + '</span>' : '—';
        }
      });
    });

    container.querySelectorAll(".membri-expel-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        expelMember(btn.getAttribute("data-uid"), btn.getAttribute("data-nick"));
      });
    });
  }

  var tries = 0;
  var wait = setInterval(function () {
    tries++;
    if (window.CVI && CVI.supabase) {
      clearInterval(wait);
      setTimeout(init, 600);
    } else if (tries > 40) clearInterval(wait);
  }, 100);
})();
