# Usha Enterprises - Static Product Ordering (onlinewebsitetest)

This repository contains a simple static website for "Usha Enterprises" that loads product data from products.json, allows users to add items to a cart, checkout by entering their details, generate a PDF invoice, download it, and open WhatsApp with a pre-filled message instructing the user to attach and send the PDF to Shanu Kumar.

Updates in this commit
- Improved styling and layout for a more engaging look (hero banner, shadows, refined buttons, responsive tweaks).
- Phone number validation added: checkout requires a 10-digit phone number. The phone input has maxlength=10 and client-side validation; the form also validates before creating the PDF.

How to use
1. Open index.html in a browser (or enable GitHub Pages to host it).
2. Add quantities using + / - buttons; click Checkout when ready.
3. Fill first name, last name, address and phone (10 digits); click "Place order & Generate PDF".
4. Download the generated PDF and attach it in WhatsApp. Click "Open WhatsApp" to open a chat with a prefilled message.

Notes & limitations
- Currency: INR (₹) is used.
- No login or server-side API.
- We cannot automatically attach the PDF to WhatsApp from a static site; the user must download and attach it manually. The site opens a WhatsApp share link with prefilled text.

Next steps you may want
- Provide Shanu Kumar's phone number (with country code) to open a direct chat link.
- Add product images and category filters.
- Persist orders to a backend and automate WhatsApp sending (requires server + WhatsApp Business API).

