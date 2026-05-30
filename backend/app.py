from flask import Flask, request, jsonify
from flask_cors import CORS
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from sklearn.linear_model import LinearRegression
from bs4 import BeautifulSoup
from urllib.parse import urlparse, urljoin
from markupsafe import escape
import numpy as np
import pandas as pd
import requests
import logging
from datetime import datetime
import time
import re
import os
import mimetypes
import math
import socket
import ipaddress
from openai import OpenAI

# ================== CONFIG ==================
app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("pricevana")
SUPPORTED_PRODUCT_DOMAINS = ("amazon.in", "flipkart.com", "myntra.com")


def get_json_payload():
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else {}


def parse_number(value, name, *, positive=False, non_negative=False):
    try:
        number = float(value)
    except (TypeError, ValueError):
        raise ValueError(f"{name} must be a valid number")

    if not math.isfinite(number):
        raise ValueError(f"{name} must be a finite number")
    if positive and number <= 0:
        raise ValueError(f"{name} must be positive")
    if non_negative and number < 0:
        raise ValueError(f"{name} cannot be negative")
    return number


def next_id(records):
    return max((record.get("id", 0) for record in records), default=0) + 1


def validate_external_url(url):
    if not isinstance(url, str) or not url.strip():
        raise ValueError("A valid product URL is required")

    url = url.strip()
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise ValueError("Only HTTP or HTTPS product URLs are supported")
    if parsed.username or parsed.password:
        raise ValueError("URLs containing credentials are not supported")

    hostname = parsed.hostname.rstrip(".").lower()
    if hostname == "localhost" or hostname.endswith(".localhost"):
        raise ValueError("Local or private network URLs are not allowed")
    if not any(
        hostname == domain or hostname.endswith("." + domain)
        for domain in SUPPORTED_PRODUCT_DOMAINS
    ):
        raise ValueError("Only Amazon India, Flipkart and Myntra product URLs are supported")

    try:
        addresses = socket.getaddrinfo(hostname, parsed.port or 443, type=socket.SOCK_STREAM)
    except socket.gaierror:
        raise ValueError("Product URL host could not be resolved")

    for address in addresses:
        ip = ipaddress.ip_address(address[4][0])
        if not ip.is_global:
            raise ValueError("Local or private network URLs are not allowed")
    return url


def get_external_page(url, headers):
    current_url = url
    for _ in range(5):
        current_url = validate_external_url(current_url)
        response = requests.get(
            current_url, headers=headers, timeout=10, allow_redirects=False
        )
        if response.is_redirect or response.is_permanent_redirect:
            location = response.headers.get("Location")
            if not location:
                raise ValueError("Product page redirect has no destination")
            current_url = urljoin(current_url, location)
            continue
        response.raise_for_status()
        return response
    raise ValueError("Too many redirects while retrieving product page")


def get_catalog_product(url):
    catalog = globals().get("SEARCH_PRODUCTS", [])
    for product in catalog:
        if product["url"] == url:
            return {
                "title": product["title"],
                "price": product["price"],
                "currency": "INR",
                "price_source": "demo_catalog",
            }
    return None


# ================== PRICE PARSER ==================
def parse_price_string(price_text):
    if not price_text:
        raise ValueError("Empty price text")

    currency_match = re.search(r'([₹$€£]|INR|USD|EUR|GBP)', price_text)
    currency = currency_match.group(0) if currency_match else "INR"

    num_match = re.search(r'[\d.,]+', price_text.replace('\u00A0', ' '))
    if not num_match:
        raise ValueError("No numeric value found")

    price_str = num_match.group(0).replace(',', '')
    value = float(price_str)

    return value, currency


# ================== SCRAPER ==================
def create_driver():
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1920,1080")

    driver = webdriver.Chrome(
        service=Service(ChromeDriverManager().install()),
        options=options
    )
    return driver


def scrape_flipkart(driver):
    title = None
    price = None

    # Title selectors
    title_selectors = [
        "span.VU-ZEz",
        "span.B_NuCI"
    ]

    # Price selectors
    price_selectors = [
        "div.Nx9bqj",
        "div._30jeq3._16Jk6d"
    ]

    for selector in title_selectors:
        try:
            title = driver.find_element(By.CSS_SELECTOR, selector).text
            if title:
                break
        except:
            pass

    for selector in price_selectors:
        try:
            price_text = driver.find_element(By.CSS_SELECTOR, selector).text
            price = float(
                re.sub(r"[^\d]", "", price_text)
            )
            if price:
                break
        except:
            pass

    return title, price


def scrape_amazon(driver):
    title = None
    price = None

    title_selectors = [
        "#productTitle"
    ]

    price_selectors = [
        ".a-price-whole",
        "#priceblock_ourprice",
        "#priceblock_dealprice"
    ]

    for selector in title_selectors:
        try:
            title = driver.find_element(By.CSS_SELECTOR, selector).text.strip()
            if title:
                break
        except:
            pass

    for selector in price_selectors:
        try:
            price_text = driver.find_element(By.CSS_SELECTOR, selector).text
            price = float(
                re.sub(r"[^\d]", "", price_text)
            )
            if price:
                break
        except:
            pass

    return title, price


def extract_meta_image(url):
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
        }
        response = requests.get(url, headers=headers, timeout=5)
        html = response.text
        
        match = re.search(r'<meta[^>]*property=["\']og:image["\'][^>]*content=["\']([^"\']+)["\']', html, re.IGNORECASE)
        if match:
            return match.group(1)
            
        match = re.search(r'<meta[^>]*content=["\']([^"\']+)["\'][^>]*property=["\']og:image["\']', html, re.IGNORECASE)
        if match:
            return match.group(1)
            
        match = re.search(r'<meta[^>]*name=["\']twitter:image["\'][^>]*content=["\']([^"\']+)["\']', html, re.IGNORECASE)
        if match:
            return match.group(1)
            
    except Exception as e:
        logger.warning(f"Meta image extraction failed: {e}")
    return None


def generate_mock_product(url):
    parsed = urlparse(url)
    path = parsed.path
    
    segments = [s for s in path.split('/') if s]
    slug = ""
    for s in reversed(segments):
        if s.lower() in {'p', 'dp', 'product', 'gp'}:
            continue
        if s.lower().startswith('itm') and len(s) >= 10:
            continue
        if re.match(r'^[A-Z0-9]{10}$', s, re.IGNORECASE):
            continue
        if s.isdigit():
            continue
        slug = s
        break
        
    if not slug and segments:
        slug = segments[0]
        
    slug = slug.split('.')[0]
    slug = re.sub(r'^[ip]d[m|t]', '', slug)
    
    words = re.split(r'[-_]', slug)
    cleaned_words = [w.capitalize() for w in words if w]
    title = " ".join(cleaned_words)
    
    if not title:
        title = "Generic Tracked Product"
        
    title = re.sub(r'\b[A-Z0-9]{10}\b', '', title).strip()
    
    import hashlib
    url_hash = int(hashlib.md5(url.encode('utf-8')).hexdigest(), 16)
    
    title_lower = title.lower()
    if any(k in title_lower for k in ["airdope", "earbud", "headphone", "earphone", "duopod", "pod", "sound", "audio"]):
        price = 499 + (url_hash % 2500)
    elif any(k in title_lower for k in ["phone", "mobile", "galaxy", "iphone", "s24", "oneplus"]):
        price = 12999 + (url_hash % 67000)
    elif any(k in title_lower for k in ["laptop", "macbook", "notebook", "computer"]):
        price = 29999 + (url_hash % 70000)
    elif any(k in title_lower for k in ["shirt", "tshirt", "jeans", "jacket", "socks", "clothing"]):
        price = 399 + (url_hash % 2600)
    else:
        price = 499 + (url_hash % 14500)
        
    image_url = extract_meta_image(url)
        
    return {
        "title": title,
        "price": float(price),
        "currency": "INR",
        "price_source": "mock_generator",
        "image_url": image_url
    }


def scrape_product_info(url):
    driver = None
    try:
        driver = create_driver()
        driver.set_page_load_timeout(10)
        driver.get(url)
        time.sleep(2)
        domain = urlparse(url).netloc.lower()
        title = None
        price = None

        if "flipkart" in domain:
            title, price = scrape_flipkart(driver)
        elif "amazon" in domain:
            title, price = scrape_amazon(driver)
        else:
            return generate_mock_product(url), None

        if not title or not price:
            logger.warning("Scraper failed to extract title/price, falling back to mock generator")
            return generate_mock_product(url), None

        image_url = extract_meta_image(url)

        return {
            "title": title,
            "price": price,
            "currency": "INR",
            "price_source": "live_scraping",
            "image_url": image_url
        }, None

    except Exception as e:
        logger.warning(f"Scraper error: {e}. Falling back to mock generator.")
        return generate_mock_product(url), None
    finally:
        if driver:
            try:
                driver.quit()
            except:
                pass


# ================== ML MODEL ==================
def predict_lowest_price(current_price):
    history = []
    for i in range(30):
        fluctuation = np.random.uniform(-0.08, 0.05)
        simulated_price = current_price * (1 + fluctuation)
        history.append(round(simulated_price, 2))

    X = np.arange(len(history)).reshape(-1, 1)
    y = np.array(history)

    model = LinearRegression()
    model.fit(X, y)

    future_days = np.arange(30, 37).reshape(-1, 1)
    predictions = model.predict(future_days)
    lowest_price = min(predictions)

    if lowest_price < current_price:
        advice = "Wait for price drop"
    else:
        advice = "Current price is best"

    return (
        round(float(lowest_price), 2),
        advice,
        history,
        predictions.tolist()
    )


# ================== ROUTES ==================

@app.route('/')
def index():
    return jsonify({
        "status": "running",
        "service": "Pricevana REST API",
        "supported_domains": SUPPORTED_PRODUCT_DOMAINS
    })


@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()
        url = data.get("url")

        if not url:
            return jsonify({
                "error": "Product URL required"
            }), 400

        # Check demo catalog first to avoid Selenium dependency for catalog URLs
        product = get_catalog_product(url)
        error = None
        if not product:
            product, error = scrape_product_info(url)

        if error:
            return jsonify({
                "error": error
            }), 422

        current_price = product["price"]
        predicted_price, advice, history, future = predict_lowest_price(
            current_price
        )

        return jsonify({
            "product_title": product["title"],
            "currentPrice": current_price,
            "predictedLowest": round(predicted_price, 2),
            "currency": "INR",
            "advice": advice,
            "history": history,
            "future_predictions": future,
            "price_source": product["price_source"],
            "url": url,
            "image_url": product.get("image_url")
        })

    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500


@app.route('/compare', methods=['POST'])
def compare():
    try:
        data = get_json_payload()
        title = data.get('title')
        current_url = str(data.get('url', ''))

        if not title:
            return jsonify({"error": "Title required"}), 400
        title = str(title)[:300]

        platforms = [
            {"name": "Amazon", "search_url": "https://www.amazon.in/s?k=", "price_sel": ".a-price-whole"},
            {"name": "Flipkart", "search_url": "https://www.flipkart.com/search?q=", "price_sel": "._30jeq3"},
            {"name": "Myntra", "search_url": "https://www.myntra.com/", "price_sel": ".product-discountedPrice"}
        ]

        results = []
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
        }

        import hashlib
        seed = int(hashlib.md5(title.encode()).hexdigest(), 16)
        rng = np.random.default_rng(seed % 1000)
        try:
            current_price = parse_number(data.get('current_price', 1000), "Current price", positive=True)
        except ValueError as e:
            return jsonify({"error": str(e)}), 400

        for p in platforms:
            if p["name"].lower() in current_url.lower():
                continue
                
            price_variation = rng.uniform(0.9, 1.1)
            results.append({
                "platform": p["name"],
                "price": round(current_price * price_variation),
                "url": p["search_url"] + requests.utils.quote(title),
                "available": True
            })

        return jsonify({
            "comparisons": results
        })

    except Exception as e:
        logger.error(f"Comparison endpoint exception: {str(e)}")
        return jsonify({"error": str(e)}), 500


# ================== AI ADVICE ==================

def generate_rule_based_advice(product, price, predicted):
    diff = price - predicted
    if diff > 0:
        pct = round((diff / price) * 100, 1)
        return (
            f"🎯 Strategic Buyer Tip: We predict a price drop of {pct}% (save ~₹{int(diff)}) over the coming week. "
            f"Setting a Pricevana Alert is highly recommended to catch the lowest rate."
        )
    else:
        return (
            f"🔥 Active Deal Alert: The current rate of ₹{price} is at its seasonal baseline. "
            f"Our predictive models project a potential upward adjustment soon. This is a recommended buy."
        )


@app.route('/ai-advice', methods=['POST'])
def ai_advice():
    try:
        data = get_json_payload()

        product = data.get('product')
        price = data.get('price')
        predicted = data.get('predicted')
        if not product or price is None or predicted is None:
            return jsonify({"error": "Product, price and predicted price required"}), 400
            
        # Try calling OpenAI first if API key is configured
        api_key = os.getenv("OPENAI_API_KEY")
        if api_key and not api_key.startswith("your_") and len(api_key) > 20:
            try:
                prompt = f"Product: {product}\nCurrent Price: ₹{price}\nPredicted Price: ₹{predicted}\n\nGive short buying advice (2 lines)."
                client = OpenAI(api_key=api_key)
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "user", "content": prompt}],
                    timeout=5
                )
                return jsonify({
                    "advice": response.choices[0].message.content.strip()
                })
            except Exception as openai_err:
                logger.warning(f"OpenAI API failed: {openai_err}. Falling back to rule-based advice.")
        
        # Fallback to rule-based strategic advice generator
        advice_text = generate_rule_based_advice(product, price, predicted)
        return jsonify({
            "advice": advice_text
        })

    except Exception as e:
        logger.error(f"AI advice endpoint exception: {str(e)}")
        return jsonify({"error": str(e)}), 500


# ================== BUYHATKE & FLASH.CO FEATURES DATA ==================

price_alerts = []

MOCK_COUPONS = {
    "amazon": [
        {"code": "AMZFREE", "discount": "Free Shipping", "description": "Get free shipping on your entire cart", "success_rate": "92%"},
        {"code": "SAVE10", "discount": "10% OFF", "description": "10% discount up to ₹1,000 on electronic appliances", "success_rate": "78%"},
        {"code": "FESTIVE500", "discount": "₹500 OFF", "description": "Flat ₹500 off on order above ₹5,000", "success_rate": "65%"},
        {"code": "AMZBLOCK", "discount": "15% OFF", "description": "15% off on Amazon Brands", "success_rate": "42%"}
    ],
    "flipkart": [
        {"code": "FKWELCOME10", "discount": "10% OFF", "description": "10% off for your first shopping order", "success_rate": "95%"},
        {"code": "SUPERCOIN5", "discount": "5% OFF", "description": "Additional 5% discount on using Flipkart SuperCoins", "success_rate": "89%"},
        {"code": "FLAT1200", "discount": "₹1,200 OFF", "description": "Flat ₹1,200 off on select Mobiles & Electronics", "success_rate": "54%"},
        {"code": "FKDEAL", "discount": "15% OFF", "description": "15% off on electronic accessories", "success_rate": "38%"}
    ],
    "myntra": [
        {"code": "MYNTRA200", "discount": "₹200 OFF", "description": "Flat ₹200 off on your first order above ₹999", "success_rate": "98%"},
        {"code": "STYLE30", "discount": "30% OFF", "description": "30% off on premium fashion labels", "success_rate": "82%"},
        {"code": "FREEGIFT", "discount": "Free Accessory", "description": "Get a free card holder on orders above ₹2,499", "success_rate": "67%"},
        {"code": "TRENDING15", "discount": "15% OFF", "description": "Extra 15% discount on trending casual wear", "success_rate": "50%"}
    ]
}

inbox_emails = [
    {
        "id": 1,
        "sender": "Flipkart Delivery",
        "sender_email": "delivery@flipkart.com",
        "subject": "Your package is out for delivery! 🚚",
        "date": "Today, 08:30 AM",
        "body": """
            <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff; color: #1e293b;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #eff6ff; padding-bottom: 15px; margin-bottom: 20px;">
                    <h2 style="color: #2563eb; margin: 0; font-size: 20px;">Flipkart</h2>
                    <span style="font-size: 12px; color: #64748b; font-weight: bold; background: #eff6ff; padding: 4px 8px; border-radius: 999px;">ORDER #FP981273912</span>
                </div>
                <p>Hi Customer,</p>
                <p>Great news! Your package is currently out for delivery with our delivery partner and will reach you today by 9:00 PM.</p>
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <strong style="display: block; margin-bottom: 8px; color: #0f172a;">Shipping Details:</strong>
                    <div style="font-size: 14px; line-height: 1.5;">
                        <strong>Product:</strong> Sony WH-1000XM4 Noise Cancelling Headphones<br>
                        <strong>Quantity:</strong> 1<br>
                        <strong>Delivery Address:</strong> 104, Green Meadows, Sector 45, Gurgaon, Haryana - 122003
                    </div>
                </div>
                <p style="font-size: 14px; color: #64748b;">Thanks for shopping with us!<br>Team Flipkart</p>
            </div>
        """,
        "status": "Out for Delivery",
        "retailer": "Flipkart",
        "amount": 19999,
        "cashback": 1000,
        "read": False
    },
    {
        "id": 2,
        "sender": "Amazon.in Orders",
        "sender_email": "auto-confirm@amazon.in",
        "subject": "Order Confirmation for Sony PlayStation 5 🎮",
        "date": "Yesterday, 04:15 PM",
        "body": """
            <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff; color: #1e293b;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #fff7ed; padding-bottom: 15px; margin-bottom: 20px;">
                    <h2 style="color: #ff9900; margin: 0; font-size: 20px;">Amazon.in</h2>
                    <span style="font-size: 12px; color: #64748b; font-weight: bold; background: #fff7ed; padding: 4px 8px; border-radius: 999px;">ORDER #408-9812739-11029</span>
                </div>
                <p>Hello,</p>
                <p>Thank you for shopping with us. We'll send a confirmation when your items ship. Your estimated delivery date is in 2 days.</p>
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <strong style="display: block; margin-bottom: 8px; color: #0f172a;">Order Summary:</strong>
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                        <tr style="border-bottom: 1px solid #e2e8f0;">
                            <td style="padding: 8px 0;">Sony PlayStation 5 Console (Slim)</td>
                            <td style="text-align: right; padding: 8px 0;">₹44,990.00</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold;">Grand Total:</td>
                            <td style="text-align: right; padding: 8px 0; font-weight: bold; color: #ff9900;">₹44,990.00</td>
                        </tr>
                    </table>
                </div>
                <p style="font-size: 14px; color: #64748b;">Visit Your Orders to check tracking details.<br>Amazon.in Support</p>
            </div>
        """,
        "status": "Shipped",
        "retailer": "Amazon",
        "amount": 44990,
        "cashback": 2249.50,
        "read": True
    },
    {
        "id": 3,
        "sender": "Myntra Delivery",
        "sender_email": "orders@myntra.com",
        "subject": "Your Myntra package has been delivered! 🎉",
        "date": "May 24, 2026",
        "body": """
            <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff; color: #1e293b;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #fdf2f8; padding-bottom: 15px; margin-bottom: 20px;">
                    <h2 style="color: #ff3f6c; margin: 0; font-size: 20px;">Myntra</h2>
                    <span style="font-size: 12px; color: #64748b; font-weight: bold; background: #fdf2f8; padding: 4px 8px; border-radius: 999px;">ORDER #MY-918237918</span>
                </div>
                <p>Hey there,</p>
                <p>Your style has arrived! Your order was delivered at 2:40 PM. We hope you love the fit!</p>
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <strong style="display: block; margin-bottom: 8px; color: #0f172a;">Delivered Items:</strong>
                    <div style="font-size: 14px; line-height: 1.5;">
                        <strong>Product:</strong> Roadster Men Solid Bomber Jacket<br>
                        <strong>Size:</strong> L<br>
                        <strong>Amount Paid:</strong> ₹1,899.00
                    </div>
                </div>
                <p style="font-size: 14px; color: #64748b;">Thank you for shopping with Myntra!<br>Style Team</p>
            </div>
        """,
        "status": "Delivered",
        "retailer": "Myntra",
        "amount": 1899,
        "cashback": 94.95,
        "read": True
    }
]

wallet = {
    "balance": 3344.45,
    "coins": 1520,
    "transactions": [
        {"id": 1, "type": "Cashback", "amount": 1000.00, "details": "Flipkart Order #FP981273912", "date": "May 25, 2026", "status": "Credited"},
        {"id": 2, "type": "Cashback", "amount": 2249.50, "details": "Amazon Order #408-9812739-11029", "date": "May 24, 2026", "status": "Credited"},
        {"id": 3, "type": "Cashback", "amount": 94.95, "details": "Myntra Order #MY-918237918", "date": "May 24, 2026", "status": "Credited"},
    ]
}


@app.route('/api/coupons', methods=['POST'])
def get_coupons():
    try:
        data = get_json_payload()
        url = str(data.get('url', '')).lower()
        
        retailer = "amazon"
        if "flipkart" in url:
            retailer = "flipkart"
        elif "myntra" in url:
            retailer = "myntra"
            
        coupons = MOCK_COUPONS.get(retailer, MOCK_COUPONS["amazon"])
        return jsonify({"coupons": coupons, "retailer": retailer})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/alerts', methods=['GET', 'POST', 'DELETE'])
def manage_alerts():
    global price_alerts
    try:
        if request.method == 'GET':
            return jsonify({"alerts": price_alerts})
            
        elif request.method == 'POST':
            data = get_json_payload()
            if not data or not data.get('url') or not data.get('email') or not data.get('target_price'):
                return jsonify({"error": "Missing required fields"}), 400

            target_price = parse_number(data.get('target_price'), "Target price", positive=True)
            current_price = parse_number(data.get('current_price', 0), "Current price", non_negative=True)
                
            alert = {
                "id": next_id(price_alerts),
                "title": str(data.get('title', 'Unknown Product'))[:300],
                "url": data.get('url'),
                "email": str(data.get('email'))[:254],
                "current_price": current_price,
                "target_price": target_price,
                "currency": data.get('currency', 'INR'),
                "date_created": datetime.utcnow().strftime("%Y-%m-%d"),
                "status": "Active"
            }
            price_alerts.append(alert)
            return jsonify({"message": "Alert created successfully", "alert": alert})
            
        elif request.method == 'DELETE':
            data = get_json_payload()
            alert_id = data.get('id')
            if not alert_id:
                return jsonify({"error": "Alert ID required"}), 400
                
            price_alerts = [a for a in price_alerts if a["id"] != int(alert_id)]
            return jsonify({"message": "Alert deleted successfully"})
            
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/inbox', methods=['GET', 'POST'])
def manage_inbox():
    global inbox_emails, wallet
    try:
        if request.method == 'GET':
            return jsonify({"inbox": inbox_emails})
            
        elif request.method == 'POST':
            data = get_json_payload()
            if not data or not data.get('title') or data.get('price') is None:
                return jsonify({"error": "Product title and price required"}), 400
                
            title = str(data.get('title'))[:300]
            price = parse_number(data.get('price'), "Price", positive=True)
            url = str(data.get('url', ''))
            currency = data.get('currency', 'INR')
            currency = currency if currency in {"INR", "USD", "EUR", "GBP"} else "INR"
            safe_title = escape(title)
            safe_currency = escape(currency)
            
            retailer = "Amazon"
            if "flipkart" in url.lower():
                retailer = "Flipkart"
            elif "myntra" in url.lower():
                retailer = "Myntra"
                
            order_id = f"ORDER-{datetime.utcnow().strftime('%M%S%f')[:9]}"
            cashback_amount = round(price * 0.05, 2)
            coins_earned = int(price * 0.02)
            
            email_body = f"""
                <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff; color: #1e293b;">
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 15px; margin-bottom: 20px;">
                        <h2 style="color: #2563eb; margin: 0; font-size: 20px;">{retailer}</h2>
                        <span style="font-size: 12px; color: #64748b; font-weight: bold; background: #f1f5f9; padding: 4px 8px; border-radius: 999px;">{order_id}</span>
                    </div>
                    <p>Hello Shopper,</p>
                    <p>Your Pricevana assistant successfully captured and verified your order! Congratulations on earning cashbacks and coins.</p>
                    <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <strong style="display: block; margin-bottom: 8px; color: #1e40af;">🎉 Cashback Verified!</strong>
                        <p style="margin: 0; font-size: 14px; color: #1e3a8a;">
                            A cash value of <strong>{safe_currency} {cashback_amount}</strong> (5% cashback) has been instantly credited to your Pricevana Wallet!
                        </p>
                    </div>
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <strong style="display: block; margin-bottom: 8px; color: #0f172a;">Order Summary:</strong>
                        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                            <tr style="border-bottom: 1px solid #e2e8f0;">
                                <td style="padding: 8px 0;">{safe_title}</td>
                                <td style="text-align: right; padding: 8px 0;">{safe_currency} {price}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold;">Grand Total:</td>
                                <td style="text-align: right; padding: 8px 0; font-weight: bold; color: #2563eb;">{safe_currency} {price}</td>
                            </tr>
                        </table>
                    </div>
                    <p style="font-size: 14px; color: #64748b;">Thanks for shopping smarter with Pricevana!<br>Smart Delivery Team</p>
                </div>
            """
            
            new_email = {
                "id": next_id(inbox_emails),
                "sender": f"{retailer} Smart Tracker",
                "sender_email": f"tracker@{retailer.lower()}.com",
                "subject": f"Verified Order & Cashback Alert! {order_id} 💰",
                "date": "Just now",
                "body": email_body,
                "status": "In Transit",
                "retailer": retailer,
                "amount": price,
                "cashback": cashback_amount,
                "read": False
            }
            
            inbox_emails.insert(0, new_email)
            
            wallet["balance"] = round(wallet["balance"] + cashback_amount, 2)
            wallet["coins"] += coins_earned
            wallet["transactions"].insert(0, {
                "id": next_id(wallet["transactions"]),
                "type": "Cashback",
                "amount": cashback_amount,
                "details": f"{retailer} Order {order_id}",
                "date": "Today",
                "status": "Credited"
            })
            
            return jsonify({
                "message": "Order captured & simulated email delivered successfully!",
                "order_id": order_id,
                "cashback": cashback_amount,
                "coins": coins_earned,
                "email": new_email
            })
            
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/wallet', methods=['GET', 'POST'])
def manage_wallet():
    global wallet
    try:
        if request.method == 'GET':
            return jsonify(wallet)
            
        elif request.method == 'POST':
            # UPI withdrawal simulation
            data = get_json_payload()
            if not data or data.get('amount') is None or not data.get('upi'):
                return jsonify({"error": "Amount and UPI ID required"}), 400
                
            amount = parse_number(data.get('amount'), "Amount", positive=True)
            upi = str(data.get('upi'))[:100]
            
            if amount > wallet["balance"]:
                return jsonify({"error": "Insufficient balance"}), 400
                
            wallet["balance"] = round(wallet["balance"] - amount, 2)
            wallet["transactions"].insert(0, {
                "id": next_id(wallet["transactions"]),
                "type": "Withdrawal",
                "amount": -amount,
                "details": f"UPI payout to {upi}",
                "date": "Today",
                "status": "Completed"
            })
            
            return jsonify({
                "message": "Withdrawal processed successfully via UPI!",
                "new_balance": wallet["balance"],
                "amount_withdrawn": amount
            })
            
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ================== DISCOVERY HUB DATA (BUYHATKE-STYLE) ==================

MOCK_GIFT_CARDS = {
    "amazon": {"name": "Amazon Pay Gift Card", "cashback_rate": 0.5, "badge": "FLAT 0.5% CASHBACK", "provider": "Amazon"},
    "flipkart": {"name": "Flipkart Gift Card", "cashback_rate": 1.0, "badge": "FLAT 1.0% OFF", "provider": "Flipkart"},
    "myntra": {"name": "Myntra Gift Card", "cashback_rate": 4.5, "badge": "FLAT 4.5% OFF", "provider": "Myntra"},
    "dominos": {"name": "Dominos Voucher Card", "cashback_rate": 12.0, "badge": "FLAT 12.0% OFF", "provider": "Dominos"},
    "blinkit": {"name": "Blinkit E-Voucher", "cashback_rate": 3.0, "badge": "FLAT 3.0% OFF", "provider": "Blinkit"},
    "pvr": {"name": "PVR Cinemas Voucher", "cashback_rate": 18.0, "badge": "FLAT 18.0% OFF", "provider": "PVR"}
}

MOCK_BUDGET_DEALS = {
    "99": [
        {"title": "USB-C OTG Sync Adapter", "store": "Flipkart", "price": 79, "original_price": 299, "discount": "73% OFF", "rating": 4.2, "url": "https://www.flipkart.com/search?q=usb-c+otg+adapter"},
        {"title": "Laptop Webcam Slider Cover (3 Pack)", "store": "Amazon", "price": 49, "original_price": 199, "discount": "75% OFF", "rating": 4.5, "url": "https://www.amazon.in/s?k=laptop+webcam+cover"},
        {"title": "Premium Matte Metal Carabiner Keyring", "store": "Amazon", "price": 89, "original_price": 399, "discount": "77% OFF", "rating": 3.9, "url": "https://www.amazon.in/s?k=matte+metal+carabiner"}
    ],
    "199": [
        {"title": "Dual-Port 18W Fast Car Charger", "store": "Amazon", "price": 149, "original_price": 499, "discount": "70% OFF", "rating": 4.3, "url": "https://www.amazon.in/s?k=fast+car+charger"},
        {"title": "Fine Point Capacitive Stylus Pen", "store": "Flipkart", "price": 129, "original_price": 399, "discount": "67% OFF", "rating": 4.0, "url": "https://www.flipkart.com/search?q=capacitive+stylus+pen"},
        {"title": "Anti-Static Screen Cleaning Microfiber Cloth", "store": "Myntra", "price": 119, "original_price": 249, "discount": "52% OFF", "rating": 4.6, "url": "https://www.myntra.com/screen-clean-cloth"}
    ],
    "299": [
        {"title": "Ergonomic Silent USB Wired Mouse", "store": "Flipkart", "price": 249, "original_price": 799, "discount": "68% OFF", "rating": 4.1, "url": "https://www.flipkart.com/search?q=wired+mouse"},
        {"title": "Unisex Cotton Cushion Cushion Socks (3 Pair)", "store": "Myntra", "price": 229, "original_price": 599, "discount": "61% OFF", "rating": 4.4, "url": "https://www.myntra.com/socks"},
        {"title": "Flexible 360 Mini Tripod for Phone", "store": "Amazon", "price": 279, "original_price": 899, "discount": "69% OFF", "rating": 4.2, "url": "https://www.amazon.in/s?k=mini+tripod+phone"}
    ],
    "399": [
        {"title": "Smart LED Bulb 9W (Wi-Fi, Multi-Color)", "store": "Amazon", "price": 349, "original_price": 999, "discount": "65% OFF", "rating": 4.5, "url": "https://www.amazon.in/s?k=smart+led+bulb+9w"},
        {"title": "Comfy Lounge Cotton Pajama Shorts", "store": "Myntra", "price": 399, "original_price": 999, "discount": "60% OFF", "rating": 4.3, "url": "https://www.myntra.com/pajama-shorts"},
        {"title": "Anti-Glare Blue Light Filtering Glasses", "store": "Flipkart", "price": 379, "original_price": 1299, "discount": "70% OFF", "rating": 4.0, "url": "https://www.flipkart.com/search?q=blue+light+glasses"}
    ]
}

MOCK_CATEGORY_DEALS = {
    "smartphones": [
        {"title": "Apple iPhone 15 Pro Max (256GB, Blue)", "store": "Amazon", "price": 139900, "original_price": 159900, "discount": "12% OFF", "rating": 4.8, "url": "https://www.amazon.in/s?k=iphone+15+pro+max"},
        {"title": "Samsung Galaxy S24 Ultra (5G, 12GB RAM)", "store": "Flipkart", "price": 119999, "original_price": 129999, "discount": "7% OFF", "rating": 4.7, "url": "https://www.flipkart.com/search?q=samsung+s24+ultra"},
        {"title": "OnePlus 12R (5G, 8GB RAM, 256GB)", "store": "Amazon", "price": 39999, "original_price": 45999, "discount": "13% OFF", "rating": 4.5, "url": "https://www.amazon.in/s?k=oneplus+12r"}
    ],
    "laptops": [
        {"title": "Apple MacBook Air M2 (16GB, 512GB SSD)", "store": "Amazon", "price": 94999, "original_price": 114999, "discount": "17% OFF", "rating": 4.8, "url": "https://www.amazon.in/s?k=macbook+air+m2"},
        {"title": "HP Pavilion 15 (Ryzen 5, 16GB, 512GB)", "store": "Flipkart", "price": 44999, "original_price": 54999, "discount": "18% OFF", "rating": 4.2, "url": "https://www.flipkart.com/search?q=hp+pavilion+15"},
        {"title": "Lenovo IdeaPad Slim 3 (Intel Core i3)", "store": "Amazon", "price": 32900, "original_price": 48999, "discount": "32% OFF", "rating": 4.1, "url": "https://www.amazon.in/s?k=lenovo+ideapad+slim+3"}
    ],
    "televisions": [
        {"title": "Xiaomi Smart TV X Pro (55 Inch, 4K Dolby)", "store": "Flipkart", "price": 34999, "original_price": 49999, "discount": "30% OFF", "rating": 4.4, "url": "https://www.flipkart.com/search?q=xiaomi+tv+55"},
        {"title": "Sony BRAVIA 4K Ultra HD (65 Inch, Smart TV)", "store": "Amazon", "price": 79999, "original_price": 119900, "discount": "33% OFF", "rating": 4.7, "url": "https://www.amazon.in/s?k=sony+tv+65"},
        {"title": "Samsung Crystal 4K Smart TV (43 Inch)", "store": "Amazon", "price": 28990, "original_price": 44900, "discount": "35% OFF", "rating": 4.3, "url": "https://www.amazon.in/s?k=samsung+tv+43"}
    ],
    "appliances": [
        {"title": "Samsung 236L Double Door Refrigerator", "store": "Flipkart", "price": 22490, "original_price": 28999, "discount": "22% OFF", "rating": 4.4, "url": "https://www.flipkart.com/search?q=samsung+double+door+refrigerator"},
        {"title": "LG 7kg 5-Star Front Load Washing Machine", "store": "Amazon", "price": 29490, "original_price": 38999, "discount": "24% OFF", "rating": 4.6, "url": "https://www.amazon.in/s?k=lg+washing+machine"},
        {"title": "Haier 190L Single Door Refrigerator", "store": "Flipkart", "price": 14790, "original_price": 19999, "discount": "26% OFF", "rating": 4.3, "url": "https://www.flipkart.com/search?q=haier+single+door+refrigerator"}
    ]
}

SEARCH_PRODUCTS = [
    {"title": "SMOWKLY Women Korean Cotton Shorts Pajama Set", "store": "Amazon", "price": 498, "original_price": 999, "discount": "50% OFF", "rating": 3.8, "url": "https://www.amazon.in/s?k=smowkly+shorts+pajama+set"},
    {"title": "Korean Style Women Night Suit Cute Printed Pajamas", "store": "Flipkart", "price": 649, "original_price": 1299, "discount": "50% OFF", "rating": 3.8, "url": "https://www.flipkart.com/search?q=korean+style+women+night+suit"},
    {"title": "Women Korean Striped Shorts Pajama Set", "store": "Amazon", "price": 498, "original_price": 999, "discount": "50% OFF", "rating": 3.9, "url": "https://www.amazon.in/s?k=striped+shorts+pajama+set"},
    {"title": "Women Korean Hearts Print Pajama Set", "store": "Amazon", "price": 493.9, "original_price": 999, "discount": "51% OFF", "rating": 3.9, "url": "https://www.amazon.in/s?k=hearts+print+pajama+set"},
    {"title": "Celary Korean Style Night Suit Cute Printed Sleepwear", "store": "Amazon", "price": 649, "original_price": 1499, "discount": "57% OFF", "rating": 3.8, "url": "https://www.amazon.in/s?k=celary+night+suit"},
    {"title": "Sony WH-1000XM4 Noise Cancellation Bluetooth Headphones", "store": "Amazon", "price": 19999, "original_price": 29990, "discount": "33% OFF", "rating": 4.6, "url": "https://www.amazon.in/Sony-WH-1000XM4-Bluetooth-Cancellation-Resistance/dp/B0863TXGM3"},
    {"title": "Puma Unisex Solid Classic Retro Sneakers", "store": "Myntra", "price": 2499, "original_price": 4999, "discount": "50% OFF", "rating": 4.2, "url": "https://www.myntra.com/sneakers"},
    {"title": "Adidas Running Ultraboost Sports Shoes", "store": "Myntra", "price": 9899, "original_price": 17999, "discount": "45% OFF", "rating": 4.7, "url": "https://www.myntra.com/adidas-ultraboost"}
]

for tier in MOCK_BUDGET_DEALS.values():
    SEARCH_PRODUCTS.extend(tier)
for cat in MOCK_CATEGORY_DEALS.values():
    SEARCH_PRODUCTS.extend(cat)


@app.route('/api/search', methods=['POST'])
def search_deals():
    try:
        data = get_json_payload()
        query = data.get('query', '').lower().strip()
        
        if not query:
            return jsonify({"results": SEARCH_PRODUCTS[:6]})
            
        matches = []
        for p in SEARCH_PRODUCTS:
            if query in p["title"].lower() or query in p["store"].lower():
                matches.append(p)
                
        return jsonify({"results": matches})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/deals', methods=['GET'])
def get_deals():
    try:
        tier = request.args.get('tier')
        category = request.args.get('category')
        
        if tier:
            deals = MOCK_BUDGET_DEALS.get(tier, [])
            return jsonify({"deals": deals})
        elif category:
            deals = MOCK_CATEGORY_DEALS.get(category, [])
            return jsonify({"deals": deals})
            
        return jsonify({"error": "Missing parameter tier or category"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/giftcards/buy', methods=['POST'])
def buy_giftcard():
    global inbox_emails, wallet
    try:
        data = get_json_payload()
        if not data or not data.get('brand') or data.get('value') is None:
            return jsonify({"error": "Brand and card value required"}), 400
            
        brand_id = data.get('brand')
        value = parse_number(data.get('value'), "Card value", positive=True)
        
        card = MOCK_GIFT_CARDS.get(brand_id)
        if not card:
            return jsonify({"error": "Invalid Brand selected"}), 400
            
        cashback_rate = card["cashback_rate"]
        cashback_earned = round(value * (cashback_rate / 100), 2)
        
        voucher_code = f"PV-{brand_id.upper()}-{datetime.utcnow().strftime('%f%H%M')[:10]}"
        provider = card["provider"]
        
        payment_source = "External Gateway (Card/UPI)"
        if wallet["balance"] >= value:
            wallet["balance"] = round(wallet["balance"] - value, 2)
            payment_source = "Cashback Wallet Balance"
            wallet["transactions"].insert(0, {
                "id": next_id(wallet["transactions"]),
                "type": "Voucher Purchase",
                "amount": -value,
                "details": f"Bought {card['name']} Voucher",
                "date": "Today",
                "status": "Completed"
            })
            
        wallet["balance"] = round(wallet["balance"] + cashback_earned, 2)
        wallet["coins"] += int(value * 0.05)
        
        wallet["transactions"].insert(0, {
            "id": next_id(wallet["transactions"]),
            "type": "Voucher Cashback",
            "amount": cashback_earned,
            "details": f"{cashback_rate}% Flat Reward for {card['name']}",
            "date": "Today",
            "status": "Credited"
        })
        
        email_body = f"""
            <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff; color: #1e293b;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f8fafc; padding-bottom: 15px; margin-bottom: 20px;">
                    <h2 style="color: #6366f1; margin: 0; font-size: 20px;">Pricevana Gift Voucher Hub</h2>
                    <span style="font-size: 12px; color: #64748b; font-weight: bold; background: #eff6ff; padding: 4px 8px; border-radius: 999px;">VOUCHER CONFIRMED</span>
                </div>
                <p>Hello Shopper,</p>
                <p>Your digital voucher purchase was processed successfully! Here are your activation details:</p>
                
                <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                    <span style="font-size: 13px; color: var(--text-muted); display: block; margin-bottom: 4px;">{card['name']} Value</span>
                    <strong style="font-size: 32px; color: #2563eb; display: block; margin-bottom: 12px;">₹{value}</strong>
                    <span style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.5px; display: block; margin-bottom: 4px;">Activation Voucher Code</span>
                    <strong style="font-family: monospace; font-size: 18px; letter-spacing: 1px; background: white; padding: 6px 16px; border: 1px dashed #2563eb; border-radius: 4px; display: inline-block;">{voucher_code}</strong>
                </div>

                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px; border-radius: 6px; margin: 20px 0;">
                    <strong style="color: #166534; font-size: 13px; display: block; margin-bottom: 2px;">🎁 flat Cashback Credited!</strong>
                    <p style="margin: 0; font-size: 13px; color: #14532d;">
                        A cash reward of <strong>₹{cashback_earned}</strong> ({cashback_rate}% flat cashback) has been added to your wallet!
                    </p>
                </div>

                <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; font-size: 12px;">
                    <strong>Receipt Details:</strong><br>
                    <strong>Payment Source:</strong> {payment_source}<br>
                    <strong>Voucher Provider:</strong> {provider}<br>
                    <strong>Transaction Date:</strong> Today
                </div>
                
                <p style="font-size: 13px; color: var(--text-muted); margin-top: 20px; text-align: center;">
                    Redeem this code at checkout on the {provider} app/website.<br>
                    Thanks for shopping with Pricevana!
                </p>
            </div>
        """
        
        new_email = {
            "id": next_id(inbox_emails),
            "sender": "Pricevana Voucher Hub",
            "sender_email": "vouchers@pricevana.co",
            "subject": f"Voucher Delivered! ₹{value} {card['name']} Code Inside 🎁",
            "date": "Just now",
            "body": email_body,
            "status": "Delivered",
            "retailer": provider,
            "amount": value,
            "cashback": cashback_earned,
            "read": False
        }
        
        inbox_emails.insert(0, new_email)
        
        return jsonify({
            "message": "Gift card purchased successfully!",
            "cashback_earned": cashback_earned,
            "voucher_code": voucher_code,
            "new_balance": wallet["balance"],
            "email": new_email
        })
        
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ================== SPEND LENS & GROCERY BASKET DATA ==================

GROCERY_ITEMS_PRICES = {
    "milk": {"name": "Organic Whole Milk (1L)", "bigbasket": 68, "blinkit": 72, "zepto": 70},
    "coffee": {"name": "Premium Roast Coffee (200g)", "bigbasket": 340, "blinkit": 360, "zepto": 350},
    "almonds": {"name": "California Almonds (500g)", "bigbasket": 420, "blinkit": 450, "zepto": 440},
    "bread": {"name": "Whole Wheat Bread (400g)", "bigbasket": 45, "blinkit": 48, "zepto": 46},
    "eggs": {"name": "Farm Fresh Eggs (12 Pack)", "bigbasket": 90, "blinkit": 95, "zepto": 92},
    "butter": {"name": "Premium Salted Butter (500g)", "bigbasket": 265, "blinkit": 275, "zepto": 270}
}


@app.route('/api/spend-lens', methods=['GET'])
def get_spend_lens():
    global wallet, inbox_emails
    try:
        retailer_breakdown = [
            {"store": "Amazon", "amount": 44990, "color": "#ff9900", "percentage": 67},
            {"store": "Flipkart", "amount": 19999, "color": "#2563eb", "percentage": 30},
            {"store": "Myntra", "amount": 1899, "color": "#ff3f6c", "percentage": 3}
        ]
        
        calculated_spent = sum(item["amount"] for item in inbox_emails if item.get("status") != "Delivered") + 66888
        
        data = {
            "total_spent": calculated_spent,
            "total_cashback_earned": wallet["balance"],
            "efficiency_rate": round((wallet["balance"] / calculated_spent) * 100, 2) if calculated_spent > 0 else 5.0,
            "missed_savings": 4820,
            "retailer_breakdown": retailer_breakdown,
            "monthly_savings_trend": [1200, 1500, 900, 1820, 2400, 1900]
        }
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/basket/compare', methods=['POST'])
def compare_grocery_basket():
    try:
        data = get_json_payload()
        selected_items = data.get('items', [])
        
        if not selected_items:
            return jsonify({"bigbasket": 0, "blinkit": 0, "zepto": 0, "cheapest": "bigbasket", "breakdown": {}})
            
        bb_total = 0
        bl_total = 0
        zp_total = 0
        breakdown = {}
        
        for item_key in selected_items:
            item = GROCERY_ITEMS_PRICES.get(item_key)
            if item:
                bb_total += item["bigbasket"]
                bl_total += item["blinkit"]
                zp_total += item["zepto"]
                breakdown[item_key] = {
                    "name": item["name"],
                    "bigbasket": item["bigbasket"],
                    "blinkit": item["blinkit"],
                    "zepto": item["zepto"]
                }
                
        totals = {"bigbasket": bb_total, "blinkit": bl_total, "zepto": zp_total}
        cheapest_store = min(totals, key=totals.get)
        
        return jsonify({
            "bigbasket": bb_total,
            "blinkit": bl_total,
            "zepto": zp_total,
            "cheapest": cheapest_store,
            "breakdown": breakdown
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/similar', methods=['POST'])
def get_similar_products():
    try:
        data = get_json_payload()
        title = data.get('title', '').lower()
        
        is_audio = "sony" in title or "headphones" in title or "audio" in title or "wh-1000" in title or "xm4" in title
        is_phone = "iphone" in title or "s24" in title or "galaxy" in title or "oneplus" in title or "smartphone" in title
        is_laptop = "macbook" in title or "laptop" in title or "ideapad" in title or "pavilion" in title
        is_clothing = "shorts" in title or "pajama" in title or "night" in title or "loungewear" in title or "socks" in title or "sneakers" in title
        
        if is_audio:
            alternatives = [
                {"title": "Bose QuietComfort 45 Bluetooth Headphones", "store": "Amazon", "price": 22999, "original_price": 29900, "discount": "23% OFF", "rating": 4.7, "url": "https://www.amazon.in/s?k=bose+quietcomfort+45"},
                {"title": "JBL Live 660NC Wireless Headphones", "store": "Flipkart", "price": 9999, "original_price": 14999, "discount": "33% OFF", "rating": 4.3, "url": "https://www.flipkart.com/search?q=jbl+live+660nc"},
                {"title": "Sony WH-CH720N Noise Cancelling Headphones", "store": "Amazon", "price": 7990, "original_price": 14990, "discount": "46% OFF", "rating": 4.2, "url": "https://www.amazon.in/s?k=sony+wh-ch720n"}
            ]
        elif is_phone:
            alternatives = [
                {"title": "Apple iPhone 15 Plus (128GB, Black)", "store": "Amazon", "price": 79900, "original_price": 89900, "discount": "11% OFF", "rating": 4.7, "url": "https://www.amazon.in/s?k=iphone+15+plus"},
                {"title": "Samsung Galaxy S24 (5G, 8GB RAM)", "store": "Flipkart", "price": 74999, "original_price": 79999, "discount": "6% OFF", "rating": 4.5, "url": "https://www.flipkart.com/search?q=samsung+s24"},
                {"title": "OnePlus 12R (5G, 8GB, 256GB)", "store": "Amazon", "price": 39999, "original_price": 45999, "discount": "13% OFF", "rating": 4.5, "url": "https://www.amazon.in/s?k=oneplus+12r"}
            ]
        elif is_laptop:
            alternatives = [
                {"title": "Apple MacBook Air M3 (8GB, 256GB SSD)", "store": "Amazon", "price": 104900, "original_price": 114900, "discount": "9% OFF", "rating": 4.8, "url": "https://www.amazon.in/s?k=macbook+air+m3"},
                {"title": "HP Pavilion 15 (Ryzen 5, 16GB SSD)", "store": "Flipkart", "price": 44999, "original_price": 54999, "discount": "18% OFF", "rating": 4.2, "url": "https://www.flipkart.com/search?q=hp+pavilion+15"},
                {"title": "Lenovo IdeaPad Slim 3 (Intel Core i3)", "store": "Amazon", "price": 32900, "original_price": 48999, "discount": "32% OFF", "rating": 4.1, "url": "https://www.amazon.in/s?k=lenovo+ideapad+slim+3"}
            ]
        elif is_clothing:
            alternatives = [
                {"title": "SMOWKLY Women Korean Shorts Pajama Set", "store": "Amazon", "price": 498, "original_price": 999, "discount": "50% OFF", "rating": 3.8, "url": "https://www.amazon.in/s?k=smowkly+shorts+pajama+set"},
                {"title": "Women Korean Striped Shorts Pajama Set", "store": "Amazon", "price": 498, "original_price": 999, "discount": "50% OFF", "rating": 3.9, "url": "https://www.amazon.in/s?k=striped+shorts+pajama+set"},
                {"title": "Puma Unisex Solid Classic Retro Sneakers", "store": "Myntra", "price": 2499, "original_price": 4999, "discount": "50% OFF", "rating": 4.2, "url": "https://www.myntra.com/sneakers"}
            ]
        else:
            alternatives = SEARCH_PRODUCTS[:3]
            
        return jsonify({"results": alternatives})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ================== RUN ==================
if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=os.getenv("FLASK_DEBUG") == "1")
