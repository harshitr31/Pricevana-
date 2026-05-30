document.addEventListener('DOMContentLoaded', () => {
    // ------------------ API CONFIG ------------------
    const API_BASE = (window.location.protocol === 'file:' || (window.location.port !== '5000' && window.location.port !== ''))
        ? 'http://127.0.0.1:5000'
        : '';

    // ------------------ DOM ELEMENTS ------------------
    const urlInput = document.getElementById('productUrl');
    const predictBtn = document.getElementById('predictBtn');
    const exampleBtn = document.getElementById('exampleBtn');
    const resultContainer = document.getElementById('result');
    const aiSection = document.getElementById('aiSection');
    const aiResult = document.getElementById('aiResult');
    const aiBtn = document.getElementById('aiBtn');
    const yearEl = document.getElementById('year');

    // Tab buttons
    const tabBtnPredictor = document.getElementById('tabBtnPredictor');
    const tabBtnDeals = document.getElementById('tabBtnDeals');
    const tabBtnWorkspace = document.getElementById('tabBtnWorkspace');
    const tabContentPredictor = document.getElementById('tabContentPredictor');
    const tabContentDeals = document.getElementById('tabContentDeals');
    const tabContentWorkspace = document.getElementById('tabContentWorkspace');

    // Workspace sub-tabs
    const workSubTabInbox = document.getElementById('workSubTabInbox');
    const workSubTabWallet = document.getElementById('workSubTabWallet');
    const workSubTabAlerts = document.getElementById('workSubTabAlerts');
    const workPaneInbox = document.getElementById('workPaneInbox');
    const workPaneWallet = document.getElementById('workPaneWallet');
    const workPaneAlerts = document.getElementById('workPaneAlerts');

    // Widgets
    const couponWidget = document.getElementById('couponWidget');
    const couponList = document.getElementById('couponList');
    const applyCouponsBtn = document.getElementById('applyCouponsBtn');
    const priceAlertWidget = document.getElementById('priceAlertWidget');
    const priceAlertForm = document.getElementById('priceAlertForm');
    const alertTargetPrice = document.getElementById('alertTargetPrice');
    const alertEmail = document.getElementById('alertEmail');

    // Inbox elements
    const inboxList = document.getElementById('inboxList');
    const emailViewerPlaceholder = document.getElementById('emailViewerPlaceholder');
    const emailViewerContent = document.getElementById('emailViewerContent');
    const emailMessageBody = document.getElementById('emailMessageBody');
    const advanceStatusBtn = document.getElementById('advanceStatusBtn');
    const inboxUnreadDot = document.getElementById('inboxUnreadDot');

    // Wallet elements
    const walletBalanceTop = document.getElementById('walletBalanceTop');
    const walletCoinsTop = document.getElementById('walletCoinsTop');
    const walletBalanceMega = document.getElementById('walletBalanceMega');
    const walletCoinsMega = document.getElementById('walletCoinsMega');
    const walletTxList = document.getElementById('walletTxList');

    // Alerts list
    const activeAlertsList = document.getElementById('activeAlertsList');
    const simulateAlertBtn = document.getElementById('simulateAlertBtn');

    // Deals Hub Elements
    const dealSearchForm = document.getElementById('dealSearchForm');
    const dealSearchInput = document.getElementById('dealSearchInput');
    const searchResultsSection = document.getElementById('searchResultsSection');
    const searchResultsGrid = document.getElementById('searchResultsGrid');
    const searchResultCount = document.getElementById('searchResultCount');
    const budgetDealsGrid = document.getElementById('budgetDealsGrid');
    const categoryDealsSection = document.getElementById('categoryDealsSection');
    const categoryDealsTitle = document.getElementById('categoryDealsTitle');
    const categoryDealsGrid = document.getElementById('categoryDealsGrid');

    // Gift Card Modal elements
    const giftCardModal = document.getElementById('giftCardModal');
    const gcCardValue = document.getElementById('gcCardValue');
    const gcModalLogoWrap = document.getElementById('gcModalLogoWrap');
    const gcModalBrandName = document.getElementById('gcModalBrandName');
    const gcModalCashbackBadge = document.getElementById('gcModalCashbackBadge');
    const gcModalRewardValue = document.getElementById('gcModalRewardValue');

    // Live Volatility Ticker
    const liveTickerTrack = document.getElementById('liveTickerTrack');

    // Grocery basket
    const bigbasketTotal = document.getElementById('bigbasketTotal');
    const blinkitTotal = document.getElementById('blinkitTotal');
    const zeptoTotal = document.getElementById('zeptoTotal');
    const bbTotalCard = document.getElementById('bbTotalCard');
    const blTotalCard = document.getElementById('blTotalCard');
    const zpTotalCard = document.getElementById('zpTotalCard');
    const bbCheapestBadge = document.getElementById('bbCheapestBadge');
    const blCheapestBadge = document.getElementById('blCheapestBadge');
    const zpCheapestBadge = document.getElementById('zpCheapestBadge');

    // Spend Lens Dashboard Elements
    const spendLensEfficiency = document.getElementById('spendLensEfficiency');
    const spendLensMissed = document.getElementById('spendLensMissed');
    const spendLensRetailerBreakdown = document.getElementById('spendLensRetailerBreakdown');

    // State Variables
    let priceChart = null;
    let selectedEmail = null;
    let localInboxEmails = [];
    let localWalletData = { balance: 0, coins: 0, transactions: [] };
    let localAlerts = [];
    let discountApplied = 0;
    let activeGcBrand = null;
    let cheapestBasketStore = "bigbasket";
    let cheapestBasketAmount = 0;

    // Persist local status states to prevent backend fetch sync overrides
    const readEmailIds = new Set();
    const localEmailStatuses = new Map();

    const GIFT_CARD_RATES = {
        amazon: { name: "Amazon Pay Gift Card", rate: 0.5, letter: "A", class: "bg-orange", badge: "FLAT 0.5% CASHBACK" },
        flipkart: { name: "Flipkart Gift Card", rate: 1.0, letter: "F", class: "bg-blue", badge: "FLAT 1.0% CASHBACK" },
        myntra: { name: "Myntra Gift Card", rate: 4.5, letter: "M", class: "bg-pink", badge: "FLAT 4.5% CASHBACK" },
        dominos: { name: "Dominos Pizza Card", rate: 12.0, letter: "D", class: "bg-red", badge: "FLAT 12.0% CASHBACK" },
        blinkit: { name: "Blinkit Gift Card", rate: 3.0, letter: "B", class: "bg-yellow", badge: "FLAT 3.0% CASHBACK" },
        pvr: { name: "PVR Cinema Card", rate: 18.0, letter: "P", class: "bg-purple", badge: "FLAT 18.0% CASHBACK" }
    };

    const MOCK_TICKER_DEALS = [
        { store: "AMAZON", title: "Sony WH-1000XM4 Headphones", drop: "-₹10,000" },
        { store: "FLIPKART", title: "PlayStation 5 Console Slim", drop: "-₹5,000" },
        { store: "MYNTRA", title: "Roadster Men Casual Bomber Jacket", drop: "-₹1,100" },
        { store: "AMAZON", title: "Apple MacBook Air M2", drop: "-₹20,000" },
        { store: "FLIPKART", title: "Samsung Galaxy S24 Ultra", drop: "-₹10,000" },
        { store: "MYNTRA", title: "Puma Classic Retro Sneakers", drop: "-₹2,500" }
    ];

    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // ------------------ PREMIUM THEME CONTROLLER ------------------
    const themeBtns = document.querySelectorAll('.theme-circle-btn');
    themeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = btn.getAttribute('data-theme');
            setTheme(theme);
        });
    });

    function setTheme(theme) {
        document.body.className = '';
        document.body.classList.add(`theme-${theme}`);
        
        themeBtns.forEach(btn => {
            if (btn.getAttribute('data-theme') === theme) {
                btn.style.borderColor = 'var(--text-main)';
                btn.classList.add('active');
            } else {
                btn.style.borderColor = 'transparent';
                btn.classList.remove('active');
            }
        });

        try {
            localStorage.setItem('pricevana-theme', theme);
        } catch (e) {
            console.warn("localStorage is not accessible:", e);
        }
        
        // Dynamic chart refresh on theme change
        if (priceChart && window.lastPredictionData) {
            initChart(window.lastPredictionData.history, window.lastPredictionData.future_predictions);
        }
    }

    // Load saved or default theme safely
    let savedTheme = 'lavender';
    try {
        savedTheme = localStorage.getItem('pricevana-theme') || 'lavender';
    } catch (e) {
        console.warn("localStorage is not accessible:", e);
    }
    setTheme(savedTheme);

    // ------------------ INITIAL WORKSPACE SYNC ------------------
    setTimeout(() => {
    syncWorkspace();
    initPriceTicker();
        if (window.updateBasketComparison) {
            window.updateBasketComparison();
        }

        if (window.loadBudgetDeals) {
            window.loadBudgetDeals('99', document.getElementById('tierBtn99'));
        }
    }, 100);

    // ------------------ MAIN TABS NAVIGATION ------------------
    function clearAllTabs() {
        tabBtnPredictor.classList.remove('active');
        tabBtnDeals.classList.remove('active');
        tabBtnWorkspace.classList.remove('active');
        tabContentPredictor.classList.remove('active');
        tabContentDeals.classList.remove('active');
        tabContentWorkspace.classList.remove('active');
    }

    tabBtnPredictor.addEventListener('click', () => {
        clearAllTabs();
        tabBtnPredictor.classList.add('active');
        tabContentPredictor.classList.add('active');
        document.getElementById('marketingFeaturesSection').style.display = 'block';
    });

    tabBtnDeals.addEventListener('click', () => {
        clearAllTabs();
        tabBtnDeals.classList.add('active');
        tabContentDeals.classList.add('active');
        document.getElementById('marketingFeaturesSection').style.display = 'block';
    });

    tabBtnWorkspace.addEventListener('click', () => {
        clearAllTabs();
        tabBtnWorkspace.classList.add('active');
        tabContentWorkspace.classList.add('active');
        document.getElementById('marketingFeaturesSection').style.display = 'none';
        syncWorkspace();
    });

    // ------------------ WORKSPACE SUB-TABS NAVIGATION ------------------
    function clearSubPanes() {
        workSubTabInbox.classList.remove('active');
        workSubTabWallet.classList.remove('active');
        workSubTabAlerts.classList.remove('active');
        workPaneInbox.classList.remove('active');
        workPaneWallet.classList.remove('active');
        workPaneAlerts.classList.remove('active');
    }

    workSubTabInbox.addEventListener('click', () => {
        clearSubPanes();
        workSubTabInbox.classList.add('active');
        workPaneInbox.classList.add('active');
        loadInboxData();
    });

    workSubTabWallet.addEventListener('click', () => {
        clearSubPanes();
        workSubTabWallet.classList.add('active');
        workPaneWallet.classList.add('active');
        loadWalletData();
        loadSpendLensData();
    });

    workSubTabAlerts.addEventListener('click', () => {
        clearSubPanes();
        workSubTabAlerts.classList.add('active');
        workPaneAlerts.classList.add('active');
        loadAlertsData();
    });

    // ------------------ TICKER INITIALIZER ------------------
    function initPriceTicker() {
        if (!liveTickerTrack) return;
        // Duplicate list for infinite animation loop
        const listItems = [...MOCK_TICKER_DEALS, ...MOCK_TICKER_DEALS];
        liveTickerTrack.innerHTML = listItems.map(item => `
            <div class="ticker-item">
                <span class="ticker-store">${escapeHtml(item.store)}</span>
                <span style="flex:1; margin-left: 12px; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(item.title)}</span>
                <span class="ticker-drop">${escapeHtml(item.drop)}</span>
            </div>
        `).join('');
    }

    // ------------------ GROCERY MULTI-ITEM BASKET COMPARISON ------------------
    window.updateBasketComparison = async function() {
        const checkboxes = document.querySelectorAll('.grocery-check-label input');
        const checkedItems = [];
        checkboxes.forEach(c => {
            if (c.checked) checkedItems.push(c.value);
        });

        try {
            const res = await fetch(`${API_BASE}/api/basket/compare`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: checkedItems })
            });
            const data = await res.json();

            // Render totals
            bigbasketTotal.textContent = formatCurrency(data.bigbasket, 'INR');
            blinkitTotal.textContent = formatCurrency(data.blinkit, 'INR');
            zeptoTotal.textContent = formatCurrency(data.zepto, 'INR');

            // Clear cheapest classes & badges
            bbTotalCard.style.borderColor = '#e2e8f0';
            blTotalCard.style.borderColor = '#e2e8f0';
            zpTotalCard.style.borderColor = '#e2e8f0';
            bbCheapestBadge.style.display = 'none';
            blCheapestBadge.style.display = 'none';
            zpCheapestBadge.style.display = 'none';

            cheapestBasketStore = data.cheapest;
            cheapestBasketAmount = data[data.cheapest];

            // Highlight cheapest
            if (data.cheapest === 'bigbasket') {
                bbTotalCard.style.borderColor = 'var(--secondary)';
                bbCheapestBadge.style.display = 'block';
            } else if (data.cheapest === 'blinkit') {
                blTotalCard.style.borderColor = 'var(--secondary)';
                blCheapestBadge.style.display = 'block';
            } else if (data.cheapest === 'zepto') {
                zpTotalCard.style.borderColor = 'var(--secondary)';
                zpCheapestBadge.style.display = 'block';
            }

            document.getElementById('basketCheckoutBtn').innerHTML = `Checkout Basket via ${data.cheapest.toUpperCase()} (₹${cheapestBasketAmount}) & Cashback <i data-lucide="zap"></i>`;
            lucide.createIcons();

        } catch (err) {
            console.error("Basket compare failed", err);
        }
    };

    window.checkoutCheapestBasket = async function() {
        const checkboxes = document.querySelectorAll('.grocery-check-label input');
        const checkedItems = [];
        checkboxes.forEach(c => {
            if (c.checked) checkedItems.push(c.value);
        });

        if (checkedItems.length === 0) {
            alert('Please select at least one item to checkout!');
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/api/inbox`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: `Smart Grocery Basket - ${checkedItems.length} Checked Items`,
                    price: cheapestBasketAmount,
                    url: `https://www.${cheapestBasketStore}.com/checkout`
                })
            });

            const data = await res.json();
            if (res.ok) {
                showToast("Grocery Basket Ordered! 🛒", `Captured verification receipt from ${cheapestBasketStore.toUpperCase()}! ₹${data.cashback} Cashback added!`);
                
                if (data.email) {
                    localInboxEmails.unshift(data.email);
                }

                tabBtnWorkspace.click();
                workSubTabInbox.click();
                
                if (data.email) {
                    viewEmail(data.email.id);
                }
            }
        } catch (err) {
            console.error("Grocery checkout failed", err);
        }
    };

    // ------------------ SPEND LENS DASHBOARD INTEGRATION ------------------
    async function loadSpendLensData() {
        try {
            const res = await fetch(`${API_BASE}/api/spend-lens`);
            const data = await res.json();

            spendLensEfficiency.textContent = data.efficiency_rate.toFixed(1) + '%';
            spendLensMissed.textContent = formatCurrency(data.missed_savings, 'INR');

            // Render share list progress bars
            spendLensRetailerBreakdown.innerHTML = data.retailer_breakdown.map(r => `
                <div class="spend-share-item">
                    <div class="spend-share-color-dot" style="background:${r.color};"></div>
                    <span class="spend-share-label">${escapeHtml(r.store)}</span>
                    <span class="spend-share-amount">${formatCurrency(r.amount, 'INR')}</span>
                    <div class="spend-share-progress-bar">
                        <div class="spend-share-progress-fill" style="background:${r.color}; width:${r.percentage}%;"></div>
                    </div>
                    <span style="font-size:11px; width:28px; text-align:right; font-weight:bold;">${r.percentage}%</span>
                </div>
            `).join('');

        } catch (err) {
            console.error("Spend Lens failed", err);
        }
    }

    // ------------------ DEALS SEARCH DISCOVERY ------------------
    window.executeKeywordSearch = async function(e) {
        e.preventDefault();
        const query = dealSearchInput.value.trim();
        
        try {
            const res = await fetch(`${API_BASE}/api/search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
            });
            const data = await res.json();
            
            searchResultsSection.style.display = 'block';
            searchResultCount.textContent = `${data.results.length} matched products found`;
            
            renderDealsGrid(data.results, searchResultsGrid);
            searchResultsSection.scrollIntoView({ behavior: 'smooth' });
        } catch (err) {
            console.error("Search failed", err);
        }
    };

    window.clearSearchResults = function() {
        dealSearchInput.value = '';
        searchResultsSection.style.display = 'none';
        searchResultsGrid.innerHTML = '';
    };

    // ------------------ BUDGET TIERS LOADERS ------------------
    window.loadBudgetDeals = async function(tier, button) {
        // Clear active buttons
        const buttons = document.querySelectorAll('.budget-tier-btn');
        buttons.forEach(b => b.classList.remove('active'));
        if (button) button.classList.add('active');

        budgetDealsGrid.innerHTML = `<div class="skeleton" style="height: 180px; width: 100%;"></div><div class="skeleton" style="height: 180px; width: 100%;"></div>`;
        
        try {
            const res = await fetch(`${API_BASE}/api/deals?tier=${tier}`);
            const data = await res.json();
            renderDealsGrid(data.deals, budgetDealsGrid);
        } catch (err) {
            console.error("Failed to load budget deals", err);
        }
    };

    // ------------------ CATEGORY DEALS LOADERS ------------------
    window.loadCategoryDeals = async function(category, tile) {
        // Highlight active tile
        const tiles = document.querySelectorAll('.category-tile');
        tiles.forEach(t => t.style.borderColor = 'rgba(255,255,255,0.4)');
        if (tile) tile.style.borderColor = 'var(--secondary)';

        categoryDealsSection.style.display = 'block';
        categoryDealsTitle.innerHTML = `<i data-lucide="sparkles" style="vertical-align:middle; margin-right:6px; color:var(--secondary);"></i> Hot recommendations in ${category.toUpperCase()}`;
        categoryDealsGrid.innerHTML = `<div class="skeleton" style="height: 180px; width: 100%;"></div>`;
        
        try {
            const res = await fetch(`${API_BASE}/api/deals?category=${category}`);
            const data = await res.json();
            renderDealsGrid(data.deals, categoryDealsGrid);
            lucide.createIcons();
            categoryDealsSection.scrollIntoView({ behavior: 'smooth' });
        } catch (err) {
            console.error("Failed to load category deals", err);
        }
    };

    // ------------------ RENDER DEALS UTILITY ------------------
    function renderDealsGrid(deals, targetElement) {
        if (!deals || deals.length === 0) {
            targetElement.innerHTML = `<p style="padding:20px; text-align:center; color:var(--text-muted);">No deals active in this list.</p>`;
            return;
        }

        targetElement.innerHTML = deals.map(d => {
            const ratingStars = '★'.repeat(Math.round(d.rating)) + '☆'.repeat(5 - Math.round(d.rating));
            
            return `
                <div class="deal-card fade-in">
                    <div class="deal-card-header">
                        <span class="deal-card-store">${escapeHtml(d.store)}</span>
                        <span class="deal-card-rating">${ratingStars} <span style="font-weight:700;">${d.rating}</span></span>
                    </div>
                    <h4 class="deal-card-title">${escapeHtml(d.title)}</h4>
                    <div class="deal-card-price-row">
                        <span class="deal-card-price">${formatCurrency(d.price, 'INR')}</span>
                        <span class="deal-card-orig">${formatCurrency(d.original_price, 'INR')}</span>
                        <span class="deal-card-discount">${escapeHtml(d.discount)}</span>
                    </div>
                    <div class="deal-card-footer">
                        <button class="btn ghost btn-sm" onclick="analyzeDiscoveredPrice('${escapeHtml(d.url)}')">
                            <i data-lucide="trending-down"></i> Analyze Trend
                        </button>
                        <button class="btn primary btn-sm" onclick="buyDiscoveredDeal('${escapeHtml(d.title)}', ${d.price}, '${escapeHtml(d.url)}')">
                            <i data-lucide="shopping-bag"></i> Buy Deal
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        lucide.createIcons();
    }

    window.analyzeDiscoveredPrice = function(url) {
        clearAllTabs();
        tabBtnPredictor.classList.add('active');
        tabContentPredictor.classList.add('active');
        document.getElementById('marketingFeaturesSection').style.display = 'block';
        urlInput.value = url;
        predictBtn.click();
    };

    window.buyDiscoveredDeal = async function(title, price, url) {
        try {
            const res = await fetch(`${API_BASE}/api/inbox`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, price, url })
            });

            const data = await res.json();
            if (res.ok) {
                showToast("Deal Purchased! 🛍️", `Order captured. ₹${data.cashback} Cashback credited to your Pricevana Wallet!`);
                
                if (data.email) {
                    localInboxEmails.unshift(data.email);
                }

                tabBtnWorkspace.click();
                workSubTabInbox.click();
                
                if (data.email) {
                    viewEmail(data.email.id);
                }
            }
        } catch (err) {
            console.error("Deal buy failed", err);
        }
    };

    // ------------------ GIFT CARDS DIALOG ------------------
    window.openGiftCardBuy = function(brandId) {
        const brand = GIFT_CARD_RATES[brandId];
        if (!brand) return;

        activeGcBrand = brandId;
        gcModalBrandName.textContent = brand.name;
        gcModalCashbackBadge.textContent = brand.badge;
        gcModalCashbackBadge.className = `gc-badge ${brand.class}-light`;
        
        // Show real logo inside the purchase modal
        gcModalLogoWrap.innerHTML = `<img src="static/images/stores/${brandId}.png" alt="${brand.name}" style="max-width: 80%; max-height: 80%; object-fit: contain;" />`;
        gcModalLogoWrap.className = `gc-logo-wrap`;
        gcModalLogoWrap.style.background = 'white';
        gcModalLogoWrap.style.border = '1px solid var(--border-color)';
        
        gcCardValue.value = '';
        gcModalRewardValue.textContent = '₹0.00';
        giftCardModal.style.display = 'flex';
    };

    window.closeGiftCardModal = function() {
        giftCardModal.style.display = 'none';
        activeGcBrand = null;
    };

    window.calculateGiftCardCashback = function() {
        const brand = GIFT_CARD_RATES[activeGcBrand];
        const val = parseFloat(gcCardValue.value);
        if (!brand || isNaN(val) || val <= 0) {
            gcModalRewardValue.textContent = '₹0.00';
            return;
        }

        const reward = val * (brand.rate / 100);
        gcModalRewardValue.textContent = formatCurrency(reward, 'INR');
    };

    window.processGiftCardBuy = async function(e) {
        e.preventDefault();
        const value = parseFloat(gcCardValue.value);

        if (!activeGcBrand || isNaN(value) || value <= 0) {
            alert('Please check input fields');
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/api/giftcards/buy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ brand: activeGcBrand, value })
            });

            const data = await res.json();
            if (!res.ok) {
                alert(data.error || "Purchase failed");
                return;
            }

            showToast("Voucher Confirmed! 🎁", `digital card delivered to your smart inbox! Earned ₹${data.cashback_earned} Cashback!`);
            closeGiftCardModal();

            if (data.email) {
                localInboxEmails.unshift(data.email);
            }

            // Switch to Workspace
            tabBtnWorkspace.click();
            workSubTabInbox.click();
            
            if (data.email) {
                viewEmail(data.email.id);
            }

        } catch (err) {
            console.error("Voucher purchase failed", err);
        }
    };

    // ------------------ EXAMPLE PREDICTOR ACTION ------------------
    if (exampleBtn){
        exampleBtn.addEventListener('click', () => {
            if (urlInput) {
                urlInput.value = 'https://www.amazon.in/Sony-WH-1000XM4-Bluetooth-Cancellation-Resistance/dp/B0863TXGM3';
                urlInput.focus();
            }
        });
    }

    // ------------------ PREDICT ACTION ------------------
    if (predictBtn) {
    predictBtn.addEventListener('click', async () => {
        let url = urlInput.value.trim();
        if (!url) {
            alert('Please enter a product URL.');
            return;
        }
        // Auto-prepend https:// if protocol is missing
        if (!/^https?:\/\//i.test(url)) {
            url = 'https://' + url;
            urlInput.value = url;
        }
        if (!isValidUrl(url)) {
            alert('Please enter a valid product URL.');
            return;
        }
        setLoading(true);
        discountApplied = 0;
        try {
            const resp = await fetch(`${API_BASE}/predict`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url })
            });
            const data = await resp.json();
            if (!resp.ok || data.error) {
                throw new Error(data.error || "Prediction failed");
            }
            renderResult(data);
            if (typeof fetchComparisons === 'function') {
                fetchComparisons(data);
            }
            if (typeof fetchAIAdvice === 'function') {
                fetchAIAdvice(data);
            }
            if (typeof fetchCoupons === 'function') {
                fetchCoupons(url);
            }
            if (typeof fetchSimilarProducts === 'function') {
                fetchSimilarProducts(data);
            }
            // Setup price alert prefill safely
            if (priceAlertWidget) {
                priceAlertWidget.style.display = 'block';
            }
            if (alertTargetPrice) {
                alertTargetPrice.value = Math.round(data.predictedLowest);
            }
        } catch (err) {
            console.error(err);
            if (resultContainer) {
                resultContainer.innerHTML = `
                    <div class="error-msg" style="color:#ef4444; padding:20px; text-align:center;">
                        ${escapeHtml(err.message)}
                    </div>
                `;
            }
        } finally {
            setLoading(false);

        }
    });
    }
    // ------------------ AI ADVICE BUTTON ------------------
    if (aiBtn) {
    aiBtn.addEventListener('click', () => {
        if (window.lastPredictionData) {
            fetchAIAdvice(window.lastPredictionData);
        }
    });
    }

    // ------------------ API SYNCERS & LOADERS ------------------

    async function syncWorkspace() {
        await loadInboxData();
        await loadWalletData();
        await loadAlertsData();
    }

    async function loadInboxData() {
        try {
            const res = await fetch(`${API_BASE}/api/inbox`);
            const data = await res.json();
            localInboxEmails = data.inbox.map(e => {
                if (readEmailIds.has(e.id)) {
                    e.read = true;
                }
                if (localEmailStatuses.has(e.id)) {
                    const newStatus = localEmailStatuses.get(e.id);
                    e.status = newStatus;
                    if (newStatus === 'Delivered') {
                        e.subject = `Your package has been successfully delivered! 🎉`;
                    }
                }
                return e;
            });
            renderInboxList();
        } catch (err) {
            console.error("Failed to load inbox data", err);
        }
    }

    async function loadWalletData() {
        try {
            const res = await fetch(`${API_BASE}/api/wallet`);
            const data = await res.json();
            localWalletData = data;
            
            // Render wallet info
            walletBalanceTop.textContent = formatCurrency(data.balance, 'INR');
            walletCoinsTop.textContent = data.coins.toLocaleString() + ' PCO';
            walletBalanceMega.textContent = formatCurrency(data.balance, 'INR');
            walletCoinsMega.innerHTML = `<i data-lucide="star"></i> ${data.coins.toLocaleString()} Pricevana Coins`;
            document.getElementById('modalBalance').textContent = formatCurrency(data.balance, 'INR');

            renderTransactionsList(data.transactions);
            lucide.createIcons();
        } catch (err) {
            console.error("Failed to load wallet data", err);
        }
    }

    async function loadAlertsData() {
        try {
            const res = await fetch(`${API_BASE}/api/alerts`);
            const data = await res.json();
            localAlerts = data.alerts;
            renderAlertsList();
        } catch (err) {
            console.error("Failed to load alerts data", err);
        }
    }

    async function fetchCoupons(url) {
        try {
            const res = await fetch(`${API_BASE}/api/coupons`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });
            const data = await res.json();
            renderCoupons(data.coupons);
            couponWidget.style.display = 'block';
        } catch (err) {
            console.error("Failed to fetch coupons", err);
        }
    }

    // ------------------ INTERACTIVE COMPONENT RENDERERS ------------------

    function renderCoupons(coupons) {
        if (!coupons || coupons.length === 0) {
            couponList.innerHTML = `<p style="font-size: 13px; color: var(--text-muted);">No promotional coupons detected for this retailer.</p>`;
            applyCouponsBtn.style.display = 'none';
            return;
        }

        couponList.innerHTML = coupons.map(c => `
            <div class="coupon-card-mini fade-in">
                <div class="coupon-details">
                    <span class="coupon-code-badge">${escapeHtml(c.code)}</span>
                    <span class="coupon-discount">${escapeHtml(c.discount)}</span>
                    <span class="coupon-desc">${escapeHtml(c.description)}</span>
                </div>
                <span class="coupon-success-tag">${escapeHtml(c.success_rate)} Success</span>
            </div>
        `).join('');
        applyCouponsBtn.style.display = 'block';
    }

    function renderTransactionsList(transactions) {
        if (!walletTxList) return;
        if (!transactions || transactions.length === 0) {
            walletTxList.innerHTML = `<tr><td colspan="5" style="padding: 20px; text-align: center; color: var(--text-muted);">No transaction history available.</td></tr>`;
            return;
        }
        walletTxList.innerHTML = transactions.map(tx => {
            const isCredit = tx.amount > 0;
            const amtClass = isCredit ? 'text-green' : 'text-red';
            const amtSign = isCredit ? '+' : '';
            return `
                <tr>
                    <td>${escapeHtml(tx.date)}</td>
                    <td><span class="tx-type-badge type-${tx.type.toLowerCase().replace(/ /g, '-')}">${escapeHtml(tx.type)}</span></td>
                    <td>${escapeHtml(tx.details)}</td>
                    <td class="${amtClass}" style="font-weight:700;">${amtSign}${formatCurrency(tx.amount, 'INR')}</td>
                    <td><span class="order-badge-status status-delivered">${escapeHtml(tx.status)}</span></td>
                </tr>
            `;
        }).join('');
    }

    function renderAlertsList() {
        if (!activeAlertsList) return;
        if (!localAlerts || localAlerts.length === 0) {
            activeAlertsList.innerHTML = `<tr><td colspan="7" style="padding:20px; text-align:center; color:var(--text-muted);">No active price alerts set.</td></tr>`;
            return;
        }
        activeAlertsList.innerHTML = localAlerts.map(alt => `
            <tr class="fade-in">
                <td>${escapeHtml(alt.date_created)}</td>
                <td style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                    <a href="${escapeHtml(alt.url)}" target="_blank" style="color:var(--primary); font-weight:500;">${escapeHtml(alt.title)}</a>
                </td>
                <td>${escapeHtml(alt.email)}</td>
                <td style="font-weight:700; color:var(--secondary);">${formatCurrency(alt.target_price, alt.currency)}</td>
                <td style="font-weight:700;">${formatCurrency(alt.current_price, alt.currency)}</td>
                <td><span class="order-badge-status status-in-transit">${escapeHtml(alt.status)}</span></td>
                <td>
                    <button class="btn ghost btn-xs" onclick="deleteAlert(${alt.id})" style="padding:6px 12px; font-size:11px; border-radius:6px; color:#ef4444; border-color:rgba(239,68,68,0.2);">
                        Delete
                    </button>
                </td>
            </tr>
        `).join('');
    }

    window.deleteAlert = async function(id) {
        try {
            const res = await fetch(`${API_BASE}/api/alerts`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            if (res.ok) {
                showToast("Alert Deleted", "Price alert removed successfully.");
                loadAlertsData();
            }
        } catch (err) {
            console.error("Failed to delete alert", err);
        }
    };

    function renderInboxList() {
        if (localInboxEmails.length === 0) {
            inboxList.innerHTML = `<div class="viewer-placeholder" style="padding: 40px; text-align: center;"><p>Your inbox is empty</p></div>`;
            inboxUnreadDot.style.display = 'none';
            return;
        }

        // Count unread
        const unreadCount = localInboxEmails.filter(e => !e.read).length;
        if (unreadCount > 0) {
            inboxUnreadDot.style.display = 'flex';
            inboxUnreadDot.textContent = unreadCount;
        } else {
            inboxUnreadDot.style.display = 'none';
        }

        inboxList.innerHTML = localInboxEmails.map(e => {
            let badgeClass = 'status-in-transit';
            if (e.status === 'Out for Delivery') badgeClass = 'status-out-for-delivery';
            if (e.status === 'Delivered') badgeClass = 'status-delivered';

            const activeClass = selectedEmail && selectedEmail.id === e.id ? 'active' : '';
            const unreadClass = !e.read ? 'unread' : '';

            return `
                <div class="email-item ${activeClass} ${unreadClass}" onclick="viewEmail(${e.id})">
                    <div class="email-item-header">
                        <span class="email-sender">${escapeHtml(e.sender)}</span>
                        <span class="email-date">${escapeHtml(e.date)}</span>
                    </div>
                    <span class="email-subject">${escapeHtml(e.subject)}</span>
                    <div class="email-meta-row">
                        <span class="order-badge-status ${badgeClass}">${escapeHtml(e.status)}</span>
                        <span class="cashback-earn-pill">+₹${e.cashback.toFixed(2)} Cashback</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    window.viewEmail = function(id) {
        const mail = localInboxEmails.find(e => e.id === id);
        if (!mail) return;

        readEmailIds.add(id);
        selectedEmail = mail;
        mail.read = true; // Mark as read locally
        renderInboxList(); // Update unread states

        emailViewerPlaceholder.style.display = 'none';
        emailViewerContent.style.display = 'block';
        emailMessageBody.innerHTML = mail.body;

        // Render Delivery Timeline Stepper
        updateTimelineStepper(mail.status);
    };

    function updateTimelineStepper(status) {
        // Clear all step states
        const steps = ['step1', 'step2', 'step3', 'step4'];
        const lines = ['line1', 'line2', 'line3'];

        steps.forEach(s => {
            const el = document.getElementById(s);
            if (el) el.className = 'stepper-step';
        });
        lines.forEach(l => {
            const el = document.getElementById(l);
            if (el) el.className = 'stepper-line';
        });

        // Apply progressive active states
        if (status === 'Ordered') {
            document.getElementById('step1').classList.add('active');
        } else if (status === 'Shipped' || status === 'In Transit') {
            document.getElementById('step1').classList.add('completed');
            document.getElementById('line1').classList.add('completed');
            document.getElementById('step2').classList.add('active');
        } else if (status === 'Out for Delivery') {
            document.getElementById('step1').classList.add('completed');
            document.getElementById('line1').classList.add('completed');
            document.getElementById('step2').classList.add('completed');
            document.getElementById('line2').classList.add('completed');
            document.getElementById('step3').classList.add('active');
        } else if (status === 'Delivered') {
            document.getElementById('step1').classList.add('completed');
            document.getElementById('line1').classList.add('completed');
            document.getElementById('step2').classList.add('completed');
            document.getElementById('line2').classList.add('completed');
            document.getElementById('step3').classList.add('completed');
            document.getElementById('line3').classList.add('completed');
            document.getElementById('step4').classList.add('completed');
        }
    }

    // Advancing shipment status simulation
    if (advanceStatusBtn) {

    advanceStatusBtn.addEventListener('click', () => {

        if (!selectedEmail) return;

        let nextStatus = 'Ordered';

        if (selectedEmail.status === 'Ordered') {
            nextStatus = 'Shipped';
        }
        else if (
            selectedEmail.status === 'Shipped' ||
            selectedEmail.status === 'In Transit'
        ) {
            nextStatus = 'Out for Delivery';
        }
        else if (selectedEmail.status === 'Out for Delivery') {
            nextStatus = 'Delivered';
        }
        else {
            alert('Package is already delivered!');
            return;
        }

        selectedEmail.status = nextStatus;

        localEmailStatuses.set(selectedEmail.id, nextStatus);

        const localEmail = localInboxEmails.find(
            e => e.id === selectedEmail.id
        );

        if (localEmail) {

            localEmail.status = nextStatus;

            if (nextStatus === 'Delivered') {

                localEmail.subject =
                    `Your package has been successfully delivered! 🎉`;

                showToast(
                    "Package Delivered!",
                    `Your order from ${selectedEmail.retailer} has been delivered. Cashback earned: ₹${selectedEmail.cashback}`
                );

            } else {

                showToast(
                    "Order Status Updated",
                    `Order ${selectedEmail.id} is now ${nextStatus}`
                );

            }
        }

        renderInboxList();
        updateTimelineStepper(nextStatus);

    });
}

    // ------------------ INTERACTIVE SIMULATORS ------------------

    // 1. Coupon Auto-Apply Simulation Overlay Logic
    if (applyCouponsBtn) {

    applyCouponsBtn.addEventListener('click', () => {

        const overlay = document.getElementById('couponOverlay');
        const progress = document.getElementById('couponProgressBar');
        const statusText = document.getElementById('couponStatusText');
        const logs = document.getElementById('couponStatusLog');

        // Safety checks
        if (!overlay || !progress || !statusText || !logs) {
            console.error('Coupon elements missing');
            return;
        }

        overlay.style.display = 'flex';
        progress.style.width = '0%';
        logs.innerHTML = '';

        const mockCodes = [
            {
                code: 'FKWELCOME10',
                success: true,
                discount: 0.10,
                desc: '10% OFF Welcome Bonus'
            },
            {
                code: 'SUPERCOIN5',
                success: true,
                discount: 0.05,
                desc: '5% OFF via Supercoins'
            },
            {
                code: 'FLAT1200',
                success: false,
                discount: 0,
                desc: 'Flat ₹1,200 on appliances only'
            },
            {
                code: 'SAVEMORE',
                success: false,
                discount: 0,
                desc: 'Expired Code'
            }
        ];

        let index = 0;

        function runStep() {

            if (index >= mockCodes.length) {

                progress.style.width = '100%';

                statusText.innerText =
                    'Calculating best discount code...';

                setTimeout(() => {

                    overlay.style.display = 'none';

                    applyBestCouponDiscount();

                }, 1000);

                return;
            }

            const codeObj = mockCodes[index];

            statusText.innerText =
                `Testing promo code: ${codeObj.code}...`;

            const percent =
                ((index + 1) / mockCodes.length) * 100;

            progress.style.width = `${percent}%`;

            setTimeout(() => {

                if (codeObj.success) {

                    logs.innerHTML += `
                        <div class="log-success">
                            ✔️ [SUCCESS] Applied ${codeObj.code}
                            - Save ${codeObj.discount * 100}%!
                        </div>
                    `;

                } else {

                    logs.innerHTML += `
                        <div class="log-fail">
                            ❌ [FAILED] Code ${codeObj.code}
                            is invalid.
                        </div>
                    `;
                }

                logs.scrollTop = logs.scrollHeight;

                index++;

                runStep();

            }, 600);
        }

        runStep();

    });

}

    // 2. Alert Registration
    window.createPriceAlert = async function(e) {
        e.preventDefault();
        if (!window.lastPredictionData) return;

        const email = alertEmail.value.trim();
        const target = parseFloat(alertTargetPrice.value);

        if (!email || isNaN(target)) {
            alert('Please input a valid email and alert target.');
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/api/alerts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: window.lastPredictionData.product_title,
                    url: window.lastPredictionData.url,
                    email: email,
                    target_price: target,
                    current_price: window.lastPredictionData.currentPrice,
                    currency: window.lastPredictionData.currency
                })
            });

            if (res.ok) {
                showToast("Price Alert Set!", `We will email you at ${email} once price drops below ₹${target.toLocaleString()}`);
                alertEmail.value = '';
                loadAlertsData();
            }
        } catch (err) {
            console.error(err);
        }
    };

    // 3. Simulating Immediate Price Drop Alert (BuyHatke Demo)
    if (simulateAlertBtn) {

    simulateAlertBtn.addEventListener('click', () => {

        if (localAlerts.length === 0) {
            alert('Please register at least one Price Alert first!');
            return;
        }

        const alertItem = localAlerts[0];

        const newLowPrice = Math.round(
            alertItem.target_price * 0.95
        );

        showToast(
            "Price Drop Alert! 📉",
            `The price of "${alertItem.title}" crashed to ${formatCurrency(newLowPrice, alertItem.currency)}`
        );

    });

}

    // 4. UPI Withdrawal Modal Payout
    window.openWithdrawModal = function() {
        document.getElementById('withdrawModal').style.display = 'flex';
    };

    window.closeWithdrawModal = function() {
        document.getElementById('withdrawModal').style.display = 'none';
    };

    window.processWithdrawal = async function(e) {
        e.preventDefault();
        const upi = document.getElementById('upiId').value.trim();
        const amount = parseFloat(document.getElementById('withdrawAmount').value);

        if (!upi || isNaN(amount) || amount <= 0) {
            alert('Please check your fields.');
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/api/wallet`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ upi, amount })
            });

            const data = await res.json();
            if (!res.ok) {
                alert(data.error || "Withdrawal failed");
                return;
            }

            showToast("Payout Transferred! 💸", `Successfully transferred ₹${amount.toLocaleString()} to ${upi}`);
            closeWithdrawModal();
            document.getElementById('withdrawForm').reset();
            loadWalletData();
        } catch (err) {
            console.error(err);
        }
    };

    // 5. Toast Notifications
    function showToast(title, body) {
        const toast = document.getElementById('toastNotification');
        toast.querySelector('.toast-title').textContent = title;
        toast.querySelector('#toastBody').textContent = body;
        
        toast.style.display = 'block';
        
        // Auto dismiss after 6 seconds
        setTimeout(() => {
            closeToast();
        }, 6000);
    }

    window.closeToast = function() {
        document.getElementById('toastNotification').style.display = 'none';
    };

    // ------------------ PREDICT LOADING CONTROLS ------------------

    function setLoading(isLoading) {
        predictBtn.disabled = isLoading;
        predictBtn.innerHTML = isLoading ? 
            `<i data-lucide="loader-2" class="animate-spin"></i> Predicting...` : 
            `<i data-lucide="search"></i> Check Price`;
        
        if (isLoading) {
            resultContainer.classList.remove('show');
            couponWidget.style.display = 'none';
            priceAlertWidget.style.display = 'none';
            if (document.getElementById('similarProductsSection')) {
                document.getElementById('similarProductsSection').style.display = 'none';
            }
            resultContainer.innerHTML = `
                <div style="padding: 40px; text-align: center;">
                    <div class="skeleton" style="height: 48px; width: 60%; margin: 0 auto 20px;"></div>
                    <div class="skeleton" style="height: 150px; width: 100%;"></div>
                </div>
            `;
            lucide.createIcons();
        }
    }

    async function fetchAIAdvice(data) {
        aiSection.style.display = 'block';
        aiResult.innerHTML = `<span class="fade-in">🤖 Generating expert strategy...</span>`;
        
        try {
            const res = await fetch(`${API_BASE}/ai-advice`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    product: data.product_title,
                    price: data.currentPrice,
                    predicted: data.predictedLowest
                })
            });

            const result = await res.json();
            aiResult.innerText = result.advice || "Unable to generate advice at this moment.";
            aiResult.classList.add('fade-in');
        } catch (err) {
            aiResult.innerText = "Error fetching AI advice.";
        }
    }

    async function fetchComparisons(data) {
        const compSection = document.getElementById('comparisonSection');
        const compList = document.getElementById('comparisonList');
        
        compSection.style.display = 'block';
        compList.innerHTML = `
            <div class="skeleton" style="height: 80px; width: 100%;"></div>
            <div class="skeleton" style="height: 80px; width: 100%;"></div>
        `;

        try {
            const res = await fetch(`${API_BASE}/compare`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: data.product_title,
                    url: data.url,
                    current_price: data.currentPrice
                })
            });

            const result = await res.json();
            
            compList.innerHTML = result.comparisons.map(c => `
                <a href="${c.url}" target="_blank" rel="noopener noreferrer" class="comparison-card fade-in">
                    <span class="comp-platform">${c.platform}</span>
                    <span class="comp-price">${formatCurrency(c.price, data.currency)}</span>
                    <span class="comp-footer">
                        View Offer <i data-lucide="external-link" style="width:12px; height:12px;"></i>
                    </span>
                </a>
            `).join('');
            
            lucide.createIcons();
        } catch (err) {
            compList.innerHTML = `<p style="font-size:12px; color:red;">Market data unavailable</p>`;
        }
    }

    async function fetchSimilarProducts(data) {
        const similarSection = document.getElementById('similarProductsSection');
        const similarGrid = document.getElementById('similarProductsGrid');
        
        if (!similarSection || !similarGrid) return;
        
        similarSection.style.display = 'block';
        similarGrid.innerHTML = `
            <div class="skeleton" style="height: 180px; width: 100%;"></div>
            <div class="skeleton" style="height: 180px; width: 100%;"></div>
            <div class="skeleton" style="height: 180px; width: 100%;"></div>
        `;
        
        try {
            const res = await fetch(`${API_BASE}/api/similar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: data.product_title })
            });
            const result = await res.json();
            
            if (!result.results || result.results.length === 0) {
                similarGrid.innerHTML = `<p style="padding:20px; text-align:center; color:var(--text-muted);">No similar products found.</p>`;
                return;
            }
            
            similarGrid.innerHTML = result.results.map(d => {
                const ratingStars = '★'.repeat(Math.round(d.rating)) + '☆'.repeat(5 - Math.round(d.rating));
                return `
                    <div class="deal-card fade-in">
                        <div class="deal-card-header">
                            <span class="deal-card-store">${escapeHtml(d.store)}</span>
                            <span class="deal-card-rating">${ratingStars} <span style="font-weight:700;">${d.rating}</span></span>
                        </div>
                        <h4 class="deal-card-title">${escapeHtml(d.title)}</h4>
                        <div class="deal-card-price-row">
                            <span class="deal-card-price">${formatCurrency(d.price, 'INR')}</span>
                            <span class="deal-card-orig">${formatCurrency(d.original_price, 'INR')}</span>
                            <span class="deal-card-discount">${escapeHtml(d.discount)}</span>
                        </div>
                        <div class="deal-card-footer">
                            <button class="btn ghost btn-sm" onclick="analyzeDiscoveredPrice('${escapeHtml(d.url)}')">
                                <i data-lucide="trending-down"></i> Analyze Trend
                            </button>
                            <button class="btn primary btn-sm" onclick="buyDiscoveredDeal('${escapeHtml(d.title)}', ${d.price}, '${escapeHtml(d.url)}')">
                                <i data-lucide="shopping-bag"></i> Buy Deal
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
            
            lucide.createIcons();
        } catch (err) {
            console.error("Failed to load similar products", err);
            similarGrid.innerHTML = `<p style="font-size:12px; color:red; padding: 20px; text-align: center;">Similar products details unavailable</p>`;
        }
    }

    function renderResult(data) {
        window.lastPredictionData = data;
        const current = Number(data.currentPrice);
        const predicted = Number(data.predictedLowest);
        renderResultWithScore(current, current, predicted, data.advice, data.currency);
        
        // Sync browser extension simulator
        syncExtensionData(data);
    }

    function getProductSvg(title) {
        const t = title.toLowerCase();
        if (t.includes('headphone') || t.includes('airdope') || t.includes('earbud') || t.includes('earphone') || t.includes('duopod') || t.includes('sound') || t.includes('audio')) {
            return `
                <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: 100%; max-width: 160px; filter: drop-shadow(0 10px 20px rgba(99,102,241,0.15));">
                    <circle cx="50" cy="50" r="40" fill="url(#headphoneGrad)" opacity="0.1" />
                    <path d="M20 55C20 40 30 25 50 25C70 25 80 40 80 55" stroke="var(--primary)" stroke-width="6" stroke-linecap="round" />
                    <rect x="14" y="50" width="12" height="20" rx="6" fill="var(--primary)" />
                    <rect x="74" y="50" width="12" height="20" rx="6" fill="var(--primary)" />
                    <rect x="18" y="53" width="4" height="14" rx="2" fill="var(--secondary)" />
                    <rect x="78" y="53" width="4" height="14" rx="2" fill="var(--secondary)" />
                    <defs>
                        <radialGradient id="headphoneGrad" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(50 50) rotate(90) scale(40)">
                            <stop offset="0%" stop-color="var(--primary)" />
                            <stop offset="100%" stop-color="var(--secondary)" />
                        </radialGradient>
                    </defs>
                </svg>
            `;
        } else if (t.includes('phone') || t.includes('mobile') || t.includes('iphone') || t.includes('s24') || t.includes('galaxy') || t.includes('oneplus')) {
            return `
                <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: 100%; max-width: 160px; filter: drop-shadow(0 10px 20px rgba(99,102,241,0.15));">
                    <rect x="32" y="12" width="36" height="76" rx="8" fill="url(#phoneGrad)" stroke="var(--primary)" stroke-width="4" />
                    <rect x="46" y="17" width="8" height="2" rx="1" fill="#fff" opacity="0.8" />
                    <circle cx="50" cy="80" r="4" fill="none" stroke="#fff" stroke-width="1.5" opacity="0.8" />
                    <defs>
                        <linearGradient id="phoneGrad" x1="32" y1="12" x2="68" y2="88" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stop-color="var(--primary)" />
                            <stop offset="100%" stop-color="var(--secondary)" />
                        </linearGradient>
                    </defs>
                </svg>
            `;
        } else if (t.includes('laptop') || t.includes('macbook') || t.includes('computer') || t.includes('notebook')) {
            return `
                <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: 100%; max-width: 180px; filter: drop-shadow(0 10px 20px rgba(99,102,241,0.15));">
                    <rect x="25" y="30" width="50" height="32" rx="4" fill="url(#laptopGrad)" stroke="var(--primary)" stroke-width="3" />
                    <path d="M15 65C15 63 17 62 19 62H81C83 62 85 63 85 65V67H15V65Z" fill="var(--primary)" />
                    <rect x="45" y="63" width="10" height="2" rx="1" fill="#fff" opacity="0.8" />
                    <defs>
                        <linearGradient id="laptopGrad" x1="25" y1="30" x2="75" y2="62" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stop-color="var(--primary)" />
                            <stop offset="100%" stop-color="var(--secondary)" />
                        </linearGradient>
                    </defs>
                </svg>
            `;
        } else {
            return `
                <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: 100%; max-width: 160px; filter: drop-shadow(0 10px 20px rgba(99,102,241,0.15));">
                    <path d="M35 35C35 25 40 20 50 20C60 20 65 25 65 35" stroke="var(--primary)" stroke-width="4" stroke-linecap="round" />
                    <rect x="25" y="35" width="50" height="45" rx="6" fill="url(#bagGrad)" stroke="var(--primary)" stroke-width="2" />
                    <circle cx="50" cy="55" r="10" fill="none" stroke="#fff" stroke-width="3" opacity="0.3" />
                    <defs>
                        <linearGradient id="bagGrad" x1="25" y1="35" x2="75" y2="80" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stop-color="var(--primary)" />
                            <stop offset="100%" stop-color="var(--secondary)" />
                        </linearGradient>
                    </defs>
                </svg>
            `;
        }
    }

    function renderResultWithScore(original, current, predicted, advice, currency) {
        const data = window.lastPredictionData || {};
        const diff = current - predicted;
        
        let score = 82;
        let gaugeColor = '#10b981';
        let recommendationText = 'Go Ahead & Buy now';
        let recDesc = 'Optimal price point. Highly recommended.';

        if (diff > 0) {
            score = Math.max(15, Math.round(85 - (diff / current) * 150));
            gaugeColor = score > 50 ? '#eab308' : '#ef4444';
            recommendationText = score > 50 ? 'Stable price point' : 'Wait! Price drop soon';
            recDesc = score > 50 ? 'Moderate value. Consider waiting if not urgent.' : 'Significant drop predicted soon. Set an alert.';
        } else if (diff < 0) {
            score = Math.min(99, Math.round(85 + (Math.abs(diff) / current) * 120));
            gaugeColor = '#10b981';
            recommendationText = 'Go Ahead & Buy now';
            recDesc = 'Excellent value point. Purchase recommended.';
        }

        const needleAngle = -90 + (score / 100) * 180;
        const isCouponApplied = discountApplied > 0;
        
        // Consistent metrics hashed based on title
        let url_hash = 127;
        if (data.product_title) {
            for (let i = 0; i < data.product_title.length; i++) {
                url_hash = (url_hash + data.product_title.charCodeAt(i)) % 1000;
            }
        }
        const ratingVal = (4.0 + (url_hash % 9) / 10).toFixed(1);
        const reviewsCount = ((url_hash % 85) + 12).toFixed(1) + 'K';
        
        // Determine store attributes
        const urlStr = data.url || '';
        let storeName = 'Flipkart';
        let storeColorClass = 'store-flipkart';
        let storeUrl = 'https://www.flipkart.com';
        
        if (urlStr.includes('amazon')) {
            storeName = 'Amazon';
            storeColorClass = 'store-amazon';
            storeUrl = 'https://www.amazon.in';
        } else if (urlStr.includes('myntra')) {
            storeName = 'Myntra';
            storeColorClass = 'store-myntra';
            storeUrl = 'https://www.myntra.com';
        }

        // Stats calculation
        const highestVal = data.history && data.history.length > 0 ? Math.max(...data.history) : Math.round(current * 1.35);
        const lowestVal = predicted;
        const avgVal = data.history && data.history.length > 0 ? Math.round(data.history.reduce((a, b) => a + b, 0) / data.history.length) : Math.round((current + predicted) / 2);
        const bbdPriceVal = Math.round(predicted * 0.92);

        const imageHtml = data.image_url 
            ? `<img src="${escapeHtml(data.image_url)}" alt="${escapeHtml(data.product_title || 'Product Image')}" style="max-width: 100%; max-height: 180px; object-fit: contain; filter: drop-shadow(0 10px 15px rgba(0,0,0,0.08));" />`
            : getProductSvg(data.product_title || '');

        resultContainer.innerHTML = `
            <style>
                .pred-product-grid {
                    display: grid;
                    grid-template-columns: 1fr 1.1fr;
                    gap: 24px;
                    align-items: start;
                    margin-top: 16px;
                    text-align: left;
                }
                .pred-card-left {
                    background: rgba(255, 255, 255, 0.45);
                    border: 1px solid var(--border-color);
                    border-radius: 16px;
                    padding: 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }
                .pred-image-showcase {
                    background: radial-gradient(circle at 50% 50%, rgba(99,102,241,0.04) 0%, rgba(255,255,255,0.7) 100%);
                    border-radius: 12px;
                    padding: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 1px dashed var(--border-color);
                    position: relative;
                    min-height: 180px;
                }
                .pred-retailer-badge {
                    position: absolute;
                    top: 12px;
                    left: 12px;
                    background: white;
                    border: 1px solid var(--border-color);
                    color: var(--text-main);
                    font-weight: 700;
                    font-size: 11px;
                    padding: 4px 10px;
                    border-radius: 6px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.02);
                }
                .pred-product-details h4 {
                    font-size: 16px;
                    font-weight: 700;
                    color: var(--text-main);
                    line-height: 1.4;
                    margin: 0 0 8px 0;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                }
                .pred-rating-row {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 12px;
                }
                .pred-stars {
                    color: #d97706;
                    font-size: 13px;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    gap: 2px;
                }
                .pred-review-count {
                    font-size: 12px;
                    color: var(--text-muted);
                    font-weight: 500;
                }
                .pred-price-row {
                    display: flex;
                    align-items: baseline;
                    gap: 8px;
                    margin-bottom: 16px;
                }
                .pred-current-price {
                    font-size: 26px;
                    font-weight: 800;
                    color: var(--text-main);
                }
                .pred-original-price {
                    font-size: 15px;
                    text-decoration: line-through;
                    color: var(--text-muted);
                }
                .pred-discount-badge {
                    background: rgba(16, 185, 129, 0.1);
                    color: var(--secondary);
                    font-size: 12px;
                    font-weight: 700;
                    padding: 2px 8px;
                    border-radius: 6px;
                }
                .pred-btn-buy {
                    width: 100%;
                    padding: 12px;
                    font-size: 13px;
                    font-weight: 700;
                    border-radius: var(--radius-md);
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    cursor: pointer;
                    transition: var(--transition);
                    text-decoration: none;
                    border: none;
                }
                .pred-btn-buy.store-flipkart {
                    background: #fb641b;
                    color: white;
                }
                .pred-btn-buy.store-amazon {
                    background: #ff9900;
                    color: #111;
                }
                .pred-btn-buy.store-myntra {
                    background: #ff3f6c;
                    color: white;
                }
                .pred-btn-buy:hover {
                    opacity: 0.9;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                }
                
                .pred-card-right {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }
                .pred-scanner-pane {
                    background: rgba(255, 255, 255, 0.45);
                    border: 1px solid var(--border-color);
                    border-radius: 16px;
                    padding: 20px;
                }
                .pred-scanner-pane h5 {
                    font-size: 11px;
                    font-weight: 700;
                    text-transform: uppercase;
                    color: var(--text-muted);
                    letter-spacing: 0.5px;
                    margin: 0 0 16px 0;
                }
                .pred-recommendation-block {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    margin-bottom: 20px;
                }
                .pred-gauge-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                .pred-recommendation-text h6 {
                    font-size: 14px;
                    font-weight: 700;
                    margin: 0 0 4px 0;
                }
                .pred-recommendation-text p {
                    font-size: 12px;
                    color: var(--text-muted);
                    margin: 0;
                    line-height: 1.4;
                }
                
                .pred-stats-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                }
                .pred-stat-card {
                    background: white;
                    border: 1px solid var(--border-color);
                    border-radius: 12px;
                    padding: 12px;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    text-align: left;
                }
                .pred-stat-card.promo-card {
                    background: #fffdf5;
                    border-color: #fef3c7;
                    grid-column: span 2;
                }
                .pred-stat-lbl {
                    font-size: 10px;
                    font-weight: 700;
                    text-transform: uppercase;
                    color: var(--text-muted);
                    letter-spacing: 0.3px;
                }
                .pred-stat-val {
                    font-size: 16px;
                    font-weight: 800;
                    color: var(--text-main);
                }
                
                @media (max-width: 768px) {
                    .pred-product-grid {
                        grid-template-columns: 1fr;
                    }
                }
            </style>

            <div class="pred-product-grid">
                <!-- LEFT COLUMN: Product details & showcase -->
                <div class="pred-card-left">
                    <div class="pred-image-showcase">
                        <span class="pred-retailer-badge">
                            <i data-lucide="shopping-bag" style="width:12px; height:12px;"></i>
                            ${storeName}
                        </span>
                        ${imageHtml}
                    </div>
                    
                    <div class="pred-product-details">
                        <h4>${escapeHtml(data.product_title || 'Unknown Product')}</h4>
                        <div class="pred-rating-row">
                            <span class="pred-stars">★ ${ratingVal}</span>
                            <span class="pred-review-count">(${reviewsCount} reviews)</span>
                        </div>
                        
                        <div class="pred-price-row">
                            <span class="pred-current-price">${formatCurrency(current, currency)}</span>
                            <span class="pred-original-price">${formatCurrency(highestVal, currency)}</span>
                            <span class="pred-discount-badge">${Math.round((1 - (current/highestVal)) * 100)}% OFF</span>
                        </div>
                        
                        <a href="${escapeHtml(urlStr)}" target="_blank" rel="noopener noreferrer" class="pred-btn-buy ${storeColorClass}">
                            Buy on ${storeName} <i data-lucide="external-link" style="width:14px; height:14px;"></i>
                        </a>
                    </div>
                </div>

                <!-- RIGHT COLUMN: Deal Scanner and Price Stats -->
                <div class="pred-card-right">
                    <div class="pred-scanner-pane">
                        <h5>Should you buy now?</h5>
                        <div class="pred-recommendation-block">
                            <!-- Gauge -->
                            <div class="pred-gauge-container">
                                <div class="pred-gauge-body" style="background: conic-gradient(from 180deg at 50% 100%, #ef4444 0deg, #eab308 90deg, #10b981 180deg, transparent 180deg); width: 84px; height: 42px; border-top-left-radius: 84px; border-top-right-radius: 84px; position: relative; overflow: hidden;">
                                    <div class="pred-gauge-inner" style="background: white; width: 56px; height: 28px; border-top-left-radius: 56px; border-top-right-radius: 56px; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); z-index: 2;"></div>
                                    <div class="pred-gauge-needle" style="width: 3px; height: 32px; background: #312e81; position: absolute; bottom: 0; left: calc(50% - 1.5px); transform-origin: 50% 100%; transform: rotate(${needleAngle}deg); z-index: 3; border-radius: 1.5px; transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);"></div>
                                </div>
                                <div style="display: flex; justify-content: space-between; font-size: 8px; color: var(--text-muted); font-weight: 700; margin-top: 4px; width: 84px;">
                                    <span>Bad Time</span>
                                    <span>Good Time</span>
                                </div>
                            </div>

                            <div class="pred-recommendation-text">
                                <h6 style="color: ${gaugeColor};">${recommendationText}</h6>
                                <p>${recDesc}</p>
                            </div>
                        </div>

                        <h5>Price Stats</h5>
                        <div class="pred-stats-grid">
                            <div class="pred-stat-card">
                                <span class="pred-stat-lbl">Highest Price</span>
                                <span class="pred-stat-val">${formatCurrency(highestVal, currency)}</span>
                            </div>
                            <div class="pred-stat-card">
                                <span class="pred-stat-lbl">Average Price</span>
                                <span class="pred-stat-val">${formatCurrency(avgVal, currency)}</span>
                            </div>
                            <div class="pred-stat-card">
                                <span class="pred-stat-lbl">Lowest Price</span>
                                <span class="pred-stat-val">${formatCurrency(lowestVal, currency)}</span>
                            </div>
                            <div class="pred-stat-card promo-card">
                                <span class="pred-stat-lbl" style="color:#d97706;">Big Billion Days Price 🏷️</span>
                                <span class="pred-stat-val" style="color:#d97706;">${formatCurrency(bbdPriceVal, currency)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            ${isCouponApplied ? `
                <button id="buyBtnPricevana" class="btn primary" style="margin-top:20px; width: 100%; font-size:13px; padding: 12px; margin-bottom: 20px;">
                    <i data-lucide="shopping-bag"></i> Claim Tracking & 5% Cashback
                </button>
            ` : ''}

            <hr class="section-divider" style="margin: 24px 0 16px 0;">
            <h3 style="font-size: 14px; color: var(--text-muted); margin-bottom: 12px; text-align: left;"><i data-lucide="trending-down" style="width:14px; height:14px; vertical-align:middle; margin-right:4px;"></i> Linear Price Fluctuation Trend</h3>
            <div class="chart-wrapper">
                <canvas id="priceTrendsChart" style="max-height: 200px;"></canvas>
            </div>
        `;

        resultContainer.classList.add('show');
        lucide.createIcons();
        
        if (isCouponApplied) {
            document.getElementById('buyBtnPricevana').addEventListener('click', triggerSimulatedOrder);
        }

        initChart(data.history, data.future_predictions);
    }

    function getChartColors() {
        const style = getComputedStyle(document.body);
        const primary = style.getPropertyValue('--primary').trim() || '#5938de';
        const textMuted = style.getPropertyValue('--text-muted').trim() || '#6f6b80';
        
        const isDark = document.body.classList.contains('theme-midnight') || document.body.classList.contains('theme-cyberpunk');
        
        return {
            primary: primary,
            background: hexToRgba(primary, 0.08),
            grid: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
            text: textMuted,
            pointBg: isDark ? '#15151b' : '#fff'
        };
    }

    function hexToRgba(color, alpha) {
        if (color.startsWith('rgb')) {
            return color.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
        }
        if (!color.startsWith('#')) return `rgba(99, 102, 241, ${alpha})`;
        const hex = color.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    function initChart(history, future) {
        const ctx = document.getElementById('priceTrendsChart').getContext('2d');
        
        if (priceChart) {
            priceChart.destroy();
        }

        const colors = getChartColors();
        const labels = [...history.map((_, i) => `Past ${history.length - i}`), ...future.map((_, i) => `Day ${i + 1}`)];
        const dataValues = [...history, ...future];

        priceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Price Trend',
                    data: dataValues,
                    borderColor: colors.primary,
                    backgroundColor: colors.background,
                    borderWidth: 3,
                    pointRadius: 4,
                    pointBackgroundColor: colors.pointBg,
                    pointBorderColor: colors.primary,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        grid: { color: colors.grid },
                        ticks: { color: colors.text }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: colors.text }
                    }
                }
            }
        });
    }

    // --- Helpers ---
    function formatCurrency(val, currency) {
        if (currency === "INR" || currency === "₹") {
            return "₹" + Number(val).toLocaleString("en-IN");
        }
        return (currency || "$") + " " + Number(val).toLocaleString();
    }

    function isValidUrl(url) {
        try {
            const u = new URL(url);
            return ['http:', 'https:'].includes(u.protocol);
        } catch {
            return false;
        }
    }

    function escapeHtml(text) {
        return String(text).replace(/[&<>"']/g, c => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[c]));
    }

    // ------------------ BUYHATKE FLOATING EXTENSION SIMULATOR ------------------
    let extIsOpen = false;
    
    window.toggleExtSidebar = function() {
        const sidebar = document.getElementById('extSidebar');
        if (!sidebar) return;
        
        extIsOpen = !extIsOpen;
        sidebar.style.display = extIsOpen ? 'flex' : 'none';
        
        // Populate with current active state
        if (extIsOpen && window.lastPredictionData) {
            syncExtensionData(window.lastPredictionData);
        }
    };
    
    window.triggerExtCoupons = function() {
        // Toggle view back to predictor tab
        tabBtnPredictor.click();
        
        // Trigger auto-apply button
        const applyBtn = document.getElementById('applyCouponsBtn');
        if (applyBtn && applyBtn.style.display !== 'none') {
            applyBtn.click();
            toggleExtSidebar(); // Close sidebar to let them see progress!
        } else {
            alert('Coupons are only available after analyzing a product URL!');
        }
    };
    
    window.extSwitchProduct = function() {
        // Change text in search input and predict
        urlInput.value = 'https://www.flipkart.com/search?q=bose+quietcomfort+45';
        tabBtnPredictor.click();
        predictBtn.click();
        
        // Keep sidebar open
        extIsOpen = true;
        document.getElementById('extSidebar').style.display = 'flex';
    };
    
    function syncExtensionData(data) {
        const extStoreName = document.getElementById('extStoreName');
        const extProductTitle = document.getElementById('extProductTitle');
        const extCurrentPrice = document.getElementById('extCurrentPrice');
        const extBuyScore = document.getElementById('extBuyScore');
        
        if (extStoreName) {
            const urlStr = data.url || '';
            extStoreName.textContent = urlStr.includes('flipkart') 
                ? 'Flipkart.com' 
                : urlStr.includes('myntra') 
                    ? 'Myntra.com' 
                    : 'Amazon.in';
        }
        if (extProductTitle) extProductTitle.textContent = data.product_title;
        if (extCurrentPrice) extCurrentPrice.textContent = formatCurrency(data.currentPrice, data.currency);
        
        // Calculate buy score
        const diff = data.currentPrice - data.predictedLowest;
        let score = 82;
        let scoreColor = 'text-green';
        
        if (diff > 0) {
            score = Math.max(15, Math.round(85 - (diff / data.currentPrice) * 150));
            scoreColor = score > 60 ? 'text-amber' : 'text-red';
        } else {
            score = Math.min(99, Math.round(85 + (Math.abs(diff) / data.currentPrice) * 120));
            scoreColor = 'text-green';
        }
        
        if (extBuyScore) {
            extBuyScore.textContent = score;
            extBuyScore.className = `ext-m-value ${scoreColor === 'text-green' ? 'text-green' : scoreColor === 'text-amber' ? 'text-amber' : 'text-red'}`;
        }
        lucide.createIcons();
    }
});
