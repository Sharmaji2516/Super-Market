import { listenForProducts, listenForCategoryOrder } from './firebase-config.js?v=1.1.0';

let allProducts = []; // To store products for filtering
let activeCategory = localStorage.getItem('redirectCategory') || 'all';
localStorage.removeItem('redirectCategory');
let activeSubCategory = 'all';
let categoryCustomOrder = []; // Custom category priority sequence set by Admin
let categoryCustomImages = {};

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

// Function to populate old category dropdown if present
function populateCategoryDropdown(products) {
  const categoryFilter = document.getElementById('categoryFilter');
  if (!categoryFilter) return;
  const rawCategories = [...new Set(products.map(p => p.category).filter(Boolean))];
  const categories = sortCategoriesByCustomOrder(rawCategories);

  const currentVal = categoryFilter.value || 'all';
  categoryFilter.innerHTML = '<option value="all">All Categories</option>' + 
    categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
  categoryFilter.value = currentVal;
}

// Dynamic Home Categories Renderer
function renderHomeCategories(products) {
  const homeGrid = document.getElementById('home-categories-grid');
  if (!homeGrid || !products || products.length === 0) return;

  const counts = {};
  products.forEach(p => {
    if (p.category) {
      counts[p.category] = (counts[p.category] || 0) + 1;
    }
  });

  const rawCategories = Object.keys(counts);
  const categories = sortCategoriesByCustomOrder(rawCategories);

  let html = '';
  const bgColors = ['#dcfce7', '#e0f2fe', '#fef3c7', '#fce7f3', '#f1f5f9'];
  const textColors = ['#166534', '#075985', '#92400e', '#9d174d', '#475569'];

  categories.forEach((cat, index) => {
    const iconClass = getCategoryIcon(cat);
    const rawImg = categoryCustomImages[cat] || categoryCustomImages[cat.toUpperCase()] || categoryCustomImages[cat.toLowerCase()];
    const customImg = resolveDirectImageUrl(rawImg);

    const innerContent = customImg 
      ? `<img src="${customImg}" alt="${cat}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">` 
      : `<i class="${iconClass}"></i>`;

    const idx = index % bgColors.length;

    html += `
      <a href="products.html" onclick="localStorage.setItem('redirectCategory', '${cat}')" class="home-cat-card" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 1rem 0.5rem; text-align: center; transition: var(--transition); text-decoration: none; display: flex; flex-direction: column; align-items: center;" onmouseover="this.style.borderColor='var(--primary)'; this.style.transform='translateY(-3px)'" onmouseout="this.style.borderColor='#e2e8f0'; this.style.transform='translateY(0)'">
        <div style="width: 50px; height: 50px; background: ${bgColors[idx]}; color: ${textColors[idx]}; border-radius: 50%; display: grid; place-items: center; margin-bottom: 0.6rem; font-size: 1.4rem; overflow: hidden;">
          ${innerContent}
        </div>
        <span style="font-weight: 700; font-size: 0.85rem; color: var(--text-main);">${cat}</span>
      </a>
    `;
  });

  homeGrid.innerHTML = html;
}

// Dynamic Sidebar Category Renderer
function renderSidebarFilters(products, selectedCat) {
  const list = document.getElementById('sidebarCategoryList');
  if (!list || !products || products.length === 0) return;

  // Count products per category
  const counts = {};
  products.forEach(p => {
    if (p.category) {
      counts[p.category] = (counts[p.category] || 0) + 1;
    }
  });

  const rawCategories = Object.keys(counts);
  const categories = sortCategoriesByCustomOrder(rawCategories);

  let html = `
    <label class="filter-radio-label ${selectedCat === 'all' ? 'active-filter' : ''}">
      <input type="radio" name="categoryFilterRadio" value="all" ${selectedCat === 'all' ? 'checked' : ''}>
      <span class="radio-custom"></span>
      <span class="filter-name">All Categories</span>
      <span class="filter-count">${products.length}</span>
    </label>
  `;

  categories.forEach(cat => {
    const count = counts[cat];
    const isActive = selectedCat === cat;

    html += `
      <label class="filter-radio-label ${isActive ? 'active-filter' : ''}">
        <input type="radio" name="categoryFilterRadio" value="${cat}" ${isActive ? 'checked' : ''}>
        <span class="radio-custom"></span>
        <span class="filter-name">${cat}</span>
        <span class="filter-count">${count}</span>
      </label>
    `;
  });

  list.innerHTML = html;

  // Attach listeners to newly rendered radios
  list.querySelectorAll('input[type="radio"]').forEach(radio => {
    radio.addEventListener('change', () => {
      // Update label active styling
      list.querySelectorAll('.filter-radio-label').forEach(lbl => lbl.classList.remove('active-filter'));
      if (radio.closest('.filter-radio-label')) {
        radio.closest('.filter-radio-label').classList.add('active-filter');
      }
      performSearch();
    });
  });
}

function performSearch() {
  const searchInput = document.getElementById('productSearch');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
  
  // Find selected category radio
  const selectedCategoryRadio = document.querySelector('input[name="categoryFilterRadio"]:checked');
  const selectedCategory = selectedCategoryRadio ? selectedCategoryRadio.value : (activeCategory || 'all');
  
  // Find selected price radio
  const selectedPriceRadio = document.querySelector('input[name="priceFilter"]:checked');
  const selectedPrice = selectedPriceRadio ? selectedPriceRadio.value : 'all';

  activeCategory = selectedCategory;

  if (clearSearchBtn) {
    clearSearchBtn.style.display = searchTerm ? 'block' : 'none';
  }

  const filtered = allProducts.filter(p => {
    // 1. Name match
    const matchesName = p.name.toLowerCase().includes(searchTerm) || 
                       (p.brand && p.brand.toLowerCase().includes(searchTerm)) ||
                       (p.desc && p.desc.toLowerCase().includes(searchTerm));
    
    // 2. Category match
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    
    // 3. Price match
    let matchesPrice = true;
    if (selectedPrice !== 'all' && p.price) {
      const price = Number(p.price);
      if (selectedPrice === '0-50') matchesPrice = price < 50;
      else if (selectedPrice === '50-200') matchesPrice = price >= 50 && price <= 200;
      else if (selectedPrice === '200-500') matchesPrice = price >= 200 && price <= 500;
      else if (selectedPrice === '500-plus') matchesPrice = price > 500;
    }

    return matchesName && matchesCategory && matchesPrice;
  });
  
  renderProductsUI(filtered);
}

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

    const rawYt = product.youtube_url || product.videoLink || '';
    const rawIg = product.instagram_url || '';
    let finalYtUrl = rawYt.trim();
    let finalIgUrl = rawIg.trim();
    
    if (finalYtUrl.includes('instagram.com')) {
      finalIgUrl = finalYtUrl;
      finalYtUrl = '';
    } else if (finalIgUrl.includes('youtube.com') || finalIgUrl.includes('youtu.be')) {
      finalYtUrl = finalIgUrl;
      finalIgUrl = '';
    }

    let ytEmbed = null;
    if (finalYtUrl) {
      const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
      const match = finalYtUrl.match(regExp);
      ytEmbed = (match && match[1]) ? `https://www.youtube.com/embed/${match[1]}?autoplay=0&rel=0&modestbranding=1` : null;
    }

    let igEmbed = null;
    if (finalIgUrl) {
      const match = finalIgUrl.match(/instagram\.com\/(reel|p|tv)\/([^/?#&]+)/i);
      if (match) {
        const mediaType = match[1] === 'tv' ? 'reel' : match[1];
        igEmbed = `https://www.instagram.com/${mediaType}/${match[2]}/embed`;
      }
    }

    const isYtShort = finalYtUrl.includes('/shorts/');

    html += `
      <div class="product-card ${!inStock ? 'out-of-stock' : ''}" onclick="window.location.href='product-detail.html?id=${product.id}'" style="cursor: pointer;">
        <div class="product-img-wrapper">
          ${discountPercent ? `<div class="product-badge" style="background: #2563eb;">${discountPercent}% OFF</div>` : (product.offer ? `<div class="product-badge">${product.offer}</div>` : '')}
          <img src="${product.image}" alt="${product.name}" class="product-img" loading="lazy" style="${!inStock ? 'filter: grayscale(1); opacity: 0.6;' : ''}">
          ${!inStock ? '<div class="out-of-stock-overlay">OUT OF STOCK</div>' : ''}
        </div>
        <div class="product-content">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
            <span class="product-category">${product.category}${product.subCategory ? ` > ${product.subCategory}` : ''}</span>
            ${product.unit ? `<span class="product-unit-pill">${product.unit}</span>` : ''}
          </div>
          <h3 class="product-title" style="${!inStock ? 'color: var(--text-muted);' : ''}">${product.name}</h3>
          ${product.desc ? `<p class="product-desc" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; font-size: 0.95rem; color: var(--text-muted); margin-bottom: 0.8rem; line-height: 1.6;">${product.desc}</p>` : ''}
          
          <div class="product-footer" style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid #f1f5f9;">
            ${product.price ? `
            <div class="product-price">
              <div class="price-amounts" style="display: flex; align-items: baseline; gap: 8px;">
                <span class="current-price" style="font-size: 1.35rem; font-weight: 900; color: var(--text-main);">₹${product.price}</span>
                ${(product.oldPrice && Number(product.oldPrice) > Number(product.price)) ? `<span class="old-price" style="text-decoration: line-through; color: #94a3b8; font-size: 0.95rem; font-weight: 600;">₹${product.oldPrice}</span>` : ''}
              </div>
            </div>
            ` : '<div></div>'}

            <div class="status-badge ${inStock ? 'in-stock' : 'out-stock'}">
              <span class="status-dot"></span>
              ${inStock ? 'In Stock' : 'Out of Stock'}
            </div>
          </div>
        </div>
      </div>
    `;
  });

  if (products.length === 0) {
    html = `
      <div class="no-results" style="grid-column: 1/-1; text-align: center; padding: 4rem 2rem; background: white; border-radius: 20px; border: 1px dashed #cbd5e1;">
        <i class="fa-solid fa-box-open" style="font-size: 3.5rem; color: #94a3b8; margin-bottom: 1rem;"></i>
        <h3 style="font-size: 1.4rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.5rem;">No products found</h3>
        <p style="color: var(--text-muted); font-size: 0.95rem;">Try adjusting your search terms or filters to find what you're looking for.</p>
      </div>
    `;
  }

  productsContainer.innerHTML = html;
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
        renderSidebarFilters(allProducts, activeCategory);
        renderHomeCategories(allProducts);
        performSearch();
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
    renderSidebarFilters(allProducts, activeCategory);
    renderHomeCategories(allProducts);
  });

  // --- 2. REAL-TIME SYNC: Listen for products from Firestore ---
  listenForProducts(async (products) => {
    const activeProducts = products.filter(p => p.isDeleted !== true);
    
    activeProducts.forEach(p => {
      if (p.image) {
        p.image = resolveDirectImageUrl(p.image);
      }
    });
    allProducts = activeProducts;
    
    try {
      localStorage.setItem('cachedProducts', JSON.stringify(activeProducts));
    } catch (e) {
      console.warn("Local storage cache write error:", e);
    }
    
    populateCategoryDropdown(activeProducts);
    renderSidebarFilters(activeProducts, activeCategory);
    renderHomeCategories(activeProducts);
    performSearch();
  });

  // Search Logic & Listeners
  const searchInput = document.getElementById('productSearch');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const searchHistoryList = document.getElementById('searchHistoryList');
  const categoryFilter = document.getElementById('categoryFilter');

  if (categoryFilter) {
    categoryFilter.addEventListener('change', performSearch);
  }

  // Price Filter Listeners
  const priceRadios = document.querySelectorAll('input[name="priceFilter"]');
  if (priceRadios.length > 0) {
    priceRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        const priceContainer = document.getElementById('sidebarPriceList');
        if (priceContainer) {
          priceContainer.querySelectorAll('.filter-radio-label').forEach(lbl => lbl.classList.remove('active-filter'));
        }
        if (radio.closest('.filter-radio-label')) {
          radio.closest('.filter-radio-label').classList.add('active-filter');
        }
        performSearch();
      });
    });
  }

  // Accordion Expand / Collapse Handlers
  document.querySelectorAll('.filter-accordion-header').forEach(header => {
    header.addEventListener('click', () => {
      const accordion = header.closest('.filter-accordion');
      if (accordion) {
        accordion.classList.toggle('collapsed');
      }
    });
  });

  // Mobile Sidebar Toggle
  const mobileOpenBtn = document.getElementById('mobileFilterOpenBtn');
  const mobileCloseBtn = document.getElementById('mobileFilterCloseBtn');
  const sidebar = document.querySelector('.sidebar-filters');

  if (mobileOpenBtn && sidebar) {
    mobileOpenBtn.addEventListener('click', () => sidebar.classList.add('open'));
  }
  if (mobileCloseBtn && sidebar) {
    mobileCloseBtn.addEventListener('click', () => sidebar.classList.remove('open'));
  }

  // --- Smart Search System with Dropdown & History ---
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

  const renderSearchDropdown = () => {
    if (!searchHistoryList || !searchInput) return;
    const term = searchInput.value.toLowerCase().trim();

    if (term.length > 0) {
      const matches = allProducts.filter(p => 
        p.name.toLowerCase().includes(term) || 
        (p.category && p.category.toLowerCase().includes(term)) ||
        (p.desc && p.desc.toLowerCase().includes(term))
      ).slice(0, 5);

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

      searchHistoryList.querySelectorAll('.search-suggest-item').forEach(el => {
        el.addEventListener('click', () => {
          const name = el.getAttribute('data-name');
          searchInput.value = name;
          saveHistory(name);
          performSearch();
          searchHistoryList.style.display = 'none';
        });
      });
      return;
    }

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

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      performSearch();
    });
  }

  // Navbar Background on Scroll
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    });
  }

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
