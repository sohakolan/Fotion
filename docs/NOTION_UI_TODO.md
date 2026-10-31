# TODO — Parité UI et interactions Notion

Référence de travail : **30 octobre 2026** · État du code : **Fotion 0.2.0**.

Voir [le périmètre et les règles de validation](README.md) et [les sources officielles](NOTION_REFERENCE.md).

Chaque case décrit un résultat à implémenter ou à vérifier, pas une promesse de parité déjà obtenue. Les critères détaillés sont notre découpage de travail ; leur formulation ne constitue pas une spécification interne de Notion.

**Légende :** `[x]` = résultat étroit vérifié dans le code/tests ; `[ ] [PARTIEL]` = base existante, parité non acquise ; `[ ]` = à faire/à vérifier. Les priorités et exclusions s’appliquent à toute la section.

**Aucune case UI n’est cochée : aucune comparaison pixel à pixel complète en navigateur réel n’a été validée.** Les mentions PARTIEL signalent seulement un composant existant.

## 01. Référence et règle du « 1:1 » — P0

Références : [S01](NOTION_REFERENCE.md#s01), [S02](NOTION_REFERENCE.md#s02), [S03](NOTION_REFERENCE.md#s03).

- [ ] **UI-001** Choisir une version datée de Notion, une plateforme et une langue de référence.
- [ ] **UI-002** Identifier si la barre latérale retenue est ancienne ou nouvelle ; ne pas mélanger les deux.
- [ ] **UI-003** Constituer des captures publiques ou autorisées de chaque écran retenu.
- [ ] **UI-004** Créer un jeu de documents fictifs commun aux captures Notion et Fotion.
- [ ] **UI-005** Fixer viewport, zoom, DPR, OS, police et thème pour chaque comparaison.
- [ ] **UI-006** Enregistrer chaque capture avec son état : menu ouvert, sélection, hover, loading, erreur.
- [ ] **UI-007** Mesurer les dimensions et couleurs ; distinguer mesures et estimations.
- [ ] **UI-008** Documenter les variations liées aux plans, rôles, expérimentations et plateformes.
- [ ] **UI-009** Séparer parité visuelle, parité d’interaction et parité fonctionnelle.
- [ ] **UI-010** Ne cocher aucun écran « 1:1 » sans capture comparative et validation humaine.
- [ ] **UI-011** Utiliser la marque Fotion ; ne pas faire passer l’application pour un service officiel Notion.
- [ ] **UI-012** Conserver les exclusions IA/collaboration visibles dans cette checklist, sans faux boutons actifs.

## 02. Système visuel — P0

Références : [S03](NOTION_REFERENCE.md#s03).

- [ ] **UI-013** [PARTIEL] Palette claire : fonds principaux, barre latérale, panneaux et surfaces surélevées.
- [ ] **UI-014** [PARTIEL] Palette sombre : texte, surfaces, séparateurs et contrastes.
- [ ] **UI-015** [PARTIEL] Palette complète de texte et surlignage des blocs.
- [ ] **UI-016** Couleurs des états sélection, hover, focus, actif, désactivé, danger et succès.
- [ ] **UI-017** [PARTIEL] Polices par défaut, serif et monospace avec fallbacks identiques au contexte de référence.
- [ ] **UI-018** Mesurer corps, titres, graisse, hauteur de ligne et espacement des lettres.
- [ ] **UI-019** Mesurer les espacements des paragraphes et des familles de blocs.
- [ ] **UI-020** Standardiser icônes : taille, trait, boîte, alignement et états remplis.
- [ ] **UI-021** Rendre les emoji sans casser l’alignement entre OS.
- [ ] **UI-022** Mesurer bordures, rayons, ombres et séparateurs.
- [ ] **UI-023** Reproduire apparence des champs, boutons, cases et sélecteurs.
- [ ] **UI-024** Définir tokens CSS documentés pour toutes les valeurs récurrentes.
- [ ] **UI-025** Éliminer les styles contradictoires et surcharges accumulées entre les jets.
- [ ] **UI-026** Préserver contraste, focus visible et mode de contraste renforcé.
- [ ] **UI-027** Respecter reduced-motion et zoom texte.

## 03. Cadre de l’application — P0

Références : [S02](NOTION_REFERENCE.md#s02), [S11](NOTION_REFERENCE.md#s11).

- [ ] **UI-028** [PARTIEL] Largeur initiale de la barre latérale et proportions du canevas.
- [ ] **UI-029** [PARTIEL] Redimensionnement de la barre latérale avec limite, curseur et persistance.
- [ ] **UI-030** [PARTIEL] Barre supérieure : hauteur, marges, icônes et alignement vertical.
- [ ] **UI-031** Séparation des zones fixes et défilantes ; pas de double scrollbar inattendue.
- [ ] **UI-032** Barre latérale masquée, ouverte et temporaire au survol.
- [ ] **UI-033** Transitions d’ouverture et fermeture conformes à la référence.
- [ ] **UI-034** Gestion de plusieurs onglets et des fenêtres de bureau si retenues.
- [ ] **UI-035** Comportement sur écran étroit sans écraser le document.
- [ ] **UI-036** État de démarrage sans flash de thème ou saut de mise en page.
- [ ] **UI-037** État de chargement de page sans perdre le chrome de navigation.
- [ ] **UI-038** Écran vide sans page, coffre manquant et erreur de chargement.
- [ ] **UI-039** Position des éléments d’aide et menus globaux selon la version de référence.

## 04. Barre latérale — P0

Références : [S02](NOTION_REFERENCE.md#s02), [S11](NOTION_REFERENCE.md#s11), [S37](NOTION_REFERENCE.md#s37).

- [ ] **UI-040** [PARTIEL] Sélecteur d’espace : avatar, nom tronqué, chevron et menu.
- [ ] **UI-041** Sections, onglets et ordre exacts de la version Notion retenue.
- [ ] **UI-042** [PARTIEL] Entrées Recherche, Accueil et Nouvelle page : icônes, raccourcis et hauteur.
- [ ] **UI-043** Accueil distinct d’une page arbitraire du coffre.
- [ ] **UI-044** Section Récents et comportement de sa liste.
- [ ] **UI-045** [PARTIEL] Favoris : titre, lignes, état sélectionné et gestion des noms longs.
- [ ] **UI-046** [PARTIEL] Section privée : libellé, actions au survol et création de page.
- [ ] **UI-047** Sections partagées et espaces d’équipe — différées avec collaboration.
- [ ] **UI-048** [PARTIEL] Arborescence : indentation par niveau et largeur de la zone de clic.
- [ ] **UI-049** [PARTIEL] Chevron de dépliage, fichier sans icône, emoji et état vide des enfants.
- [ ] **UI-050** [PARTIEL] Actions … et + révélées au survol sans décaler le titre.
- [ ] **UI-051** Différencier sélection active, hover, focus clavier et page déplacée.
- [ ] **UI-052** [PARTIEL] Menu contextuel sur clic droit et sur bouton ….
- [ ] **UI-053** Ouvrir dans un nouvel onglet/panneau depuis les entrées appropriées.
- [ ] **UI-054** [PARTIEL] Ligne d’insertion avant/après et surbrillance de dépôt dans une page.
- [ ] **UI-055** Afficher un indicateur explicite pour un dépôt interdit.
- [ ] **UI-056** Dépliage automatique d’une page cible pendant un drag.
- [ ] **UI-057** Défilement automatique de l’arborescence pendant un drag.
- [ ] **UI-058** Réordonner les favoris sans modifier la hiérarchie des pages.
- [ ] **UI-059** Afficher la destination de déplacement avant validation.
- [ ] **UI-060** [PARTIEL] Pied de barre : paramètres, import, corbeille et aide selon référence.
- [ ] **UI-061** Restauration du scroll et des nœuds ouverts après retour/rechargement.

## 05. En-tête et navigation de page — P0

Références : [S02](NOTION_REFERENCE.md#s02), [S03](NOTION_REFERENCE.md#s03), [S34](NOTION_REFERENCE.md#s34).

- [ ] **UI-062** [PARTIEL] Fil d’Ariane avec icônes, séparateurs, noms tronqués et navigation.
- [ ] **UI-063** Menu des ancêtres masqués lorsque le fil dépasse la largeur disponible.
- [ ] **UI-064** [PARTIEL] Boutons précédent/suivant et leurs états désactivés.
- [ ] **UI-065** Indication de confidentialité, emplacement et accès effectif.
- [ ] **UI-066** [PARTIEL] Favori actif/inactif avec taille, couleur et zone de clic de référence.
- [ ] **UI-067** [PARTIEL] Bouton … et positionnement du menu de page.
- [ ] **UI-068** Afficher la date/activité de modification selon le contexte retenu.
- [ ] **UI-069** Ne pas surcharger le chrome avec des informations techniques de sauvegarde.
- [ ] **UI-070** Conserver une erreur de sauvegarde visible et actionnable.
- [ ] **UI-071** Partager, commentaires, historique et présence — états différés, sans simulation trompeuse.
- [ ] **UI-072** Ouverture en aperçu et conversion vers pleine page.
- [ ] **UI-073** Bouton fermer/revenir dans les panneaux latéraux et aperçus.

## 06. Couverture, icône et titre — P0

Références : [S03](NOTION_REFERENCE.md#s03).

- [ ] **UI-074** [PARTIEL] Hauteur de couverture selon viewport et mise à l’échelle de l’image.
- [ ] **UI-075** Repositionnement par déplacement, validation et annulation.
- [ ] **UI-076** États sans couverture, couverture en chargement et image cassée.
- [ ] **UI-077** [PARTIEL] Bouton de changement de couverture au survol et au clavier.
- [ ] **UI-078** Sélecteur de couverture avec onglets galerie/import/lien disponibles dans la référence.
- [ ] **UI-079** [PARTIEL] Taille de l’icône, chevauchement sur la couverture et alignement au titre.
- [ ] **UI-080** [PARTIEL] États sans icône, sans couverture et sans les deux.
- [ ] **UI-081** [PARTIEL] Commandes Ajouter une icône / Ajouter une couverture et apparition au survol.
- [ ] **UI-082** Sélecteur emoji : recherche, catégories, récents et navigation clavier.
- [ ] **UI-083** Sélecteur d’icônes monochromes, couleurs et image personnalisée.
- [ ] **UI-084** [PARTIEL] Suppression de l’icône ou couverture avec restitution de la bonne marge.
- [ ] **UI-085** [PARTIEL] Titre éditable : corps, graisse, placeholder, retours visuels et hauteur automatique.
- [ ] **UI-086** Titre très long, emoji, plusieurs lignes visuelles et sélection de texte.
- [ ] **UI-087** Entrée dans le titre place le curseur au bon endroit dans le document.
- [ ] **UI-088** Marges exactes avec/sans icône, couverture, propriétés et commentaires.

## 07. Canevas et typographie — P0

Références : [S03](NOTION_REFERENCE.md#s03), [S04](NOTION_REFERENCE.md#s04).

- [ ] **UI-089** [PARTIEL] Largeur standard du contenu et centrage à plusieurs tailles d’écran.
- [ ] **UI-090** [PARTIEL] Mode pleine largeur sans modifier les blocs ou les vues de façon inattendue.
- [ ] **UI-091** [PARTIEL] Petite taille de texte, serif et mono propres à la page.
- [ ] **UI-092** Mesurer marges latérales et espaces avant/après le titre.
- [ ] **UI-093** Mesurer paragraphes, titres, listes, citations, code et séparateurs.
- [ ] **UI-094** Éviter une couleur ou marge spéciale arbitraire sur le premier paragraphe.
- [ ] **UI-095** [PARTIEL] Rendre correctement gras, liens, code, souligné, barré et couleurs.
- [ ] **UI-096** Aligner cases à cocher, puces et numéros avec la première ligne du texte.
- [ ] **UI-097** Traiter les blocs multiligne et indentations sans variation de rythme.
- [ ] **UI-098** Afficher une ligne vide éditable sous le dernier bloc.
- [ ] **UI-099** Cliquer dans l’espace sous le contenu pour commencer à écrire.
- [ ] **UI-100** Respecter la largeur du caret, des sélections et de leurs couleurs.
- [ ] **UI-101** Maintenir le scroll quand un titre change de hauteur ou qu’un menu s’ouvre.

## 08. Menus /, + et transformation — P0

Références : [S01](NOTION_REFERENCE.md#s01), [S05](NOTION_REFERENCE.md#s05).

- [ ] **UI-102** [PARTIEL] Ancrer le menu / à la ligne courante plutôt qu’à une position fixe.
- [ ] **UI-103** Basculer au-dessus lorsque l’espace manque et éviter tous les débordements.
- [ ] **UI-104** [PARTIEL] Dimensions, ombre, bordure et rayon du menu.
- [ ] **UI-105** [PARTIEL] Vignettes des blocs, titre, description et espacement des lignes.
- [ ] **UI-106** Ordre des catégories et options identique à la référence retenue.
- [ ] **UI-107** [PARTIEL] Filtrage au clavier sans enlever le texte avant validation.
- [ ] **UI-108** [PARTIEL] État survolé et sélection clavier synchronisés.
- [ ] **UI-109** Maintenir l’option active visible lors du défilement interne.
- [ ] **UI-110** [PARTIEL] Entrée valide ; Échap ferme sans effacer le texte ni perdre le curseur.
- [ ] **UI-111** Retour arrière, changement de ligne et clic extérieur ferment au bon moment.
- [ ] **UI-112** États aucun résultat, recherche partielle et saisie IME.
- [ ] **UI-113** [PARTIEL] Le bouton + ouvre le même catalogue de blocs à la bonne position.
- [ ] **UI-114** [PARTIEL] Le menu Transformer en conserve le contenu et indique le type courant.
- [ ] **UI-115** Sous-menus accessibles au clavier, au pointeur et au tactile.
- [ ] **UI-116** Raccourcis affichés seulement s’ils sont réellement fonctionnels.
- [ ] **UI-117** Focus rendu à l’éditeur après validation ou annulation.

## 09. Poignées, sélection et drag-and-drop — P0

Références : [S01](NOTION_REFERENCE.md#s01), [S04](NOTION_REFERENCE.md#s04).

- [ ] **UI-118** [PARTIEL] Poignées + et ⋮⋮ alignées avec la première ligne du bloc survolé.
- [ ] **UI-119** Zone de passage entre bloc et poignée sans disparition ni clignotement.
- [ ] **UI-120** [PARTIEL] Curseurs grab/grabbing et distinction clic/déplacement.
- [ ] **UI-121** [PARTIEL] Aperçu déplacé compact, lisible, non interactif et sans copie du document entier.
- [ ] **UI-122** [PARTIEL] Source visuellement atténuée sans effondrer la mise en page.
- [ ] **UI-123** [PARTIEL] Repère horizontal à la frontière réelle de deux blocs.
- [ ] **UI-124** Repère vertical pour la création de colonnes.
- [ ] **UI-125** Repère d’imbrication pour liste, dépliant, encadré et colonne.
- [ ] **UI-126** Aperçu d’une sélection multibloc avec indication de quantité.
- [ ] **UI-127** [PARTIEL] Défilement automatique proportionnel à la proximité du bord.
- [ ] **UI-128** Défilement indépendant des menus, de la page et de la barre latérale.
- [ ] **UI-129** Déploiement de la cible repliée après délai mesuré.
- [ ] **UI-130** [PARTIEL] Aucun menu contextuel ne s’ouvre après un dépôt.
- [ ] **UI-131** [PARTIEL] Échap supprime aperçu/repère et laisse le document inchangé.
- [ ] **UI-132** Annulation en dehors de la fenêtre, pointercancel, perte de capture et changement d’onglet.
- [ ] **UI-133** Déplacement dans un document zoomé, en RTL et avec police alternative.
- [ ] **UI-134** Alternative clavier visible et annoncée aux lecteurs d’écran.
- [ ] **UI-135** Poignées tactiles et appui prolongé sans empêcher le défilement normal.
- [ ] **UI-136** Tester précisément début/fin de page, liste vide, dernier item et blocs imbriqués.

## 10. Barre de formatage et liens — P0

Références : [S01](NOTION_REFERENCE.md#s01), [S03](NOTION_REFERENCE.md#s03).

- [ ] **UI-137** [PARTIEL] Positionnement de la barre au-dessus de la sélection, avec retour sous la sélection si nécessaire.
- [ ] **UI-138** Sélections sur plusieurs lignes et près des bords du viewport.
- [ ] **UI-139** [PARTIEL] Type de bloc, gras, italique, souligné, barré, code et lien.
- [ ] **UI-140** [PARTIEL] Couleurs, surlignage, dernière couleur et options de conversion disponibles.
- [ ] **UI-141** États actifs et mixtes conformes à la sélection réelle.
- [ ] **UI-142** [PARTIEL] Cliquer dans la barre conserve la plage de texte sélectionnée.
- [ ] **UI-143** [PARTIEL] Formulaire de lien ancré avec URL, validation et suppression.
- [ ] **UI-144** Aperçu du lien existant avec ouvrir, copier, modifier et retirer.
- [ ] **UI-145** Sélecteur de pages internes avec icône et titre.
- [ ] **UI-146** Afficher les URL longues et invalides sans déformer le formulaire.
- [ ] **UI-147** Commentaire et suggestion — différés avec collaboration.
- [ ] **UI-148** Positionner la barre avec scroll, zoom et clavier virtuel.

## 11. Rendu des blocs — P0/P1

Références : [S01](NOTION_REFERENCE.md#s01), [S04](NOTION_REFERENCE.md#s04), [S06](NOTION_REFERENCE.md#s06), [S07](NOTION_REFERENCE.md#s07).

- [ ] **UI-149** [PARTIEL] Paragraphes et trois niveaux de titres.
- [ ] **UI-150** [PARTIEL] Puces, numéros, checkboxes et tâches terminées.
- [ ] **UI-151** Listes longues, niveaux imbriqués et marqueurs selon profondeur.
- [ ] **UI-152** [PARTIEL] Citation avec trait, marge et contenu multiligne.
- [ ] **UI-153** [PARTIEL] Encadré avec icône, fond et padding ; compléter les variantes.
- [ ] **UI-154** [PARTIEL] Dépliant avec chevron, résumé éditable et contenu indenté.
- [ ] **UI-155** Titres dépliants et groupes de blocs sélectionnés.
- [ ] **UI-156** [PARTIEL] Code avec fond, police, sélecteur de langue, copie, légende et traitement des lignes longues : composants présents, fidélité visuelle à valider.
- [ ] **UI-157** Équations avec aperçu, édition et erreur.
- [ ] **UI-158** [PARTIEL] Séparateur et espaces de part et d’autre.
- [ ] **UI-159** [PARTIEL] Table des matières et état du titre actif.
- [ ] **UI-160** [PARTIEL] Sous-pages et liens de page avec survol et icône.
- [ ] **UI-161** Mentions de page, date et personne sous forme de pastilles appropriées.
- [ ] **UI-162** Bloc synchronisé : bordure, indication d’origine et menus.
- [ ] **UI-163** Bouton de page : icône, libellé, hover et confirmation.
- [ ] **UI-164** Colonnes : gouttières, poignées de largeur et repli mobile.
- [ ] **UI-165** Blocs inconnus : rendu conservateur, identification et accès au source.

## 12. Tableaux simples et médias — P1

Références : [S06](NOTION_REFERENCE.md#s06), [S51](NOTION_REFERENCE.md#s51).

- [ ] **UI-166** [PARTIEL] Grille du tableau simple, dimensions des cellules et en-têtes.
- [ ] **UI-167** Poignées de lignes/colonnes au survol et sélection par plage.
- [ ] **UI-168** Menu de ligne/colonne avec insertion, duplication, déplacement et suppression.
- [ ] **UI-169** Redimensionnement manuel des colonnes et adaptation à la largeur.
- [ ] **UI-170** Navigation Tab/Maj+Tab, Entrée et collage tabulaire.
- [ ] **UI-171** [PARTIEL] Image distante avec proportions préservées.
- [ ] **UI-172** [PARTIEL] Poignées de redimensionnement, alignement, légende et texte alternatif.
- [ ] **UI-173** Visionneuse d’image avec fermer, zoom et navigation pertinente.
- [ ] **UI-174** Uploader avec glisser-déposer, progression, erreurs et annulation.
- [ ] **UI-175** Carte fichier : icône, nom, taille, menu et téléchargement.
- [ ] **UI-176** Lecteurs audio/vidéo et PDF intégrés.
- [ ] **UI-177** Marque-page avec aperçu, description et fallback sans métadonnées.
- [ ] **UI-178** Embed : chargement, refus d’intégration, contenu hors ligne et ouvrir dans un onglet.
- [ ] **UI-179** Ne pas déplacer le curseur lorsque les dimensions d’un média deviennent connues.

## 13. Menus de page et apparence — P0/P1

Références : [S03](NOTION_REFERENCE.md#s03), [S15](NOTION_REFERENCE.md#s15).

- [ ] **UI-180** [PARTIEL] Menu … : largeur, alignement, sections et séparateurs.
- [ ] **UI-181** Reproduire la hiérarchie exacte des sous-menus de la version retenue.
- [ ] **UI-182** [PARTIEL] Choix de police avec aperçu typographique.
- [ ] **UI-183** [PARTIEL] Interrupteurs petite taille et pleine largeur, accessibles au clavier.
- [ ] **UI-184** Afficher état verrouillé, verrouiller/déverrouiller et conséquences visibles.
- [ ] **UI-185** [PARTIEL] Actions renommer, dupliquer, déplacer, exporter et corbeille.
- [ ] **UI-186** Copier lien, ouvrir dans un autre mode, historique et informations de page.
- [ ] **UI-187** Configurer table des matières, commentaires et backlinks selon référence.
- [ ] **UI-188** Trier/masquer les options non applicables sans action factice.
- [ ] **UI-189** Afficher auteur/date/compteurs à l’emplacement de référence.
- [ ] **UI-190** [PARTIEL] Positionner les sélecteurs d’icône/couverture près du bouton déclencheur.
- [ ] **UI-191** Conserver l’ancrage et le focus lors des changements de taille et du scroll.

## 14. Recherche et sélecteurs — P0/P1

Références : [S08](NOTION_REFERENCE.md#s08), [S09](NOTION_REFERENCE.md#s09).

- [ ] **UI-192** [PARTIEL] Palette de recherche : overlay, largeur, position verticale et ombre.
- [ ] **UI-193** [PARTIEL] Champ, placeholder, icône et touche Échap.
- [ ] **UI-194** [PARTIEL] Résultats avec icône, titre et extrait.
- [ ] **UI-195** Chemin parent, date et type de résultat si présents dans la référence.
- [ ] **UI-196** Filtres et tri avec leur propre état actif.
- [ ] **UI-197** Surlignage des mots recherchés.
- [ ] **UI-198** [PARTIEL] Navigation ↑/↓, Entrée, clic et retour de focus.
- [ ] **UI-199** Recherche sans résultat, recherche récente et état d’attente.
- [ ] **UI-200** Grand nombre de résultats avec défilement/virtualisation.
- [ ] **UI-201** [PARTIEL] Sélecteur Déplacer vers avec racine et liste de destinations.
- [ ] **UI-202** Expliquer les destinations interdites plutôt que laisser une action sans effet.
- [ ] **UI-203** Sélecteurs @, [[, personne, date et relation avec comportement cohérent.

## 15. Bases de données : chrome et cellules — P1

Références : [S12](NOTION_REFERENCE.md#s12), [S13](NOTION_REFERENCE.md#s13), [S14](NOTION_REFERENCE.md#s14), [S26](NOTION_REFERENCE.md#s26).

- [ ] **UI-204** En-tête de base : icône, titre, description et menu.
- [ ] **UI-205** Onglets des vues, ajout, menu, renommage et réorganisation.
- [ ] **UI-206** Barre recherche, filtres, tri, groupement, propriétés et mise en page.
- [ ] **UI-207** Bouton Nouvelle entrée et choix de modèle.
- [ ] **UI-208** Panneau de propriétés : ajouter, masquer, réordonner, modifier et supprimer.
- [ ] **UI-209** Cellule titre avec icône, ouverture de page et focus.
- [ ] **UI-210** Cellules texte, nombre, cases, URL, fichiers et dates.
- [ ] **UI-211** Pastilles select/multi-select/status : couleur, suppression et menus.
- [ ] **UI-212** Sélecteurs de personnes et relations avec recherche.
- [ ] **UI-213** Picker date : calendrier, heure, intervalle, fuseau et rappel.
- [ ] **UI-214** Nombres formatés, progressions, rollups et valeurs calculées.
- [ ] **UI-215** Éditeur de formule avec coloration, complétion, aide et erreurs.
- [ ] **UI-216** Sélection de lignes/cellules, édition en lot et menus contextuels.
- [ ] **UI-217** Pied de colonne avec menu de calcul et valeur.
- [ ] **UI-218** États de cellule vide, erreur, calcul en cours et accès restreint.
- [ ] **UI-219** Page d’entrée : propriétés, groupes, zones épinglées et panneau de détails.

## 16. Chaque vue de base — P1/P2

Références : [S13](NOTION_REFERENCE.md#s13), [S20](NOTION_REFERENCE.md#s20), [S21](NOTION_REFERENCE.md#s21), [S22](NOTION_REFERENCE.md#s22), [S23](NOTION_REFERENCE.md#s23).

- [ ] **UI-220** Tableau : en-tête fixe, colonnes, poignée de ligne et insertion.
- [ ] **UI-221** Liste : densité, propriétés visibles et états des lignes.
- [ ] **UI-222** Kanban : largeur des colonnes, en-tête, compteurs et bouton ajouter.
- [ ] **UI-223** Kanban : cartes, contenu, drop targets, regroupements et colonnes repliées.
- [ ] **UI-224** Galerie : tailles de cartes, aperçu, ratios et métadonnées.
- [ ] **UI-225** Calendrier : grille, navigation de période, aujourd’hui et création d’événement.
- [ ] **UI-226** Calendrier : événements couvrant plusieurs jours et drag de date.
- [ ] **UI-227** Chronologie : échelle, grille, barre des tâches et panneau latéral.
- [ ] **UI-228** Chronologie : poignées de début/fin et dépendances.
- [ ] **UI-229** Graphiques : axes, légendes, infobulles, couleurs et états sans données.
- [ ] **UI-230** Formulaire : éditeur, aperçu, champs, erreurs et confirmation.
- [ ] **UI-231** Fil : carte de page, contenu, pagination et commandes autorisées.
- [ ] **UI-232** Carte : marqueurs, popup, zoom, recherche et état sans position.
- [ ] **UI-233** Filtres avancés : groupes ET/OU, badges et menu des opérateurs.
- [ ] **UI-234** Tri et groupement : ordre, sens, regroupement secondaire et suppression.
- [ ] **UI-235** Bases vides : démarrage manuel, modèle, import et source liée.

## 17. Modèles, wiki, boutons et automations — P2

Références : [S25](NOTION_REFERENCE.md#s25), [S27](NOTION_REFERENCE.md#s27), [S28](NOTION_REFERENCE.md#s28), [S29](NOTION_REFERENCE.md#s29), [S30](NOTION_REFERENCE.md#s30).

- [ ] **UI-236** Galerie des modèles avec catégories, recherche et aperçu.
- [ ] **UI-237** Éditeur de modèle clairement distinct d’une page normale.
- [ ] **UI-238** Menu modèle par défaut et récurrence.
- [ ] **UI-239** Éditeur de mise en page avec zones déplaçables et aperçu.
- [ ] **UI-240** Wiki : vues, propriétaire, vérification et expiration.
- [ ] **UI-241** Menu de vérification et état expiré.
- [ ] **UI-242** Configuration de bouton : nom, icône et liste d’actions.
- [ ] **UI-243** Éditeur d’actions : sélecteurs, variables et confirmations.
- [ ] **UI-244** Éditeur d’automation : déclencheurs, conditions, actions et activation.
- [ ] **UI-245** Historique d’exécution avec détails d’erreur et reprise.
- [ ] **UI-246** Formulaires de connexion/reconnexion pour actions externes.

## 18. Corbeille, historique, import/export — P0/P1

Références : [S15](NOTION_REFERENCE.md#s15), [S31](NOTION_REFERENCE.md#s31), [S32](NOTION_REFERENCE.md#s32).

- [ ] **UI-247** [PARTIEL] Fenêtre corbeille, liste des pages et restauration.
- [ ] **UI-248** Recherche, filtres, emplacement d’origine et date de suppression.
- [ ] **UI-249** Aperçu d’une page supprimée sans possibilité d’édition involontaire.
- [ ] **UI-250** Confirmation d’effacement définitif et état vide.
- [ ] **UI-251** [PARTIEL] Panneau historique avec liste chronologique des versions.
- [ ] **UI-252** [PARTIEL] Comparaison de versions, aperçu et confirmation de restauration.
- [ ] **UI-253** Import : choix du format, fichiers multiples, progression et rapport.
- [ ] **UI-254** Export : format, sous-pages, médias, options et progression.
- [ ] **UI-255** Erreur partielle avec possibilité de récupérer les fichiers valides.
- [ ] **UI-256** Nom et destination du téléchargement compréhensibles.
- [ ] **UI-257** Résolution des conflits Markdown avec comparaison et copie de secours.
- [ ] **UI-258** Accès au coffre et aux sauvegardes sans afficher de détails techniques inutiles dans le document.

## 19. Collaboration, publication et IA — HORS PÉRIMÈTRE ACTUEL

Références : [S34](NOTION_REFERENCE.md#s34), [S35](NOTION_REFERENCE.md#s35), [S38](NOTION_REFERENCE.md#s38), [S39](NOTION_REFERENCE.md#s39), [S40](NOTION_REFERENCE.md#s40).

- [ ] **UI-259** Menu Partager : personnes, droits, lien et onglet publication.
- [ ] **UI-260** Avatars présents, curseurs et sélections distantes.
- [ ] **UI-261** Commentaires en marge, fils, réponses, réactions et résolution.
- [ ] **UI-262** Panneau des commentaires ouverts/résolus et navigation aux ancrages.
- [ ] **UI-263** Suggestions de modifications et commandes accepter/refuser.
- [ ] **UI-264** Boîte de réception : filtres, non-lus, navigation et réglages.
- [ ] **UI-265** Dialogue d’invitation, demande d’accès et page restreinte.
- [ ] **UI-266** Espaces d’équipe et menus de gestion des membres.
- [ ] **UI-267** Publication : aperçu, options du site, domaine et statut.
- [ ] **UI-268** Chat IA : entrée, streaming, sources et actions proposées.
- [ ] **UI-269** Actions IA en ligne et différences proposées dans le document.
- [ ] **UI-270** Agent personnel, agents personnalisés, paramètres et historique d’exécution.
- [ ] **UI-271** Notes de réunion : capture, transcription, résumé et tâches.
- [ ] **UI-272** États quota, fournisseur indisponible et permission manquante.

## 20. Paramètres et produits adjacents — P2/DIFFÉRÉ

Références : [S37](NOTION_REFERENCE.md#s37), [S46](NOTION_REFERENCE.md#s46), [S47](NOTION_REFERENCE.md#s47), [S48](NOTION_REFERENCE.md#s48), [S49](NOTION_REFERENCE.md#s49).

- [ ] **UI-273** [PARTIEL] Paramètres de thème et accès au coffre.
- [ ] **UI-274** Navigation des paramètres et séparation compte/espace/intégrations.
- [ ] **UI-275** Profil, langue, dates, fuseau et préférences de démarrage.
- [ ] **UI-276** Préférences de notifications et disponibilité hors ligne.
- [ ] **UI-277** Gestion des membres, invités, groupes et espaces d’équipe — différée.
- [ ] **UI-278** Écrans sécurité, connexions, facturation et administration — différés.
- [ ] **UI-279** Bibliothèque et marketplace : recherche, catégories, aperçu et installation.
- [ ] **UI-280** Calendar et Mail : inventaire d’écrans séparé si leur clonage est un jour demandé.
- [ ] **UI-281** Onboarding, pages exemples et aide sans personnalisation codée en dur.
- [ ] **UI-282** Écrans de mise à jour, migration et récupération après crash.

## 21. États et interactions transversales — P0

Critères propres à Fotion : exigences de fiabilité/recette proposées, pas fonctionnalités attribuées à Notion.

- [ ] **UI-283** Chaque contrôle possède normal, hover, focus, pressed et disabled lorsque pertinent.
- [ ] **UI-284** Chaque action asynchrone possède attente, succès, erreur et possibilité de reprise.
- [ ] **UI-285** Chaque liste possède vide, une entrée, beaucoup d’entrées et libellés très longs.
- [ ] **UI-286** Échap ferme uniquement la couche supérieure et restitue le focus.
- [ ] **UI-287** Clic extérieur ferme la bonne couche sans exécuter un contrôle situé derrière.
- [ ] **UI-288** Les menus imbriqués restent ouverts lors du passage du pointeur entre les couches.
- [ ] **UI-289** Tab/Maj+Tab suivent un ordre logique et restent dans les fenêtres modales.
- [ ] **UI-290** Le focus initial est pertinent ; le focus de retour est préservé après fermeture.
- [ ] **UI-291** Les raccourcis n’interceptent pas les compositions IME ni les champs non concernés.
- [ ] **UI-292** Les confirmations protègent les actions destructrices sans gêner les actions réversibles.
- [ ] **UI-293** Les notifications temporaires ne masquent pas le contenu et restent annoncées correctement.
- [ ] **UI-294** Messages d’erreur concrets avec action de récupération, sans détails sensibles.
- [ ] **UI-295** Positionnement des popovers correct après scroll, resize et zoom.
- [ ] **UI-296** Pas de saut de layout dû aux boutons révélés au survol.
- [ ] **UI-297** Pas de menu hors écran ni derrière un overlay.
- [ ] **UI-298** Aucun bouton décoratif présenté comme une action fonctionnelle.

## 22. Mobile, accessibilité et performance visuelle — P0/P2

Références : [S46](NOTION_REFERENCE.md#s46).

- [ ] **UI-299** [PARTIEL] Barre latérale mobile en panneau et voile de fond.
- [ ] **UI-300** Navigation tactile sans dépendance au hover.
- [ ] **UI-301** Clavier virtuel : titre, caret, toolbar et menus restent visibles.
- [ ] **UI-302** Zones tactiles mesurées et poignées utilisables sans bloquer le scroll.
- [ ] **UI-303** Colonnes, tableaux et bases adaptés aux petits écrans.
- [ ] **UI-304** Test orientation portrait/paysage et safe areas.
- [ ] **UI-305** Rôles ARIA, noms accessibles, états expanded/selected/checked et live regions.
- [ ] **UI-306** Navigation complète au clavier, y compris drag alternatif et tableaux.
- [ ] **UI-307** Lecture cohérente avec VoiceOver et NVDA.
- [ ] **UI-308** Zoom 200 %, agrandissement du texte, contraste renforcé et reduced-motion.
- [ ] **UI-309** Aucune information transmise uniquement par couleur, position ou hover.
- [ ] **UI-310** RTL, textes longs et langues aux métriques différentes.
- [ ] **UI-311** Caret et sélection stables à 60 Hz sur les scénarios de référence.
- [ ] **UI-312** Absence de clignotement et de décalage des menus lors d’une sauvegarde.
- [ ] **UI-313** Virtualisation sans disparition du focus ou des ancres sélectionnées.
- [ ] **UI-314** Mesurer mémoire, coût du drag et réponse de la recherche sur les mêmes jeux de données.

## 23. Recette visuelle obligatoire — P0

Critères propres à Fotion : exigences de fiabilité/recette proposées, pas fonctionnalités attribuées à Notion.

- [ ] **UI-315** Capturer la page vide, la page sans couverture et la page avec couverture/icône.
- [ ] **UI-316** Capturer tous les blocs simples, imbriqués et sélectionnés.
- [ ] **UI-317** Capturer les menus /, +, bloc, transformation, lien, couleur et page.
- [ ] **UI-318** Capturer la barre latérale repliée, développée, redimensionnée et pendant un drag.
- [ ] **UI-319** Capturer recherche, déplacement, paramètres, import, export et corbeille.
- [ ] **UI-320** Capturer chaque propriété et chaque vue de base lorsqu’implémentées.
- [ ] **UI-321** Capturer les erreurs et états vides, pas seulement le happy path.
- [ ] **UI-322** Comparer clair/sombre aux viewports de référence, sans changer les données.
- [ ] **UI-323** Superposer les captures et consigner chaque écart mesuré dans une issue.
- [ ] **UI-324** Associer les écarts à leurs IDs UI et fonctionnels.
- [ ] **UI-325** Faire vérifier les interactions dans Chromium, Firefox et WebKit réels.
- [ ] **UI-326** Tester manuellement souris et pavé tactile ; tactile pour le périmètre mobile.
- [ ] **UI-327** Ne pas confondre les tests JSDOM existants avec un test de rendu navigateur.
- [ ] **UI-328** Ne déclarer le clone visuel validé qu’après fermeture des écarts bloquants.

## État initial et preuves

La base actuelle est dans [App.tsx](../ui/app/App.tsx), [editor.tsx](../ui/features/editor/components/DocumentEditor.tsx), [BlockControls.tsx](../ui/features/editor/components/BlockControls.tsx) et [styles](../ui/app/styles/). Le [scénario JSDOM](../scripts/check-ui.mjs) valide des événements et changements de DOM, pas les pixels ou le comportement du matériel réel.

À la création : **328 critères**, **0 cochés**, **73 partiels**. Ne pas présenter le ratio comme un pourcentage de parité : les critères ont des tailles et périmètres différents.

## Recette navigateur — 30 octobre 2026

[Scénarios Playwright](../tests/e2e/editor.spec.ts) exécutés dans Chrome avec un coffre temporaire : déplacement réel au pointeur, annulation/rétablissement, sauvegarde puis rechargement ; sélection totale et palette de couleurs aux largeurs 1440 et 320 px ; pages bureau en thèmes clair/sombre et mobile à 390 px sans débordement horizontal. Les trois scénarios passent. La sélection totale de ProseMirror est désormais prise en charge par la barre de formatage.

Les captures sont générées dans `test-results/`. Cette recette valide ces parcours et contraintes de géométrie ; elle ne constitue pas une comparaison pixel à pixel avec Notion et ne couvre pas Safari, Firefox ni le tactile réel. Les cases de parité visuelle restent ouvertes.

## Hauteur du titre responsive — 30 octobre 2026

UI-085/UI-086 : correction du titre tronqué après réduction de la fenêtre sans rechargement. Le [composant PageTitle](../ui/features/pages/components/PageTitle.tsx) observe la largeur réelle du champ et recalcule sa hauteur après modification du texte, de la police ou du viewport. Les changements de largeur de la barre latérale et du mode pleine largeur sont ainsi pris en compte. Les changements de hauteur ne relancent pas l'observation en boucle.

[Recette Chrome](../tests/e2e/editor.spec.ts) : long titre à 320 px, retour au bureau, police monospace, pleine largeur, barre latérale redimensionnée au clavier, raccourcissement du titre, Entrée vers l'éditeur et sauvegarde/rechargement. Le titre du navigateur suit aussi le renommage. Le rendu a été inspecté sur la capture mobile. La métrique typographique exacte de Notion, le maintien du scroll dans toutes les situations et le clavier virtuel sur appareil physique restent à vérifier.

## Avancement — UI-Kit et menus de bloc/page

Référence : captures officielles du centre d’aide Notion (barre latérale, menu de bloc animé, blocs de base mobiles), téléchargées en octobre 2026 pour comparaison locale et non versionnées.

- UI-Kit `ui/kit/` : jetons de thème clair/sombre (surfaces, texte, palette des 9 couleurs de bloc, typographie, rayons, ombres de menu, plans), composants partagés et galerie `#ui-kit` vérifiée dans les deux thèmes.
- Menu de bloc : recherche « Rechercher des actions… », Supprimer, Dupliquer (⌘/Ctrl+D, aussi au clavier dans l’éditeur), Transformer en ›, Couleur › pour les encadrés ; bloc ciblé surligné en bleu ; info-bulles « Faire glisser pour déplacer / Cliquer pour ouvrir le menu » et « Cliquer pour ajouter en dessous / ⌥-clic pour ajouter au-dessus » (comportement implémenté).
- Menu de page : ordre de la référence (police, liens et déplacements, interrupteurs, annulation/historique/import/export), pied avec nombre de mots et dernière modification.
- Barre latérale : création de page par l’icône crayon à côté de l’espace ; Paramètres dans la navigation principale.

Restent hors de ces lots : commentaires, suggestions, IA, dictée, copier le lien d’un bloc et « Déplacer vers » pour un bloc (pas de boutons factices tant que la fonction n’existe pas), couleur pour tous les types de blocs, comparaison au pixel des autres écrans.

## Avancement — barre latérale, recherche, menu de page, icônes

Références locales : `ref/` (ignoré par Git) contient les captures du centre d’aide Notion par article (`ref/help-articles/<article>/<langue>/`) et les captures de Fotion avant modification (`ref/fotion/`).

- Barre latérale : sections Favoris/Privé repliables d’un clic sur leur nom ; menu « … » Trier (Manuel, Dernière modification), Afficher (5, 10, 15, 20) et Déplacer la section ; ligne « Plus » ouvrant un panneau avec « Rechercher une page… », tri et création. Préférences conservées dans le navigateur.
- Recherche : « Rechercher dans Espace de Sohane… », filtre « Titres uniquement », pages récentes groupées par date (Aujourd’hui, Hier, 7 et 30 derniers jours, Plus ancien), parent après le titre, date à droite, ↵ sur la ligne active, pied « ↑↓ Sélectionner · ↵ Ouvrir · ⌘↵ Ouvrir dans un nouvel onglet » (fonctionnel).
- Menu de page : ordre de la capture de référence (Style Ag, Petit texte, Pleine largeur, Verrouiller, Favoris, Copier le lien ⌘L, Dupliquer, Déplacer vers, Annuler, Historique, Pages supprimées, Supprimer, Importer, Exporter, nombre de mots).
- Barre supérieure : horloge « Historique de la page ».
- Icône de page : sélecteur Emoji avec Aléatoire, Supprimer, « Filtrer… » sur les noms français CLDR, Récents et catégories ; les emojis que la police du système ne sait pas afficher sont masqués.

Écarts encore visibles : bouton Partager et commentaires (hors périmètre), onglets « Importer une image » et « Lien » du sélecteur d’icône, filtres de recherche Créé par/Espace/Dans la page/Date, présentation « Lié à cette page » des backlinks, statut d’enregistrement local à la place de « Modifiée il y a… ».


## Rendu des images et sélection — 31 octobre 2026

UI-172, UI-171 : les images seules deviennent un bloc figure centré sur la colonne de contenu (`720px`), avec légende en `figcaption` gris (14px, placeholder « Écrire une légende… ») et sélection par contour bleu `#2383e2` en surimpression (`image-outline`) — le contour se porte sur une couche réelle car les `<img>` remplacées avalent les bordures et ombres internes (test minimal : bordure peinte, ombre interne jamais) et ombres internes. La poignée de redimensionnement affiche bordure pointillée rouge `rgba(212,76,71,0.5)` pendant le déplacement et la largeur est rangée en pourcentage lors du relâchement. Mesures : résultat capture `test-results/` dans les scénarios (image sélectionnée = 423 pixels de contour exactement `rgb(35,131,226)` sur `test-results/probe-zoom.png`). Restent les variantes d'alignement de la référence et la comparaison complète clair/sombre sans couverture.
