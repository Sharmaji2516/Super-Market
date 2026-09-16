import { listenForProducts } from './firebase-config.js?v=1.3.5';

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
      ? `<div class="product-video-embed-section">${videoCardsHtml}</div>` 
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
        <div class="product-page-img-container">
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
          
          ${product.unit ? `
          <div class="product-page-pack-size" style="margin-bottom: 2rem;">
            <div style="font-size: 0.75rem; font-weight: 700; color: #6b7280; text-transform: uppercase; margin-bottom: 10px; letter-spacing: 0.5px;">PACK SIZE / OPTION</div>
            <div style="display: inline-flex; align-items: center; justify-content: center; padding: 8px 16px; border: 1px solid #10b981; border-radius: 20px; font-size: 0.85rem; font-weight: 700; color: #047857; background: #ecfdf5; min-width: 80px;">
              ${product.unit}
            </div>
          </div>
          ` : ''}

          <div class="product-page-desc" style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 1.25rem;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
              <i class="fa-solid fa-circle-info" style="color: #6b7280; font-size: 1.2rem;"></i>
              <h3 style="margin: 0; font-size: 1.05rem; color: #111827; font-weight: 700;">About this product</h3>
            </div>
            <p style="color: #4b5563; font-size: 0.95rem; line-height: 1.5; margin: 0;">${product.desc ? product.desc.replace(/\n/g, '<br>') : 'No description available for this product.'}</p>
          </div>
        </div>
      </div>
      ${videoSectionHtml}
      ${relatedHtml}
    `;
  });
});
