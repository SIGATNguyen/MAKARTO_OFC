/**
 * script.js - Application de cartographie interactive des bombardements atomiques
 * Développé par l'équipe M2 SIGAT - Université Rennes 2
 * 
 * Ce script gère l'affichage interactif des cartes et le scrollytelling 
 * permettant de visualiser les impacts des bombardements atomiques
 * d'Hiroshima et Nagasaki, ainsi qu'une simulation sur Rennes.
 * 
 * LU CONG SANG Kévin.
 */

// ======= UTILITAIRES ET DÉTECTION D'ENVIRONNEMENT =======

/**
 * Détecte si l'utilisateur est sur un appareil mobile
 * @returns {boolean} - true si la largeur d'écran est ≤ 768px
 */
function isMobile() {
  return window.innerWidth <= 768;
}

// Variable pour suivre la dernière largeur de fenêtre
let lastWidth = window.innerWidth;

/**
 * Optimise les appels de callback en utilisant requestAnimationFrame
 * @param {Function} callback - La fonction à optimiser
 * @returns {Function} - La fonction optimisée
 */
function throttleRAF(callback) {
  let ticking = false;
  return function(...args) {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        callback.apply(this, args);
        ticking = false;
      });
      ticking = true;
    }
  };
}

/**
 * Retarde l'exécution d'une fonction jusqu'à ce que l'utilisateur ait cessé d'interagir
 * @param {Function} func - La fonction à exécuter
 * @param {number} wait - Délai d'attente en ms
 * @returns {Function} - La fonction avec délai
 */
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// ======= GESTION DU REDIMENSIONNEMENT =======

/**
 * Gère le redimensionnement de la fenêtre et adapte l'interface
 */
function handleResize() {
  const width = window.innerWidth;
  const wasMobile = lastWidth <= 768;
  const isMobileNow = width <= 768;
  
  // Si on passe de mobile à desktop ou vice versa, recharger la page
  if (wasMobile !== isMobileNow) {
    window.location.reload();
    return;
  }
  
  // Réinitialise le scrollytelling à chaque redimensionnement significatif
  if (scroller && Math.abs(window.innerWidth - lastWidth) > 50) {
    scroller.resize();
    lastWidth = window.innerWidth;
  }
}

// ======= SYSTÈME DE CHARGEMENT =======

document.addEventListener('DOMContentLoaded', function() {
  const loadingIndicator = document.getElementById('loading-indicator');
  
  // Force la fermeture du loader après 3 secondes maximum
  setTimeout(() => {
    if (loadingIndicator) {
      loadingIndicator.classList.add('hidden');
      startIntroAnimations();
    }
  }, 3000);
});

// ======= INITIALISATION MAPLIBRE =======

// Déclaration de la variable map globalement pour y accéder depuis toutes les fonctions
var map = new maplibregl.Map({
  container: 'map',
  style: 'https://basemaps.cartocdn.com/gl/positron-nolabels-gl-style/style.json',
  center: [132.49859, 34.38477], // Coordonnées initiales (Hiroshima)
  zoom: 12.5,
  pitch: 0,
  bearing: 0,
  fadeDuration: 0,
  attributionControl: false,
  // Optimisations pour les performances
  antialias: false,
  preserveDrawingBuffer: false
});

// Popup pour les points d'intérêt
const poiPopup = new maplibregl.Popup({
  closeButton: false,
  closeOnClick: false,
  offset: [0, -10],
  className: 'poi-popup'
});

// Gestion des erreurs de la carte
map.on('error', function(e) {
  console.error('Erreur MapLibre:', e);
  document.getElementById('loading-indicator').classList.add('hidden');
  startIntroAnimations();
});

/**
 * Configuration des couches cartographiques
 * Cette fonction est appelée une fois que la carte est chargée
 */
map.on('load', function() {
  console.log("Carte chargée avec succès");
  
  // Masquer le loader une fois la carte chargée
  const loadingIndicator = document.getElementById('loading-indicator');
  if (loadingIndicator) {
    loadingIndicator.classList.add('hidden');
  }
  
  // Démarrer les animations
  startIntroAnimations();

  // Ajouter le contrôle d'échelle
  map.addControl(new maplibregl.ScaleControl({
    maxWidth: 100,
    unit: 'metric'
  }), 'bottom-left');
  
  /**
   * Ajoute une couche à la carte
   * @param {string} id - Identifiant de la couche
   * @param {string} url - URL du fichier GeoJSON
   * @param {string} color - Couleur à appliquer (format CSS)
   * @param {number} opacity - Opacité de la couche (0-1)
   */
  function addMapLayer(id, url, color, opacity = 0.8) {
    try {
      map.addSource(id, {
        type: 'geojson',
        data: url
      });
      
      map.addLayer({
        id: id + '_layer',
        type: 'fill',
        source: id,
        paint: {
          'fill-color': color,
          'fill-opacity': opacity,
          'fill-outline-color': 'rgba(0, 0, 0, 0.2)'
        },
        layout: {
          // Par défaut les couches sont créées visibles
          'visibility': 'visible'
        }
      });
      
      console.log(`Couche ${id} ajoutée avec succès`);
    } catch (error) {
      console.error(`Erreur lors de l'ajout de la couche ${id}:`, error);
    }
  }
  
  // --- Ajout des couches pour Hiroshima ---
  addMapLayer('hiroshima_detruit', 
    './assets/hiroshima/h_total_detruit.geojson', 
    '#af0d1d');
  
  addMapLayer('hiroshima_moinsdetruit', 
    './assets/hiroshima/h_partiel_detruit.geojson', 
    '#ea504c');
  
  addMapLayer('hiroshima_sauve', 
    './assets/hiroshima/h_sauve.geojson', 
    '#f39c9e');

  // --- Ajout des couches pour Nagasaki ---
  addMapLayer('nagasaki_detruit', 
    './assets/nagasaki/n_total_detruit.geojson', 
    '#af0d1d');
  
  addMapLayer('nagasaki_feu', 
    './assets/nagasaki/n_partiel_detruit.geojson', 
    '#ea504c');
  
  addMapLayer('nagasaki_sauve', 
    './assets/nagasaki/n_sauve.geojson', 
    '#f39c9e');
    
  // --- Ajout des couches pour Rennes (simulation) ---
  addMapLayer('rennes_detruit', 
    './assets/rennes/tampon_1km6_4326.geojson', 
    '#af0d1d');
  
  addMapLayer('rennes_partiel', 
    './assets/rennes/tampon_3km_4326.geojson', 
    '#ea504c');

  // Ajout des points d'intérêt
  addPointsOfInterest();

  // Par défaut, on cache toutes les couches jusqu'à l'arrivée à la section correspondante
  const allLayers = [
    'hiroshima_detruit_layer', 'hiroshima_moinsdetruit_layer', 'hiroshima_sauve_layer',
    'nagasaki_detruit_layer', 'nagasaki_feu_layer', 'nagasaki_sauve_layer',
    'rennes_detruit_layer', 'rennes_partiel_layer', 'rennes_radius_layer',
    'poi_points', 'poi_labels'
  ];
  
  allLayers.forEach(layer => {
    if (map.getLayer(layer)) {
      map.setLayoutProperty(layer, 'visibility', 'none');
    }
  });

  // Configuration des boutons toggle pour la légende
  setupAllToggles();
  
  // Initialisation de la section courante avec un court délai
  setTimeout(() => {
    const currentSection = getCurrentSection();
    if (currentSection) {
      console.log("Section initiale détectée:", currentSection.id);
      handleStepEnter({ element: currentSection });
    }
  }, 500);
});

/**
 * Ajoute les points d'intérêt à la carte
 * Ces points marquent les lieux spécifiques dans chaque ville
 */
function addPointsOfInterest() {
  try {
    // Ajouter la source de données pour les points d'intérêt
    map.addSource('poi_source', {
      type: 'geojson',
      data: './assets/POI/POI.geojson'
    });
    
    // Ajouter une couche pour les points
    map.addLayer({
      id: 'poi_points',
      type: 'circle',
      source: 'poi_source',
      paint: {
        'circle-radius': 6,
        'circle-color': '#AF0D1D',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#FFFFFF',
        'circle-opacity': 0.8
      },
      layout: {
        'visibility': 'visible'
      }
    });
    
    // Ajouter une couche pour les labels des points
    map.addLayer({
      id: 'poi_labels',
      type: 'symbol',
      source: 'poi_source',
      layout: {
        'text-field': ['get', 'nom'],
        'text-font': ['Open Sans Bold'],
        'text-size': [
          'step',
          ['zoom'], 
          0,    // Invisible aux petits zoom
          10, 8,
          12, 12,
          14, 13
        ],
        'text-offset': [0, -1.5],
        'text-anchor': 'bottom',
        'visibility': 'visible',
        'text-allow-overlap': false,
        'text-ignore-placement': false,
        'text-variable-anchor': [
          'bottom',
          'bottom-left',
          'bottom-right',
          'top',
          'left',
          'right'
        ],
        'text-radial-offset': 0.5,
        'text-justify': 'center',
        'text-optional': true
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': '#000000',
        'text-halo-width': 1,
        'text-halo-blur': 0.2,
      }
    });
    
    console.log("Points d'intérêt ajoutés avec succès");
    
  } catch (error) {
    console.error("Erreur lors de l'ajout des points d'intérêt:", error);
  }
}

// ======= LÉGENDE INTERACTIVE =======

/**
 * Configure tous les boutons de légende pour toutes les villes
 */
function setupAllToggles() {
  // Hiroshima toggles
  setupToggle('toggle-destroyed-fixed');
  setupToggle('toggle-lessdestroyed-fixed');
  setupToggle('toggle-sauve-fixed');
  setupTogglePoints('toggle-poi-hiro-fixed');
  
  // Nagasaki toggles
  setupToggle('toggle-naga-detruit-fixed');
  setupToggle('toggle-naga-feu-fixed');
  setupToggle('toggle-naga-sauve-fixed');
  setupTogglePoints('toggle-poi-naga-fixed');
  
  // Rennes toggles
  setupToggle('toggle-rennes-detruit-fixed');
  setupToggle('toggle-rennes-partiel-fixed');
  setupTogglePoints('toggle-poi-rennes-fixed');
  
  // Toggle global pour les points d'intérêt
  setupTogglePoints('toggle-poi-fixed');
  
  console.log("Tous les boutons de légende ont été configurés");
}

/**
 * Configure un bouton toggle pour les couches de la carte
 * @param {string} btnId - ID du bouton dans le DOM
 */
function setupToggle(btnId) {
  const btn = document.getElementById(btnId);
  if (!btn) {
    console.warn(`Bouton ${btnId} non trouvé`);
    return;
  }
  
  console.log(`Bouton de légende configuré: ${btnId}`);
  
  btn.addEventListener('click', function() {
    const layer = btn.getAttribute('data-layer');
    const isActive = btn.classList.contains('active');
    
    console.log(`Toggle clicked: ${btnId} for layer ${layer}, currently active: ${isActive}`);
    
    try {
      if (map.getLayer(layer)) {
        // Basculer la visibilité
        const newVisibility = isActive ? 'none' : 'visible';
        map.setLayoutProperty(layer, 'visibility', newVisibility);
        
        // Mettre à jour l'apparence du bouton
        if (isActive) {
          btn.classList.remove('active');
          btn.classList.add('inactive');
          btn.style.opacity = '0.5';
        } else {
          btn.classList.add('active');
          btn.classList.remove('inactive');
          btn.style.opacity = '1';
        }
        
        console.log(`Visibilité de ${layer} définie à ${newVisibility}`);
      } else {
        console.warn(`Couche ${layer} non trouvée`);
      }
    } catch (error) {
      console.error(`Erreur lors du toggle de ${layer}:`, error);
    }
  });
}

/**
 * Configure un bouton toggle spécifiquement pour les points d'intérêt
 * @param {string} btnId - ID du bouton dans le DOM
 */
function setupTogglePoints(btnId) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.addEventListener('click', () => {
    const vis = map.getLayoutProperty('poi_points', 'visibility');
    const newVis = (vis === 'visible') ? 'none' : 'visible';
    map.setLayoutProperty('poi_points', 'visibility', newVis);
    map.setLayoutProperty('poi_labels', 'visibility', newVis);
    btn.classList.toggle('active');
    btn.classList.toggle('inactive');
  });
}

// ======= ANIMATION DE L'INTRO =======

/**
 * Démarre les animations d'introduction de la page
 */
function startIntroAnimations() {
  console.log("Démarrage des animations");
  
  // Animation des éléments fade-in
  const fadeElements = document.querySelectorAll('.fade-in');
  
  const fadeObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.2 });
  
  fadeElements.forEach(elem => {
    fadeObserver.observe(elem);
  });
  
  // Initialiser le scrollytelling
  initScrollytelling();
}

// ======= SCROLLYTELLING =======

// Variable globale pour le scrollytelling
var scroller = scrollama();
// Garder une trace de la section actuelle pour gérer les légendes
var currentSection = "";

/**
 * Obtient la section actuellement visible à l'écran
 * @returns {Element|null} - L'élément DOM de la section visible ou null
 */
function getCurrentSection() {
  if (isMobile()) {
    // Méthode pour mobile utilisant le scrollY de window
    const sections = document.querySelectorAll('.step');
    const scrollPosition = window.scrollY + window.innerHeight / 2;
    
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const rect = section.getBoundingClientRect();
      const sectionTop = window.scrollY + rect.top;
      const sectionBottom = sectionTop + rect.height;
      
      if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
        return section;
      }
    }
  } else {
    // Méthode pour desktop
    const sections = document.querySelectorAll('.step');
    const scrollContainer = document.getElementById('scroll-container');
    const scrollPosition = scrollContainer.scrollTop + window.innerHeight / 2;
    
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const sectionTop = section.offsetTop;
      const sectionBottom = sectionTop + section.offsetHeight;
      
      if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
        return section;
      }
    }
  }
  
  return null;
}

/**
 * Trouve la section suivante dans le flux de scrollytelling
 * @param {string} currentId - ID de la section actuelle
 * @returns {string|null} - ID de la section suivante ou null
 */
function getNextSection(currentId) {
  const sections = document.querySelectorAll('.step');
  let foundCurrent = false;
  
  for (let i = 0; i < sections.length; i++) {
    if (foundCurrent) {
      return sections[i].id;
    }
    if (sections[i].id === currentId) {
      foundCurrent = true;
    }
  }
  
  return null;
}

/**
 * Trouve la section précédente dans le flux de scrollytelling
 * @param {string} currentId - ID de la section actuelle
 * @returns {string|null} - ID de la section précédente ou null
 */
function getPreviousSection(currentId) {
  const sections = document.querySelectorAll('.step');
  
  for (let i = 1; i < sections.length; i++) {
    if (sections[i].id === currentId) {
      return sections[i-1].id;
    }
  }
  
  return null;
}

/**
 * Gère l'entrée dans une nouvelle section du scrollytelling
 * Configure la carte et les légendes en fonction de la section
 * @param {Object} response - Objet contenant l'élément entré
 */
function handleStepEnter(response) {
  const id = response.element.id;
  console.log(`Navigation vers la section: ${id}`);
  
  // Mémoriser la section actuelle
  currentSection = id;
  
  // Masquer les légendes par défaut
  const legendHiroshima = document.getElementById("legend-hiroshima");
  const legendNagasaki = document.getElementById("legend-nagasaki");
  const legendRennes = document.getElementById("legend-rennes");
  
  if (legendHiroshima) legendHiroshima.style.display = "none";
  if (legendNagasaki) legendNagasaki.style.display = "none";
  if (legendRennes) legendRennes.style.display = "none";
  
  // Configuration spécifique par section
  try {
    switch(id) {
      case "intro":
        map.flyTo({ center: [132.49859, 34.38477], zoom: 12.5, duration: 1500 });
        hideAllLayers();
        break;

      case "pacific-combined":
        map.flyTo({ center: [160, 0], zoom: 3, duration: 1500 });
        hideAllLayers();
        break;
      
      case "timeline":
        map.flyTo({ center: [135.5, 35.0], zoom: 6, duration: 1500 });
        hideAllLayers();
        break;
      
      case "lorem-section":
        map.flyTo({ center: [137.40184, 36.39750], zoom: 5, duration: 1500 });
        hideAllLayers();
        break;
      
      case "hiroshima":
        map.flyTo({ center: [132.50124, 34.39776], zoom: 11.4, bearing: -8, pitch: 18, duration: 8000 });
        
        // Montrer la légende et activer toutes les couches immédiatement
        if (legendHiroshima) {
          legendHiroshima.style.display = "block";
        }
        
        // Force l'affichage immédiat des couches d'Hiroshima
        ['hiroshima_detruit_layer', 'hiroshima_moinsdetruit_layer', 'hiroshima_sauve_layer'].forEach(layer => {
          try {
            if (map.getLayer(layer)) {
              map.setLayoutProperty(layer, 'visibility', 'visible');
              console.log(`Couche ${layer} affichée`);
            }
          } catch (error) {
            console.error(`Erreur d'affichage de la couche ${layer}:`, error);
          }
        });
        
        // Activation des points d'intérêt pour Hiroshima
        try {
          map.setLayoutProperty('poi_points', 'visibility', 'visible');
          map.setLayoutProperty('poi_labels', 'visibility', 'visible');
          resetPoiToggleButton(true);
        } catch (error) {
          console.error("Erreur d'affichage des points d'intérêt:", error);
        }
        
        // Cache les autres couches
        ['nagasaki_detruit_layer', 'nagasaki_feu_layer', 'nagasaki_sauve_layer',
         'rennes_detruit_layer', 'rennes_partiel_layer'].forEach(layer => {
          try {
            if (map.getLayer(layer)) {
              map.setLayoutProperty(layer, 'visibility', 'none');
            }
          } catch (error) {}
        });
        
        // Réinitialiser l'état des boutons de légende
        resetLegendButtons('hiroshima');
        break;
      
      case "nagasaki":
        map.flyTo({ center: [129.88424, 32.76064], zoom: 12.1, bearing: -49.60, pitch: 34.50, duration: 8000 });
        
        // Montrer la légende et activer toutes les couches immédiatement
        if (legendNagasaki) {
          legendNagasaki.style.display = "block";
        }
        
        // Force l'affichage immédiat des couches de Nagasaki
        ['nagasaki_detruit_layer', 'nagasaki_feu_layer', 'nagasaki_sauve_layer'].forEach(layer => {
          try {
            if (map.getLayer(layer)) {
              map.setLayoutProperty(layer, 'visibility', 'visible');
              console.log(`Couche ${layer} affichée`);
            }
          } catch (error) {
            console.error(`Erreur d'affichage de la couche ${layer}:`, error);
          }
        });
        
        // Activation des points d'intérêt pour Nagasaki
        try {
          map.setLayoutProperty('poi_points', 'visibility', 'visible');
          map.setLayoutProperty('poi_labels', 'visibility', 'visible');
          resetPoiToggleButton(true);
        } catch (error) {
          console.error("Erreur d'affichage des points d'intérêt:", error);
        }
        
        // Cache les autres couches
        ['hiroshima_detruit_layer', 'hiroshima_moinsdetruit_layer', 'hiroshima_sauve_layer',
         'rennes_detruit_layer', 'rennes_partiel_layer'].forEach(layer => {
          try {
            if (map.getLayer(layer)) {
              map.setLayoutProperty(layer, 'visibility', 'none');
            }
          } catch (error) {}
        });
        
        // Réinitialiser l'état des boutons de légende
        resetLegendButtons('nagasaki');
        break;
      
      case "infographie-hiroshima":
        map.flyTo({ center: [131.5, 33.5], zoom: 5, duration: 1500 });
        hideAllLayers();
        break;
      
      case "post-infographie-section":
        map.flyTo({ center: [135, 36], zoom: 5, duration: 1500 });
        hideAllLayers();
        break;
      
      case "rennes-impact":
        map.flyTo({ center: [-1.64124, 48.11316], zoom: 11.8, bearing: 0, pitch: 0, duration: 8000});
        
        // Montrer la légende et activer toutes les couches immédiatement
        if (legendRennes) {
          legendRennes.style.display = "block";
        }
        
        // Force l'affichage immédiat des couches de Rennes
        ['rennes_detruit_layer', 'rennes_partiel_layer'].forEach(layer => {
          try {
            if (map.getLayer(layer)) {
              map.setLayoutProperty(layer, 'visibility', 'visible');
              console.log(`Couche ${layer} affichée`);
            }
          } catch (error) {
            console.error(`Erreur d'affichage de la couche ${layer}:`, error);
          }
        });
        
        // Affiche les points d'intérêt pour Rennes
        try {
          map.setLayoutProperty('poi_points', 'visibility', 'visible');
          map.setLayoutProperty('poi_labels', 'visibility', 'visible');
          resetPoiToggleButton(true);
        } catch (error) {
          console.error("Erreur d'affichage des points d'intérêt:", error);
        }
        
        // Cache les autres couches
        ['hiroshima_detruit_layer', 'hiroshima_moinsdetruit_layer', 'hiroshima_sauve_layer',
         'nagasaki_detruit_layer', 'nagasaki_feu_layer', 'nagasaki_sauve_layer'].forEach(layer => {
          try {
            if (map.getLayer(layer)) {
              map.setLayoutProperty(layer, 'visibility', 'none');
            }
          } catch (error) {}
        });
        
        // Réinitialiser l'état des boutons de légende
        resetLegendButtons('rennes');
        break;
      
      case "conclusion":
        map.flyTo({ center: [135.5, 35.0], zoom: 4, pitch: 45, duration: 1500 });
        hideAllLayers();
        break;
    }
  } catch (error) {
    console.error("Erreur lors du changement de section:", error);
  }
}

/**
 * Réinitialise le bouton de toggle des points d'intérêt
 * @param {boolean} active - État actif souhaité (true=activé, false=désactivé)
 */
function resetPoiToggleButton(active) {
  const btn = document.getElementById('toggle-poi-fixed');
  if (btn) {
    if (active) {
      btn.classList.add('active');
      btn.classList.remove('inactive');
      btn.style.opacity = '1';
    } else {
      btn.classList.remove('active');
      btn.classList.add('inactive');
      btn.style.opacity = '0.5';
    }
  }
}

/**
 * Gère la sortie d'une section du scrollytelling
 * @param {Object} response - Objet contenant les informations sur la sortie de section
 */
function handleStepExit(response) {
  const { element, direction } = response;
  const id = element.id;
  
  console.log(`Sortie de la section: ${id}, direction: ${direction}`);
  
  // Déterminer la prochaine/précédente section
  const nextSectionId = direction === 'down' ? getNextSection(id) : getPreviousSection(id);
  console.log(`Section suivante/précédente: ${nextSectionId}`);
  
  const legendHiroshima = document.getElementById("legend-hiroshima");
  const legendNagasaki = document.getElementById("legend-nagasaki");
  const legendRennes = document.getElementById("legend-rennes");
  
  // Gérer les transitions spécifiques
  if ((id === "nagasaki" && nextSectionId === "infographie-hiroshima") ||
      (id === "infographie-hiroshima" && nextSectionId === "post-infographie-section") ||
      (id === "post-infographie-section" && nextSectionId === "rennes-impact") ||
      (id === "rennes-impact" && nextSectionId === "conclusion")) {
    if (legendHiroshima) legendHiroshima.style.display = "none";
    if (legendNagasaki) legendNagasaki.style.display = "none";
    if (legendRennes) legendRennes.style.display = "none";
    hideAllLayers();
  }
  
  // Gérer la transition entre Rennes et Post-Infographie (remontée)
  else if (id === "rennes-impact" && nextSectionId === "post-infographie-section") {
    if (legendRennes) legendRennes.style.display = "none";
    hideAllLayers();
  }
}

/**
 * Montre uniquement les couches d'Hiroshima
 */
function showHiroshimaLayers() {
  if (!map.loaded()) return;
  
  // Afficher les couches d'Hiroshima
  ['hiroshima_detruit_layer', 'hiroshima_moinsdetruit_layer', 'hiroshima_sauve_layer'].forEach(layer => {
    try {
      if (map.getLayer(layer)) {
        map.setLayoutProperty(layer, 'visibility', 'visible');
      }
    } catch (error) {}
  });
  
  // Afficher les points d'intérêt
  try {
    map.setLayoutProperty('poi_points', 'visibility', 'visible');
    resetPoiToggleButton(true);
  } catch (error) {}
  
  // Cacher les autres couches
  ['nagasaki_detruit_layer', 'nagasaki_feu_layer', 'nagasaki_sauve_layer',
   'rennes_detruit_layer', 'rennes_partiel_layer'].forEach(layer => {
    try {
      if (map.getLayer(layer)) {
        map.setLayoutProperty(layer, 'visibility', 'none');
      }
    } catch (error) {}
  });
}

/**
 * Montre uniquement les couches de Nagasaki
 */
function showNagasakiLayers() {
  if (!map.loaded()) return;
  
  // Afficher les couches de Nagasaki
  ['nagasaki_detruit_layer', 'nagasaki_feu_layer', 'nagasaki_sauve_layer'].forEach(layer => {
    try {
      if (map.getLayer(layer)) {
        map.setLayoutProperty(layer, 'visibility', 'visible');
      }
    } catch (error) {}
  });
  
  // Afficher les points d'intérêt
  try {
    map.setLayoutProperty('poi_points', 'visibility', 'visible');
    resetPoiToggleButton(true);
  } catch (error) {}
  
  // Cacher les autres couches
  ['hiroshima_detruit_layer', 'hiroshima_moinsdetruit_layer', 'hiroshima_sauve_layer',
   'rennes_detruit_layer', 'rennes_partiel_layer'].forEach(layer => {
    try {
      if (map.getLayer(layer)) {
        map.setLayoutProperty(layer, 'visibility', 'none');
      }
    } catch (error) {}
  });
}

/**
 * Montre uniquement les couches de Rennes
 */
function showRennesLayers() {
  if (!map.loaded()) return;
  
  // Afficher les couches de Rennes
  ['rennes_detruit_layer', 'rennes_partiel_layer'].forEach(layer => {
    try {
      if (map.getLayer(layer)) {
        map.setLayoutProperty(layer, 'visibility', 'visible');
      }
    } catch (error) {}
  });
  
  // Ajuster les points d'intérêt pour Rennes
  try {
    map.setLayoutProperty('poi_points', 'visibility', 'visible');
    map.setLayoutProperty('poi_labels', 'visibility', 'visible');
    resetPoiToggleButton(true);
  } catch (error) {}
  
  // Cacher les autres couches
  ['hiroshima_detruit_layer', 'hiroshima_moinsdetruit_layer', 'hiroshima_sauve_layer',
   'nagasaki_detruit_layer', 'nagasaki_feu_layer', 'nagasaki_sauve_layer'].forEach(layer => {
    try {
      if (map.getLayer(layer)) {
        map.setLayoutProperty(layer, 'visibility', 'none');
      }
    } catch (error) {}
  });
}

/**
 * Cache toutes les couches cartographiques
 */
function hideAllLayers() {
  if (!map.loaded()) return;
  
  const allLayers = [
    'hiroshima_detruit_layer', 'hiroshima_moinsdetruit_layer', 'hiroshima_sauve_layer',
    'nagasaki_detruit_layer', 'nagasaki_feu_layer', 'nagasaki_sauve_layer',
    'rennes_detruit_layer', 'rennes_partiel_layer',
    'poi_points', 'poi_labels'
  ];
  
  allLayers.forEach(layer => {
    try {
      if (map.getLayer(layer)) {
        map.setLayoutProperty(layer, 'visibility', 'none');
      }
    } catch (error) {
      // Ne pas logger les erreurs pour éviter de surcharger la console
    }
  });
}

/**
 * Réinitialise les boutons de légende à l'état actif pour une ville donnée
 * @param {string} city - Ville concernée ('hiroshima', 'nagasaki' ou 'rennes')
 */
function resetLegendButtons(city) {
  if (city === 'hiroshima') {
    // Réinitialiser les boutons d'Hiroshima
    ['toggle-destroyed-fixed', 'toggle-lessdestroyed-fixed', 'toggle-sauve-fixed'].forEach(btnId => {
      const btn = document.getElementById(btnId);
      if (btn) {
        btn.classList.add('active');
        btn.classList.remove('inactive');
        btn.style.opacity = '1';
      }
    });
  } else if (city === 'nagasaki') {
    // Réinitialiser les boutons de Nagasaki
    ['toggle-naga-detruit-fixed', 'toggle-naga-feu-fixed', 'toggle-naga-sauve-fixed'].forEach(btnId => {
      const btn = document.getElementById(btnId);
      if (btn) {
        btn.classList.add('active');
        btn.classList.remove('inactive');
        btn.style.opacity = '1';
      }
    });
  } else if (city === 'rennes') {
    // Réinitialiser les boutons de Rennes
    ['toggle-rennes-detruit-fixed', 'toggle-rennes-partiel-fixed'].forEach(btnId => {
      const btn = document.getElementById(btnId);
      if (btn) {
        btn.classList.add('active');
        btn.classList.remove('inactive');
        btn.style.opacity = '1';
      }
    });
  }
}

/**
 * Initialise le système de scrollytelling
 * Configuration différente pour mobile et desktop
 */
function initScrollytelling() {
  try {
    // Configuration adaptée selon le type d'appareil
    if (isMobile()) {
      // Sur mobile, on utilise une configuration plus simple
      scroller.setup({
        container: "body", // Utiliser le body comme conteneur sur mobile
        step: ".step",
        offset: 0.5,
        debug: false
      })
      .onStepEnter(handleStepEnter)
      .onStepExit(handleStepExit);
      
      // Permettre le défilement natif sur mobile
      document.body.style.overflow = 'auto';
      document.documentElement.style.overflow = 'auto';
      
      const scrollContainer = document.getElementById('scroll-container');
      if (scrollContainer) {
        scrollContainer.style.position = 'static';
        scrollContainer.style.height = 'auto';
        scrollContainer.style.overflow = 'visible';
      }
    } else {
      // Configuration pour desktop
      scroller.setup({
        container: "#scroll-container",
        step: ".step",
        offset: 0.5,
        debug: false
      })
      .onStepEnter(handleStepEnter)
      .onStepExit(handleStepExit);
    }
    
    // Animation de la timeline au scroll
    const timelineItems = document.querySelectorAll('.timeline-item');
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // Animation en cascade
          const index = Array.from(timelineItems).indexOf(entry.target);
          setTimeout(() => {
            entry.target.classList.add('visible');
          }, index * 100);
        }
      });
    }, { threshold: 0.25 });
    
    timelineItems.forEach(item => {
      observer.observe(item);
    });
    
    // Autres initialisations
    initTabs();
    initProgressBar();
    initBombInfographic();
    
    // Position initiale
    setTimeout(() => {
      const firstStep = document.querySelector('.step');
      if (firstStep) {
        handleStepEnter({ element: firstStep });
      }
    }, 300);
  } catch (error) {
    console.error("Erreur d'initialisation du scrollytelling:", error);
  }
}

// ======= TABS POUR L'INFOGRAPHIE =======

/**
 * Initialise les onglets dans la section infographie
 */
function initTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', function() {
      // Désactiver tous les onglets
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
      });
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
      });
      
      // Activer l'onglet sélectionné
      this.classList.add('active');
      const targetId = this.getAttribute('data-target');
      const targetContent = document.getElementById(targetId);
      if (targetContent) {
        targetContent.classList.add('active');
      }
      
      // Mettre à jour l'affichage de la bombe
      updateBombDisplay(targetId);
    });
  });
}

// ======= Gestion de l'affichage des bombes =======

/**
 * Initialise l'infographie des bombes
 */
function initBombInfographic() {
  // Initialiser le contenu avec l'image de Little Boy (Hiroshima est l'onglet par défaut)
  updateBombDisplay('tab-hiroshima');
}

/**
 * Met à jour l'affichage de l'infographie des bombes en fonction de l'onglet actif
 * @param {string} tabId - ID de l'onglet actif
 */
function updateBombDisplay(tabId) {
  const bombDisplay = document.getElementById('bomb-display');
  
  if (!bombDisplay) {
    console.warn("Élément bomb-display non trouvé");
    return;
  }
  
  let bombHtml = '';
  
  switch(tabId) {
    case 'tab-hiroshima':
      bombHtml = `
        <div class="bomb-container animate-bomb">
          <img src="./assets/infographies/littleboy_hiroshima.png" alt="Little Boy - Bombe d'Hiroshima">
          <div class="bomb-title">
            <span class="bomb-name">Little Boy</span>
          </div>
        </div>
      `;
      break;
    case 'tab-nagasaki':
      bombHtml = `
        <div class="bomb-container animate-bomb">
          <img src="./assets/infographies/fatman_nagasaki.png" alt="Fat Man - Bombe de Nagasaki">
          <div class="bomb-title">
            <span class="bomb-name">Fat Man</span>
          </div>
        </div>
      `;
      break;
    case 'tab-comparison':
      bombHtml = `
        <div class="bombs-comparison animate-bomb">
          <img src="./assets/infographies/deux_bombes.png" alt="Comparaison des bombes" style="max-width: 100%; max-height: 400px;">
        </div>
      `;
      break;
    default:
      bombHtml = `<p>Information non disponible</p>`;
  }
  
  bombDisplay.innerHTML = bombHtml;
}

// ======= BARRE DE PROGRESSION =======

/**
 * Initialise la barre de progression du scrollytelling
 * Version optimisée pour mobile et desktop
 */
function initProgressBar() {
  const progressBar = document.getElementById('progress-bar');
  const progressIndicator = document.getElementById('progress-indicator');
  const scrollContainer = document.getElementById('scroll-container');
  
  if (!progressBar || !progressIndicator) return;
  
  let lastScrollPosition = 0;
  let lastScrollTime = 0;
  
  // Fonction qui met à jour la barre de progression
  const updateProgressBar = function() {
    // Limiter les mises à jour à 60 FPS maximum
    const now = Date.now();
    if (now - lastScrollTime < 16) return; // ~60 FPS
    
    let scrollProgress;
    
    if (isMobile()) {
      // Sur mobile, on utilise le scroll de la fenêtre
      const scrollTop = window.scrollY;
      if (Math.abs(scrollTop - lastScrollPosition) < 5) return;
      
      const scrollHeight = document.body.scrollHeight - window.innerHeight;
      scrollProgress = (scrollTop / scrollHeight) * 100;
      
      lastScrollPosition = scrollTop;
    } else {
      // Sur desktop, on utilise le scroll du conteneur
      if (!scrollContainer) return;
      
      const scrollTop = scrollContainer.scrollTop;
      if (Math.abs(scrollTop - lastScrollPosition) < 5) return;
      
      const scrollHeight = scrollContainer.scrollHeight - scrollContainer.clientHeight;
      scrollProgress = (scrollTop / scrollHeight) * 100;
      
      lastScrollPosition = scrollTop;
    }
    
    // Mettre à jour directement le style
    progressBar.style.width = scrollProgress + '%';
    progressIndicator.style.left = scrollProgress + '%';
    
    lastScrollTime = now;
  };
  
  // Ajouter les écouteurs d'événements appropriés selon le type d'appareil
  if (isMobile()) {
    window.addEventListener('scroll', updateProgressBar);
  } else {
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', updateProgressBar);
    }
  }
}

/**
 * Gère l'affichage de la bibliographie dans le footer
 */
function toggleBibliography() {
  const content = document.getElementById('bibliography');
  const toggle = document.querySelector('.bibliography-toggle');
  const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
  
  toggle.setAttribute('aria-expanded', !isExpanded);
  content.setAttribute('aria-hidden', isExpanded);
  
  if (!isExpanded) {
    content.style.display = 'block';
    content.classList.remove('closing');
  } else {
    content.classList.add('closing');
    setTimeout(() => {
      content.style.display = 'none';
      content.classList.remove('closing');
    }, 500); // Délai correspondant à la durée de l'animation
  }
}

// Initialisation de la bibliographie
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.bibliography-toggle');
  const content = document.getElementById('bibliography');
  
  if (toggle && content) {
    toggle.setAttribute('aria-expanded', 'false');
    content.setAttribute('aria-hidden', 'true');
  }
});

// ======= INITIALISATION GÉNÉRALE =======

document.addEventListener('DOMContentLoaded', function() {
  console.log("DOM chargé, initialisation...");
  
  // Initialiser les fonctionnalités de base
  initProgressBar();
  initTabs();
  
  // Précacher les ressources importantes
  precacheResources();
  
  // Gestion du redimensionnement
  window.addEventListener('resize', debounce(handleResize, 150));
  handleResize();
});

/**
 * Préchargement des ressources importantes pour optimiser les performances
 */
function precacheResources() {
  // Préchargement des images pour éviter les retards de rendu
  const urls = [
    './assets/infographies/littleboy_hiroshima.png',
    './assets/infographies/fatman_nagasaki.png',
    './assets/infographies/deux_bombes.png',
    './assets/timeline/PEARLHARBOR.webp',
    './assets/timeline/MIDWAY.webp',
    './assets/timeline/IWO.webp',
    './assets/timeline/OKINAWA.webp',
    './assets/timeline/TRINIT.webp',
    'https://paradigm-from-asia-africa.com/media/images/top/top_img_genbaku.jpg',
    './assets/carte_pacifique/pacific_ok.png'
  ];
  
  urls.forEach(url => {
    const img = new Image();
    img.src = url;
  });
}

function blockMobileDevices() {
  const blocker = document.getElementById("mobile-blocker");
  
  // Détection simplifiée
  const isMobileUserAgent = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const hasSmallScreen = window.innerWidth <= 768;
  
  const isReallyMobile = isMobileUserAgent && hasSmallScreen;
  
  if (isReallyMobile && blocker) {
    document.body.innerHTML = '';
    document.body.appendChild(blocker);
    blocker.classList.remove("mobile-hidden");
  }
}

window.addEventListener("DOMContentLoaded", blockMobileDevices);
