# Le Japon frappé par le feu atomique

## À propos du projet

Ce projet est une application web interactive présentant l'impact des bombardements atomiques d'Hiroshima et Nagasaki lors de la Seconde Guerre mondiale, avec une perspective contemporaine incluant une simulation sur la ville de Rennes. Développé par l'équipe du Master SIGAT (Université Rennes 2) en partenariat avec Ouest-France, ce récit journalistique cartographique vous plonge dans cette page sombre de l'histoire, 80 ans après les événements.

![MAKARTO](https://github.com/user-attachments/assets/f79ae023-1489-4342-b5cc-17c4bafa91b4)


## Fonctionnalités principales

- **Cartographie interactive** des zones impactées à Hiroshima et Nagasaki
- **Frise chronologique** des événements majeurs du conflit du Pacifique
- **Infographies comparatives** des bombes "Little Boy" et "Fat Man"
- **Simulation** de l'impact de la bombe atomique sur la ville de Rennes
- **Scrollytelling immersif** avec défilement fluide entre les sections

## Technologies utilisées

- **MapLibre GL JS** : bibliothèque de cartographie interactive
- **Scrollama** : bibliothèque de scrollytelling
- **HTML5/CSS3** : structure et mise en forme
- **JavaScript** : interactivité et animations
- **CARTO Vector Tiles** : fond de carte

## Structure du projet

```
/
├── index.html          # Structure HTML principale
├── style.css           # Feuille de style
├── script.js           # Logique JavaScript
├── assets/
│   ├── carte_pacifique/
│   │   └── pacific_ok.png
│   ├── hiroshima/
│   │   ├── h_total_detruit.geojson  # Zones détruites
│   │   ├── h_partiel_detruit.geojson
│   │   └── h_sauve.geojson
│   ├── infographies/
│   │   ├── littleboy_hiroshima.png
│   │   ├── fatman_nagasaki.png
│   │   └── deux_bombes.png
│   ├── logo/
│   │   ├── logo_sigat.svg
│   │   └── logo_ouest_france.svg
│   ├── nagasaki/
│   │   ├── n_total_detruit.geojson
│   │   ├── n_partiel_detruit.geojson
│   │   └── n_sauve.geojson
│   ├── POI/
│   │   └── POI.geojson           # Points d'intérêt
│   ├── rennes/
│   │   ├── tampon_1km6_4326.geojson  # Simulation
│   │   └── tampon_3km_4326.geojson
│   └── timeline/
│       ├── PEARLHARBOR.webp
│       ├── MIDWAY.webp
│       ├── IWO.webp
│       ├── OKINAWA.webp
│       └── TRINIT.webp
```

## Installation et déploiement

### Prérequis

- Un serveur web local ou distant
- Un navigateur web moderne (Chrome, Firefox, Safari, Edge)

### Installation locale

1. Clonez ou téléchargez ce dépôt
2. Placez les fichiers sur votre serveur web local
3. Accédez au projet via `http://localhost/votre-dossier`

### Déploiement en ligne

1. Téléchargez tous les fichiers sur votre serveur web
2. Assurez-vous que les droits d'accès sont correctement configurés
3. Accédez à votre site via l'URL configurée

## Navigateurs supportés

- Google Chrome (dernières versions)
- Mozilla Firefox (dernières versions)
- Safari (dernières versions)
- Microsoft Edge (dernières versions)

## Méthodologie et sources

Les cartographies présentées sont basées sur une numérisation de documents cartographiques produits par l'armée américaine pendant et après la Seconde Guerre mondiale. Ces cartes historiques, qui documentent les destructions, sont superposées à un fond de carte actuel pour mettre en évidence les transformations urbaines survenues au cours des 80 dernières années.

Une bibliographie complète est disponible dans l'application, incluant des ouvrages historiques, des documents scientifiques et des sources cartographiques de référence.

## Contributeurs

Ce projet a été développé par :
- [KEVIN LU CONG SANG](https://www.linkedin.com/in/kevin-lu-cong-sang-2b048529b)
- [ROMAIN GUILLOUX](https://www.linkedin.com/in/romain-guillou-b4489015b)
- [THOMAS LEMOIGNE](https://www.linkedin.com/in/thomas-lemoigne-650036293/)
- [THEO FONTA](https://www.linkedin.com/in/th%C3%A9o-fonta-8b6958208)
- [MARTIN MAINGUY](https://www.linkedin.com/in/martin-mainguy-39852a2a7)
- [AUREL OHIER](https://www.linkedin.com/in/aurel-ohier-8816a7330)

## Licences et crédits

- Données géospatiales - © SIGAT
- Fond de carte - © [CARTO](https://carto.com/)
- Contributeurs © [OpenStreetMap](https://www.openstreetmap.org/copyright)
- Bibliothèques JavaScript :
  - [MapLibre](https://maplibre.org/) (licence MIT)
  - [Scrollama](https://github.com/russellsamora/scrollama) (licence MIT)

© 2025 MASTER SIGAT - Université Rennes 2 en partenariat avec Ouest-France. Tous droits réservés.

## Contact

Pour toute question ou demande concernant ce projet, veuillez contacter les contributeurs.
