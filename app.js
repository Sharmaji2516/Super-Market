import { listenForProducts, listenForCategoryOrder } from './firebase-config.js?v=1.0.6';

let allProducts = []; // To store products for filtering
let activeCategory = 'all';
let categoryCustomOrder = []; // Custom category priority sequence set by Admin

// Helper to sort category names according to custom priority sequence (Case-Insensitive)
function sortCategoriesByCustomOrder(categoriesArray) {
  const orderUpper = (categoryCustomOrder || []).map(c => (c || '').toString().trim().toUpperCase());
  return [...categoriesArray].sort((a, b) => {
    const normA = (a || '').toString().trim().toUpperCase();
    const normB = (b || '').toString().trim().toUpperCase();

    const idxA = orderUpper.indexOf(normA);
    const idxB = orderUpper.indexOf(normB);

    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });
}

// Icon mapping helper for category pills
function getCategoryIcon(categoryName) {
  const name = (categoryName || '').toLowerCase();
  if (name.includes('ice cream')) return 'fa-solid fa-ice-cream';
  if (name.includes('bread')) return 'fa-solid fa-bread-slice';
  if (name.includes('maggi') || name.includes('noodle')) return 'fa-solid fa-bowl-food';
  if (name.includes('chocolate')) return 'fa-solid fa-cookie-bite';
  if (name.includes('biscuit')) return 'fa-solid fa-cookie';
  if (name.includes('snack') || name.includes('chip')) return 'fa-solid fa-fire';
  if (name.includes('drink') || name.includes('beverage') || name.includes('juice')) return 'fa-solid fa-glass-water';
  if (name.includes('fruit') || name.includes('veg')) return 'fa-solid fa-carrot';
  return 'fa-solid fa-basket-shopping';
}

let categoryCustomImages = {};

function resolveDirectImageUrl(url) {
  if (!url) return '';
  let trimmed = url.trim();
  
  // 1. If string contains direct image URL (e.g. https://iili.io/CvHE3k7.jpg or from Markdown/HTML)
  const directMatch = trimmed.match(/https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp|gif)/i);
  if (directMatch) {
    return directMatch[0];
  }

  // 2. Auto-convert FreeImage.host viewer page link (e.g. https://freeimage.host/i/CvHE3k7) to direct image URL (https://iili.io/CvHE3k7.jpg)
  const freeimageMatch = trimmed.match(/freeimage\.host\/i\/([a-zA-Z0-9]+)/i);
  if (freeimageMatch && freeimageMatch[1]) {
    return `https://iili.io/${freeimageMatch[1]}.jpg`;
  }
  return trimmed;
}

document.addEventListener('DOMContentLoaded', async () => {
  // Mobile Navigation
  const menuBtn = document.querySelector('.menu-btn');
  const navLinks = document.querySelector('.nav-links');
  
  if (menuBtn) {
    menuBtn.addEventListener('click', () => {
      navLinks.classList.toggle('nav-active');
      const icon = menuBtn.querySelector('i');
      if (navLinks.classList.contains('nav-active')) {
        icon.classList.remove('fa-bars');
        icon.classList.add('fa-times');
      } else {
        icon.classList.remove('fa-times');
        icon.classList.add('fa-bars');
      }
    });
  }

  // Scroll Animations setup
  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
  };
  
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // --- 1. INSTANT LOAD: Load cached products & category order/images from LocalStorage ---
  try {
    const cachedOrder = localStorage.getItem('cachedCategoryOrder');
    if (cachedOrder) {
      categoryCustomOrder = JSON.parse(cachedOrder);
    }
    const cachedImgs = localStorage.getItem('cachedCategoryImages');
    if (cachedImgs) {
      categoryCustomImages = JSON.parse(cachedImgs);
    }
    const cachedData = localStorage.getItem('cachedProducts');
    if (cachedData) {
      const parsedProducts = JSON.parse(cachedData);
      if (Array.isArray(parsedProducts) && parsedProducts.length > 0) {
        allProducts = parsedProducts;
        populateCategoryDropdown(allProducts);
        renderCategoryPills(allProducts, activeCategory);
        renderProductsUI(allProducts);
      }
    }
  } catch (e) {
    console.warn("Local storage cache read error:", e);
  }

  // Listen for real-time Category Order & Metadata from Firestore
  listenForCategoryOrder((savedData) => {
    if (savedData) {
      if (Array.isArray(savedData)) {
        categoryCustomOrder = savedData;
      } else {
        categoryCustomOrder = savedData.order || [];
        const rawImgs = savedData.images || {};
        categoryCustomImages = {};
        Object.keys(rawImgs).forEach(k => {
          categoryCustomImages[k] = resolveDirectImageUrl(rawImgs[k]);
        });
      }
    }
    try {
      localStorage.setItem('cachedCategoryOrder', JSON.stringify(categoryCustomOrder));
      localStorage.setItem('cachedCategoryImages', JSON.stringify(categoryCustomImages));
    } catch(e) {}
    populateCategoryDropdown(allProducts);
    renderCategoryPills(allProducts, activeCategory);
  });

  // --- 2. REAL-TIME SYNC: Listen for products from Firestore ---
  listenForProducts(async (products) => {
    // Filter out soft-deleted products
    const activeProducts = products.filter(p => p.isDeleted !== true);
    
    // Auto-convert any FreeImage.host viewer links in products
    activeProducts.forEach(p => {
      if (p.image) {
        p.image = resolveDirectImageUrl(p.image);
      }
    });
    allProducts = activeProducts;
    
    // Save to LocalStorage for instant rendering on next page visit
    try {
      localStorage.setItem('cachedProducts', JSON.stringify(activeProducts));
    } catch (e) {
      console.warn("Local storage cache write error:", e);
    }
    
    populateCategoryDropdown(activeProducts);
    renderCategoryPills(activeProducts, activeCategory);
    performSearch();

    // Update animations for new elements
    document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
  });

  // Search Logic
  const searchInput = document.getElementById('productSearch');
  const categoryFilter = document.getElementById('categoryFilter');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const searchHistoryList = document.getElementById('searchHistoryList');

  function populateCategoryDropdown(products) {
    if (!categoryFilter) return;
    const rawCategories = [...new Set(products.map(p => p.category).filter(Boolean))];
    const categories = sortCategoriesByCustomOrder(rawCategories);

    const currentVal = categoryFilter.value || 'all';
    categoryFilter.innerHTML = '<option value="all">All Categories</option>' + 
      categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
    categoryFilter.value = currentVal;
  }

  const performSearch = () => {
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const selectedCategory = categoryFilter ? categoryFilter.value : activeCategory;
    activeCategory = selectedCategory;

    if (clearSearchBtn) {
      clearSearchBtn.style.display = searchTerm ? 'block' : 'none';
    }

    const filtered = allProducts.filter(p => {
      const matchesName = p.name.toLowerCase().includes(searchTerm) || 
                          (p.desc && p.desc.toLowerCase().includes(searchTerm));
      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
      return matchesName && matchesCategory;
    });
    
    renderCategoryPills(allProducts, selectedCategory);
    renderProductsUI(filtered);
    
    // Update animations for new elements
    document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
  };

  // Dynamic Category Pills Renderer
  function renderCategoryPills(products, selectedCat) {
    const wrapper = document.getElementById('categoryPillsWrapper');
    const bar = document.getElementById('categoryPillsBar');
    if (!wrapper || !bar || !products || products.length === 0) return;

    // Count products per category
    const counts = {};
    products.forEach(p => {
      if (p.category) {
        counts[p.category] = (counts[p.category] || 0) + 1;
      }
    });

    const rawCategories = Object.keys(counts);
    const categories = sortCategoriesByCustomOrder(rawCategories);

    let pillsHTML = `
      <div class="category-pill ${selectedCat === 'all' ? 'active' : ''}" data-category="all">
        <div class="pill-icon-box">
          <i class="fa-solid fa-border-all"></i>
          <span class="pill-badge">${products.length}</span>
        </div>
        <span class="pill-title">All Categories</span>
      </div>
    `;

    categories.forEach(cat => {
      const count = counts[cat];
      const iconClass = getCategoryIcon(cat);
      const rawImg = categoryCustomImages[cat] || categoryCustomImages[cat.toUpperCase()] || categoryCustomImages[cat.toLowerCase()];
      const customImg = resolveDirectImageUrl(rawImg);
      const isActive = selectedCat === cat;

      const innerContent = customImg 
        ? `<img src="${customImg}" alt="${cat}" class="pill-custom-img" loading="lazy">` 
        : `<i class="${iconClass}"></i>`;

      pillsHTML += `
        <div class="category-pill ${isActive ? 'active' : ''}" data-category="${cat}">
          <div class="pill-icon-box">
            ${innerContent}
            <span class="pill-badge">${count}</span>
          </div>
          <span class="pill-title">${cat}</span>
        </div>
      `;
    });

    bar.innerHTML = pillsHTML;
    wrapper.style.display = 'block';

    // Update Category Count badge
    const totalCatCountEl = document.getElementById('totalCategoriesCount');
    if (totalCatCountEl) {
      totalCatCountEl.textContent = categories.length + 1;
    }

    // Populate Explore All Modal Grid
    const modalGrid = document.getElementById('catModalGrid');
    if (modalGrid) {
      let modalHTML = `
        <div class="cat-modal-card ${selectedCat === 'all' ? 'active' : ''}" data-category="all">
          <div class="pill-icon-box">
            <i class="fa-solid fa-border-all"></i>
            <span class="pill-badge">${products.length}</span>
          </div>
          <span class="pill-title">All Categories</span>
        </div>
      `;

      categories.forEach(cat => {
        const count = counts[cat];
        const iconClass = getCategoryIcon(cat);
        const rawImg = categoryCustomImages[cat] || categoryCustomImages[cat.toUpperCase()] || categoryCustomImages[cat.toLowerCase()];
        const customImg = resolveDirectImageUrl(rawImg);
        const isActive = selectedCat === cat;

        const innerContent = customImg 
          ? `<img src="${customImg}" alt="${cat}" class="pill-custom-img" loading="lazy">` 
          : `<i class="${iconClass}"></i>`;

        modalHTML += `
          <div class="cat-modal-card ${isActive ? 'active' : ''}" data-category="${cat}">
            <div class="pill-icon-box">
              ${innerContent}
              <span class="pill-badge">${count}</span>
            </div>
            <span class="pill-title">${cat}</span>
          </div>
        `;
      });
      modalGrid.innerHTML = modalHTML;

      // Add click listener to modal category cards
      modalGrid.querySelectorAll('.cat-modal-card').forEach(card => {
        card.onclick = () => {
          const cat = card.getAttribute('data-category');
          activeCategory = cat;
          if (categoryFilter) categoryFilter.value = cat;
          performSearch();
          closeExploreModal();
          const target = document.getElementById('products-container');
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        };
      });
    }

    // Add click listeners to category pills
    bar.querySelectorAll('.category-pill').forEach(pill => {
      pill.onclick = () => {
        const cat = pill.getAttribute('data-category');
        activeCategory = cat;
        if (categoryFilter) categoryFilter.value = cat;
        performSearch();
        if (cat === 'all') {
          openExploreModal();
        } else {
          const target = document.getElementById('products-container');
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      };
    });
  }

  // Explore Categories Modal Handlers
  const modalOverlay = document.getElementById('exploreCategoriesModal');
  const openModalBtn = document.getElementById('openExploreModalBtn');
  const closeModalBtn = document.getElementById('closeExploreModalBtn');

  function openExploreModal() {
    if (modalOverlay) modalOverlay.classList.add('active');
  }

  function closeExploreModal() {
    if (modalOverlay) modalOverlay.classList.remove('active');
  }

  if (openModalBtn) openModalBtn.onclick = openExploreModal;
  if (closeModalBtn) closeModalBtn.onclick = closeExploreModal;
  if (modalOverlay) {
    modalOverlay.onclick = (e) => {
      if (e.target === modalOverlay) closeExploreModal();
    };
  }

  // --- Smart Professional Search System ---
  const MAX_HISTORY = 5;
  const getHistory = () => JSON.parse(localStorage.getItem('searchHistory') || '[]');
  
  const saveHistory = (term) => {
    if (!term || term.length < 2) return;
    let history = getHistory();
    history = history.filter(item => item.toLowerCase() !== term.toLowerCase());
    history.unshift(term);
    if (history.length > MAX_HISTORY) history.pop();
    localStorage.setItem('searchHistory', JSON.stringify(history));
  };

  const deleteHistoryItem = (term) => {
    let history = getHistory();
    history = history.filter(item => item !== term);
    localStorage.setItem('searchHistory', JSON.stringify(history));
    renderSearchDropdown();
  };

  // Render Smart Dropdown (History + Popular Searches + Instant Product Matches)
  const renderSearchDropdown = () => {
    if (!searchHistoryList || !searchInput) return;
    const term = searchInput.value.toLowerCase().trim();

    // 1. If user is typing, show instant product suggestions
    if (term.length > 0) {
      const matches = allProducts.filter(p => 
        p.name.toLowerCase().includes(term) || 
        (p.category && p.category.toLowerCase().includes(term)) ||
        (p.desc && p.desc.toLowerCase().includes(term))
      ).slice(0, 5); // Limit top 5 suggestions

      if (matches.length === 0) {
        searchHistoryList.innerHTML = `
          <div style="padding: 1rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
            No matching items found for "<strong>${term}</strong>"
          </div>
        `;
        searchHistoryList.style.display = 'block';
        return;
      }

      let suggestHTML = `
        <div class="search-dropdown-section-header">
          <i class="fa-solid fa-sparkles" style="color: var(--primary);"></i> Matching Products (${matches.length})
        </div>
      `;

      matches.forEach(item => {
        suggestHTML += `
          <div class="search-suggest-item" data-id="${item.id}" data-name="${item.name}">
            <img src="${item.image}" alt="${item.name}" class="suggest-img">
            <div class="suggest-info">
              <span class="suggest-title">${item.name}</span>
              <div class="suggest-meta">
                <span class="suggest-price">₹${item.price}</span>
                <span>• ${item.category}</span>
              </div>
            </div>
            <i class="fa-solid fa-chevron-right" style="color: #cbd5e1; font-size: 0.8rem;"></i>
          </div>
        `;
      });

      searchHistoryList.innerHTML = suggestHTML;
      searchHistoryList.style.display = 'block';

      // Click listener for instant suggestions
      searchHistoryList.querySelectorAll('.search-suggest-item').forEach(el => {
        el.addEventListener('click', () => {
          const name = el.getAttribute('data-name');
          searchInput.value = name;
          saveHistory(name);
          performSearch();
          searchHistoryList.style.display = 'none';
          const target = document.getElementById('products-container');
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });
      return;
    }

    // 2. If search input is empty, show History + Popular Search Chips
    const history = getHistory();
    const popularTags = ['Biscuits', 'Maggi', 'Ice Cream', 'Chocolate', 'Bread', 'Beverages'];

    let dropdownHTML = '';

    if (history.length > 0) {
      dropdownHTML += `
        <div class="search-dropdown-section-header">
          <i class="fa-solid fa-clock-rotate-left"></i> Recent Searches
        </div>
      `;
      history.forEach(item => {
        dropdownHTML += `
          <div class="search-history-item" data-term="${item}">
            <div class="search-history-text">
              <i class="fa-solid fa-magnifying-glass" style="color: #94a3b8; font-size: 0.8rem;"></i>
              <span>${item}</span>
            </div>
            <i class="fa-solid fa-xmark search-history-delete" data-term="${item}"></i>
          </div>
        `;
      });
    }

    dropdownHTML += `
      <div class="search-dropdown-section-header" style="margin-top: 0.4rem;">
        <i class="fa-solid fa-fire" style="color: #f59e0b;"></i> Popular Searches
      </div>
      <div class="trending-chips-container">
        ${popularTags.map(tag => `<span class="trending-chip" data-tag="${tag}"><i class="fa-solid fa-arrow-trend-up"></i> ${tag}</span>`).join('')}
      </div>
    `;

    searchHistoryList.innerHTML = dropdownHTML;
    searchHistoryList.style.display = 'block';

    // Click listener for history items
    searchHistoryList.querySelectorAll('.search-history-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.classList.contains('search-history-delete')) {
          e.stopPropagation();
          deleteHistoryItem(e.target.dataset.term);
          return;
        }
        searchInput.value = item.dataset.term;
        performSearch();
        searchHistoryList.style.display = 'none';
      });
    });

    // Click listener for popular tags
    searchHistoryList.querySelectorAll('.trending-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const tag = chip.getAttribute('data-tag');
        searchInput.value = tag;
        saveHistory(tag);
        performSearch();
        searchHistoryList.style.display = 'none';
      });
    });
  };

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      performSearch();
      renderSearchDropdown();
    });
    
    searchInput.addEventListener('focus', () => {
      renderSearchDropdown();
    });

    searchInput.addEventListener('blur', () => {
      setTimeout(() => {
        if (searchHistoryList) searchHistoryList.style.display = 'none';
      }, 250);
      
      const term = searchInput.value.trim();
      if (term.length >= 2) {
        saveHistory(term);
      }
    });

    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const term = searchInput.value.trim();
        if (term.length >= 2) {
          saveHistory(term);
        }
        if (searchHistoryList) searchHistoryList.style.display = 'none';
        searchInput.blur();
      }
    });
  }

  if (categoryFilter) {
    categoryFilter.addEventListener('change', performSearch);
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      performSearch();
    });
  }

  // Navbar Background on Scroll
  const navbar = document.querySelector('.navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });

  // Contact Form Handling (WhatsApp Redirect)
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const firstName = document.getElementById('firstName').value;
      const lastName = document.getElementById('lastName').value;
      const email = document.getElementById('email').value;
      const message = document.getElementById('message').value;
      
      const whatsappNumber = "917014974762"; 
      const fullText = `*Name:* ${firstName} ${lastName}%0A*Message:* ${message}`;
      
      const waUrl = `https://wa.me/${whatsappNumber}?text=${fullText}`;
      window.open(waUrl, '_blank');
      
      contactForm.reset();
      alert('Thank you! Redirecting to WhatsApp...');
    });
  }
});

function renderProductsUI(products) {
  const productsContainer = document.getElementById('products-container');
  if (!productsContainer) return;
  
  let html = '';
  // Sort by ID descending to show newest products first
  products.sort((a, b) => Number(b.id) - Number(a.id)).forEach(product => {
    const inStock = product.inStock !== false;
    const discountPercent = (product.oldPrice && Number(product.oldPrice) > Number(product.price)) 
      ? Math.round(((Number(product.oldPrice) - Number(product.price)) / Number(product.oldPrice)) * 100) 
      : null;

    const waMsg = encodeURIComponent(`Hello Soni Super Market, I am interested in buying:\n*Product:* ${product.name}\n*Price:* ₹${product.price}${product.unit ? ' (' + product.unit + ')' : ''}`);
    const waUrl = `https://wa.me/917014974762?text=${waMsg}`;
    
    html += `
      <div class="product-card animate-on-scroll ${!inStock ? 'out-of-stock' : ''}">
        <div class="product-img-wrapper">
          ${discountPercent ? `<div class="product-badge" style="background: #2563eb;">${discountPercent}% OFF</div>` : (product.offer ? `<div class="product-badge">${product.offer}</div>` : '')}
          <img src="${product.image}" alt="${product.name}" class="product-img" loading="lazy" style="${!inStock ? 'filter: grayscale(1); opacity: 0.6;' : ''}">
          ${!inStock ? '<div class="out-of-stock-overlay">OUT OF STOCK</div>' : ''}
        </div>
        <div class="product-content">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
            <span class="product-category">${product.category}</span>
            ${product.unit ? `<span style="background: #f1f5f9; color: #475569; font-size: 0.75rem; font-weight: 700; padding: 2px 8px; border-radius: 6px;">${product.unit}</span>` : ''}
          </div>
          <h3 class="product-title" style="${!inStock ? 'color: var(--text-muted);' : ''}">${product.name}</h3>
          <p class="product-desc">${product.desc || ''}</p>
          
          <div class="product-footer" style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; padding-top: 0.8rem; border-top: 1px solid #f1f5f9;">
            <div class="product-price">
              <div class="price-amounts" style="display: flex; align-items: baseline; gap: 6px;">
                <span class="current-price" style="font-size: 1.3rem; font-weight: 800; color: var(--text-main);">₹${product.price}</span>
                ${(product.oldPrice && Number(product.oldPrice) > Number(product.price)) ? `<span class="old-price" style="text-decoration: line-through; color: #94a3b8; font-size: 0.95rem; font-weight: 500;">₹${product.oldPrice}</span>` : ''}
              </div>
            </div>

            <span style="font-size: 0.8rem; font-weight: 700; color: ${inStock ? '#16a34a' : '#dc2626'}; background: ${inStock ? '#f0fdf4' : '#fef2f2'}; border: 1px solid ${inStock ? '#bbf7d0' : '#fecaca'}; padding: 3px 10px; border-radius: 20px;">
              ${inStock ? 'In Stock' : 'Out of Stock'}
            </span>
          </div>
          ${product.videoLink ? `
            <a href="${product.videoLink}" target="_blank" class="product-external-link" style="margin-top: 0.8rem; display: block; text-align: center; color: var(--primary); font-size: 0.85rem; font-weight: 700;">
              <i class="fa-solid fa-play-circle"></i> Watch Video Demo
            </a>
          ` : ''}
        </div>
      </div>
    `;
  });

  if (products.length === 0) {
    html = `
      <div class="no-results animate-on-scroll">
        <i class="fa-solid fa-box-open" style="font-size: 3rem; color: #cbd5e1; margin-bottom: 1rem;"></i>
        <h3 style="font-size: 1.4rem; font-weight: 800; color: var(--text-main);">No products found</h3>
        <p style="color: var(--text-muted);">Try searching with a different product name or category filter.</p>
      </div>
    `;
    productsContainer.style.display = 'block';
  } else {
    productsContainer.style.display = 'grid';
  }

  productsContainer.innerHTML = html;
}

