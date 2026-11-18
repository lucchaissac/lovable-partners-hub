# 1,000 opportunities · Lovable Community

Export autonome de la démo validée :
https://lovable-brands.vercel.app/1000-opportunities

## Importer dans Lovable

Depuis le dashboard Lovable : **+ → Import project to Lovable → Upload code**.
Dépose le ZIP, puis clique sur **Start import**. Utilise ensuite le texte de
`lovable-remix-prompt.txt` pour demander une reprise fidèle.

Guide officiel consulté le 18 novembre 2026 :
https://docs.lovable.dev/features/projects/import-project

Lovable reconstruit les projets importés sur sa propre stack : le ZIP fournit
le code et tous les assets, et les captures dans `references/` servent à vérifier
le résultat. L'import dans ton compte Lovable n'a pas été exécuté par cet export.

## Ce qui est inclus

- Page complète, responsive, accessible à la racine `/`.
- Camera Plain locale, logos originaux, portrait et identité Socratyc.
- Véritable globe Three.js, données géographiques et dépendances locales.
- Glow SVG Figma en deux plans, globe entre les deux.
- Arrivée sur San Francisco, cœur ancré avec rotation/scale, pulsations et ondes.
- Mouvement réversible au scroll, ancres douces et navigation active.
- Filtres, détails d'ateliers et formulaire de démonstration.
- `noindex, nofollow` dans le HTML et dans la configuration Vercel.

Aucun backend, base de données, compte utilisateur ou variable d'environnement
n'est nécessaire. Le formulaire ne transmet et ne sauvegarde rien. Les liens
des ateliers renvoient toujours à l'initiative d'origine.

## Lancer le projet

Avec Node.js 22.12 ou plus récent :

```sh
npm ci
npm run dev
```

Pour vérifier le build : `npm run build`, puis `npm run preview`.
Ouvre la page via le serveur HTTP ; un double-clic sur `index.html` ne suffit
pas pour charger les modules et le globe.

## Où modifier

- `index.html` : texte et structure de la page.
- `src/demos/opportunities.css` : mise en page, typographie et responsive.
- `shared/hubTheme.css` : police et tokens de couleur.
- `src/demos/opportunities.js` : ateliers, interactions et progression du scroll.
- `src/demos/opportunitiesGlobe.js` : adaptateur du globe.
- `src/demos/locations.js` : coordonnées des villes.
- `public/ambassadors/scene/community-intro.mjs` : animation du cœur et des ondes.
- `public/ambassadors/scene/globe.js` : moteur Three.js original.
- `public/demos/1000-opportunities/heart-glow-*.svg` : glow vectoriel.

Le renderer reste dans une iframe de même origine, servie depuis `public/`.
Conserve ses chemins relatifs, son import map et le bridge de messages.
Le globe et les images ne dépendent pas du site Vercel d'origine.

Les seuls liens externes du parcours public sont ceux vers l'initiative
d'origine et Lovable Community. Les outils historiques du renderer contiennent
aussi un géocodeur et un export vidéo local, inactifs dans cette page.

## Métadonnées

Le canonical de l'ancien domaine a été retiré pour ne pas attribuer ton remix
au site d'origine. Garde `noindex` pendant la démo et adapte le canonical au
domaine choisi lorsque tu le souhaites.

`export-manifest.json` indique le commit source et les empreintes des fichiers.
Les licences des bibliothèques sont dans `licenses/`. Les marques, photos et
polices conservent leurs droits d'origine.
