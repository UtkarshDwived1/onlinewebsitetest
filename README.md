# Usha Enterprises - Static Product Ordering (onlinewebsitetest)

This repository contains a simple static website for "Usha Enterprises" that loads product data from products.json, allows users to add items to a cart, checkout by entering their details, generate a PDF invoice, download it, and open WhatsApp with a pre-filled message instructing the user to attach and send the PDF to Shanu Kumar.

What I added
- index.html — main static page
- styles.css — basic responsive styles
- script.js — product loading, cart logic, PDF generation (jsPDF), WhatsApp share link
- products.json — sample masala product list (easy to update weekly)

How to use
1. Open index.html in a browser (or enable GitHub Pages to host it).
2. Add quantities using + / - buttons; click Checkout when ready.
3. Fill first name, last name, address and phone; click "Place order & Generate PDF".
4. Download the generated PDF and attach it in WhatsApp. Click "Open WhatsApp" to open a chat with a prefilled message.

Notes & limitations
- Currency: INR (₹) is used.
- No login or server-side API.
- We cannot automatically attach the PDF to WhatsApp from a static site; the user must download and attach it manually. The site opens a WhatsApp share link with prefilled text.

Optional next steps (I can implement if you want)
- Add recipient phone number to open a direct chat (wa.me/<number>) — please provide the number with country code.
- Add product categories filter or search.
- Add images for products.
- Hook to a backend to persist orders and send WhatsApp messages automatically (requires WhatsApp Business API).

