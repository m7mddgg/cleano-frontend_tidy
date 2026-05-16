const API_URL = 'https://cleano-backend.vercel.app/api/orders';

// ==========================================
// 1. الإشعارات (Notifications)
// ==========================================
const bellIcon = document.getElementById('bell-icon');
const notifDropdown = document.getElementById('notif-dropdown');
const markReadBtn = document.getElementById('mark-read-btn');

if(bellIcon) {
    bellIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        notifDropdown.style.display = notifDropdown.style.display === 'block' ? 'none' : 'block';
    });
}
window.addEventListener('click', (e) => {
    if (notifDropdown && !notifDropdown.contains(e.target) && e.target !== bellIcon) {
        notifDropdown.style.display = 'none';
    }
});

function sendNotification(targetUser, message) {
    let notifs = JSON.parse(localStorage.getItem('cleano_notifs')) || [];
    notifs.push({ target: targetUser, text: message, date: new Date().toLocaleString(), read: false });
    localStorage.setItem('cleano_notifs', JSON.stringify(notifs));
}

function loadNotifications() {
    const currentUser = localStorage.getItem('cleano_customer_name') || 'Customer';
    let notifs = JSON.parse(localStorage.getItem('cleano_notifs')) || [];
    let myNotifs = notifs.filter(n => n.target === currentUser).reverse();
    
    const notifList = document.getElementById('notif-list');
    const badge = document.getElementById('notif-badge');
    if (!notifList || !badge) return;

    notifList.innerHTML = '';
    let unreadCount = 0;

    if (myNotifs.length === 0) {
        notifList.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 10px;">No notifications yet</p>';
    } else {
        myNotifs.forEach(n => {
            if (!n.read) unreadCount++;
            notifList.innerHTML += `
                <div style="padding: 10px; border-bottom: 1px solid var(--border); ${n.read ? 'opacity: 0.6;' : 'background: rgba(34, 197, 94, 0.05); border-left: 3px solid var(--primary);'}">
                    <p style="margin-bottom: 5px; color: var(--text-main);">${n.text}</p>
                    <small style="color: var(--text-muted); font-size: 11px;">${n.date}</small>
                </div>`;
        });
    }

    if (unreadCount > 0) {
        badge.style.display = 'flex';
        badge.innerText = unreadCount;
    } else {
        badge.style.display = 'none';
    }
}

if(markReadBtn) {
    markReadBtn.addEventListener('click', () => {
        const currentUser = localStorage.getItem('cleano_customer_name') || 'Customer';
        let notifs = JSON.parse(localStorage.getItem('cleano_notifs')) || [];
        notifs.forEach(n => { if (n.target === currentUser) n.read = true; });
        localStorage.setItem('cleano_notifs', JSON.stringify(notifs));
        loadNotifications();
    });
}
setInterval(loadNotifications, 2000); // تحديث الإشعارات كل ثانيتين

// ==========================================
// 2. طلبات العميل
// ==========================================
document.getElementById('submit-request-btn').addEventListener('click', async () => {
    const serviceInput = document.getElementById('service-type'); 
    const addressInput = document.getElementById('service-address'); 

    if (!serviceInput.value || !addressInput.value) {
        alert('Please fill out all fields.');
        return;
    }

    // تحديد السعر كرقم صافي بناءً على اختيار العميل
    let extractedPrice = 0;
    if (serviceInput.value === 'Basic Cleaning') extractedPrice = 40;
    else if (serviceInput.value === 'Deep Cleaning') extractedPrice = 90;
    else if (serviceInput.value === 'Garbage Pickup') extractedPrice = 25;

    const currentUser = localStorage.getItem('cleano_customer_name') || 'Guest';

    const orderData = {
        customer: currentUser,
        service: serviceInput.options[serviceInput.selectedIndex].text, 
        address: addressInput.value,
        price: extractedPrice, // <-- هنا السحر! بعتنا السعر كرقم
        status: 'pending'
    };

    try {
        const response = await fetch('https://cleano-backend.vercel.app/api/orders', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });

        if (response.ok) {
            alert('Order placed successfully!');
            addressInput.value = '';
            if (typeof fetchUserOrders === 'function') fetchUserOrders();
        }
    } catch (error) {
        console.error('Error:', error);
    }
});

// ==========================================
// 3. البروفايل والقائمة المنسدلة
// ==========================================
const userDropdownToggle = document.getElementById('user-dropdown-toggle');
const userDropdownMenu = document.getElementById('user-dropdown-menu');
const userProfileModal = document.getElementById('user-profile-modal');
const openUserProfileBtn = document.getElementById('open-user-profile-btn');
const closeUserProfileBtn = document.querySelector('.close-user-profile-modal');

if(userDropdownToggle) {
    userDropdownToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        userDropdownMenu.style.display = userDropdownMenu.style.display === 'block' ? 'none' : 'block';
    });
}
window.addEventListener('click', () => { if (userDropdownMenu) userDropdownMenu.style.display = 'none'; });

if(openUserProfileBtn) {
    openUserProfileBtn.addEventListener('click', (e) => {
        e.preventDefault();
        userProfileModal.style.display = 'block';
        document.getElementById('user-profile-name').value = localStorage.getItem('cleano_customer_name') || 'Customer';
        document.getElementById('user-profile-phone').value = localStorage.getItem('cleano_customer_phone') || '';
        const savedPic = localStorage.getItem('cleano_customer_pic');
        if (savedPic) document.getElementById('user-profile-preview').src = savedPic;
    });
}
if(closeUserProfileBtn) closeUserProfileBtn.addEventListener('click', () => userProfileModal.style.display = 'none');

document.getElementById('user-pic-upload').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const base64Image = event.target.result;
            document.getElementById('user-profile-preview').src = base64Image;
            localStorage.setItem('cleano_customer_pic', base64Image);
        }
        reader.readAsDataURL(file);
    }
});

document.getElementById('save-user-profile-btn').addEventListener('click', () => {
    const newName = document.getElementById('user-profile-name').value.trim();
    const newPhone = document.getElementById('user-profile-phone').value.trim();
    if(newName) localStorage.setItem('cleano_customer_name', newName);
    localStorage.setItem('cleano_customer_phone', newPhone);
    loadUserData();
    userProfileModal.style.display = 'none';
    alert('Profile saved!');
    fetchMyOrders(); 
});

function logoutUser() { window.location.href = 'index.html'; }

function loadUserData() {
    const savedPic = localStorage.getItem('cleano_customer_pic');
    const savedName = localStorage.getItem('cleano_customer_name') || 'Customer';
    const displayUserName = document.getElementById('display-user-name');
    const topbarUserAvatar = document.getElementById('topbar-user-avatar');
    if(displayUserName) displayUserName.innerText = savedName;
    if(topbarUserAvatar) topbarUserAvatar.src = savedPic ? savedPic : `https://ui-avatars.com/api/?name=${savedName}&background=3b82f6&color=fff`;
}

// ==========================================
// 4. السكاشن (SPA Routing) والدارك مود
// ==========================================
const navLinks = document.querySelectorAll('.nav-links li');
const pages = document.querySelectorAll('.page-section');

if(navLinks.length > 0) {
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            navLinks.forEach(item => item.classList.remove('active'));
            this.classList.add('active');
            pages.forEach(page => {
                page.style.display = 'none';
                page.classList.remove('active-section');
            });
            const targetId = this.getAttribute('data-target');
            const targetSection = document.getElementById(targetId);
            if(targetSection) {
                targetSection.style.display = 'block';
                setTimeout(() => targetSection.classList.add('active-section'), 50);
            }
        });
    });
}

const themeToggle = document.getElementById('theme-toggle');
if(themeToggle) {
    if (localStorage.getItem('cleano_theme') === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggle.checked = true;
    }
    themeToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
            document.body.classList.add('dark-mode');
            localStorage.setItem('cleano_theme', 'dark');
        } else {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('cleano_theme', 'light');
        }
    });
}
// ==========================================
// زرار فتح وقفل القائمة الجانبية (Sidebar Toggle)
// ==========================================
const sidebarToggle = document.getElementById('sidebar-toggle');

if (sidebarToggle) {
    // 1. أول ما الصفحة تفتح، بنشوف هل اليوزر كان قافلها قبل كده ولا لأ
    if (localStorage.getItem('cleano_sidebar') === 'closed') {
        document.body.classList.add('sidebar-closed');
    }

    // 2. لما ندوس على الزرار
    sidebarToggle.addEventListener('click', () => {
        // بنضيف أو نشيل الكلاس اللي بيقفل القائمة
        document.body.classList.toggle('sidebar-closed');
        
        // 3. نحفظ الحالة الجديدة عشان تفضل ثابته بعد الـ Refresh
        if (document.body.classList.contains('sidebar-closed')) {
            localStorage.setItem('cleano_sidebar', 'closed');
        } else {
            localStorage.setItem('cleano_sidebar', 'open');
        }
    });
}
// ==========================================
// دالة إرسال التقييم للسيرفر
// ==========================================
async function rateOrder(orderId, workerName, rating) {
    if (workerName === 'Not Assigned') {
        return alert("Cannot rate this order because no worker was assigned.");
    }
    
    try {
        await fetch(`${API_URL}/${orderId}/rate`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rating, workerName })
        });
        
        alert(`Thank you for rating! You gave ${rating} stars. ⭐`);
        fetchUserOrders(); // نحدث الجدول عشان النجوم الذهبي تظهر
    } catch (error) {
        console.error('Error rating:', error);
    }
}
// ==========================================
// نظام الشات المباشر (Live Chat Logic)
// ==========================================
const BASE_API = API_URL.replace('/orders', ''); // بنجيب الرابط الأساسي للسيرفر

function toggleChat() {
    const chatWidget = document.getElementById('chat-widget');
    chatWidget.style.display = chatWidget.style.display === 'flex' ? 'none' : 'flex';
    if(chatWidget.style.display === 'flex') fetchMessages();
}

async function fetchMessages() {
    const currentUser = localStorage.getItem('cleano_customer_name');
    if (!currentUser) return;
    
    try {
        const response = await fetch(`${BASE_API}/messages/${currentUser}`);
        const msgs = await response.json();
        
        const chatBox = document.getElementById('chat-messages');
        chatBox.innerHTML = '';
        
        msgs.forEach(msg => {
            const isMe = msg.sender === currentUser;
            chatBox.innerHTML += `
                <div style="max-width: 80%; padding: 10px; border-radius: 10px; ${isMe ? 'background: #3b82f6; color: white; align-self: flex-end; border-bottom-right-radius: 0;' : 'background: var(--border); color: var(--text-main); align-self: flex-start; border-bottom-left-radius: 0;'}">
                    <p style="margin: 0; font-size: 14px;">${msg.text}</p>
                    <small style="font-size: 10px; opacity: 0.7;">${new Date(msg.timestamp).toLocaleTimeString()}</small>
                </div>
            `;
        });
        chatBox.scrollTop = chatBox.scrollHeight; // النزول لآخر رسالة أوتوماتيك
    } catch (error) {
        console.error('Error fetching msgs:', error);
    }
}

async function sendMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    const currentUser = localStorage.getItem('cleano_customer_name');
    
    if (!text || !currentUser) return;
    
    try {
        await fetch(`${BASE_API}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sender: currentUser, receiver: 'Admin', text })
        });
        input.value = ''; // تفريغ الخانة بعد الإرسال
        fetchMessages(); // تحديث الشات فوراً
    } catch (error) {
        console.error('Error sending msg:', error);
    }
}

// تحديث الشات كل 3 ثواني عشان يبقى لايف (لو النافذة مفتوحة بس)
setInterval(() => {
    const chatWidget = document.getElementById('chat-widget');
    if (chatWidget && chatWidget.style.display === 'flex') {
        fetchMessages();
    }
}, 3000);
// متغير لحفظ طلبات العميل
let userOrders = [];

// ==========================================
// 1. دالة جلب طلبات العميل من السيرفر
// ==========================================
async function fetchUserOrders() {
    const currentUser = localStorage.getItem('cleano_customer_name');
    if (!currentUser) return;

    try {
        const response = await fetch(API_URL);
        const allOrders = await response.json();
        
        // فلترة الطلبات عشان نعرض طلبات العميل ده بس
        userOrders = allOrders.filter(order => order.customer === currentUser);
        
        // مناداة دالة الرسم الشاملة
        renderUserOrdersTable(userOrders);
    } catch (error) {
        console.error('Error fetching user orders:', error);
    }
}

// ==========================================
// 2. الدالة الشاملة لرسم جدول العميل 
// ==========================================
function renderUserOrdersTable(dataToRender = userOrders) {
    // ربطنا بالـ ID بتاعك الصح
    const tbody = document.getElementById('my-orders-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    dataToRender.forEach((order) => {
        
        // --- 1. سحر التتبع البصري (Progress Bar) ---
        let progressWidth = '0%';
        let step1Color = '#3b82f6'; 
        let step2Color = 'var(--card-bg)';
        let step3Color = 'var(--card-bg)';
        let statusText = 'Order Placed';

        if (order.status === 'completed') {
            progressWidth = '100%';
            step1Color = '#22c55e';
            step2Color = '#22c55e';
            step3Color = '#22c55e';
            statusText = 'Completed';
        } else if (order.assignedWorker && order.assignedWorker !== 'Not Assigned') {
            progressWidth = '50%';
            step1Color = '#22c55e';
            step2Color = '#3b82f6';
            statusText = 'Worker Assigned';
        }

        let trackingHtml = `
            <div style="width: 140px; margin: 0 auto;">
                <div style="display: flex; justify-content: space-between; position: relative; margin-bottom: 8px;">
                    <div style="position: absolute; top: 50%; left: 0; right: 0; height: 3px; background: var(--border); z-index: 1; transform: translateY(-50%);"></div>
                    <div style="position: absolute; top: 50%; left: 0; width: ${progressWidth}; height: 3px; background: #22c55e; z-index: 2; transform: translateY(-50%); transition: 0.5s;"></div>
                    
                    <div style="width: 14px; height: 14px; border-radius: 50%; background: ${step1Color}; z-index: 3; box-shadow: 0 0 5px rgba(0,0,0,0.2);" title="Order Placed"></div>
                    <div style="width: 14px; height: 14px; border-radius: 50%; background: ${step2Color}; border: 2px solid ${step2Color === 'var(--card-bg)' ? 'var(--border)' : 'transparent'}; z-index: 3;" title="Worker Assigned"></div>
                    <div style="width: 14px; height: 14px; border-radius: 50%; background: ${step3Color}; border: 2px solid ${step3Color === 'var(--card-bg)' ? 'var(--border)' : 'transparent'}; z-index: 3;" title="Completed"></div>
                </div>
                <div style="text-align: center;">
                    <small style="font-size: 11px; font-weight: 600; color: var(--text-main);">${statusText}</small>
                </div>
            </div>
        `;

        // --- 2. تجهيز شكل نجوم التقييم ---
        let starsHtml = '';
        if (order.status === 'completed') {
            if (order.rating > 0) {
                starsHtml = `<span style="color: #fbbf24; font-size: 18px;">${'★'.repeat(order.rating)}${'☆'.repeat(5 - order.rating)}</span>`;
            } else {
                starsHtml = `
                    <div style="color: #9ca3af; font-size: 20px; cursor: pointer;">
                        <span onclick="rateOrder('${order._id}', '${order.assignedWorker}', 1)">★</span>
                        <span onclick="rateOrder('${order._id}', '${order.assignedWorker}', 2)">★</span>
                        <span onclick="rateOrder('${order._id}', '${order.assignedWorker}', 3)">★</span>
                        <span onclick="rateOrder('${order._id}', '${order.assignedWorker}', 4)">★</span>
                        <span onclick="rateOrder('${order._id}', '${order.assignedWorker}', 5)">★</span>
                    </div>
                `;
            }
        } else {
            starsHtml = `<span style="color: var(--text-muted); font-size: 12px;">Waiting...</span>`;
        }

        // --- 3. زرار الإلغاء (اللي كان في دالتك القديمة) ---
        const actionBtn = order.status === 'pending' 
            ? `<button class="action-btn" onclick="cancelOrder('${order._id}')" style="background: #ef4444; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer;">Cancel</button>`
            : `<span style="color: #6b7280; font-size: 13px;">Cannot cancel</span>`;

        // --- 4. بناء صف الجدول بالترتيب السليم ---
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${order.orderId}</strong></td>
            <td>${order.service}</td>
            <td>${trackingHtml}</td>
            <td>${starsHtml}</td>
            <td>₪ ${order.price}</td>
            <td>${actionBtn}</td>
        `;
        tbody.appendChild(tr);
    });
}

// ==========================================
// 3. تشغيل جلب الطلبات أول ما الصفحة تفتح
// ==========================================
if (typeof window !== 'undefined') {
    fetchUserOrders();
}

// ==========================================
// 5. التشغيل الأولي
// ==========================================
window.onload = () => {
    loadUserData();
    loadNotifications();
};