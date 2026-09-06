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

    container.innerHTML = `
      <div class="product-page-layout">
        <!-- Image Section -->
        <div class="product-page-img-container">
          <img src="${product.image}" alt="${product.name}" class="product-page-img" ${!inStock ? 'style="filter: grayscale(1); opacity: 0.6;"' : ''}>
          ${!inStock ? '<div class="out-of-stock-overlay" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.7); color: white; padding: 10px 20px; border-radius: 8px; font-weight: 800;">OUT OF STOCK</div>' : ''}
        </div>

        <!-- Details Section -->
        <div class="product-page-details">
          <div class="product-page-meta">
            <span class="product-page-cat">${product.category}${product.subCategory ? ` <i class="fa-solid fa-chevron-right" style="font-size: 0.7rem; margin: 0 4px;"></i> ${product.subCategory}` : ''}</span>
            ${product.unit ? `<span class="product-page-unit">Unit: ${product.unit}</span>` : ''}
          </div>
          
          <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 15px; margin-bottom: 1.5rem;">
            <h1 class="product-page-title" style="margin-bottom: 0;">${product.name}</h1>
            <div class="product-page-stock ${inStock ? 'stock-in' : 'stock-out'}" style="margin-bottom: 0; padding: 6px 16px; font-size: 0.85rem; box-shadow: none;">
              <i class="fa-solid ${inStock ? 'fa-check-circle' : 'fa-times-circle'}"></i> 
              ${inStock ? 'Currently In Stock' : 'Out of Stock'}
            </div>
          </div>

          <div class="product-page-price-box">
            ${(product.oldPrice && Number(product.oldPrice) > Number(product.price)) ? `
              <div class="product-page-mrp-row">
                <span class="product-page-mrp-label">MRP:</span>
                <span class="product-page-old-price">₹${product.oldPrice}</span>
                <span class="product-page-discount-tag">${Math.round(((Number(product.oldPrice) - Number(product.price)) / Number(product.oldPrice)) * 100)}% OFF</span>
              </div>
              <div class="product-page-offer-row">
                <span class="product-page-offer-label">Offer Price:</span>
                <span class="product-page-price">₹${product.price}</span>
              </div>
            ` : `
              <div class="product-page-offer-row">
                <span class="product-page-offer-label">Price:</span>
                <span class="product-page-price">₹${product.price}</span>
              </div>
            `}
          </div>
          
          <div class="product-page-desc">
            <h3>Description</h3>
            <p>${product.desc ? product.desc.replace(/\n/g, '<br>') : 'No description available for this product.'}</p>
          </div>
        </div>
      </div>
      ${videoSectionHtml}
    `;
  });
});
