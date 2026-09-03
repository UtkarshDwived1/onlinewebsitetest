// script.js - fixes: initialize on DOMContentLoaded, robust visit counter, remove any emoji, safer event wiring
// Features: search, filters, cart persistence, PDF generation, visit counter
const PRODUCTS_PATH = 'products.json';
let products = [];
const cart = new Map();

function money(n){return `₹${n.toFixed(2)}`}

// visit counter: increments on each page load (stored per-browser in localStorage)
function updateVisitCounter(){
  try{
    const key = 'uw_visits';
    const raw = localStorage.getItem(key);
    let v = 1;
    if(raw !== null){
      const parsed = parseInt(raw,10);
      if(!Number.isNaN(parsed)) v = parsed + 1;
    }
    localStorage.setItem(key, String(v));
    const el = document.getElementById('visit-count');
    if(el) el.textContent = v;
  }catch(e){console.warn('visit counter failed', e)}
}

async function loadProducts(){
  const res = await fetch(PRODUCTS_PATH);
  products = await res.json();
  renderProducts(products);
  loadCartFromStorage();
}

function renderProducts(list){
  const container = document.getElementById('products');
  if(!container) return;
  container.innerHTML = '';
  list.forEach(p => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h4>${p.name}</h4>
      <div class="meta"><div class="size">${p.size}</div><div class="cat">${p.category}</div></div>
      <div class="price">${money(p.price)}</div>
      <div class="controls">
        <button aria-label="decrease" data-id="${p.id}" data-action="dec">-</button>
        <div class="qty" id="qty-${p.id}">0</div>
        <button aria-label="increase" data-id="${p.id}" data-action="inc">+</button>
        <button class="add-btn" data-id="${p.id}" data-action="inc">Add</button>
      </div>
    `;
    container.appendChild(card);
  });
  // restore visible quantities
  cart.forEach((qty,id)=>{
    const el = document.getElementById(`qty-${id}`);
    if(el) el.textContent = qty;
  });
}

function updateCartDisplay(){
  const cartItems = document.getElementById('cart-items');
  if(!cartItems) return;
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
  const totalEl = document.getElementById('total');
  if(totalEl) totalEl.textContent = money(total);
  const checkoutBtn = document.getElementById('checkout-btn');
  if(checkoutBtn) checkoutBtn.disabled = cart.size===0;
  saveCartToStorage();
}

function changeQty(id, delta){
  const current = cart.get(id) || 0;
  const next = Math.max(0, current + delta);
  if(next===0) cart.delete(id); else cart.set(id, next);
  const el = document.getElementById(`qty-${id}`);
  if(el) el.textContent = next;
  updateCartDisplay();
}

// initialize after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // event delegation for + and - buttons and add button
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

  // search
  const searchInput = document.getElementById('search');
  if(searchInput){
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.trim().toLowerCase();
      const filtered = products.filter(p => (p.name + ' ' + p.size + ' ' + p.category).toLowerCase().includes(q));
      renderProducts(filtered);
      updateCartDisplay();
    });
  }

  // filters
  document.querySelectorAll('.filter').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('.filter').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const f = btn.dataset.filter;
      if(f==='all') renderProducts(products); else renderProducts(products.filter(p=>p.category===f));
      updateCartDisplay();
    });
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

  if(checkoutBtn){
    checkoutBtn.addEventListener('click', () => {
      if(modal){ modal.setAttribute('aria-hidden','false'); modal.style.display = 'flex'; }
      const formEl = document.getElementById('checkout-form');
      if(formEl){ formEl.hidden = false; }
      if(orderResult) orderResult.hidden = true;
    });
  }
  if(closeModal) closeModal.addEventListener('click', closeModalFn);
  if(cancelBtn) cancelBtn.addEventListener('click', closeModalFn);

  function closeModalFn(){
    if(modal){ modal.setAttribute('aria-hidden','true'); modal.style.display = 'none'; }
  }

  // form submit with phone validation
  const form = document.getElementById('checkout-form');
  if(form){
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
      if(downloadPdf) { downloadPdf.href = url; downloadPdf.download = `${orderId}_invoice.pdf`; }

      // show order result
      form.hidden = true;
      if(orderResult) orderResult.hidden = false;
      if(orderMsg) orderMsg.textContent = `Order ${orderId} created. Download the PDF then attach & send it to shanukumar on WhatsApp.`;

      // prepare whatsapp message (generic share link)
      const waText = encodeURIComponent(`Hello Shanu Kumar, I have placed an order with Order ID: ${orderId}. I have downloaded the invoice PDF — please attach it here and confirm.\n\nName: ${customer.firstName} ${customer.lastName}\nPhone: ${customer.phone}\nTotal: ₹${total.toFixed(2)}`);
      if(waShare) waShare.onclick = () => { window.open(`https://wa.me/?text=${waText}`, '_blank'); };

      // keep the order in memory (could be sent to server later)
      window.lastOrder = order;
    });
  }

  // small UX: shop now scroll
  const shopNow = document.getElementById('shop-now');
  if(shopNow) shopNow.addEventListener('click', ()=>{
    const prod = document.getElementById('products');
    if(prod) prod.scrollIntoView({behavior:'smooth'});
  });

  // theme toggle (simple)
  const themeToggle = document.getElementById('theme-toggle');
  if(themeToggle) themeToggle.addEventListener('click', ()=>{
    document.body.classList.toggle('dark');
    themeToggle.textContent = document.body.classList.contains('dark') ? '☀️' : '🌙';
  });

  // initialize visit counter and load products
  updateVisitCounter();
  loadProducts().catch(err=>console.error(err));

  // Update cart when products change (e.g. after load) to keep qtys in UI
  const prodEl = document.getElementById('products');
  if(prodEl){
    const observer = new MutationObserver(()=>updateCartDisplay());
    observer.observe(prodEl, {childList:true, subtree:true});
  }
});

// cart persistence functions (keep outside DOMContentLoaded)
function saveCartToStorage(){
  const obj = {};
  cart.forEach((v,k)=>obj[k]=v);
  localStorage.setItem('uw_cart', JSON.stringify(obj));
}
function loadCartFromStorage(){
  try{
    const raw = localStorage.getItem('uw_cart');
    if(raw){
      const obj = JSON.parse(raw);
      Object.keys(obj).forEach(k=>cart.set(k, obj[k]));
      updateCartDisplay();
      // sync qty displays
      cart.forEach((qty,id)=>{
        const el = document.getElementById(`qty-${id}`);
        if(el) el.textContent = qty;
      });
    }
  }catch(e){console.warn('cart load failed',e)}
}
