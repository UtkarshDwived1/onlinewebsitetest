// script.js - load products.json, handle cart and PDF generation (updated validations & small UX)
const PRODUCTS_PATH = 'products.json';
let products = [];
const cart = new Map();

function money(n){return `₹${n.toFixed(2)}`}

async function loadProducts(){
  const res = await fetch(PRODUCTS_PATH);
  products = await res.json();
  renderProducts();
}

function renderProducts(){
  const container = document.getElementById('products');
  container.innerHTML = '';
  products.forEach(p => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="thumb">🌶️</div>
      <h4>${p.name}</h4>
      <div class="meta"><div class="size">${p.size}</div><div class="cat">${p.category}</div></div>
      <div class="price">${money(p.price)}</div>
      <div class="controls">
        <button aria-label="decrease" data-id="${p.id}" data-action="dec">-</button>
        <div class="qty" id="qty-${p.id}">0</div>
        <button aria-label="increase" data-id="${p.id}" data-action="inc">+</button>
      </div>
    `;
    container.appendChild(card);
  });
}

function updateCartDisplay(){
  const cartItems = document.getElementById('cart-items');
  cartItems.innerHTML = '';
  let total = 0;
  if(cart.size===0){
    cartItems.innerHTML = '<div class="empty">Your cart is empty. Add some masala to get started!</div>';
  }
  cart.forEach((qty, id) => {
    const p = products.find(x=>x.id===id);
    if(!p) return;
    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `<div><div class="name">${p.name} (${p.size})</div><div class="muted">Qty: ${qty}</div></div><div>${money(p.price*qty)}</div>`;
    cartItems.appendChild(div);
    total += p.price * qty;
  });
  document.getElementById('total').textContent = money(total);
  document.getElementById('checkout-btn').disabled = cart.size===0;
}

function changeQty(id, delta){
  const current = cart.get(id) || 0;
  const next = Math.max(0, current + delta);
  if(next===0) cart.delete(id); else cart.set(id, next);
  const el = document.getElementById(`qty-${id}`);
  if(el) el.textContent = next;
  updateCartDisplay();
}

// event delegation for + and - buttons
document.addEventListener('click', e => {
  const btn = e.target.closest('button');
  if(!btn) return;
  const action = btn.dataset.action;
  const id = btn.dataset.id;
  if(action && id){
    if(action==='inc') changeQty(id, 1);
    if(action==='dec') changeQty(id, -1);
  }
});

// Checkout modal handlers
const modal = document.getElementById('checkout-modal');
const checkoutBtn = document.getElementById('checkout-btn');
const closeModal = document.getElementById('close-modal');
const cancelBtn = document.getElementById('cancel');
const orderResult = document.getElementById('order-result');
const orderMsg = document.getElementById('order-msg');
const downloadPdf = document.getElementById('download-pdf');
const waShare = document.getElementById('wa-share');

checkoutBtn.addEventListener('click', () => {
  modal.setAttribute('aria-hidden','false');
  modal.style.display = 'flex';
  document.getElementById('checkout-form').hidden = false;
  orderResult.hidden = true;
});
closeModal.addEventListener('click', close);
cancelBtn.addEventListener('click', close);
function close(){
  modal.setAttribute('aria-hidden','true');
  modal.style.display = 'none';
}

// form submit with phone validation
const form = document.getElementById('checkout-form');
form.addEventListener('submit', async (ev) =>{
  ev.preventDefault();
  const data = new FormData(form);
  const customer = {
    firstName: (data.get('firstName')||'').trim(),
    lastName: (data.get('lastName')||'').trim(),
    address: (data.get('address')||'').trim(),
    phone: (data.get('phone')||'').trim()
  };

  // validate phone: must be 10 digits
  const digits = customer.phone.replace(/\D/g,'');
  if(digits.length !== 10){
    alert('Please enter a valid 10-digit phone number.');
    return;
  }
  customer.phone = digits;

  const orderId = 'ORD-' + Math.random().toString(36).substring(2,10).toUpperCase();
  const items = [];
  let total = 0;
  cart.forEach((qty,id)=>{
    const p = products.find(x=>x.id===id);
    if(p){ items.push({...p, qty}); total += p.price*qty; }
  });

  const order = {orderId, customer, items, total, createdAt: new Date().toISOString()};

  // generate PDF using jsPDF
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({unit:'pt'});
  doc.setFontSize(16);
  doc.text('Usha Enterprises - Order Invoice', 40, 60);
  doc.setFontSize(11);
  doc.text(`Order ID: ${orderId}`, 40, 90);
  doc.text(`Name: ${customer.firstName} ${customer.lastName}`, 40, 110);
  doc.text(`Phone: ${customer.phone}`, 40, 130);
  doc.text(`Address: ${customer.address}`, 40, 150);

  doc.text('Items:', 40, 180);
  let y = 200;
  items.forEach(it=>{
    const line = `${it.name} (${it.size}) x ${it.qty} - ₹${(it.price*it.qty).toFixed(2)}`;
    doc.text(line, 40, y);
    y += 16;
    if(y>700){ doc.addPage(); y=40; }
  });
  doc.text(`Total: ₹${total.toFixed(2)}`, 40, y+16);

  const pdfBlob = doc.output('blob');
  const url = URL.createObjectURL(pdfBlob);
  downloadPdf.href = url;
  downloadPdf.download = `${orderId}_invoice.pdf`;

  // show order result
  form.hidden = true;
  orderResult.hidden = false;
  orderMsg.textContent = `Order ${orderId} created. Download the PDF then attach & send it to shanukumar on WhatsApp.`;

  // prepare whatsapp message (generic share link)
  const waText = encodeURIComponent(`Hello Shanu Kumar, I have placed an order with Order ID: ${orderId}. I have downloaded the invoice PDF — please attach it here and confirm.\n\nName: ${customer.firstName} ${customer.lastName}\nPhone: ${customer.phone}\nTotal: ₹${total.toFixed(2)}`);
  waShare.onclick = () => {
    const waUrl = `https://wa.me/?text=${waText}`;
    window.open(waUrl, '_blank');
  };

  // keep the order in memory (could be sent to server later)
  window.lastOrder = order;
});

// initialize
loadProducts().catch(err=>console.error(err));

// Update cart when products change (e.g. after load) to keep qtys in UI
const observer = new MutationObserver(()=>updateCartDisplay());
observer.observe(document.getElementById('products'), {childList:true, subtree:true});
