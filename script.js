// -----------------------------------------
// Ajout de la section Rennes et support pour la timeline avec images
// -----------------------------------------

// Fonction utilitaire pour détecter les appareils mobiles
function isMobile() {
  return window.innerWidth <= 768;
}

// Garder une trace de la dernière largeur de fenêtre
let lastWidth = window.innerWidth;

// ======= PERFORMANCE UTILITIES =======
// Optimise les appels de callback en utilisant requestAnimationFrame
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

// Retarde l'exécution d'une fonction jusqu'à ce que l'utilisateur ait cessé d'interagir
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// ======= RESPONSIVE HANDLING =======
// Gère le redimensionnement de la fenêtre et adapte l'interface
function handleResize() {
  const width = window.innerWidth;
  const wasMobile = lastWidth <= 768;
  const isMobileNow = width <= 768;
  
  // Si on passe de mobile à desktop ou vice versa, recharger la page
  if (wasMobile !== isMobileNow) {
    window.location.reload();
    return;
  }
  
  // Réinitialiser le scrollytelling à chaque redimensionnement significatif
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
var map = new maplibregl.Map({
  container: 'map',
  style: 'https://basemaps.cartocdn.com/gl/positron-nolabels-gl-style/style.json',
  center: [132.49859, 34.38477],
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

// Configuration des couches cartographiques
map.on('load', function() {
  console.log("Carte chargée avec succès");
  
  // Masquer le loader une fois la carte chargée
  const loadingIndicator = document.getElementById('loading-indicator');
  if (loadingIndicator) {
    loadingIndicator.classList.add('hidden');
  }
  
  // Démarrer les animations
  startIntroAnimations();

  // Ajouter le contrôle d'échelle ici
  map.addControl(new maplibregl.ScaleControl({
    maxWidth: 100,
    unit: 'metric'
  }), 'bottom-left');
  
  // Fonction pour ajouter des couches - toutes les couches sont créées avec visibilité 'visible'
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
  
  // --- Hiroshima ---
  addMapLayer('hiroshima_detruit', 
    './assets/hiroshima/h_total_detruit.geojson', 
    '#af0d1d');
  
  addMapLayer('hiroshima_moinsdetruit', 
    './assets/hiroshima/h_partiel_detruit.geojson', 
    '#ea504c');
  
  addMapLayer('hiroshima_sauve', 
    './assets/hiroshima/h_sauve.geojson', 
    '#f39c9e');

  // --- Nagasaki ---
  addMapLayer('nagasaki_detruit', 
    './assets/nagasaki/n_total_detruit.geojson', 
    '#af0d1d');
  
  addMapLayer('nagasaki_feu', 
    './assets/nagasaki/n_partiel_detruit.geojson', 
    '#ea504c');
  
  addMapLayer('nagasaki_sauve', 
    './assets/nagasaki/n_sauve.geojson', 
    '#f39c9e');
    
  // --- Rennes (simulation fictive) ---
  addMapLayer('rennes_detruit', 
    './assets/rennes/tampon_1km6_4326.geojson', 
    '#af0d1d');
  
  addMapLayer('rennes_partiel', 
    './assets/rennes/tampon_3km_4326.geojson', 
    '#ea504c');

  // Ajout des points d'intérêt
  addPointsOfInterest();

  // Par défaut, on cache toutes les couches jusqu'à ce qu'on arrive à la section correspondante
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
  
  // Initialisation selon la section courante avec un délai réduit
  setTimeout(() => {
    const currentSection = getCurrentSection();
    if (currentSection) {
      console.log("Section initiale détectée:", currentSection.id);
      handleStepEnter({ element: currentSection });
    }
  }, 500); // Réduit à 500ms pour améliorer la réactivité
});

// Fonction pour ajouter les points d'intérêt
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
        'visibility': 'visible' // Caché par défaut
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
          10, 11,
          12, 13,
          14, 15
        ],
        'text-offset': [0, -1.5],
        'text-anchor': 'bottom',
        'visibility': 'visible',
        'text-allow-overlap': false, // Empêcher le chevauchement
        'text-ignore-placement': false,
        'text-variable-anchor': [
          'bottom',
          'bottom-left',
          'bottom-right',
          'top',
          'left',
          'right'
        ], // Essayer différentes positions pour éviter les superpositions
        'text-radial-offset': 0.5,
        'text-justify': 'center',
        'text-optional': true // Permet de ne pas afficher certains labels si trop serrés
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': '#000000',
        'text-halo-width': 2,
        'text-halo-blur': 0.3,
      }
    });
    
    console.log("Points d'intérêt ajoutés avec succès");
    
  } catch (error) {
    console.error("Erreur lors de l'ajout des points d'intérêt:", error);
  }
}

// ======= LÉGENDE INTERACTIVE =======
// Fonction pour configurer tous les toggles
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
  
  // Rennes toggles (nouveaux)
  setupToggle('toggle-rennes-detruit-fixed');
  setupToggle('toggle-rennes-partiel-fixed');
  setupTogglePoints('toggle-poi-rennes-fixed');
  
  // Ajout d'un toggle pour les points d'intérêt
  setupTogglePoints('toggle-poi-fixed');
  
  console.log("Tous les boutons de légende ont été configurés");
}

// Fonction améliorée pour que la légende fonctionne dès le premier clic
function setupToggle(btnId) {
  const btn = document.getElementById(btnId);
  if (!btn) {
    console.warn(`Bouton ${btnId} non trouvé`);
    return;
  }
  
  // Log pour confirmer que le bouton est trouvé
  console.log(`Bouton de légende configuré: ${btnId}`);
  
  btn.addEventListener('click', function() {
    const layer = btn.getAttribute('data-layer');
    const isActive = btn.classList.contains('active');
    
    // Log pour déboguer
    console.log(`Toggle clicked: ${btnId} for layer ${layer}, currently active: ${isActive}`);
    
    try {
      if (map.getLayer(layer)) {
        // Basculer la visibilité
        const newVisibility = isActive ? 'none' : 'visible';
        map.setLayoutProperty(layer, 'visibility', newVisibility);
        
        // Mettre à jour les classes CSS
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

// Fonction pour configurer le toggle des points d'intérêt
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
var scroller = scrollama();
// Garder une trace de la section actuelle pour gérer les légendes
var currentSection = "";

// Fonction utilitaire pour obtenir la section actuelle visible
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
    // Méthode originale pour desktop
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

// Fonction utilitaire pour trouver la section suivante
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

// Fonction utilitaire pour trouver la section précédente
function getPreviousSection(currentId) {
  const sections = document.querySelectorAll('.step');
  
  for (let i = 1; i < sections.length; i++) {
    if (sections[i].id === currentId) {
      return sections[i-1].id;
    }
  }
  
  return null;
}

// Gestion des sections AMÉLIORÉE - affichage immédiat des couches
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
  
  // Configuration spécifique par section avec couches visibles par défaut
  try {
    switch(id) {
      case "intro":
        map.flyTo({ center: [132.49859, 34.38477], zoom: 12.5, duration: 1500 });
        hideAllLayers();
        break;

      // Nouvelle section pour la carte du Pacifique
      case "pacific-map":
        map.flyTo({ center: [160, 0], zoom: 3, duration: 1500 });
        hideAllLayers();
        break;
        
      // Nouvelle section pour le contexte du Pacifique
      case "pacific-context":
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
          // Labels visibles seulement au survol
          resetPoiToggleButton(true);
        } catch (error) {
          console.error("Erreur d'affichage des points d'intérêt:", error);
        }
        
        // Cache les autres couches
        ['nagasaki_detruit_layer', 'nagasaki_feu_layer', 'nagasaki_sauve_layer',
         'rennes_detruit_layer', 'rennes_partiel_layer', 'rennes_radius_layer'].forEach(layer => {
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
      
      // Nouvelle section pour Rennes
      case "rennes-impact":
        map.flyTo({ center: [-1.64124, 48.11316], zoom: 11.8, bearing: 0, pitch: 0, duration: 8000});
        
        // Montrer la légende et activer toutes les couches immédiatement
        if (legendRennes) {
          legendRennes.style.display = "block";
        }
        
        // Force l'affichage immédiat des couches de Rennes
        ['rennes_detruit_layer', 'rennes_partiel_layer', 'rennes_radius_layer'].forEach(layer => {
          try {
            if (map.getLayer(layer)) {
              map.setLayoutProperty(layer, 'visibility', 'visible');
              console.log(`Couche ${layer} affichée`);
            }
          } catch (error) {
            console.error(`Erreur d'affichage de la couche ${layer}:`, error);
          }
        });
        
        // Cache les points d'intérêt pour Rennes
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

// Fonction pour réinitialiser le bouton de toggle des points d'intérêt
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

// SOLUTION AMÉLIORÉE: Gestionnaire pour la sortie des sections
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

// Fonction pour montrer uniquement les couches d'Hiroshima
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
   'rennes_detruit_layer', 'rennes_partiel_layer', 'rennes_radius_layer'].forEach(layer => {
    try {
      if (map.getLayer(layer)) {
        map.setLayoutProperty(layer, 'visibility', 'none');
      }
    } catch (error) {}
  });
}

// Fonction pour montrer uniquement les couches de Nagasaki
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
   'rennes_detruit_layer', 'rennes_partiel_layer', 'rennes_radius_layer'].forEach(layer => {
    try {
      if (map.getLayer(layer)) {
        map.setLayoutProperty(layer, 'visibility', 'none');
      }
    } catch (error) {}
  });
}

// Fonction pour montrer uniquement les couches de Rennes
function showRennesLayers() {
  if (!map.loaded()) return;
  
  // Afficher les couches de Rennes
  ['rennes_detruit_layer', 'rennes_partiel_layer', 'rennes_radius_layer'].forEach(layer => {
    try {if (map.getLayer(layer)) {
        map.setLayoutProperty(layer, 'visibility', 'visible');
      }
    } catch (error) {}
  });
  
  // Cacher les points d'intérêt pour Rennes
  try {
    map.setLayoutProperty('poi_points', 'visibility', 'none');
    map.setLayoutProperty('poi_labels', 'visibility', 'none');
    resetPoiToggleButton(false);
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

// Fonction pour cacher toutes les couches - optimisée pour éviter les erreurs inutiles
function hideAllLayers() {
  if (!map.loaded()) return;
  
  const allLayers = [
    'hiroshima_detruit_layer', 'hiroshima_moinsdetruit_layer', 'hiroshima_sauve_layer',
    'nagasaki_detruit_layer', 'nagasaki_feu_layer', 'nagasaki_sauve_layer',
    'rennes_detruit_layer', 'rennes_partiel_layer', 'rennes_radius_layer',
    'poi_points', 'poi_labels'
  ];
  
  allLayers.forEach(layer => {
    try {
      if (map.getLayer(layer)) {
        map.setLayoutProperty(layer, 'visibility', 'none');
      }
    } catch (error) {
      // Ne pas logguer les erreurs ici pour éviter de surcharger la console
    }
  });
}

// Fonction pour réinitialiser les boutons de légende à l'état actif
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
    ['toggle-rennes-detruit-fixed', 'toggle-rennes-partiel-fixed', 'toggle-rennes-radiation-fixed'].forEach(btnId => {
      const btn = document.getElementById(btnId);
      if (btn) {
        btn.classList.add('active');
        btn.classList.remove('inactive');
        btn.style.opacity = '1';
      }
    });
  }
}

// Initialisation du scrollytelling AMÉLIORÉE pour prendre en charge les mobiles
function initScrollytelling() {
  try {
    // Configuration différente pour mobile et desktop
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
      // Configuration originale pour desktop
      scroller.setup({
        container: "#scroll-container",
        step: ".step",
        offset: 0.5,
        debug: false
      })
      .onStepEnter(handleStepEnter)
      .onStepExit(handleStepExit);
    }
    
    // Animation optimisée de la timeline au scroll
    const timelineItems = document.querySelectorAll('.timeline-item');
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // Animation en cascade
          const index = Array.from(timelineItems).indexOf(entry.target);
          setTimeout(() => {
            entry.target.classList.add('visible');
          }, index * 100); // Animation plus rapide
        }
      });
    }, { threshold: 0.25 });
    
    timelineItems.forEach(item => {
      observer.observe(item);
    });
    
    // Autres initialisations
    initTabs();
    initProgressBar();
    initBombInfographic(); // Nouvelle fonction pour les infographies de bombes
    
    // Position initiale
    setTimeout(() => {
      const firstStep = document.querySelector('.step');
      if (firstStep) {
        handleStepEnter({ element: firstStep });
      }
    }, 300); // Réactivité accrue
  } catch (error) {
    console.error("Erreur d'initialisation du scrollytelling:", error);
  }
}

// ======= TABS POUR L'INFOGRAPHIE =======
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
function initBombInfographic() {
  // Initialiser le contenu avec l'image de Little Boy (Hiroshima est l'onglet par défaut)
  updateBombDisplay('tab-hiroshima');
}

// Mise à jour de la fonction pour utiliser les nouvelles images fournies
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

// ======= BARRE DE PROGRESSION OPTIMISÉE POUR MOBILE =======
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
    
    // Mettre à jour directement le style sans requestAnimationFrame
    progressBar.style.width = scrollProgress + '%';
    progressIndicator.style.left = scrollProgress + '%';
    
    lastScrollTime = now;
  };
  
  // Sur mobile, on écoute l'événement de défilement sur la fenêtre
  if (isMobile()) {
    window.addEventListener('scroll', updateProgressBar);
  } else {
    // Sur desktop, on écoute l'événement de défilement sur le conteneur
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', updateProgressBar);
    }
  }
}






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

// INITIALIZE
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.bibliography-toggle');
  const content = document.getElementById('bibliography');
  
  toggle.setAttribute('aria-expanded', 'false');
  content.setAttribute('aria-hidden', 'true');
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

// Fonction pour précacher les ressources importantes
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
    './assets/timeline/POTSDAM.webp',
    './assets/timeline/URANIUMY.webp',
    './assets/timeline/NAGASAKI.webp',
    'https://paradigm-from-asia-africa.com/media/images/top/top_img_genbaku.jpg',
    './assets/carte_pacifique/pacific_ok.png'
  ];
  
  urls.forEach(url => {
    const img = new Image();
    img.src = url;
  });
}
