import { listenForProducts } from './firebase-config.js?v=1.4.2';

// --- Smart In-Store Shopping List (Digital Parchi) ---
function getShoppingList() {
  try {
    const raw = localStorage.getItem('soni_shopping_list');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveShoppingList(list) {
  try {
    localStorage.setItem('soni_shopping_list', JSON.stringify(list));
  } catch (e) { }
  updateParchiUI();
}

window.addToShoppingList = (id, name, price, oldPrice, unit, image) => {
  let list = getShoppingList();
  const existing = list.find(item => String(item.id) === String(id));
  if (existing) {
    existing.qty = (existing.qty || 1) + 1;
  } else {
    list.push({
      id: String(id),
      name: name || 'Item',
      price: Number(price) || 0,
      oldPrice: Number(oldPrice) || 0,
      unit: unit || '',
      image: image || '',
      qty: 1,
      checked: false
    });
  }
  saveShoppingList(list);
};

window.updateParchiQty = (id, delta) => {
  let list = getShoppingList();
  const item = list.find(it => String(it.id) === String(id));
  if (item) {
    item.qty = (item.qty || 1) + delta;
    if (item.qty <= 0) {
      list = list.filter(it => String(it.id) !== String(id));
    }
    saveShoppingList(list);
  }
};

window.removeFromShoppingList = (id) => {
  let list = getShoppingList();
  list = list.filter(it => String(it.id) !== String(id));
  saveShoppingList(list);
};

window.clearShoppingList = () => {
  if (confirm('Are you sure you want to clear your shopping list?')) {
    saveShoppingList([]);
  }
};

window.toggleParchiItemCheck = (id) => {
  let list = getShoppingList();
  const item = list.find(it => String(it.id) === String(id));
  if (item) {
    item.checked = !item.checked;
    saveShoppingList(list);
  }
};

window.toggleShoppingListDrawer = (forceOpen = null) => {
  const drawer = document.getElementById('shoppingListDrawer');
  let backdrop = document.querySelector('.filter-backdrop');
  if (!drawer) return;

  const shouldOpen = forceOpen !== null ? forceOpen : !drawer.classList.contains('active');
  if (shouldOpen) {
    drawer.classList.add('active');
    if (backdrop) backdrop.classList.add('active');
    updateParchiUI();
  } else {
    drawer.classList.remove('active');
    if (backdrop && !document.querySelector('.nav-links.nav-active')) {
      backdrop.classList.remove('active');
    }
  }
};

window.sendListToWhatsApp = () => {
  const list = getShoppingList();
  if (list.length === 0) {
    alert('Your shopping list is empty! Add products first.');
    return;
  }

  let text = `*Namaste Soni Super Market!* 🛒%0AYeh meri in-store shopping list hai:%0A%0A`;
  let total = 0;

  list.forEach((item, index) => {
    const itemTotal = (item.price || 0) * (item.qty || 1);
    total += itemTotal;
    text += `${index + 1}. *${encodeURIComponent(item.name)}* ${item.unit ? `(${item.unit})` : ''} x ${item.qty} = ₹${itemTotal}%0A`;
  });

  text += `%0A*Total Estimated Bill:* ₹${total}%0AKripya bataiye kya sab items stock me hain. Dhanyawad!`;
  window.open(`https://wa.me/917014974762?text=${text}`, '_blank');
};

function updateParchiUI() {
  const list = getShoppingList();
  const totalCount = list.reduce((sum, it) => sum + (it.qty || 1), 0);
  const totalVal = list.reduce((sum, it) => sum + ((it.price || 0) * (it.qty || 1)), 0);

  const barCount = document.getElementById('barParchiCount');
  const drawerCount = document.getElementById('parchiTotalCount');
  const drawerTotal = document.getElementById('parchiEstimatedTotal');
  const itemsContainer = document.getElementById('parchiItemsContainer');

  if (barCount) barCount.textContent = totalCount;
  if (drawerCount) drawerCount.textContent = totalCount;
  if (drawerTotal) drawerTotal.textContent = `₹${totalVal}`;

  if (itemsContainer) {
    if (list.length === 0) {
      itemsContainer.innerHTML = `
        <div style="text-align: center; padding: 3rem 1rem; color: #94a3b8;">
          <i class="fa-solid fa-basket-shopping" style="font-size: 2.5rem; margin-bottom: 0.8rem; color: #cbd5e1;"></i>
          <p style="font-size: 0.95rem; font-weight: 700; color: #475569; margin-bottom: 0.3rem;">Your Shopping List is Empty</p>
          <p style="font-size: 0.82rem;">Click "+ Add to List" on any product to create your in-store checklist!</p>
        </div>
      `;
    } else {
      let html = '';
      list.forEach(item => {
        html += `
          <div class="parchi-item-row ${item.checked ? 'checked' : ''}">
            <input type="checkbox" class="parchi-checkbox" ${item.checked ? 'checked' : ''} onchange="window.toggleParchiItemCheck('${item.id}')" title="Mark as picked in store">
            ${item.image ? `<img src="${item.image}" alt="" class="parchi-item-img">` : ''}
            <div class="parchi-item-details">
              <div class="parchi-item-title">${item.name}</div>
              <div class="parchi-item-meta">
                <span>₹${item.price} each</span>
                ${item.unit ? `<span>• ${item.unit}</span>` : ''}
              </div>
            </div>
            <div class="parchi-qty-controls">
              <button type="button" class="btn-qty-step" onclick="window.updateParchiQty('${item.id}', -1)">-</button>
              <span class="parchi-qty-num">${item.qty}</span>
              <button type="button" class="btn-qty-step" onclick="window.updateParchiQty('${item.id}', 1)">+</button>
            </div>
            <button type="button" class="btn-remove-parchi" onclick="window.removeFromShoppingList('${item.id}')" title="Remove">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        `;
      });
      itemsContainer.innerHTML = html;
    }
  }

  document.querySelectorAll('.btn-add-list').forEach(btn => {
    const pid = btn.getAttribute('data-pid');
    const inList = list.find(it => String(it.id) === String(pid));
    if (inList) {
      btn.classList.add('in-list');
      btn.innerHTML = `<i class="fa-solid fa-check"></i> In List (${inList.qty})`;
    } else {
      btn.classList.remove('in-list');
      btn.innerHTML = `<i class="fa-solid fa-plus"></i> Add to List`;
    }
  });
}

export function getYouTubeEmbedUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = trimmed.match(regExp);
  return (match && match[1]) ? `https://www.youtube.com/embed/${match[1]}?autoplay=0&rel=0&modestbranding=1` : null;
}

export function getInstagramEmbedUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  const match = trimmed.match(/instagram\.com\/(reel|p|tv|reels)\/([^/?#&]+)/i);
  if (!match) return null;
  const mediaType = match[1] === 'tv' ? 'reel' : (match[1] === 'reels' ? 'reel' : match[1]);
  const mediaId = match[2];
  return `https://www.instagram.com/${mediaType}/${mediaId}/embed`;
}

export function getFacebookEmbedUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (trimmed.includes('facebook.com') || trimmed.includes('fb.watch')) {
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(trimmed)}&show_text=0&width=500`;
  }
  return null;
}

document.addEventListener('DOMContentLoaded', () => {
  // Mobile Menu Toggle
  const menuBtn = document.querySelector('.menu-btn');
  const navLinks = document.querySelector('.nav-links');
  const mobileNavCloseBtn = document.getElementById('mobileNavCloseBtn');
  let backdrop = document.querySelector('.filter-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.className = 'filter-backdrop';
    document.body.appendChild(backdrop);
  }

  const closeNavDrawer = () => {
    if (navLinks) navLinks.classList.remove('nav-active');
    if (backdrop) backdrop.classList.remove('active');
    if (menuBtn) {
      const icon = menuBtn.querySelector('i');
      if (icon) {
        icon.classList.remove('fa-times', 'fa-xmark');
        icon.classList.add('fa-bars');
      }
    }
  };

  const openNavDrawer = () => {
    if (navLinks) navLinks.classList.add('nav-active');
    if (backdrop) backdrop.classList.add('active');
    if (menuBtn) {
      const icon = menuBtn.querySelector('i');
      if (icon) {
        icon.classList.remove('fa-bars');
        icon.classList.add('fa-xmark');
      }
    }
  };

  if (menuBtn) {
    menuBtn.addEventListener('click', () => {
      if (navLinks && navLinks.classList.contains('nav-active')) {
        closeNavDrawer();
      } else {
        openNavDrawer();
      }
    });
  }

  if (mobileNavCloseBtn) {
    mobileNavCloseBtn.addEventListener('click', closeNavDrawer);
  }

  if (backdrop) {
    backdrop.addEventListener('click', closeNavDrawer);
  }

  document.querySelectorAll('.drawer-menu-list a').forEach(link => {
    link.addEventListener('click', closeNavDrawer);
  });

  updateParchiUI();

  const container = document.getElementById('productDetailContainer');
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');

  if (!productId) {
    container.innerHTML = `
      <div style="text-align: center; padding: 4rem 1rem;">
        <i class="fa-solid fa-triangle-exclamation" style="font-size: 3rem; color: #cbd5e1; margin-bottom: 1rem;"></i>
        <h2>Product Not Found</h2>
        <p style="color: var(--text-muted); margin-bottom: 2rem;">We couldn't find the product you're looking for.</p>
        <a href="products.html" class="btn" style="background: var(--primary); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 700;">Browse All Products</a>
      </div>
    `;
    return;
  }

  listenForProducts((products) => {
    const product = products.find(p => String(p.id) === String(productId));

    if (!product) {
      container.innerHTML = `
        <div style="text-align: center; padding: 4rem 1rem;">
          <i class="fa-solid fa-box-open" style="font-size: 3rem; color: #cbd5e1; margin-bottom: 1rem;"></i>
          <h2>Product Not Available</h2>
          <p style="color: var(--text-muted); margin-bottom: 2rem;">This product might have been removed or is no longer available.</p>
          <a href="products.html" class="btn" style="background: var(--primary); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 700;">Back to Products</a>
        </div>
      `;
      return;
    }

    // Render product details
    const inStock = product.inStock !== false;
    const customOffer = (product.offer || product.offerBadge || '').trim();
    const discountPercent = (product.oldPrice && Number(product.oldPrice) > Number(product.price))
      ? Math.round(((Number(product.oldPrice) - Number(product.price)) / Number(product.oldPrice)) * 100)
      : null;
    const badgeLabel = customOffer || (discountPercent ? `${discountPercent}% OFF` : '');

    // Collect all candidate video links from all fields
    const candidateLinks = [
      product.youtube_url,
      product.instagram_url,
      product.videoLink
    ].filter(link => link && typeof link === 'string' && link.trim().length > 0);

    let videoCardsHtml = '';
    const renderedEmbeds = new Set();

    candidateLinks.forEach(link => {
      const trimmed = link.trim();

      // 1. YouTube
      const ytEmbed = getYouTubeEmbedUrl(trimmed);
      if (ytEmbed && !renderedEmbeds.has(ytEmbed)) {
        renderedEmbeds.add(ytEmbed);
        const isYtShort = trimmed.includes('/shorts/');
        videoCardsHtml += `
          <div class="video-embed-card yt-card">
            <div class="video-header" style="color: #ff0000;">
              <span><i class="fa-brands fa-youtube" style="margin-right: 8px;"></i> Product Video Showcase</span>
            </div>
            <div class="video-frame-wrapper ${isYtShort ? 'is-shorts' : 'is-landscape'}">
              <iframe 
                src="${ytEmbed}"
                title="YouTube Video"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              ></iframe>
            </div>
          </div>
        `;
        return;
      }

      // 2. Instagram
      const igEmbed = getInstagramEmbedUrl(trimmed);
      if (igEmbed && !renderedEmbeds.has(igEmbed)) {
        renderedEmbeds.add(igEmbed);
        videoCardsHtml += `
          <div class="video-embed-card ig-card">
            <div class="video-header" style="color: #e1306c;">
              <span><i class="fa-brands fa-instagram" style="margin-right: 8px;"></i> Instagram Reel Showcase</span>
            </div>
            <div class="video-frame-wrapper is-shorts">
              <iframe 
                src="${igEmbed}"
                title="Instagram Reel"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        `;
        return;
      }

      // 3. Facebook
      const fbEmbed = getFacebookEmbedUrl(trimmed);
      if (fbEmbed && !renderedEmbeds.has(fbEmbed)) {
        renderedEmbeds.add(fbEmbed);
        videoCardsHtml += `
          <div class="video-embed-card fb-card">
            <div class="video-header" style="color: #1877f2;">
              <span><i class="fa-brands fa-facebook" style="margin-right: 8px;"></i> Facebook Video Showcase</span>
            </div>
            <div class="video-frame-wrapper is-landscape">
              <iframe 
                src="${fbEmbed}"
                title="Facebook Video"
                allowFullScreen
                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
              ></iframe>
            </div>
          </div>
        `;
        return;
      }
    });

    const videoSectionHtml = videoCardsHtml
      ? `<div class="product-video-embed-section" style="margin-top: 0.5rem; margin-bottom: 1.75rem; align-items: flex-start;">${videoCardsHtml}</div>`
      : '';

    // -----------------------------------------------------
    // "You may also like" Section Logic
    // -----------------------------------------------------
    // Utility to shuffle an array
    const shuffleArray = (array) => {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };

    const activeProductsList = products.filter(p => p.isDeleted !== true && String(p.id) !== String(product.id));

    // Get same category products and shuffle them so it's dynamic
    let sameCatProducts = activeProductsList.filter(p => p.category === product.category);
    let relatedProducts = shuffleArray(sameCatProducts);

    if (relatedProducts.length < 10) {
      const otherProducts = activeProductsList.filter(p => p.category !== product.category);
      // Sort by newest first
      otherProducts.sort((a, b) => Number(b.id) - Number(a.id));
      // Take top 30 newest and shuffle them to add variety
      const recentOtherProducts = shuffleArray(otherProducts.slice(0, 30));

      const needed = 10 - relatedProducts.length;
      relatedProducts = relatedProducts.concat(recentOtherProducts.slice(0, needed));
    }

    relatedProducts = relatedProducts.slice(0, 10);

    let relatedHtml = '';
    if (relatedProducts.length > 0) {
      let cardsHtml = '';
      relatedProducts.forEach(relProd => {
        const inStockRel = relProd.inStock !== false;
        const discountPercentRel = (relProd.oldPrice && Number(relProd.oldPrice) > Number(relProd.price))
          ? Math.round(((Number(relProd.oldPrice) - Number(relProd.price)) / Number(relProd.oldPrice)) * 100)
          : null;

        cardsHtml += `
          <div class="product-card ${!inStockRel ? 'out-of-stock' : ''}" onclick="window.location.href='product-detail.html?id=${relProd.id}'" style="cursor: pointer;">
            <div class="product-img-wrapper" style="position: relative;">
              <img src="${relProd.image}" alt="${relProd.name}" class="product-img" loading="lazy" style="${!inStockRel ? 'filter: grayscale(1); opacity: 0.6;' : ''}">
              ${!inStockRel ? '<div class="out-of-stock-overlay">OUT OF STOCK</div>' : ''}
              
              <!-- Share Button -->
              <button class="share-product-btn" style="position: absolute; bottom: 8px; right: 8px; width: 32px; height: 32px; border-radius: 50%; background: white; border: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.1); font-size: 0.8rem; color: #4b5563; z-index: 5;" onclick="event.stopPropagation(); shareProduct('${relProd.name.replace(/'/g, "\\'")}', '${relProd.id}')">
                <i class="fa-solid fa-share-nodes"></i>
              </button>
            </div>
            <div class="product-content">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
                <span class="product-category">${relProd.category}${relProd.subCategory ? ` > ${relProd.subCategory}` : ''}</span>
                ${relProd.unit ? `<span class="product-unit-pill">${relProd.unit}</span>` : ''}
              </div>
              <h3 class="product-title" style="${!inStockRel ? 'color: var(--text-muted);' : ''}">${relProd.name}</h3>
              
              <div class="product-footer" style="display: flex; flex-direction: column; gap: 0.65rem; margin-top: auto; padding-top: 0.75rem; border-top: 1px solid #f1f5f9;">
                  ${relProd.price ? `
                  <div class="product-price-amazon">
                    ${(relProd.oldPrice && Number(relProd.oldPrice) > Number(relProd.price)) ? `
                      <div class="price-mrp-row">
                        <span class="price-mrp-label">MRP:</span>
                        <span class="price-mrp">₹${relProd.oldPrice}</span>
                        <span class="price-off">${discountPercentRel}% OFF</span>
                      </div>
                      <div class="price-offer-row">
                        <span class="price-offer-label">Offer Price:</span>
                        <span class="price-main">₹${relProd.price}</span>
                      </div>
                    ` : `
                      <div class="price-offer-row">
                        <span class="price-offer-label">Price:</span>
                        <span class="price-main">₹${relProd.price}</span>
                      </div>
                    `}
                  </div>
                  ` : '<div></div>'}

                  <div class="product-stock-center">
                    <div class="status-badge ${inStockRel ? 'in-stock' : 'out-stock'}">
                      <span class="status-dot"></span>
                      ${inStockRel ? 'IN STOCK' : 'OUT OF STOCK'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
        `;
      });

      relatedHtml = `
        <div class="related-products-section" style="margin-top: 3.5rem; padding-top: 2.5rem; border-top: 1px solid #e5e7eb;">
          <div style="margin-bottom: 1.5rem;">
            <div style="font-size: 0.75rem; font-weight: 700; color: #047857; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">MORE FOR YOU</div>
            <h2 style="font-size: 1.4rem; font-weight: 800; color: #111827; margin: 0;">You may also like</h2>
          </div>
          <div class="products-grid">
            ${cardsHtml}
          </div>
        </div>
      `;
    }

    window.shareProduct = async (title, id) => {
      const url = window.location.origin + window.location.pathname + '?id=' + id;
      if (navigator.share) {
        try {
          await navigator.share({
            title: title + ' | CHITTORGARH HUB',
            text: 'Check out this product on Chittorgarh Hub!',
            url: url
          });
        } catch (err) {
          console.log('User cancelled share or error:', err);
        }
      } else {
        navigator.clipboard.writeText(url)
          .then(() => alert('Product link copied to clipboard!'))
          .catch(err => console.error('Error copying link: ', err));
      }
    };

    container.innerHTML = `
      <div class="product-page-layout">
        <!-- Image Section -->
        <div class="product-page-img-container" style="position: relative;">
          <button class="share-product-btn" onclick="shareProduct('${product.name.replace(/'/g, "\\'")}', '${product.id}')" title="Share Product" aria-label="Share">
            <i class="fa-solid fa-share-nodes"></i>
          </button>
          <img src="${product.image}" alt="${product.name}" class="product-page-img" ${!inStock ? 'style="filter: grayscale(1); opacity: 0.6;"' : ''}>
          ${!inStock ? '<div class="out-of-stock-overlay" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.7); color: white; padding: 10px 20px; border-radius: 8px; font-weight: 800;">OUT OF STOCK</div>' : ''}
        </div>

        <!-- Details Section -->
        <div class="product-page-details">
          <div class="product-page-meta">
            <span class="product-page-cat">${product.category}${product.subCategory ? ` <i class="fa-solid fa-chevron-right" style="font-size: 0.7rem; margin: 0 4px;"></i> ${product.subCategory}` : ''}</span>
          </div>
          
          <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 15px; margin-bottom: 1rem;">
            <h1 class="product-page-title" style="margin-bottom: 0;">${product.name}</h1>
            <div class="product-page-stock ${inStock ? 'stock-in' : 'stock-out'}" style="margin-bottom: 0; padding: 6px 16px; font-size: 0.85rem; box-shadow: none;">
              <i class="fa-solid ${inStock ? 'fa-check-circle' : 'fa-times-circle'}"></i> 
              ${inStock ? 'Currently In Stock' : 'Out of Stock'}
            </div>
          </div>

          <div class="product-page-price-box" style="margin-bottom: 1.5rem; padding: 0; background: none; border: none; box-shadow: none;">
            ${(product.oldPrice && Number(product.oldPrice) > Number(product.price)) ? `
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
                <span style="font-size: 1.8rem; font-weight: 800; color: var(--text-dark);">₹${product.price}</span>
                <span style="font-size: 1.1rem; color: #9ca3af; text-decoration: line-through;">₹${product.oldPrice}</span>
                <span style="background: #0d8320; color: white; padding: 4px 8px; border-radius: 4px; font-weight: 700; font-size: 0.75rem;">${Math.round(((Number(product.oldPrice) - Number(product.price)) / Number(product.oldPrice)) * 100)}% OFF</span>
              </div>
              <div style="color: #0d8320; font-weight: 600; font-size: 0.9rem; margin-bottom: 4px;">
                You save ₹${Number(product.oldPrice) - Number(product.price)} on this item
              </div>
            ` : `
              <div style="margin-bottom: 4px;">
                <span style="font-size: 1.8rem; font-weight: 800; color: var(--text-dark);">₹${product.price}</span>
              </div>
            `}
            <div style="color: #6b7280; font-size: 0.85rem;">Inclusive of all taxes</div>
          </div>

          <!-- Add to Shopping List Action -->
          <div style="display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 1.5rem;">
            <button type="button" class="btn-add-list" data-pid="${product.id}" onclick="window.addToShoppingList('${product.id}', '${(product.name || '').replace(/'/g, "\\'")}', ${Number(product.price) || 0}, ${Number(product.oldPrice) || 0}, '${(product.unit || '').replace(/'/g, "\\'")}', '${(product.image || '').replace(/'/g, "\\'")}')" style="height: 46px; font-size: 0.95rem; border-radius: 12px; padding: 0 24px; max-width: 320px; width: 100%;">
              <i class="fa-solid fa-plus"></i> Add to List
            </button>
          </div>

          ${videoSectionHtml}

          <div class="product-page-desc" style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 1.25rem;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
              <i class="fa-solid fa-circle-info" style="color: #6b7280; font-size: 1.2rem;"></i>
              <h3 style="margin: 0; font-size: 1.05rem; color: #111827; font-weight: 700;">About this product</h3>
            </div>
            <p style="color: #4b5563; font-size: 0.95rem; line-height: 1.5; margin: 0;">${product.desc ? product.desc.replace(/\n/g, '<br>') : 'No description available for this product.'}</p>
          </div>
        </div>
      </div>
      ${relatedHtml}
    `;

    updateParchiUI();
  });
});
