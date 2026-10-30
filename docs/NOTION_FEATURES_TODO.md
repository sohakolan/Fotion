# TODO — Fonctionnalités Notion et adaptation Markdown

Référence de travail : **30 octobre 2026** · État du code : **Fotion 0.2.0**.

Voir [le périmètre et les règles de validation](README.md) et [les sources officielles](NOTION_REFERENCE.md).

Chaque case décrit un résultat à implémenter ou à vérifier, pas une promesse de parité déjà obtenue. Les critères détaillés sont notre découpage de travail ; leur formulation ne constitue pas une spécification interne de Notion.

**Légende :** `[x]` = résultat étroit vérifié dans le code/tests ; `[ ] [PARTIEL]` = base existante, parité non acquise ; `[ ]` = à faire/à vérifier. Les priorités et exclusions s’appliquent à toute la section.

## 01. Pages et arborescence — P0

Références : [S01](NOTION_REFERENCE.md#s01), [S02](NOTION_REFERENCE.md#s02), [S15](NOTION_REFERENCE.md#s15).

- [ ] **FN-001** [PARTIEL] Créer une page vide à la racine avec un identifiant stable et un titre éditable.
- [ ] **FN-002** [PARTIEL] Créer une sous-page depuis la barre latérale, le document et la commande /page.
- [ ] **FN-003** [PARTIEL] Renommer une page sans casser ses références entrantes.
- [ ] **FN-004** [PARTIEL] Afficher un titre « Sans titre » sans imposer ce texte dans le fichier.
- [ ] **FN-005** [PARTIEL] Imbriquer, déplier et replier des pages à plusieurs niveaux.
- [ ] **FN-006** [PARTIEL] Réordonner les pages et déplacer une page vers un autre parent.
- [x] **FN-007** Refuser une relation parent-enfant cyclique, y compris à travers plusieurs niveaux.
- [ ] **FN-008** [PARTIEL] Déplacer une page à la racine depuis une sous-page.
- [ ] **FN-009** [PARTIEL] Dupliquer une page ; compléter la duplication récursive de ses descendants et médias.
- [ ] **FN-010** [PARTIEL] Mettre une page en favori et la retirer des favoris.
- [ ] **FN-011** Réordonner les favoris indépendamment de l’arborescence.
- [x] **FN-012** Ouvrir une page à partir d’une URL stable, y compris après rechargement direct.
- [ ] **FN-013** [PARTIEL] Copier le lien d’une page ; conserver le contexte de navigation.
- [ ] **FN-014** Ouvrir plusieurs pages en onglets et ouvrir un lien dans un nouvel onglet.
- [ ] **FN-015** Ouvrir une page en panneau latéral, aperçu centré ou pleine page.
- [ ] **FN-016** [PARTIEL] Naviguer dans les ancêtres via le fil d’Ariane.
- [ ] **FN-017** [PARTIEL] Revenir à la page précédente ou suivante en conservant position et sélection.
- [ ] **FN-018** Afficher les pages récemment visitées et retrouver une page fermée.
- [x] **FN-019** Verrouiller et déverrouiller une page contre les modifications accidentelles.
- [ ] **FN-020** Déplacer un bloc vers une page existante ou une nouvelle page.
- [ ] **FN-021** Transformer un bloc en page et réintégrer une page sous forme de blocs.
- [ ] **FN-022** [PARTIEL] Gérer les liens vers une page supprimée, inaccessible ou déplacée.
- [ ] **FN-023** [PARTIEL] Supprimer/restaurer un sous-arbre avec un comportement explicite pour ses descendants.
- [ ] **FN-024** Choisir un emplacement lors de la création, duplication, importation ou restauration.

## 02. Saisie et sélection — P0

Références : [S01](NOTION_REFERENCE.md#s01), [S05](NOTION_REFERENCE.md#s05).

- [ ] **FN-025** [PARTIEL] Saisir, modifier et effacer du texte sans perte de sélection ni saut de défilement.
- [ ] **FN-026** [PARTIEL] Insérer un paragraphe, scinder un bloc avec Entrée et fusionner avec Retour arrière.
- [ ] **FN-027** Reproduire Entrée et Maj+Entrée dans chaque type de bloc et à ses frontières.
- [ ] **FN-028** Distinguer sélection de texte, sélection d’un bloc et sélection de plusieurs blocs.
- [ ] **FN-029** Étendre une sélection avec Maj+clic, Maj+flèches et navigation au clavier.
- [ ] **FN-030** Sélectionner un ensemble de blocs en traçant un rectangle dans la marge.
- [ ] **FN-031** Couper, copier, coller et dupliquer une sélection multibloc.
- [ ] **FN-032** Conserver un presse-papiers structuré entre pages et fenêtres de Fotion.
- [ ] **FN-033** Coller du texte brut sans styles, et conserver les styles lors du collage riche.
- [ ] **FN-034** Normaliser les collages issus de Word, Google Docs, Notion et pages web.
- [ ] **FN-035** Transformer un collage Markdown en blocs, sans interpréter les exemples de code comme des commandes.
- [ ] **FN-036** Gérer correctement IME, composition, accents, emoji, caractères combinés et RTL.
- [ ] **FN-037** Conserver la position du curseur après une sauvegarde, un déplacement ou une conversion.
- [ ] **FN-038** Continuer une liste, sortir d’une liste vide, indenter et désindenter avec Tab/Maj+Tab.
- [ ] **FN-039** [PARTIEL] Annuler et rétablir les éditions de l’éditeur.
- [ ] **FN-040** Conserver un historique cohérent pour les changements de titre et de propriétés de page.
- [ ] **FN-041** Regrouper la saisie et les actions en unités d’annulation compréhensibles.
- [ ] **FN-042** Gérer une page très longue, un bloc très long et des milliers de blocs sans figer la saisie.
- [ ] **FN-043** Afficher un état utilisable pendant le chargement, la restauration ou une erreur de document.

## 03. Mise en forme et commandes — P0

Références : [S01](NOTION_REFERENCE.md#s01), [S03](NOTION_REFERENCE.md#s03), [S05](NOTION_REFERENCE.md#s05).

- [ ] **FN-044** [PARTIEL] Appliquer et retirer gras, italique, souligné, barré et code en ligne.
- [ ] **FN-045** Gérer les combinaisons de marques et les états mixtes dans une sélection.
- [ ] **FN-046** [PARTIEL] Créer, modifier et supprimer un lien avec un formulaire contextuel.
- [ ] **FN-047** [PARTIEL] Ouvrir/copier un lien, afficher sa destination et détecter les liens internes.
- [ ] **FN-048** [PARTIEL] Appliquer les couleurs de texte et de fond proposées par la référence.
- [ ] **FN-049** [PARTIEL] Mémoriser la dernière couleur et fournir son raccourci.
- [ ] **FN-050** [PARTIEL] Supprimer toute la mise en forme d’une sélection.
- [ ] **FN-051** [PARTIEL] Afficher la barre de formatage au-dessus d’une sélection de texte.
- [ ] **FN-052** [PARTIEL] Ouvrir le menu / et filtrer les commandes par nom et alias.
- [ ] **FN-053** [PARTIEL] Parcourir le menu / avec les flèches, valider avec Entrée et fermer avec Échap.
- [ ] **FN-054** Gérer les commandes récemment utilisées et les catégories selon la version de référence.
- [ ] **FN-055** [PARTIEL] Ouvrir un sélecteur de blocs avec le bouton + dans la marge.
- [ ] **FN-056** [PARTIEL] Transformer un bloc sans perdre son texte ; couvrir tous les couples de conversion compatibles.
- [ ] **FN-057** Convertir plusieurs blocs à la fois et expliquer les conversions impossibles.
- [ ] **FN-058** [PARTIEL] Reconnaître les raccourcis Markdown de tous les blocs pris en charge.
- [ ] **FN-059** Exposer les actions de suppression, duplication, couleur et déplacement dans / quand la référence les propose.
- [ ] **FN-060** Gérer les raccourcis macOS/Windows/Linux avec des libellés adaptés.
- [ ] **FN-061** [PARTIEL] Afficher un compteur de mots et de caractères pour une sélection et une page.

## 04. Catalogue des blocs — P0/P1

Références : [S01](NOTION_REFERENCE.md#s01), [S04](NOTION_REFERENCE.md#s04), [S06](NOTION_REFERENCE.md#s06), [S07](NOTION_REFERENCE.md#s07).

- [ ] **FN-062** [PARTIEL] Paragraphe de texte riche.
- [ ] **FN-063** [PARTIEL] Titres H1, H2 et H3.
- [ ] **FN-064** [PARTIEL] Listes à puces et listes numérotées.
- [ ] **FN-065** [PARTIEL] Tâches cochables avec état conservé lors d’un déplacement.
- [ ] **FN-066** Numérotation continue, reprise et niveaux de listes imbriquées.
- [ ] **FN-067** [PARTIEL] Citations, y compris plusieurs paragraphes.
- [ ] **FN-068** [PARTIEL] Séparateur horizontal.
- [ ] **FN-069** [PARTIEL] Encadrés : icône et couleurs personnalisables ; terminer conversions et variantes d’icônes.
- [ ] **FN-070** [PARTIEL] Listes dépliantes : terminer sélection, édition du résumé et interactions imbriquées.
- [x] **FN-071** Titres dépliants H1/H2/H3.
- [ ] **FN-072** [PARTIEL] Blocs de code : compléter langues, coloration syntaxique, copie et retour à la ligne.
- [ ] **FN-073** Équations mathématiques en bloc et en ligne avec édition et erreurs lisibles.
- [ ] **FN-074** [PARTIEL] Tableaux simples : compléter en-têtes, déplacements et sélection des cellules.
- [ ] **FN-075** Colonnes de contenu avec création par dépôt latéral.
- [ ] **FN-076** Redimensionnement, réorganisation et suppression des colonnes.
- [x] **FN-077** Table des matières liée aux titres et mise à jour après renommage.
- [ ] **FN-078** Lien vers une page sous forme de bloc ; distinct d’une vraie sous-page.
- [ ] **FN-079** Mentions de pages, dates, personnes et références de base de données.
- [ ] **FN-080** Fil d’Ariane insérable dans le contenu.
- [ ] **FN-081** Blocs synchronisés avec origine, occurrences et désynchronisation.
- [ ] **FN-082** Boutons de page avec actions configurables.
- [ ] **FN-083** Modèles de blocs réutilisables selon les mécanismes de la référence.
- [ ] **FN-084** Blocs de bases de données intégrées et vues liées.
- [ ] **FN-085** Marque-pages web avec titre, description et aperçu.
- [ ] **FN-086** Blocs embarqués : vidéo, audio, PDF et contenus externes compatibles.
- [ ] **FN-087** Bloc de fichier téléchargeable.
- [ ] **FN-088** Traitement explicite des blocs non reconnus, sans suppression silencieuse.

## 05. Glisser-déposer et manipulation — P0

Références : [S01](NOTION_REFERENCE.md#s01), [S04](NOTION_REFERENCE.md#s04), [S02](NOTION_REFERENCE.md#s02).

- [ ] **FN-089** [PARTIEL] Afficher + et poignée uniquement sur le bloc visé, sans déplacer le contenu.
- [ ] **FN-090** [PARTIEL] Distinguer clic sur poignée et début de déplacement par un seuil de mouvement.
- [ ] **FN-091** [PARTIEL] Afficher un aperçu compact du bloc et un repère d’insertion précis.
- [ ] **FN-092** [PARTIEL] Déposer un bloc avant ou après un autre bloc.
- [ ] **FN-093** [PARTIEL] Déplacer une ligne de liste sans déplacer toute la liste.
- [ ] **FN-094** [PARTIEL] Transférer un élément entre listes et préserver son contenu.
- [x] **FN-095** Conserver les marques de texte et l’état coché lors des déplacements testés.
- [x] **FN-096** Faire d’un déplacement une seule étape d’annulation.
- [ ] **FN-097** [PARTIEL] Annuler un déplacement avec Échap, perte de focus et annulation de pointeur.
- [ ] **FN-098** [PARTIEL] Défiler automatiquement à l’approche des bords.
- [ ] **FN-099** Déplacer une sélection de plusieurs blocs dans l’ordre initial.
- [ ] **FN-100** Déposer à l’intérieur d’une liste dépliante, citation, encadré ou colonne.
- [ ] **FN-101** Ouvrir automatiquement une cible repliée après un survol prolongé.
- [ ] **FN-102** Former des colonnes avec un dépôt à gauche/droite d’un bloc.
- [ ] **FN-103** Afficher la différence entre insertion verticale, imbrication et colonne.
- [ ] **FN-104** Déplacer/copier des blocs entre pages via la barre latérale.
- [ ] **FN-105** Faire glisser une pièce jointe depuis le système de fichiers.
- [ ] **FN-106** Déposer une image du presse-papiers ou d’un autre navigateur.
- [ ] **FN-107** [PARTIEL] Réordonner et imbriquer des pages dans la barre latérale.
- [ ] **FN-108** Gérer le dépôt sur les favoris et la corbeille avec un résultat explicite.
- [ ] **FN-109** Vérifier souris, pavé tactile, stylet et interactions tactiles.
- [ ] **FN-110** Gérer zoom navigateur, redimensionnement et défilement imbriqué pendant le déplacement.
- [ ] **FN-111** Empêcher les pertes de contenu en cas de modification concurrente du document pendant un drag.
- [ ] **FN-112** [PARTIEL] Fournir des commandes clavier de déplacement équivalentes.

## 06. Médias et pièces jointes — P1

Références : [S06](NOTION_REFERENCE.md#s06).

- [ ] **FN-113** [PARTIEL] Insérer une image par URL.
- [ ] **FN-114** Importer une image locale et copier le fichier dans le coffre.
- [ ] **FN-115** Coller une capture d’écran et déposer plusieurs images.
- [ ] **FN-116** Redimensionner et aligner une image.
- [ ] **FN-117** Ajouter une légende et un texte alternatif.
- [ ] **FN-118** Remplacer, télécharger et ouvrir une image en grand.
- [ ] **FN-119** Recadrer/repositionner lorsque la référence l’autorise.
- [ ] **FN-120** Afficher une galerie de sélection d’images et les sources de couverture disponibles.
- [ ] **FN-121** Importer des fichiers avec taille, type, nom et téléchargement.
- [ ] **FN-122** Lire audio et vidéo avec contrôles accessibles.
- [ ] **FN-123** Afficher un PDF intégré et permettre son téléchargement.
- [ ] **FN-124** Intégrer les fournisseurs externes observés dans la référence, avec liste de compatibilité datée.
- [ ] **FN-125** Afficher les états de chargement, erreur, accès refusé et URL expirée.
- [ ] **FN-126** Autoriser l’ouverture d’un lien sans exécuter de contenu actif non fiable.
- [ ] **FN-127** Conserver les médias après déplacement, duplication, import et export.
- [ ] **FN-128** Respecter la confidentialité : aucune requête externe avant qu’un média distant soit utilisé.

## 07. Liens, mentions, recherche — P1

Références : [S08](NOTION_REFERENCE.md#s08), [S09](NOTION_REFERENCE.md#s09), [S10](NOTION_REFERENCE.md#s10).

- [ ] **FN-129** [PARTIEL] Créer un lien interne avec @, [[ et le menu de lien selon la référence.
- [ ] **FN-130** Créer une nouvelle page depuis une recherche de lien sans résultat.
- [ ] **FN-131** [PARTIEL] Afficher les mentions entrantes et les backlinks d’une page.
- [ ] **FN-132** [PARTIEL] Mettre à jour les libellés des références après renommage.
- [ ] **FN-133** Afficher un aperçu de page au survol d’une mention.
- [ ] **FN-134** Créer une mention de date et interpréter les dates relatives.
- [ ] **FN-135** Définir une heure, un fuseau et un rappel.
- [ ] **FN-136** Afficher les rappels arrivés à échéance et permettre leur modification.
- [ ] **FN-137** [PARTIEL] Rechercher dans le titre et le contenu des pages.
- [ ] **FN-138** [PARTIEL] Ouvrir la recherche avec Cmd/Ctrl+P (K hors éditeur) et parcourir les résultats au clavier ; réserver K au lien dans l’éditeur.
- [ ] **FN-139** [PARTIEL] Trier les résultats par pertinence, récence et critères de la référence.
- [ ] **FN-140** [PARTIEL] Filtrer par parent, type, auteur, dates, espace et emplacement disponibles.
- [ ] **FN-141** [PARTIEL] Surligner les occurrences et afficher des extraits pertinents.
- [ ] **FN-142** [PARTIEL] Indexer incrémentalement le coffre sans relire toutes les pages à chaque recherche.
- [ ] **FN-143** Rechercher dans la page courante avec navigation entre occurrences.
- [ ] **FN-144** [PARTIEL] Respecter la corbeille, les autorisations et les contenus non indexables.
- [ ] **FN-145** [PARTIEL] Afficher recherches récentes, suggestions et résultats vides.
- [ ] **FN-146** Ouvrir les résultats au bon bloc plutôt qu’en haut de page.

## 08. Présentation des pages et navigation globale — P0/P1

Références : [S02](NOTION_REFERENCE.md#s02), [S03](NOTION_REFERENCE.md#s03), [S11](NOTION_REFERENCE.md#s11).

- [ ] **FN-147** [PARTIEL] Ajouter, changer et retirer une icône de page.
- [ ] **FN-148** [PARTIEL] Choisir emoji, icône monochrome, couleur, image importée ou URL selon la référence.
- [ ] **FN-149** [PARTIEL] Ajouter, changer et retirer une couverture.
- [ ] **FN-150** Repositionner la couverture et conserver son cadrage.
- [ ] **FN-151** Importer une couverture et parcourir une galerie.
- [x] **FN-152** Enregistrer police, petite taille et pleine largeur par page dans le Markdown.
- [ ] **FN-153** [PARTIEL] Appliquer police par défaut, serif et monospace.
- [ ] **FN-154** [PARTIEL] Basculer entre thème clair et sombre.
- [ ] **FN-155** Suivre automatiquement le thème système.
- [ ] **FN-156** [PARTIEL] Redimensionner et masquer la barre latérale.
- [ ] **FN-157** Afficher temporairement la barre latérale au survol quand elle est masquée.
- [ ] **FN-158** Conserver les états d’arborescence et de défilement entre sessions.
- [ ] **FN-159** Fournir un vrai accueil avec pages récentes, favoris et raccourcis utiles.
- [ ] **FN-160** Afficher une bibliothèque globale et les sections proposées par la référence choisie.
- [ ] **FN-161** Personnaliser les sections et onglets de navigation quand présents dans cette version de Notion.
- [ ] **FN-162** Changer d’espace de travail/coffre sans mélange de documents.
- [ ] **FN-163** Afficher les raccourcis récents et les options propres au système d’exploitation.
- [ ] **FN-164** Configurer langue, fuseau, premier jour de semaine et formats de date.
- [ ] **FN-165** Proposer une aide contextuelle et un catalogue de raccourcis.

## 09. Bases de données : structure — P1

Références : [S12](NOTION_REFERENCE.md#s12), [S13](NOTION_REFERENCE.md#s13), [S14](NOTION_REFERENCE.md#s14).

- [ ] **FN-166** Créer une base pleine page et une base intégrée.
- [ ] **FN-167** Créer chaque ligne comme une page éditable avec propriétés et contenu.
- [ ] **FN-168** Distinguer base de données, source de données et vue.
- [ ] **FN-169** Relier une source existante sans dupliquer les données.
- [ ] **FN-170** Gérer plusieurs sources lorsque la référence le permet.
- [ ] **FN-171** Renommer, décrire, déplacer et dupliquer une base.
- [ ] **FN-172** Créer, renommer, réordonner, masquer et supprimer des propriétés.
- [ ] **FN-173** Changer le type d’une propriété avec aperçu de conversion et protection contre les pertes.
- [ ] **FN-174** Créer, dupliquer, archiver et supprimer des entrées individuellement ou en lot.
- [ ] **FN-175** Copier/coller des cellules et des plages de données.
- [ ] **FN-176** Modifier plusieurs entrées en une action.
- [ ] **FN-177** Verrouiller la structure d’une base tout en permettant les éditions autorisées.
- [ ] **FN-178** Ouvrir une ligne en aperçu centré, latéral ou pleine page.
- [ ] **FN-179** Conserver les liens entre entrées lors d’une duplication/exportation.
- [ ] **FN-180** Définir une représentation disque documentée pour schémas, vues et propriétés.
- [ ] **FN-181** Reconstituer la base à partir du coffre sans dépendre d’un cache opaque.

## 10. Types de propriétés — P1/P2

Références : [S14](NOTION_REFERENCE.md#s14), [S19](NOTION_REFERENCE.md#s19).

- [ ] **FN-182** Titre et texte riche.
- [ ] **FN-183** Nombre et formats numériques, devise, pourcentage.
- [ ] **FN-184** Affichage numérique en nombre, barre ou anneau selon la référence.
- [ ] **FN-185** Sélection simple avec options ordonnées et colorées.
- [ ] **FN-186** Sélection multiple avec création et fusion d’options.
- [ ] **FN-187** Statut avec groupes et ordre des états.
- [ ] **FN-188** Date simple, intervalle, heure, fuseau et rappel.
- [ ] **FN-189** Case à cocher.
- [ ] **FN-190** URL, e-mail et téléphone avec action adaptée.
- [ ] **FN-191** Fichiers et médias multiples.
- [ ] **FN-192** Personne et groupe — nécessite le périmètre collaboration.
- [ ] **FN-193** Relation vers une ou plusieurs pages.
- [ ] **FN-194** Agrégation de propriétés liées (rollup).
- [ ] **FN-195** Formule typée.
- [ ] **FN-196** Date de création et de dernière modification automatiques.
- [ ] **FN-197** Créateur et dernier éditeur — nécessite identité/utilisateurs.
- [ ] **FN-198** Identifiant unique avec préfixe.
- [ ] **FN-199** Bouton de base de données.
- [ ] **FN-200** Lieu/adresse/coordonnées pour la vue carte.
- [ ] **FN-201** Valeurs vides, invalides, calculées et en lecture seule distinctes.

## 11. Vues de bases de données — P1/P2

Références : [S13](NOTION_REFERENCE.md#s13), [S20](NOTION_REFERENCE.md#s20), [S21](NOTION_REFERENCE.md#s21), [S22](NOTION_REFERENCE.md#s22), [S23](NOTION_REFERENCE.md#s23).

- [ ] **FN-202** Créer, nommer, dupliquer, réordonner et supprimer une vue.
- [ ] **FN-203** Vue tableau : colonnes redimensionnables, cellules éditables, pied de calcul.
- [ ] **FN-204** Vue tableau : visibilité des propriétés et retour à la ligne.
- [ ] **FN-205** Vue liste : propriétés affichées, icônes et densité.
- [ ] **FN-206** Vue Kanban : groupes, sous-groupes, colonnes vides et déplacement des cartes.
- [ ] **FN-207** Vue galerie : aperçu, taille des cartes, cadrage et propriétés.
- [ ] **FN-208** Vue calendrier : mois/semaine selon référence, création et déplacement d’événements.
- [ ] **FN-209** Vue chronologie : plages, échelles, regroupement et déplacement de dates.
- [ ] **FN-210** Vue graphique : barres, lignes, anneaux et variantes documentées.
- [ ] **FN-211** Graphiques : axes, agrégations, couleurs, légendes et export selon référence.
- [ ] **FN-212** Vue formulaire : construction et collecte des réponses.
- [ ] **FN-213** Vue fil : cartes empilées, contenu et réactions selon droits disponibles.
- [ ] **FN-214** Vue carte : propriété de lieu, marqueurs, regroupement et ouverture d’une entrée.
- [ ] **FN-215** Mode tableau de bord et composition de vues lorsque disponible dans la version retenue — à confirmer visuellement.
- [ ] **FN-216** Filtres simples par propriété et opérateur.
- [ ] **FN-217** Groupes de filtres imbriqués ET/OU.
- [ ] **FN-218** Tri multiple avec priorité et direction.
- [ ] **FN-219** Groupement et sous-groupement avec ordre manuel ou calculé.
- [ ] **FN-220** Masquer les groupes vides et déplier/replier les groupes.
- [ ] **FN-221** Rechercher uniquement dans la vue courante.
- [ ] **FN-222** Conserver les paramètres propres à chaque vue.
- [ ] **FN-223** Préremplir les valeurs d’une nouvelle entrée selon les filtres/groupes applicables.
- [ ] **FN-224** Afficher comptages, sommes, moyennes et agrégations compatibles.
- [ ] **FN-225** Gérer pagination/virtualisation et chargement des grandes bases.

## 12. Relations, formules et projets — P1/P2

Références : [S16](NOTION_REFERENCE.md#s16), [S17](NOTION_REFERENCE.md#s17), [S18](NOTION_REFERENCE.md#s18), [S24](NOTION_REFERENCE.md#s24).

- [ ] **FN-226** Relations unidirectionnelles et réciproques.
- [ ] **FN-227** Limiter la cardinalité et supprimer un lien sans supprimer les pages.
- [ ] **FN-228** Choisir les propriétés montrées dans le sélecteur de relation.
- [ ] **FN-229** Rollups : compte, somme, moyenne, minimum, maximum et dates selon type.
- [ ] **FN-230** Rendre explicites les relations cassées et les cycles de calcul.
- [ ] **FN-231** Éditeur de formule avec complétion, documentation et erreurs localisées.
- [ ] **FN-232** Types nombre, texte, booléen, date, liste, personne et page selon le langage cible.
- [ ] **FN-233** Opérateurs, conditions, fonctions de texte, nombres et dates.
- [ ] **FN-234** Fonctions sur listes et accès aux relations.
- [ ] **FN-235** Variables, fonctions de composition et formatage autorisés par le langage cible.
- [ ] **FN-236** Recalcul incrémental avec dépendances et détection de cycles.
- [ ] **FN-237** Compatibilité des résultats avec le langage Notion : corpus d’exemples à établir.
- [ ] **FN-238** Sous-éléments avec parent et enfants dans une base.
- [ ] **FN-239** Dépendances entre tâches et déplacement cohérent des échéances.
- [ ] **FN-240** Projets et tâches : statut, responsable, dates et progression.
- [ ] **FN-241** Sprints et vues de travail associées lorsqu’activés.
- [ ] **FN-242** Conserver l’intégrité des relations pendant un import/export.

## 13. Modèles, mises en page et wikis — P1/P2

Références : [S25](NOTION_REFERENCE.md#s25), [S26](NOTION_REFERENCE.md#s26), [S27](NOTION_REFERENCE.md#s27).

- [ ] **FN-243** Créer et modifier des modèles de pages de base de données.
- [ ] **FN-244** Préremplir propriétés, contenu, icône et couverture à partir d’un modèle.
- [ ] **FN-245** Choisir un modèle par défaut pour une base ou une vue.
- [ ] **FN-246** Appliquer un modèle à une page existante selon le comportement de référence.
- [ ] **FN-247** Configurer des modèles récurrents et éviter les créations en double.
- [ ] **FN-248** Gérer les mentions de dates contextuelles dans les modèles.
- [ ] **FN-249** Parcourir et dupliquer des modèles locaux.
- [ ] **FN-250** Importer un modèle partagé avec ses bases, relations et médias.
- [ ] **FN-251** Personnaliser la disposition des pages d’une base.
- [ ] **FN-252** Épingler des propriétés, créer des groupes et déplacer des éléments vers le panneau de détails.
- [ ] **FN-253** Appliquer une disposition aux pages concernées avec aperçu.
- [ ] **FN-254** Configurer l’affichage des commentaires et backlinks selon référence.
- [ ] **FN-255** Transformer un ensemble de pages en wiki.
- [ ] **FN-256** Définir des propriétaires de pages.
- [ ] **FN-257** Vérifier une page, définir une expiration et renouveler la vérification.
- [ ] **FN-258** Afficher badge de vérification dans recherche, mentions et pages.
- [ ] **FN-259** Parcourir les vues d’un wiki et les pages à actualiser.

## 14. Boutons, automations et formulaires — P2

Références : [S28](NOTION_REFERENCE.md#s28), [S29](NOTION_REFERENCE.md#s29), [S30](NOTION_REFERENCE.md#s30), [S20](NOTION_REFERENCE.md#s20).

- [ ] **FN-260** Créer un bouton dans une page et dans une propriété de base.
- [ ] **FN-261** Nommer le bouton, définir son icône et ordonner ses actions.
- [ ] **FN-262** Créer/éditer des pages et propriétés depuis un bouton.
- [ ] **FN-263** Ouvrir une page ou une URL depuis un bouton.
- [ ] **FN-264** Demander confirmation avant les actions configurées comme destructrices.
- [ ] **FN-265** Définir variables et expressions utilisées par les actions.
- [ ] **FN-266** Déclencher une automation à la création ou modification d’une entrée.
- [ ] **FN-267** Configurer conditions, périmètre et calendrier des déclencheurs disponibles.
- [ ] **FN-268** Exécuter les actions dans l’ordre et montrer l’historique d’exécution.
- [ ] **FN-269** Désactiver, dupliquer, modifier et tester une automation.
- [ ] **FN-270** Prévenir les boucles et documenter les différences entre boutons, modèles et automations.
- [ ] **FN-271** Afficher erreurs, droits manquants et actions partiellement exécutées.
- [ ] **FN-272** Appeler un webhook avec paramètres et résultat inspectable.
- [ ] **FN-273** Notifications, e-mail et Slack — différés avec les intégrations/collaboration.
- [ ] **FN-274** Créer un formulaire lié à une base et choisir les propriétés exposées.
- [ ] **FN-275** Configurer libellés, descriptions, champs requis et ordre des questions.
- [ ] **FN-276** Ajouter les règles conditionnelles proposées par la référence.
- [ ] **FN-277** Prévisualiser le formulaire et afficher les erreurs de validation.
- [ ] **FN-278** Collecter les réponses sans permettre l’accès aux autres données de la base.
- [ ] **FN-279** Configurer confirmation, anonymat, fermeture et partage selon les capacités retenues.

## 15. Import, export, corbeille et historique — P0/P1

Références : [S15](NOTION_REFERENCE.md#s15), [S31](NOTION_REFERENCE.md#s31), [S32](NOTION_REFERENCE.md#s32), [S33](NOTION_REFERENCE.md#s33).

- [ ] **FN-280** [PARTIEL] Importer un fichier Markdown et conserver son contenu et ses propriétés prises en charge.
- [ ] **FN-281** Importer plusieurs fichiers et un dossier avec pièces jointes et liens relatifs.
- [ ] **FN-282** Importer un export Notion ZIP : Markdown/CSV, hiérarchie, identifiants et médias.
- [ ] **FN-283** Importer texte brut, HTML, CSV, DOCX et PDF avec limites explicites.
- [ ] **FN-284** Importer depuis les outils pris en charge par Notion : établir une matrice par fournisseur.
- [ ] **FN-285** Afficher progression, erreurs par fichier, reprise et rapport d’import.
- [ ] **FN-286** Prévisualiser un import et gérer collisions de noms/identifiants.
- [ ] **FN-287** [PARTIEL] Exporter une page en Markdown ; compléter toutes les métadonnées.
- [ ] **FN-288** Exporter récursivement les sous-pages et médias.
- [ ] **FN-289** Exporter bases en CSV et schémas/relations dans un format documenté.
- [ ] **FN-290** Exporter en HTML et PDF avec une mise en page fidèle.
- [ ] **FN-291** Exporter l’ensemble d’un coffre de façon reproductible.
- [ ] **FN-292** Préserver les liens internes et les noms d’assets lors des exports.
- [ ] **FN-293** [PARTIEL] Mettre une page à la corbeille et la restaurer.
- [ ] **FN-294** Rechercher, filtrer et prévisualiser les éléments supprimés.
- [ ] **FN-295** Restaurer à l’emplacement d’origine ou choisir un nouvel emplacement.
- [ ] **FN-296** Définir la rétention et demander confirmation avant effacement définitif.
- [ ] **FN-297** [PARTIEL] Conserver les versions précédentes des fichiers.
- [ ] **FN-298** [PARTIEL] Parcourir et comparer les versions dans l’interface.
- [ ] **FN-299** [PARTIEL] Restaurer une version sans détruire la version courante.
- [ ] **FN-300** [PARTIEL] Distinguer historique d’édition, sauvegarde de fichier et historique de synchronisation.

## 16. Contrat Markdown et fiabilité locale — P0, adaptation Fotion

Critères propres à Fotion : exigences de fiabilité/recette proposées, pas fonctionnalités attribuées à Notion.

- [x] **FN-301** Écrire réellement les pages sur disque en .md, avec un en-tête YAML.
- [x] **FN-302** Préserver les propriétés YAML inconnues lors des sauvegardes testées.
- [x] **FN-303** Remplacer atomiquement un fichier lors d’une sauvegarde locale.
- [x] **FN-304** Détecter les modifications externes par version avant d’écraser un fichier.
- [x] **FN-305** Conserver une copie du contenu précédent dans .history.
- [ ] **FN-306** [PARTIEL] Sauvegarder automatiquement après la saisie et avant une navigation.
- [ ] **FN-307** [PARTIEL] Récupérer un brouillon navigateur après interruption.
- [ ] **FN-308** Fournir un écran de résolution de conflit : comparer, exporter, fusionner ou abandonner explicitement.
- [ ] **FN-309** Surveiller les modifications, renommages et suppressions effectués par Obsidian.
- [ ] **FN-310** Conserver espaces, échappements et constructions Markdown non supportées sans les réécrire silencieusement.
- [ ] **FN-311** Garantir l’aller-retour de chaque bloc avant de le déclarer disponible.
- [ ] **FN-312** Décider le format persistant des colonnes, blocs synchronisés et bases de données avant leur UI.
- [ ] **FN-313** Utiliser des fichiers d’assets locaux avec chemins relatifs et détection des orphelins.
- [ ] **FN-314** Choisir le coffre depuis l’interface ; couvrir absence, lecture seule et permissions.
- [ ] **FN-315** Prendre en charge les sous-dossiers physiques et liens internes du coffre.
- [ ] **FN-316** Faire migrer les métadonnées de façon réversible et versionnée.
- [ ] **FN-317** Empêcher deux instances locales d’écraser simultanément une page.
- [ ] **FN-318** Gérer disque plein, écriture interrompue et sauvegarde partielle de plusieurs fichiers.
- [ ] **FN-319** Synchroniser les états entre onglets sans perte de modifications.
- [ ] **FN-320** Définir une rétention maîtrisée pour .history et une restauration vérifiable.
- [ ] **FN-321** Ajouter une recherche indexée, des lectures à la demande et une limite mémoire mesurée.
- [ ] **FN-322** Mesurer démarrage, saisie, recherche et déplacement sur des coffres de référence.
- [x] **FN-323** Refuser chemins traversants, liens symboliques de fichiers et origines web étrangères dans les tests existants.
- [ ] **FN-324** Tester également dossiers symlinkés, Unicode, noms réservés et fichiers très volumineux.
- [ ] **FN-325** Ne jamais publier coffre, historique, jetons ou configuration privée dans Git.

## 17. Collaboration et partage — HORS PÉRIMÈTRE ACTUEL

Références : [S34](NOTION_REFERENCE.md#s34), [S35](NOTION_REFERENCE.md#s35), [S36](NOTION_REFERENCE.md#s36), [S37](NOTION_REFERENCE.md#s37).

- [ ] **FN-326** Coéditer un document avec convergence, reconnexion et résolution des conflits.
- [ ] **FN-327** Afficher présence, avatars, curseurs et sélections distantes.
- [ ] **FN-328** Commenter une page, un bloc ou une plage de texte.
- [ ] **FN-329** Répondre, modifier, supprimer, résoudre et rouvrir un fil.
- [ ] **FN-330** Mentionner des personnes et réagir avec des emoji.
- [ ] **FN-331** Suggérer des modifications et les accepter/refuser.
- [ ] **FN-332** Afficher la boîte de réception et les notifications lues/non lues.
- [ ] **FN-333** Configurer les abonnements aux pages et préférences de notification.
- [ ] **FN-334** Inviter des membres, invités et groupes.
- [ ] **FN-335** Définir lecture, commentaire, édition et contrôle complet.
- [ ] **FN-336** Distinguer édition du contenu d’une base et modification de sa structure.
- [ ] **FN-337** Appliquer héritage, droits explicites et règles d’accès aux entrées de base.
- [ ] **FN-338** Partager une page par lien et révoquer l’accès.
- [ ] **FN-339** Expliquer l’accès effectif, les demandes d’accès et les contenus restreints.
- [ ] **FN-340** Créer des espaces d’équipe ouverts, fermés et privés.
- [ ] **FN-341** Gérer membres, propriétaires, groupes et accès par défaut.
- [ ] **FN-342** Déplacer des pages entre espaces sans élargir les droits par erreur.
- [ ] **FN-343** Journaliser les opérations de partage sensibles.

## 18. Publication et Sites — DIFFÉRÉ

Références : [S38](NOTION_REFERENCE.md#s38).

- [ ] **FN-344** Publier/dépublier une page et choisir les sous-pages accessibles.
- [ ] **FN-345** Distinguer lien partagé et site publié.
- [ ] **FN-346** Configurer titre du site, favicon, navigation et apparence disponibles.
- [ ] **FN-347** Gérer URL, slug et domaine personnalisé.
- [ ] **FN-348** Configurer référencement, aperçu social et indexation.
- [ ] **FN-349** Autoriser/interdire duplication comme modèle selon les options retenues.
- [ ] **FN-350** Afficher les données et vues publiées sans exposer les éléments privés.
- [ ] **FN-351** Intégrer les outils de mesure disponibles avec consentement approprié.
- [ ] **FN-352** Prévisualiser mobile et bureau avant publication.
- [ ] **FN-353** Séparer les droits de publication des droits d’édition.

## 19. IA et agents — HORS PÉRIMÈTRE ACTUEL

Références : [S39](NOTION_REFERENCE.md#s39), [S40](NOTION_REFERENCE.md#s40), [S41](NOTION_REFERENCE.md#s41).

- [ ] **FN-354** Assistance rédactionnelle : génération, reformulation, correction et traduction.
- [ ] **FN-355** Résumer des pages, extraire des actions et expliquer un passage.
- [ ] **FN-356** Recherche et réponses fondées sur les sources accessibles, avec citations.
- [ ] **FN-357** Créer/modifier pages, bases et propriétés via l’agent dans les limites documentées.
- [ ] **FN-358** Remplir automatiquement les propriétés compatibles.
- [ ] **FN-359** Produire des notes de réunion : transcription, résumé et actions.
- [ ] **FN-360** Gérer conversations, historique, pièces jointes et contexte sélectionné.
- [ ] **FN-361** Configurer instructions et préférences de l’agent personnel.
- [ ] **FN-362** Créer des agents personnalisés avec instructions, outils et périmètre.
- [ ] **FN-363** Configurer déclencheurs, calendriers et exécutions en arrière-plan.
- [ ] **FN-364** Afficher exécutions, erreurs, approbations et résultats des agents.
- [ ] **FN-365** Connecter des sources externes sans dépasser les autorisations des utilisateurs.
- [ ] **FN-366** Gérer partage, ownership, quotas et contrôle administratif des agents.
- [ ] **FN-367** Identifier les actions IA, permettre leur annulation et contrôler les modifications proposées.
- [ ] **FN-368** Documenter données envoyées, rétention et disponibilité des fournisseurs.

## 20. API, connexions et écosystème — P2/DIFFÉRÉ

Références : [S42](NOTION_REFERENCE.md#s42), [S43](NOTION_REFERENCE.md#s43), [S44](NOTION_REFERENCE.md#s44), [S45](NOTION_REFERENCE.md#s45).

- [ ] **FN-369** API pages, blocs, bases/sources, propriétés, fichiers, utilisateurs et commentaires selon périmètre.
- [ ] **FN-370** Pagination, recherche, filtres, erreurs, limites de débit et versionnement.
- [ ] **FN-371** Authentification d’intégrations internes et OAuth pour intégrations publiques.
- [ ] **FN-372** Permissions minimales, révocation et sélection des pages accessibles.
- [ ] **FN-373** Webhooks d’événements signés, reprise, déduplication et journalisation.
- [ ] **FN-374** Import/export automatisé et documentation SDK TypeScript.
- [ ] **FN-375** Connexion aux services observés dans la référence : établir une matrice par fournisseur.
- [ ] **FN-376** Prévisualisations de liens et bases synchronisées de fournisseurs compatibles.
- [ ] **FN-377** Serveur MCP et autorisations des outils exposés.
- [ ] **FN-378** Web Clipper : URL, sélection, contenu et destination.
- [ ] **FN-379** Annuaire des intégrations et état connecté/expiré/déconnecté.
- [ ] **FN-380** Marketplace de modèles : recherche, aperçu, duplication et publication.
- [ ] **FN-381** Gestion des créateurs et modèles payants — hors objectif local gratuit.

## 21. Applications, mobilité et hors connexion — P2

Références : [S33](NOTION_REFERENCE.md#s33), [S46](NOTION_REFERENCE.md#s46), [S47](NOTION_REFERENCE.md#s47), [S48](NOTION_REFERENCE.md#s48).

- [ ] **FN-382** Application web responsive et comportement adapté aux petits écrans.
- [ ] **FN-383** Application de bureau avec raccourcis système, fenêtres et onglets.
- [ ] **FN-384** Application mobile avec partage système et capture rapide.
- [ ] **FN-385** Ouverture de liens profonds dans l’application appropriée.
- [ ] **FN-386** Téléchargement des pages pour usage hors connexion selon le modèle retenu.
- [ ] **FN-387** Indication des pages disponibles et contenus nécessitant un réseau.
- [ ] **FN-388** Éditions hors connexion et resynchronisation sans perte — différé avec le cloud.
- [ ] **FN-389** Notifications système et préférences par appareil — différé avec les rappels/collaboration.
- [ ] **FN-390** Mises à jour, migration des données et reprise après crash.
- [ ] **FN-391** Notion Calendar : catalogue séparé des comptes, calendriers, événements et intégration aux bases.
- [ ] **FN-392** Calendar : disponibilités, réservation, fuseaux et visioconférence — produit adjacent, non requis pour le clone d’éditeur.
- [ ] **FN-393** Notion Mail : catalogue séparé des boîtes, conversations, rédaction et organisation.
- [ ] **FN-394** Mail : vues, filtres, recherche, snippets et fonctions IA — produit adjacent, non requis actuellement.

## 22. Compte, administration et entreprise — HORS PÉRIMÈTRE ACTUEL

Références : [S49](NOTION_REFERENCE.md#s49), [S50](NOTION_REFERENCE.md#s50).

- [ ] **FN-395** Création de compte, connexion, déconnexion et récupération d’accès.
- [ ] **FN-396** Profil, avatar, préférences et suppression du compte.
- [ ] **FN-397** Multiples espaces, création, renommage et transfert de propriété.
- [ ] **FN-398** Membres, invités, groupes et invitations en attente.
- [ ] **FN-399** Plans, abonnement, factures, quotas et limites — inventaire de parité commerciale uniquement.
- [ ] **FN-400** SSO/SAML, provisionnement SCIM et gestion des domaines.
- [ ] **FN-401** Gestion des sessions, appareils et politiques de connexion.
- [ ] **FN-402** Restrictions de partage externe, export, publication et intégrations.
- [ ] **FN-403** Journal d’audit, recherche et export des événements.
- [ ] **FN-404** Rétention, restauration, suppression et exigences de résidence des données.
- [ ] **FN-405** Statistiques d’usage des pages et de l’espace, avec permissions adaptées.
- [ ] **FN-406** Contrôle des fonctions IA, connexions et agents.
- [ ] **FN-407** Gestion du départ d’un membre et réattribution de ses contenus.
- [ ] **FN-408** Centre d’administration multi-espaces selon le plan de référence.

## État initial et preuves

Les cases cochées s’appuient sur [le coffre Markdown](../server/storage/vault.ts), [le moteur de déplacement](../engine/operations/block-move.ts), [les tests du coffre](../tests/unit/vault.test.ts) et [les tests de déplacement](../tests/unit/moves.test.ts). Elles ne certifient pas la parité avec toutes les variantes de Notion.

À la création : **408 critères**, **10 cochés**, **55 partiels**. Ne pas présenter le ratio comme un pourcentage de parité : les critères ont des tailles et périmètres différents.

## Avancement — palette de texte

Les critères FN-048 à FN-050 disposent désormais d’une palette texte/fond, d’une dernière couleur persistée et de son raccourci Ctrl/Cmd + Maj + H, ainsi que d’une action pour retirer toutes les marques de la sélection. Les couleurs combinées aux autres marques sont conservées en Markdown avec des balises `span` documentées dans le README.

Preuves : [extension couleur](../engine/document/colors.ts), [tests de round-trip](../tests/unit/markdown.test.ts), [scénario DOM clavier et sauvegarde](../scripts/check-ui.mjs). La comparaison visuelle avec la référence, les états de sélection mixtes dans tous les blocs et la couleur de bloc complète restent à terminer ; ces critères restent partiels.

## Avancement — blocs de code

FN-072 : langage recherchable, coloration des 37 entrées communes Lowlight, copie avec états de réussite/échec, retour à la ligne et légende sont implémentés. Le langage inconnu importé est conservé. Les extraits contenant leurs propres clôtures Markdown ne tronquent plus la page à la sauvegarde.

Preuves : [extension de code](../engine/document/code-block.ts), [round-trips Markdown et HTML](../tests/unit/markdown.test.ts), [recette DOM des commandes et du presse-papiers](../scripts/check-ui.mjs). Référence : [blocs de code Notion](https://www.notion.com/help/code-blocks). Le catalogue complet des langages de la référence, le chargement des grammaires à la demande, les mesures de performance sur longs extraits et la validation visuelle restent ouverts. FN-072 et UI-156 restent partiels.

## Avancement — recherche et liens

Recherche accent-insensible sur plusieurs termes, classement titre/contenu/récence et extraits autour du résultat. Un cache en mémoire évite de réanalyser les documents inchangés. Le formulaire de lien propose les pages du coffre ; les chemins Markdown relatifs utilisent leurs identifiants stables. Navigation avec sauvegarde préalable, message pour une cible absente/à la corbeille et panneau de liens entrants.

Preuves : [index et résolution des liens](../engine/pages/page-index.ts), [tests de recherche et de backlinks](../tests/unit/page-index.test.ts), [round-trip des liens](../tests/unit/markdown.test.ts), [parcours DOM insertion → navigation → backlink → recherche](../scripts/check-ui.mjs). L’index utilise un parseur isolé, car l’éditeur enregistre ses propres tokenizers Markdown.

Restent notamment les menus @ et [[, les mentions au titre dynamique, les aperçus, les wikiliens, le surlignage des résultats, les filtres, les ancres, un index inversé et les mesures sur grands coffres. Aucun critère de parité UI n’est déclaré validé par ces seuls tests DOM.

## Avancement — mentions de pages

FN-129 et FN-132 : menus @ et [[, filtrage par titre, flèches/Entrée/Échap, mention atomique avec icône et titre actuel, état indisponible et lien Markdown portable marqué par le titre `fotion:page`. Le formulaire de lien conserve des liens ordinaires. Les nouveaux libellés de mentions sont reflétés à l’affichage et lors de la prochaine sauvegarde ; aucun historique d’édition n’est ajouté pour le seul rafraîchissement de l’affichage.

Preuves : [extension de mention](../engine/document/page-mention.ts), [triggers](../tests/unit/page-mention.test.ts), [Markdown/HTML et renommage](../tests/unit/markdown.test.ts), [parcours DOM](../scripts/check-ui.mjs). Restent la création depuis le sélecteur, l’aperçu, les mentions de date/personne, la pagination du sélecteur et la comparaison visuelle réelle.

## Avancement — historique et restauration

Liste des copies locales, aperçu en lecture seule, vue Markdown et restauration explicite. Les conflits avec le fichier courant, les sauvegardes corrompues, les liens symboliques et les versions d’une autre page sont refusés. La version remplacée est conservée ; la restauration reprend contenu/titre/présentation en conservant emplacement/favoris et métadonnées supplémentaires actuelles.

Preuves : [coffre et API](../server/storage/vault.ts), [tests disque et HTTP](../tests/unit/vault.test.ts), [interface d’historique](../ui/features/pages/components/VersionHistory.tsx), [parcours DOM avec conflit puis restauration](../scripts/check-ui.mjs). Référence : [historique Notion](https://www.notion.com/help/duplicate-delete-and-restore-content). Restent la comparaison des changements, le regroupement, les versions nommées, la pagination/rétention et la recette visuelle 1:1.

### Sommaire dynamique — 30 octobre 2026

FN-077 : bloc insérable depuis `/sommaire`, liste H1/H2/H3 actualisée après modification, ajout ou suppression ; navigation au clic et au clavier, destinations distinctes pour les titres identiques. Le marqueur HTML `<nav data-fotion-toc></nav>` conserve la présence du bloc dans le `.md` sans dupliquer les titres. Il requiert Fotion pour produire la liste dynamique.

Preuves : [extension du sommaire](../engine/document/table-of-contents.ts), [round-trip Markdown/HTML et édition des titres](../tests/unit/markdown.test.ts), [parcours navigateur insertion, navigation, renommage, annulation et rechargement](../tests/e2e/editor.spec.ts). Référence : [sommaire Notion](https://www.notion.com/help/columns-headings-and-dividers). UI-159 reste partiel : ni suivi de section active au défilement ni comparaison visuelle 1:1 validés.

### Titres dépliants — 30 octobre 2026

FN-071 : insertion de H1/H2/H3 dépliants par le menu slash, niveaux et texte riche conservés en Markdown/HTML, corps imbriqué, navigation depuis le sommaire, recherche et backlinks. Le repli du bloc `details` ne déclenche plus sa reconstruction par ProseMirror ; ce correctif bénéficie également aux listes dépliantes. Entrée dans le résumé ouvre le contenu avant d'y placer le curseur.

Preuves : [blocs dépliants](../engine/document/blocks.ts), [round-trips](../tests/unit/markdown.test.ts), [index des liens](../tests/unit/page-index.test.ts), [recette Chrome avec sauvegarde et rechargement](../tests/e2e/editor.spec.ts). Référence : [titres dépliants Notion](https://www.notion.com/help/columns-headings-and-dividers). La conversion de blocs existants, les raccourcis Markdown et la comparaison visuelle 1:1 restent ouverts sous FN-056/FN-058 et la checklist UI.

### Conversion des dépliants — 30 octobre 2026

FN-056 progresse : paragraphe/titre vers dépliant, changement de niveau H1/H2/H3 ou liste dépliante, puis retour vers texte/titre. Le contenu riche est conservé et les blocs du corps sont réinsérés après le titre lors de la conversion inverse. Les destinations interdites par le schéma du parent sont refusées ; les conversions non prises en charge depuis un dépliant sont désactivées avec une explication. Les conversions groupées et les autres couples de blocs restent à compléter.

Preuves : [transaction de conversion](../engine/operations/toggle-conversion.ts), [tests de conservation et annulation](../tests/unit/toggle-conversion.test.ts), [menu réel et réouverture Chrome](../tests/e2e/editor.spec.ts).

### Personnalisation des encadrés — 30 octobre 2026

FN-069 progresse : sélection d'emoji, icône textuelle personnalisée ou suppression, couleurs du texte et du fond via le menu de bloc. Les réglages sont conservés dans un commentaire de métadonnées après `[!NOTE]`. Le Markdown standard reste inchangé pour un encadré par défaut. Le contenu imbriqué et ses marques survivent à la sérialisation Markdown et HTML, sans inclure le texte des commandes ni dupliquer l'icône. Une modification d'icône ou de couleur ouvre une étape d'annulation distincte.

Preuves : [extension dédiée](../engine/document/callout.ts), [round-trips et annulation](../tests/unit/markdown.test.ts), [personnalisation et réouverture Chrome](../tests/e2e/editor.spec.ts). Référence : [personnaliser les encadrés Notion](https://www.notion.com/help/customize-and-style-your-content). FN-069 reste partiel pour les conversions et les variantes d'icônes/images. La galerie proposée est limitée ; elle ne constitue pas le catalogue de Notion ni une validation visuelle 1:1.

### Coloration différée — 30 octobre 2026

FN-072 : les 37 grammaires communes sont désormais téléchargées au premier besoin, sans transaction de document. Le texte reste éditable en cas d'échec du téléchargement. Les nœuds inchangés réutilisent leurs plages colorées. Voir [mesures et preuves](PERFORMANCE.md). Le catalogue élargi, le chargement par langage et les budgets de latence sur gros documents restent ouverts.

### Tableaux simples — 30 octobre 2026

FN-074 progresse : redimensionnement de colonnes au pointeur, ligne et colonne d'en-tête configurables, sélection de cellules visible. Les tableaux représentables sans perte restent en Markdown GFM ; largeurs, en-têtes particuliers, cellules fusionnées ou contenu riche utilisent un tableau HTML marqué `data-fotion-table` dans le `.md`. Les retours de ligne sont encodés en entités pour éviter la coupure du bloc HTML. Le texte et les liens de ces tableaux sont indexés pour la recherche et les backlinks.

Preuves : [format de tableau](../engine/document/table.ts), [round-trips](../tests/unit/markdown.test.ts), [indexation](../tests/unit/page-index.test.ts), [redimensionnement et réouverture Chrome](../tests/e2e/editor.spec.ts). Restent les menus de lignes/colonnes conformes à la référence, leur réorganisation et la recette complète des sélections multiples. Les rendus HTML des lecteurs externes peuvent différer.

## Avancement — URL, verrouillage, raccourcis et compteur

FN-012 : chaque page ouverte s’affiche à l’adresse `#<identifiant>` ; un rechargement ou un lien collé rouvre cette page, et un lien vers une page absente ou à la corbeille le signale. FN-013 : « Copier le lien » dans le menu de page et le menu contextuel de la barre latérale ; le contexte de navigation (position, bloc) n’est pas encore conservé.

FN-019 : « Verrouiller la page » enregistre `locked: true` dans l’en-tête YAML, rend le contenu, le titre, l’icône et la couverture non modifiables et masque les poignées de blocs. Le badge « Verrouillée » de la barre supérieure déverrouille la page. Le verrou protège contre les modifications accidentelles dans Fotion, pas contre l’édition du fichier sur le disque.

FN-058 : raccourcis propres à Notion `> ` → liste dépliante (le texte existant devient le résumé) et `" ` → citation. Les autres raccourcis Markdown viennent de Tiptap ; leur inventaire complet face à la référence reste à faire. FN-061 : nombre de mots de la page dans le pied du menu de page, selon la segmentation `Intl` ; le compteur de caractères et le comptage d’une sélection restent à faire.

Preuves : [raccourcis](../engine/document/shortcuts.ts), [tests du moteur](../tests/unit/engine.test.ts), [scénario navigateur URL et verrouillage](../tests/e2e/editor.spec.ts).

## Avancement — menu /

FN-052, FN-053 : le menu / reprend la présentation de Notion : groupes « Blocs de base », « Médias », « Avancés » ; lignes compactes avec icône, libellé et raccourci Markdown à droite ; aperçu du bloc à côté du menu ; pied « Fermer le menu · échap » ; ouverture au-dessus du curseur en bas d’écran. Le catalogue, la détection et le classement vivent dans le moteur ([commandes /](../engine/operations/slash-commands.ts)) : `/` s’ouvre en début de bloc ou après une espace, dans tout bloc de texte hors code ; recherche sans accents sur le libellé et des alias français/anglais (`h1`, `todo`, `bullet`…), avec correspondance approximative ; Échap laisse le texte et garde le menu fermé pendant la saisie ; une requête sans résultat suivie d’une espace ferme le menu. Une commande tapée après du texte crée le bloc en dessous au lieu de convertir la ligne.

Restent : commandes récentes (FN-054), actions de bloc (couleur, suppression, déplacement) dans / (FN-059), illustrations d’aperçu identiques à la référence et blocs absents du catalogue (vidéo, fichier, signet, équation, colonnes, bloc synchronisé…). Preuves : [tests du moteur](../tests/unit/engine.test.ts), [scénario navigateur](../tests/e2e/editor.spec.ts).

## Avancement — corbeille, recherche, icônes, sections

- FN-023 (partiel) : corbeille avec recherche, chemin parent, restauration et suppression définitive confirmée. Le serveur refuse de supprimer une page hors corbeille ou modifiée sur le disque, et garde une copie dans `.history/` ([tests du coffre](../tests/unit/vault.test.ts)). Le comportement des descendants d’une page supprimée reste à définir : ils réapparaissent à la racine.
- FN-140 (partiel) : filtre « Titres uniquement ». FN-145 (partiel) : pages récentes groupées par date et message de résultat vide ; recherches récentes et suggestions restent à faire.
- FN-148 (partiel) : emojis nommés en français (CLDR), aléatoire, récents, suppression ; images importées, URL et icônes monochromes restent à faire.
- Barre latérale : tri, nombre de pages affichées, ordre des sections, repli et panneau « Plus » ([section](../ui/features/sidebar/components/SidebarSection.tsx)).

