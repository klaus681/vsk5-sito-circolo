/* CVI Virtual – shared nav, i18n helpers, mobile menu */
(function () {
  const SUPABASE_URL = 'https://kisffsyerranniypkcqa.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtpc2Zmc3llcnJhbm5peXBrY3FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA5MTgxMTgsImV4cCI6MjEwNjQ5NDExOH0.1PNoShPUl32yN3aQenRNan_SCTxtKacr_VVwi5uaELs';

  window.CVI = window.CVI || {};
  window.CVI.supabase = window.supabase
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

  const NAV_KEYS = {
    it: {
      nav_home: 'Home', nav_team: 'Team', nav_gare: 'Gare & Eventi ▾',
      nav_gare_sub: 'Calendario', nav_cal_vista: 'Vista calendario', nav_classifiche: 'Classifiche', nav_proteste: 'Proteste',
      nav_albo: "Albo d'Oro", nav_regolamento: 'Regolamento', nav_download: 'Download',
      nav_contatti: 'Contatti', nav_membri: 'Membri', nav_unisciti: 'Unisciti',
      nav_accedi: 'Accedi', nav_area_membri: 'Il mio profilo',
      nav_galleria: 'Galleria', nav_discord: 'Discord', nav_eventi_aperti: 'Eventi aperti',
      nav_risorse: 'Download e Risorse', nav_tornei: 'Tornei', nav_allenamenti: 'Allenamenti',
      nav_community: 'Community ▾', nav_friends: 'Siti amici',

      /* Home */
      home_cta1: 'Calendario Regate',
      home_stat_soci_label: 'Soci', home_stat_squadre_label: 'Squadre',
      home_stat_regate_label: 'Regate 2026', home_stat_dal_label: 'Dal',
      home_ranking_title: 'Classifica generale', home_see_all: 'Vedi tutto →',
      home_highlights: 'Ultime Regate & Highlights', home_rank_loading: 'Caricamento classifica…',
      home_rank_empty: 'Nessun risultato ancora',
      home_rank_empty_sub: 'Inserisci i risultati dalla pagina Classifiche',
      home_rank_error: 'Errore caricamento',

      /* Scheda prossima gara + countdown */
      race_next: 'Prossima gara', race_last: 'Ultima gara', race_running: 'Gara in corso',
      race_done: 'Conclusa', race_live: 'In corso', race_status: 'Stato',
      race_starts_in: 'Parte tra', race_finished: 'Gara conclusa',
      race_open_event: 'Evento aperto', race_special_event: 'Evento speciale · soci',
      race_members_only: 'Riservata ai soci', race_upcoming: 'In arrivo',
      race_no_signup: 'Senza iscrizione', race_signup_open: 'Iscrizioni aperte',
      race_signup_closed: 'Iscrizioni chiuse', race_entries: 'Iscritti',
      race_full: 'Al completo', race_password: 'Password server:',
      race_none: 'Nessuna gara in programma', race_check_later: 'Controlla più tardi per nuovi eventi.',
      race_load_error: 'Impossibile caricare le gare', race_loading: 'Caricamento da database...',
      race_no_title: 'Gara senza titolo', race_date_tbd: 'Data da definirsi',
      race_follow_live: 'Segui LIVE', day_short: 'g',

      /* Footer / banner siti amici */
      footer_circolo: 'Circolo', footer_gare: 'Gare', footer_privacy: 'Privacy',
      footer_tagline: 'Circolo Velico Italia · Virtual Skipper dal 2003.',
      skip_to_content: 'Vai al contenuto',
      friends_eyebrow: 'Community', friends_title: 'Siti amici & link utili',
      friends_sub: 'Realtà e risorse che seguiamo', friends_visit: 'Visita',
      opens_new_tab: 'si apre in una nuova scheda',

      /* Banner dinamici in home */
      banner_open_event: 'Evento aperto', banner_see_all: 'Vedi tutto →',
      banner_standings_updating: 'Classifica in aggiornamento',
      banner_open_note: 'Classifica separata · non ufficiale soci',
      banner_training: 'ALLENAMENTO', banner_members_only: 'SOLO SOCI',
      banner_entries: 'ISCRITTI', banner_training_cta: "Iscriviti all'allenamento →",
      banner_tournament: 'TORNEO', banner_status_in_progress: 'IN CORSO',
      banner_status_reg_open: 'ISCRIZIONI APERTE', banner_go_tournament: 'Vai al torneo →',
      banner_open_series: 'Serie Aperta', banner_full_standings: 'Classifica completa →',
      banner_last_race: 'Ultima regata:', banner_wins: 'vince',
      banner_discards: 'scarti', banner_automatic: '(automatici)',
      banner_races: 'regate', banner_races_vsk: 'regate VSK',
      banner_series_note: 'classifica aperta non ufficiale',
      banner_tournament_vsk: 'Torneo · classifica VSK',
      banner_view_tournament: 'Vedi il torneo →', banner_points_short: 'pt',

      /* Banner account in attesa / sospeso */
      membership_pending: '⏳ Account in attesa di approvazione.',
      membership_suspended: '⛔ Account sospeso.',
      membership_public_only: 'Puoi consultare solo i contenuti pubblici.',
      membership_details: 'Dettagli',

      /* Popup meteo gara */
      meteo_title: 'Meteo gara', meteo_official: 'Condizioni ufficiali della regata',
      meteo_note: "Condizioni meteo impostate dall'organizzazione per la regata.",
      meteo_close: 'Chiudi', meteo_races: 'Regate', meteo_race: 'Regata',
      meteo_date: 'Data gara', meteo_current: 'Corrente', meteo_wind_dir: 'Direzione vento',
      meteo_wind_intensity: 'Intensità vento', meteo_no_wind: 'Dati del vento non inseriti.',
      meteo_conditions: 'Condizioni', meteo_clouds: 'Nuvole', meteo_temp: 'Temperatura',
      meteo_knots: 'nodi', meteo_default_race: 'Gara CVI',
      meteo_f_ora: 'Ora regata', meteo_f_vento: 'Vento (nodi)', meteo_f_vento_dir: 'Direzione vento (°)',
      meteo_f_corrente: 'Corrente (nodi)', meteo_f_corrente_dir: 'Direzione corrente (°)',
      meteo_f_temp: 'Temperatura (°C)', meteo_f_cond: 'Condizioni', meteo_f_nuvole: 'Nuvole',
      meteo_ph_wind: 'es. 12.5', meteo_ph_current: 'es. 0.8', meteo_ph_temp: 'es. 16',
      meteo_ph_cond: 'es. Ventoso', meteo_ph_clouds: 'es. Sparse',
      bf_calm: 'Calma', bf_light_air: 'Bava di vento', bf_light_breeze: 'Brezza leggera',
      bf_moderate_breeze: 'Brezza tesa', bf_moderate: 'Vento moderato', bf_fresh: 'Vento fresco',
      bf_strong: 'Vento forte', bf_gale: 'Burrasca'
    },
    en: {
      nav_home: 'Home', nav_team: 'Teams', nav_gare: 'Races & Events ▾',
      nav_gare_sub: 'Calendar', nav_cal_vista: 'Calendar view', nav_classifiche: 'Standings', nav_proteste: 'Protests',
      nav_albo: 'Hall of Fame', nav_regolamento: 'Rules', nav_download: 'Download',
      nav_contatti: 'Contact', nav_membri: 'Members', nav_unisciti: 'Join Us',
      nav_accedi: 'Login', nav_area_membri: 'My profile',
      nav_galleria: 'Gallery', nav_discord: 'Discord', nav_eventi_aperti: 'Open events',
      nav_risorse: 'Downloads & Resources', nav_tornei: 'Tournaments', nav_allenamenti: 'Training',
      nav_community: 'Community ▾', nav_friends: 'Partner sites',

      home_cta1: 'Race Calendar',
      home_stat_soci_label: 'Members', home_stat_squadre_label: 'Teams',
      home_stat_regate_label: 'Races 2026', home_stat_dal_label: 'Since',
      home_ranking_title: 'Overall standings', home_see_all: 'See all →',
      home_highlights: 'Latest races & highlights', home_rank_loading: 'Loading standings…',
      home_rank_empty: 'No results yet',
      home_rank_empty_sub: 'Add results from the Standings page',
      home_rank_error: 'Loading error',

      race_next: 'Next race', race_last: 'Last race', race_running: 'Race in progress',
      race_done: 'Finished', race_live: 'Live', race_status: 'Status',
      race_starts_in: 'Starts in', race_finished: 'Race finished',
      race_open_event: 'Open event', race_special_event: 'Special event · members',
      race_members_only: 'Members only', race_upcoming: 'Starting soon',
      race_no_signup: 'No sign-up needed', race_signup_open: 'Registration open',
      race_signup_closed: 'Registration closed', race_entries: 'Entries',
      race_full: 'Full', race_password: 'Server password:',
      race_none: 'No races scheduled', race_check_later: 'Check back later for new events.',
      race_load_error: 'Unable to load races', race_loading: 'Loading from database...',
      race_no_title: 'Untitled race', race_date_tbd: 'Date to be confirmed',
      race_follow_live: 'Follow LIVE', day_short: 'd',

      footer_circolo: 'Club', footer_gare: 'Races', footer_privacy: 'Privacy',
      footer_tagline: 'Circolo Velico Italia · Virtual Skipper since 2003.',
      skip_to_content: 'Skip to content',
      friends_eyebrow: 'Community', friends_title: 'Partner sites & useful links',
      friends_sub: 'Communities and resources we follow', friends_visit: 'Visit',
      opens_new_tab: 'opens in a new tab',

      banner_open_event: 'Open event', banner_see_all: 'See all →',
      banner_standings_updating: 'Standings updating',
      banner_open_note: 'Separate standings · not an official members ranking',
      banner_training: 'TRAINING', banner_members_only: 'MEMBERS ONLY',
      banner_entries: 'ENTRIES', banner_training_cta: 'Join the training →',
      banner_tournament: 'TOURNAMENT', banner_status_in_progress: 'IN PROGRESS',
      banner_status_reg_open: 'REGISTRATION OPEN', banner_go_tournament: 'Go to the tournament →',
      banner_open_series: 'Open Series', banner_full_standings: 'Full standings →',
      banner_last_race: 'Last race:', banner_wins: 'wins',
      banner_discards: 'discards', banner_automatic: '(automatic)',
      banner_races: 'races', banner_races_vsk: 'VSK races',
      banner_series_note: 'unofficial open standings',
      banner_tournament_vsk: 'Tournament · VSK standings',
      banner_view_tournament: 'View the tournament →', banner_points_short: 'pts',

      membership_pending: '⏳ Account pending approval.',
      membership_suspended: '⛔ Account suspended.',
      membership_public_only: 'You can only view public content.',
      membership_details: 'Details',

      meteo_title: 'Race weather', meteo_official: 'Official race conditions',
      meteo_note: 'Weather conditions set by the race committee.',
      meteo_close: 'Close', meteo_races: 'Races', meteo_race: 'Race',
      meteo_date: 'Race date', meteo_current: 'Current', meteo_wind_dir: 'Wind direction',
      meteo_wind_intensity: 'Wind strength', meteo_no_wind: 'No wind data entered.',
      meteo_conditions: 'Conditions', meteo_clouds: 'Clouds', meteo_temp: 'Temperature',
      meteo_knots: 'knots', meteo_default_race: 'CVI race',
      meteo_f_ora: 'Race time', meteo_f_vento: 'Wind (knots)', meteo_f_vento_dir: 'Wind direction (°)',
      meteo_f_corrente: 'Current (knots)', meteo_f_corrente_dir: 'Current direction (°)',
      meteo_f_temp: 'Temperature (°C)', meteo_f_cond: 'Conditions', meteo_f_nuvole: 'Clouds',
      meteo_ph_wind: 'e.g. 12.5', meteo_ph_current: 'e.g. 0.8', meteo_ph_temp: 'e.g. 16',
      meteo_ph_cond: 'e.g. Windy', meteo_ph_clouds: 'e.g. Scattered',
      bf_calm: 'Calm', bf_light_air: 'Light air', bf_light_breeze: 'Light breeze',
      bf_moderate_breeze: 'Gentle breeze', bf_moderate: 'Moderate breeze', bf_fresh: 'Fresh breeze',
      bf_strong: 'Strong breeze', bf_gale: 'Gale'
    },
    fr: {
      nav_home: 'Accueil', nav_team: 'Équipes', nav_gare: 'Courses & Événements ▾',
      nav_gare_sub: 'Calendrier', nav_cal_vista: 'Vue calendrier', nav_classifiche: 'Classements', nav_proteste: 'Réclamations',
      nav_albo: 'Temple de la Renommée', nav_regolamento: 'Règlement', nav_download: 'Téléchargements',
      nav_contatti: 'Contact', nav_membri: 'Membres', nav_unisciti: 'Rejoindre',
      nav_accedi: 'Connexion', nav_area_membri: 'Mon profil',
      nav_galleria: 'Galerie', nav_discord: 'Discord', nav_eventi_aperti: 'Événements ouverts',
      nav_risorse: 'Téléchargements & Ressources', nav_tornei: 'Tournois', nav_allenamenti: 'Entraînements',
      nav_community: 'Communauté ▾', nav_friends: 'Sites amis',

      home_cta1: 'Calendrier des courses',
      home_stat_soci_label: 'Membres', home_stat_squadre_label: 'Équipes',
      home_stat_regate_label: 'Courses 2026', home_stat_dal_label: 'Depuis',
      home_ranking_title: 'Classement général', home_see_all: 'Voir tout →',
      home_highlights: 'Dernières courses & temps forts', home_rank_loading: 'Chargement du classement…',
      home_rank_empty: 'Aucun résultat pour le moment',
      home_rank_empty_sub: 'Saisissez les résultats depuis la page Classements',
      home_rank_error: 'Erreur de chargement',

      race_next: 'Prochaine course', race_last: 'Dernière course', race_running: 'Course en cours',
      race_done: 'Terminée', race_live: 'En direct', race_status: 'Statut',
      race_starts_in: 'Départ dans', race_finished: 'Course terminée',
      race_open_event: 'Événement ouvert', race_special_event: 'Événement spécial · membres',
      race_members_only: 'Réservée aux membres', race_upcoming: 'Bientôt',
      race_no_signup: 'Sans inscription', race_signup_open: 'Inscriptions ouvertes',
      race_signup_closed: 'Inscriptions fermées', race_entries: 'Inscrits',
      race_full: 'Complet', race_password: 'Mot de passe serveur :',
      race_none: 'Aucune course au programme', race_check_later: 'Revenez plus tard pour de nouveaux événements.',
      race_load_error: 'Impossible de charger les courses', race_loading: 'Chargement depuis la base de données...',
      race_no_title: 'Course sans titre', race_date_tbd: 'Date à définir',
      race_follow_live: 'Suivre en direct', day_short: 'j',

      footer_circolo: 'Club', footer_gare: 'Courses', footer_privacy: 'Confidentialité',
      footer_tagline: 'Circolo Velico Italia · Virtual Skipper depuis 2003.',
      skip_to_content: 'Aller au contenu',
      friends_eyebrow: 'Communauté', friends_title: 'Sites partenaires & liens utiles',
      friends_sub: 'Communautés et ressources que nous suivons', friends_visit: 'Visiter',
      opens_new_tab: 's’ouvre dans un nouvel onglet',

      banner_open_event: 'Événement ouvert', banner_see_all: 'Voir tout →',
      banner_standings_updating: 'Classement en cours de mise à jour',
      banner_open_note: 'Classement séparé · non officiel membres',
      banner_training: 'ENTRAÎNEMENT', banner_members_only: 'MEMBRES UNIQUEMENT',
      banner_entries: 'INSCRITS', banner_training_cta: "S'inscrire à l'entraînement →",
      banner_tournament: 'TOURNOI', banner_status_in_progress: 'EN COURS',
      banner_status_reg_open: 'INSCRIPTIONS OUVERTES', banner_go_tournament: 'Aller au tournoi →',
      banner_open_series: 'Série Ouverte', banner_full_standings: 'Classement complet →',
      banner_last_race: 'Dernière course :', banner_wins: 'vainqueur',
      banner_discards: 'écarts', banner_automatic: '(automatiques)',
      banner_races: 'courses', banner_races_vsk: 'courses VSK',
      banner_series_note: 'classement ouvert non officiel',
      banner_tournament_vsk: 'Tournoi · classement VSK',
      banner_view_tournament: 'Voir le tournoi →', banner_points_short: 'pts',

      membership_pending: '⏳ Compte en attente de validation.',
      membership_suspended: '⛔ Compte suspendu.',
      membership_public_only: 'Vous ne pouvez consulter que le contenu public.',
      membership_details: 'Détails',

      meteo_title: 'Météo course', meteo_official: 'Conditions officielles de la course',
      meteo_note: "Conditions météo définies par l'organisation pour la course.",
      meteo_close: 'Fermer', meteo_races: 'Courses', meteo_race: 'Course',
      meteo_date: 'Date de la course', meteo_current: 'Courant', meteo_wind_dir: 'Direction du vent',
      meteo_wind_intensity: 'Force du vent', meteo_no_wind: 'Données de vent non renseignées.',
      meteo_conditions: 'Conditions', meteo_clouds: 'Nuages', meteo_temp: 'Température',
      meteo_knots: 'nœuds', meteo_default_race: 'Course CVI',
      meteo_f_ora: 'Heure de la course', meteo_f_vento: 'Vent (nœuds)', meteo_f_vento_dir: 'Direction du vent (°)',
      meteo_f_corrente: 'Courant (nœuds)', meteo_f_corrente_dir: 'Direction du courant (°)',
      meteo_f_temp: 'Température (°C)', meteo_f_cond: 'Conditions', meteo_f_nuvole: 'Nuages',
      meteo_ph_wind: 'ex. 12.5', meteo_ph_current: 'ex. 0.8', meteo_ph_temp: 'ex. 16',
      meteo_ph_cond: 'ex. Venteux', meteo_ph_clouds: 'ex. Épars',
      bf_calm: 'Calme', bf_light_air: 'Très légère brise', bf_light_breeze: 'Légère brise',
      bf_moderate_breeze: 'Petite brise', bf_moderate: 'Bonne brise', bf_fresh: 'Vent frais',
      bf_strong: 'Grand frais', bf_gale: 'Coup de vent'
    },
    es: {
      nav_home: 'Inicio', nav_team: 'Equipos', nav_gare: 'Regatas y Eventos ▾',
      nav_gare_sub: 'Calendario', nav_cal_vista: 'Vista calendario', nav_classifiche: 'Clasificación', nav_proteste: 'Protestas',
      nav_albo: 'Salón de la Fama', nav_regolamento: 'Reglamento', nav_download: 'Descargas',
      nav_contatti: 'Contacto', nav_membri: 'Miembros', nav_unisciti: 'Únete',
      nav_accedi: 'Acceder', nav_area_membri: 'Mi perfil',
      nav_galleria: 'Galería', nav_discord: 'Discord', nav_eventi_aperti: 'Eventos abiertos',
      nav_risorse: 'Descargas y Recursos', nav_tornei: 'Torneos', nav_allenamenti: 'Entrenamientos',
      nav_community: 'Comunidad ▾', nav_friends: 'Sitios amigos',

      home_cta1: 'Calendario de Regatas',
      home_stat_soci_label: 'Socios', home_stat_squadre_label: 'Equipos',
      home_stat_regate_label: 'Regatas 2026', home_stat_dal_label: 'Desde',
      home_ranking_title: 'Clasificación general', home_see_all: 'Ver todo →',
      home_highlights: 'Últimas regatas y destacados', home_rank_loading: 'Cargando clasificación…',
      home_rank_empty: 'Aún no hay resultados',
      home_rank_empty_sub: 'Introduce los resultados desde la página Clasificación',
      home_rank_error: 'Error de carga',

      race_next: 'Próxima regata', race_last: 'Última regata', race_running: 'Regata en curso',
      race_done: 'Finalizada', race_live: 'En vivo', race_status: 'Estado',
      race_starts_in: 'Empieza en', race_finished: 'Regata finalizada',
      race_open_event: 'Evento abierto', race_special_event: 'Evento especial · socios',
      race_members_only: 'Solo socios', race_upcoming: 'Muy pronto',
      race_no_signup: 'Sin inscripción', race_signup_open: 'Inscripciones abiertas',
      race_signup_closed: 'Inscripciones cerradas', race_entries: 'Inscritos',
      race_full: 'Completo', race_password: 'Contraseña del servidor:',
      race_none: 'No hay regatas programadas', race_check_later: 'Vuelve más tarde para nuevos eventos.',
      race_load_error: 'No se pudieron cargar las regatas', race_loading: 'Cargando desde la base de datos...',
      race_no_title: 'Regata sin título', race_date_tbd: 'Fecha por confirmar',
      race_follow_live: 'Seguir en vivo', day_short: 'd',

      footer_circolo: 'Club', footer_gare: 'Regatas', footer_privacy: 'Privacidad',
      footer_tagline: 'Circolo Velico Italia · Virtual Skipper desde 2003.',
      skip_to_content: 'Ir al contenido',
      friends_eyebrow: 'Comunidad', friends_title: 'Sitios amigos y enlaces útiles',
      friends_sub: 'Comunidades y recursos que seguimos', friends_visit: 'Visitar',
      opens_new_tab: 'se abre en una nueva pestaña',

      banner_open_event: 'Evento abierto', banner_see_all: 'Ver todo →',
      banner_standings_updating: 'Clasificación en actualización',
      banner_open_note: 'Clasificación separada · no oficial de socios',
      banner_training: 'ENTRENAMIENTO', banner_members_only: 'SOLO SOCIOS',
      banner_entries: 'INSCRITOS', banner_training_cta: 'Inscríbete al entrenamiento →',
      banner_tournament: 'TORNEO', banner_status_in_progress: 'EN CURSO',
      banner_status_reg_open: 'INSCRIPCIONES ABIERTAS', banner_go_tournament: 'Ir al torneo →',
      banner_open_series: 'Serie Abierta', banner_full_standings: 'Clasificación completa →',
      banner_last_race: 'Última regata:', banner_wins: 'gana',
      banner_discards: 'descartes', banner_automatic: '(automáticos)',
      banner_races: 'regatas', banner_races_vsk: 'regatas VSK',
      banner_series_note: 'clasificación abierta no oficial',
      banner_tournament_vsk: 'Torneo · clasificación VSK',
      banner_view_tournament: 'Ver el torneo →', banner_points_short: 'pts',

      membership_pending: '⏳ Cuenta pendiente de aprobación.',
      membership_suspended: '⛔ Cuenta suspendida.',
      membership_public_only: 'Solo puedes consultar el contenido público.',
      membership_details: 'Detalles',

      meteo_title: 'Meteo regata', meteo_official: 'Condiciones oficiales de la regata',
      meteo_note: 'Condiciones meteorológicas definidas por la organización para la regata.',
      meteo_close: 'Cerrar', meteo_races: 'Regatas', meteo_race: 'Regata',
      meteo_date: 'Fecha de la regata', meteo_current: 'Corriente', meteo_wind_dir: 'Dirección del viento',
      meteo_wind_intensity: 'Intensidad del viento', meteo_no_wind: 'No se han introducido datos del viento.',
      meteo_conditions: 'Condiciones', meteo_clouds: 'Nubes', meteo_temp: 'Temperatura',
      meteo_knots: 'nudos', meteo_default_race: 'Regata CVI',
      meteo_f_ora: 'Hora de la regata', meteo_f_vento: 'Viento (nudos)', meteo_f_vento_dir: 'Dirección del viento (°)',
      meteo_f_corrente: 'Corriente (nudos)', meteo_f_corrente_dir: 'Dirección de la corriente (°)',
      meteo_f_temp: 'Temperatura (°C)', meteo_f_cond: 'Condiciones', meteo_f_nuvole: 'Nubes',
      meteo_ph_wind: 'ej. 12.5', meteo_ph_current: 'ej. 0.8', meteo_ph_temp: 'ej. 16',
      meteo_ph_cond: 'ej. Ventoso', meteo_ph_clouds: 'ej. Dispersas',
      bf_calm: 'Calma', bf_light_air: 'Brisa muy débil', bf_light_breeze: 'Brisa débil',
      bf_moderate_breeze: 'Brisa moderada', bf_moderate: 'Brisa fresca', bf_fresh: 'Viento fuerte',
      bf_strong: 'Viento muy fuerte', bf_gale: 'Tempestad'
    }
  };

  const LOCALES = { it: 'it-IT', en: 'en-GB', fr: 'fr-FR', es: 'es-ES' };

  window.CVI.currentLang = localStorage.getItem('cvi_lang') || 'it';

  /** Dizionario del lingua richiesta (default: lingua corrente). */
  window.CVI.dict = function (lang) {
    return NAV_KEYS[lang || window.CVI.currentLang] || NAV_KEYS.it;
  };

  /** Traduce una chiave nel dizionario corrente; `fallback` se manca. */
  window.CVI.t = function (key, fallback) {
    var val = window.CVI.dict()[key];
    return val == null ? (fallback == null ? key : fallback) : val;
  };

  /** Locale BCP-47 per toLocaleString/toLocaleDateString. */
  window.CVI.locale = function (lang) {
    return LOCALES[lang || window.CVI.currentLang] || LOCALES.it;
  };

  /* Footer: etichetta le colonne e i link una sola volta, così basta il
     normale ciclo data-i18n per tradurli su tutte le pagine. */
  var FOOTER_LINK_KEYS = {
    'team.html': 'nav_team',
    'classifiche.html': 'nav_classifiche',
    'albo-doro.html': 'nav_albo',
    'galleria.html': 'nav_galleria',
    'discord.html': 'nav_discord',
    'regolamento.html': 'nav_regolamento',
    'gare.html': 'nav_gare_sub',
    'risorse.html': 'nav_risorse',
    'contatti.html': 'nav_contatti',
    'unisciti.html': 'nav_unisciti',
    'eventi-aperti.html': 'nav_eventi_aperti',
    'proteste.html': 'nav_proteste',
    'tornei.html': 'nav_tornei',
    'allenamenti.html': 'nav_allenamenti',
    'siti-amici.html': 'nav_friends',
    'privacy.html': 'footer_privacy'
  };

  function annotateFooter() {
    document.querySelectorAll('.footer-col a[href]').forEach(function (a) {
      if (a.getAttribute('data-i18n')) return;
      var file = (a.getAttribute('href') || '').split('#')[0].split('?')[0].split('/').pop();
      var key = FOOTER_LINK_KEYS[file];
      if (key) a.setAttribute('data-i18n', key);
    });
    document.querySelectorAll('.footer-col h4').forEach(function (h) {
      if (h.getAttribute('data-i18n')) return;
      var txt = (h.textContent || '').trim().toLowerCase();
      h.setAttribute('data-i18n', /^(gare|races|courses|regatas|competiciones|wettbewerbe)/.test(txt) ? 'footer_gare' : 'footer_circolo');
    });
    document.querySelectorAll('.skip-link').forEach(function (a) {
      if (!a.getAttribute('data-i18n')) a.setAttribute('data-i18n', 'skip_to_content');
    });
  }

  window.CVI.applyI18n = function (extra) {
    annotateFooter();
    const dict = Object.assign({}, NAV_KEYS[window.CVI.currentLang] || NAV_KEYS.it, (extra && extra[window.CVI.currentLang]) || {});
    document.documentElement.lang = window.CVI.currentLang || 'it';
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      const key = el.getAttribute('data-i18n');
      if (dict[key] == null) return;
      var val = dict[key];
      if (/<[a-z][\s\S]*>/i.test(val)) el.innerHTML = val;
      else el.textContent = val;
    });
  };

  window.CVI.cambiaLingua = function (lang, extra) {
    window.CVI.currentLang = lang;
    localStorage.setItem('cvi_lang', lang);
    window.CVI.applyI18n(extra);
    /* Notifica gli script che generano contenuti dinamici (gare, banner, ...)
       così possono ridisegnarli nella nuova lingua. */
    try {
      document.dispatchEvent(new CustomEvent('cvi:langchange', { detail: { lang: lang } }));
    } catch (e) {
      var ev = document.createEvent('Event');
      ev.initEvent('cvi:langchange', true, true);
      ev.detail = { lang: lang };
      document.dispatchEvent(ev);
    }
  };

  window.CVI.initMobileNav = function () {
    const btn = document.getElementById('navToggle');
    const mobile = document.getElementById('navMobile');
    if (!btn || !mobile) return;

    function setOpen(open) {
      mobile.classList.toggle('is-open', open);
      btn.classList.toggle('is-open', open);
      document.body.classList.toggle('menu-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? 'Chiudi menu' : 'Apri menu');
    }

    btn.onclick = function (e) {
      e.preventDefault();
      e.stopPropagation();
      setOpen(!mobile.classList.contains('is-open'));
    };

    mobile.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        setOpen(false);
      });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && mobile.classList.contains('is-open')) {
        setOpen(false);
      }
    });
  };

  /** Logo header uniforme: immagine + testo su tutte le pagine */
  window.CVI.upgradeHeaderLogo = function () {
    var container = document.querySelector('header .logo-container');
    if (!container) return;

    if (!container.querySelector('img.logo-img')) {
      var img = document.createElement('img');
      img.src = 'logo-cvi.png';
      img.alt = 'Logo Circolo Velico Italia';
      img.className = 'logo-img';
      img.width = 32;
      img.height = 32;
      img.loading = 'eager';
      img.decoding = 'async';
      container.insertBefore(img, container.firstChild);
    }

    var textEl = container.querySelector('.logo-text');
    if (!textEl) {
      textEl = document.createElement('span');
      textEl.className = 'logo-text';
      container.appendChild(textEl);
    }
    // Rimuove emoji ancora se presente e uniforma testo
    textEl.innerHTML = 'CVI <span>Virtual</span>';
  };

  /** Footer: naming uniforme Circolo Velico Italia */
  window.CVI.ensureFooter = function () {
    document.querySelectorAll('.footer-bottom').forEach(function (el) {
      el.textContent = '© 2003–2026 Circolo Velico Italia · Virtual Skipper';
    });
    document.querySelectorAll('.footer-brand p').forEach(function (p) {
      if (/Virtual Skipper/i.test(p.textContent) || /skipper/i.test(p.textContent)) {
        p.textContent = window.CVI.t('footer_tagline', 'Circolo Velico Italia · Virtual Skipper dal 2003.');
      }
    });
    document.querySelectorAll('.footer-brand .logo-text').forEach(function (el) {
      el.innerHTML = 'CVI <span style="color: var(--accent-color)">Virtual</span>';
    });
    /* Link "Siti amici" nel footer (prima colonna), una volta sola */
    var col = document.querySelector('.footer-col');
    if (col && !document.querySelector('.footer-col a[href="siti-amici.html"]')) {
      var a = document.createElement('a');
      a.href = 'siti-amici.html';
      a.setAttribute('data-i18n', 'nav_friends');
      a.textContent = window.CVI.t('nav_friends', 'Siti amici');
      col.appendChild(a);
    }
  };

  window.CVI.ensureNavAlign = function () {};

  /** Crea/aggiorna il menu "Community" (Galleria, Discord, Siti amici) */
  window.CVI.ensureNavLinks = function () {
    var dict = NAV_KEYS[window.CVI.currentLang] || NAV_KEYS.it;
    var ITEMS = [
      { href: 'galleria.html', key: 'nav_galleria', label: dict.nav_galleria || 'Galleria' },
      { href: 'discord.html', key: 'nav_discord', label: dict.nav_discord || 'Discord' },
      { href: 'siti-amici.html', key: 'nav_friends', label: dict.nav_friends || 'Siti amici' }
    ];

    var ul = document.querySelector('nav.nav-desktop ul');
    if (ul) {
      /* toglie le vecchie voci piatte Galleria / Discord (anche quelle in HTML) */
      Array.prototype.slice.call(ul.children).forEach(function (li) {
        var a = li.querySelector('a');
        var file = a ? (a.getAttribute('href') || '').split('#')[0].split('/').pop() : '';
        if (/^(galleria|discord)\.html$/i.test(file)) ul.removeChild(li);
      });

      var group = ul.querySelector('li.cvi-community');
      if (!group) {
        group = document.createElement('li');
        group.className = 'dropdown cvi-community';
        var top = document.createElement('a');
        top.href = 'siti-amici.html';
        top.setAttribute('data-i18n', 'nav_community');
        top.textContent = dict.nav_community || 'Community ▾';
        var sub0 = document.createElement('ul');
        sub0.className = 'dropdown-menu';
        group.appendChild(top);
        group.appendChild(sub0);
        var albo = ul.querySelector('a[href="albo-doro.html"]');
        if (albo && albo.parentElement && albo.parentElement.parentElement === ul) {
          albo.parentElement.insertAdjacentElement('afterend', group);
        } else {
          ul.appendChild(group);
        }
      }

      var sub = group.querySelector('.dropdown-menu');
      ITEMS.forEach(function (it) {
        if (sub.querySelector('a[href="' + it.href + '"]')) return;
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.href = it.href;
        a.setAttribute('data-i18n', it.key);
        a.textContent = it.label;
        li.appendChild(a);
        sub.appendChild(li);
      });
    }

    var mobile = document.getElementById('navMobile');
    if (mobile) {
      Array.prototype.slice.call(mobile.children).forEach(function (el) {
        var file = el.tagName === 'A' ? (el.getAttribute('href') || '').split('#')[0].split('/').pop() : '';
        if (/^(galleria|discord)\.html$/i.test(file)) mobile.removeChild(el);
      });

      var mgroup = mobile.querySelector('.cvi-community-mobile');
      if (!mgroup) {
        mgroup = document.createElement('div');
        mgroup.className = 'mobile-dropdown cvi-community-mobile';
        var alboM = mobile.querySelector('a[href="albo-doro.html"]');
        if (alboM) alboM.insertAdjacentElement('afterend', mgroup);
        else mobile.appendChild(mgroup);
      }
      ITEMS.forEach(function (it) {
        if (mgroup.querySelector('a[href="' + it.href + '"]')) return;
        var a = document.createElement('a');
        a.href = it.href;
        a.setAttribute('data-i18n', it.key);
        a.textContent = '\u2192 ' + it.label;
        mgroup.appendChild(a);
      });
    }
  };

  window.CVI.aggiornaAuth = async function () {
    try {
      if (!CVI.supabase) return;
      const { data: { session } } = await CVI.supabase.auth.getSession();
      const links = [document.getElementById('auth-link'), document.getElementById('auth-link-mobile')].filter(Boolean);
      if (session && session.user) {
        links.forEach(function (a) {
          a.textContent = (NAV_KEYS[window.CVI.currentLang] || NAV_KEYS.it).nav_area_membri || 'Il mio profilo';
          a.href = 'profilo.html';
          a.setAttribute('data-i18n', 'nav_area_membri');
        });
      } else {
        links.forEach(function (a) {
          a.textContent = (NAV_KEYS[window.CVI.currentLang] || NAV_KEYS.it).nav_accedi || 'Accedi';
          a.href = 'accedi.html';
          a.setAttribute('data-i18n', 'nav_accedi');
        });
      }
    } catch (e) { console.warn('[CVI] auth', e); }
  };

  window.CVI.initFloatingDiscord = function () {
    if (document.getElementById('cvi-discord-fab')) return;
    const a = document.createElement('a');
    a.id = 'cvi-discord-fab';
    a.href = 'discord.html';
    a.title = 'Community Discord';
    a.setAttribute('aria-label', 'Discord');
    a.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.688-.608 1.024a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.024.077.077 0 0 0-.078-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>';
    a.style.cssText = 'position:fixed;bottom:1.25rem;right:1.25rem;z-index:9000;width:52px;height:52px;border-radius:50%;background:#5865F2;color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 14px 28px rgba(88,101,242,.35);text-decoration:none;transition:transform .2s ease,background .2s ease;';
    a.onmouseenter = function () { a.style.transform = 'scale(1.08)'; a.style.background = '#4752c4'; };
    a.onmouseleave = function () { a.style.transform = 'scale(1)'; a.style.background = '#5865F2'; };
    document.body.appendChild(a);
  };

  window.CVI.resolveRole = function (prof) {
    if (!prof) return 'socio';
    var r = (prof.role || '').toString().toLowerCase();
    if (r === 'admin' || r === 'scorer' || r === 'caposquadra' || r === 'socio') return r;
    if (prof.is_admin === true) return 'admin';
    return 'socio';
  };

  window.CVI.canAccessAdmin = function (role) {
    return role === 'admin' || role === 'scorer';
  };

  window.CVI.ensureAdminNavLink = async function () {
    try {
      if (!CVI.supabase) return;
      var res = await CVI.supabase.auth.getSession();
      var session = res.data && res.data.session;
      if (!session || !session.user) return;
      var pr = await CVI.supabase.from('profiles').select('is_admin, role').eq('id', session.user.id).maybeSingle();
      var role = CVI.resolveRole(pr.data);
      if (!CVI.canAccessAdmin(role)) return;
      function addLink(container, isMobile) {
        if (!container) return;
        if (container.querySelector('a[href="admin.html"]')) return;
        var a = document.createElement('a');
        a.href = 'admin.html';
        a.textContent = 'Admin';
        a.style.color = '#38bdf8';
        a.style.fontWeight = '700';
        if (isMobile) { container.appendChild(a); }
        else { var li = document.createElement('li'); li.appendChild(a); container.appendChild(li); }
      }
      addLink(document.querySelector('nav.nav-desktop ul'), false);
      addLink(document.getElementById('navMobile'), true);
    } catch (e) { console.warn('[CVI] ensureAdminNavLink', e); }
  };

  window.CVI.init = function (activePage, extraI18n) {
    window.CVI.initMobileNav();
    window.CVI.upgradeHeaderLogo();
    window.CVI.ensureNavAlign();
    window.CVI.ensureNavLinks();
    window.CVI.ensureFooter();
    const sel = document.getElementById('languageSelect');
    if (sel) {
      sel.value = window.CVI.currentLang;
      sel.onchange = function () { window.CVI.cambiaLingua(sel.value, extraI18n); };
    }
    if (activePage) {
      document.querySelectorAll('a[href="' + activePage + '"]').forEach(function (a) { a.classList.add('active'); });
    }
    window.CVI.applyI18n(extraI18n);
    window.CVI.aggiornaAuth();
    window.CVI.initFloatingDiscord();
    window.CVI.ensureAdminNavLink();
    try {
      var s = document.createElement('script');
      s.src = 'discord-notify.js?v=3';
      s.async = true;
      document.head.appendChild(s);
    } catch (e) {}
  };
})();


/* —— Extra CVI: link Proteste / Eventi aperti / Vista calendario nel menu a tendina —— */
(function () {
  "use strict";
  var _ens = window.CVI && window.CVI.ensureNavLinks;
  if (_ens) {
    window.CVI.ensureNavLinks = function () {
      _ens();
      function addDrop(href, label) {
        var drop = document.querySelector("nav.nav-desktop .dropdown-menu");
        if (drop && !drop.querySelector('a[href="' + href + '"]')) {
          var li = document.createElement("li");
          var a = document.createElement("a");
          a.href = href; a.textContent = label;
          li.appendChild(a); drop.appendChild(li);
        }
        var mob = document.querySelector("#navMobile .mobile-dropdown");
        if (mob && !mob.querySelector('a[href="' + href + '"]')) {
          var am = document.createElement("a");
          am.href = href; am.textContent = "\u2192 " + label;
          mob.appendChild(am);
        }
      }
      var lang = window.CVI.currentLang || "it";
      var pr = ({ it: "Proteste", en: "Protests", fr: "R\u00e9clamations", es: "Protestas" })[lang] || "Proteste";
      var calLabel = ({ it: "Vista calendario", en: "Calendar view", fr: "Vue calendrier", es: "Vista calendario" })[lang] || "Vista calendario";
      addDrop("calendario.html", calLabel);
      addDrop("proteste.html", pr);
      addDrop("eventi-aperti.html", "Eventi aperti");
    };
  }
})();
