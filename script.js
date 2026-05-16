// رابط الـ API بتاع السيرفر اللي إحنا عملناه
const API_URL = 'https://cleano-backend.vercel.app/api/orders';
let orders = [];

// 1. دالة لجلب الطلبات من السيرفر (GET Request)
// جلب الطلبات من السيرفر
async function fetchOrders() {
    try {
        const response = await fetch(API_URL);
        orders = await response.json();
        
        updateStats();
        renderAllOrdersTable(); // دي بس اللي شغالة عشان الجدول الكبير
        renderChatUsers();
        // تشغيل الرسومات البيانية
        if (typeof renderCharts === 'function') {
            renderCharts(orders);
        }
        
    } catch (error) {
        console.error('Error fetching orders:', error);
    }
}

// 2. تحديث الإحصائيات في الداشبورد
function updateStats() {
    const totalOrders = orders.length;
    const totalRevenue = orders.filter(o => o.status === 'completed').reduce((sum, order) => sum + order.price, 0);
    
    document.getElementById('total-orders').innerText = totalOrders;
    document.getElementById('active-workers').innerText = "12"; 
    document.getElementById('total-revenue').innerText = `₪ ${totalRevenue}`;
}
// ==========================================
// الرسومات البيانية (Charts & Analytics)
// ==========================================
let statusChartInstance = null;
let serviceChartInstance = null;
let revenueChartInstance = null;

// تظبيط لون الخط في الرسومات عشان يليق مع الدارك مود واللايت مود
Chart.defaults.color = '#9ca3af';

function renderCharts(ordersData) {
    // 1. تجميع بيانات الخدمات والحالات
    let pendingCount = 0;
    let completedCount = 0;
    let serviceCounts = {};

    ordersData.forEach(order => {
        if (order.status === 'pending') pendingCount++;
        if (order.status === 'completed') completedCount++;

        if (serviceCounts[order.service]) {
            serviceCounts[order.service]++;
        } else {
            serviceCounts[order.service] = 1;
        }
    });

    // 2. تحديث الرسم الدائري (الحالات)
    const statusCtx = document.getElementById('statusChart');
    if (statusCtx) {
        if (statusChartInstance) statusChartInstance.destroy();
        statusChartInstance = new Chart(statusCtx, {
            type: 'doughnut',
            data: {
                labels: ['Pending', 'Completed'],
                datasets: [{
                    data: [pendingCount, completedCount],
                    backgroundColor: ['#f59e0b', '#22c55e'],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    // 3. تحديث الرسم الشريطي (الخدمات)
    const serviceCtx = document.getElementById('serviceChart');
    if (serviceCtx) {
        if (serviceChartInstance) serviceChartInstance.destroy();
        serviceChartInstance = new Chart(serviceCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(serviceCounts),
                datasets: [{
                    label: 'Number of Requests',
                    data: Object.values(serviceCounts),
                    backgroundColor: '#3b82f6',
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
            }
        });
    }

    // ==========================================
    // 4. السحر الجديد: حساب أرباح آخر 7 أيام
    // ==========================================
    const last7Days = [];
    const revenueData = [0, 0, 0, 0, 0, 0, 0];

    // نجيب تواريخ آخر 7 أيام أوتوماتيك
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        last7Days.push(d.toISOString().split('T')[0]); // صيغة YYYY-MM-DD
    }

    // نلف على الطلبات، ولو الطلب اكتمل وله تاريخ من آخر 7 أيام، نجمع سعره
    ordersData.forEach(order => {
        if (order.status === 'completed' && order.date) {
            const index = last7Days.indexOf(order.date);
            if (index !== -1) {
                revenueData[index] += Number(order.price);
            }
        }
    });

    // تحديث رسم الأرباح الخطي
    const revenueCtx = document.getElementById('revenueChart');
    if (revenueCtx) {
        if (revenueChartInstance) revenueChartInstance.destroy();
        revenueChartInstance = new Chart(revenueCtx, {
            type: 'line',
            data: {
                labels: last7Days, // هنا بنعرض التواريخ الحقيقية بدل أيام الأسبوع
                datasets: [{
                    label: 'Revenue (₪)',
                    data: revenueData, // هنا بنعرض الأرباح الحقيقية
                    borderColor: '#22c55e',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#22c55e'
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.05)' } },
                    x: { grid: { display: false }, ticks: { font: { size: 10 } } }
                }
            }
        });
    }
}

// 3. رسم جدول الطلبات
function renderTable(dataToRender = orders) {
    const tbody = document.getElementById('orders-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    dataToRender.forEach((order) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${order.orderId}</strong></td>
            <td>${order.service}</td>
            <td>${order.customer}</td>
            <td><span class="status ${order.status}">${order.status}</span></td>
            <td>₪ ${order.price}</td>
            <td>
                <button class="action-btn" onclick="deleteOrder('${order._id}')"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}
// رسم جدول "كل الطلبات" في صفحة Orders مع خاصية تغيير الحالة
// رسم جدول كل الطلبات (محدث لدعم الإشعارات)
function renderAllOrdersTable(dataToRender = orders) {
    const tbody = document.getElementById('all-orders-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    dataToRender.forEach((order) => {
        // نجهز قائمة العمال (Dropdown)
        let workersOptions = `<option value="Not Assigned">Not Assigned</option>`;
        allWorkersList.forEach(worker => {
            // لو العامل ده هو اللي متسجل في الطلب، نخليه selected
            let isSelected = (order.assignedWorker === worker.name) ? 'selected' : '';
            workersOptions += `<option value="${worker.name}" ${isSelected}>${worker.name}</option>`;
        });

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${order.orderId}</strong></td>
            <td>${order.service}</td>
            <td>${order.customer}</td>
            <td>
                <select onchange="updateOrderStatus('${order._id}', this.value, '${order.customer}', '${order.orderId}')" class="form-control" style="padding: 5px; font-size: 13px; width: 110px; background: ${order.status === 'completed' ? '#dcfce7' : '#fef3c7'}; color: #1f2937; font-weight: 600; border: none;">
                    <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                    <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Completed</option>
                </select>
            </td>
            <td>
                <select onchange="assignWorkerToOrder('${order._id}', this.value)" class="form-control" style="padding: 5px; font-size: 13px; width: 120px;">
                    ${workersOptions}
                </select>
            </td>
            <td>₪ ${order.price}</td>
            <td>
                <button class="action-btn" onclick="printInvoice('${order._id}')" style="background: #3b82f6; margin-right: 5px;" title="Print Invoice"><i class="fa-solid fa-print"></i></button>
                <button class="action-btn" onclick="deleteOrder('${order._id}')" style="background: #ef4444;" title="Delete Order"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// دالة تغيير حالة الطلب في الداتابيز
async function updateOrderStatus(id, newStatus, customerName, orderId) {
    try {
        await fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        
        // السطر السحري اللي بيبعت الإشعار للعميل
        sendNotification(customerName, `Your order ${orderId} has been marked as ${newStatus}!`);
        
        fetchOrders(); // تحديث الجدول والأرباح
    } catch (error) {
        console.error('Error updating status:', error);
    }
}

// 4. حذف طلب من السيرفر (DELETE Request)
async function deleteOrder(id) {
    if(confirm('Are you sure you want to delete this order?')) {
        try {
            await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
            fetchOrders(); // تحديث الجدول بعد الحذف
        } catch (error) {
            console.error('Error deleting order:', error);
        }
    }
}

// 5. إضافة طلب جديد للسيرفر (POST Request)
// ==========================================
// إضافة طلب يدوي عن طريق الأدمن (Modal Logic)
// ==========================================
const modal = document.getElementById('add-order-modal');
const openModalBtn = document.getElementById('open-order-modal-btn');
const closeModalBtn = document.querySelector('.close-modal');

// 1. فتح الـ Modal
if (openModalBtn) {
    openModalBtn.addEventListener('click', () => {
        modal.style.display = 'block';
    });
}

// 2. قفل الـ Modal من علامة الـ X أو الضغط برا
closeModalBtn.addEventListener('click', () => modal.style.display = 'none');
window.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
});

// 3. إرسال الطلب للسيرفر
document.getElementById('submit-manual-order').addEventListener('click', async () => {
    const customerInput = document.getElementById('manual-customer-name');
    const serviceSelect = document.getElementById('manual-service-type');
    
    const customerName = customerInput.value.trim();
    if (!customerName) {
        alert('Please enter the customer name!');
        return;
    }

    const serviceName = serviceSelect.value;
    
    // تحديد السعر بناءً على الخدمة
    let price = 40;
    if (serviceName === 'Deep Cleaning') price = 90;
    if (serviceName === 'Garbage Pickup') price = 25;

    // تجهيز بيانات الطلب (الـ ID هيتعمل أوتوماتيك)
    const newOrder = {
        orderId: `#${1000 + Math.floor(Math.random() * 1000)}`, // توليد ID
        service: serviceName,
        customer: customerName,
        status: 'pending', // بيبدأ كـ انتظار
        price: price
    };

    try {
        await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newOrder)
        });
        
        // تفريغ الخانة وقفل الـ Modal وتحديث الجدول
        customerInput.value = '';
        modal.style.display = 'none';
        fetchOrders(); 
        alert('Order added successfully!');
    } catch (error) {
        console.error('Error adding manual order:', error);
    }
});

// 6. إعداد الرسم البياني (Chart.js)
function initChart() {
    const ctx = document.getElementById('revenueChart').getContext('2d');
    // ==========================================
// رسم بياني حقيقي للأرباح (Live Revenue Chart)
// ==========================================
let revenueChart; // متغير عشان نحفظ فيه الشارت

function renderCharts(orders) {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;

    // 1. تصفير أرباح الأيام (من الإثنين للأحد)
    // [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
    const weeklyRevenue = [0, 0, 0, 0, 0, 0, 0];

    // 2. حساب الأرباح الحقيقية من الطلبات المكتملة بس
    orders.forEach(order => {
        if (order.status === 'completed') {
            const orderDate = new Date(order.createdAt || Date.now()); // لو مفيش تاريخ بناخد تاريخ النهاردة
            let dayIndex = orderDate.getDay(); // دي بترجع من 0 (الأحد) لـ 6 (السبت)
            
            // تظبيط الاندكس عشان يطابق الشارت بتاعنا اللي بيبدأ من الإثنين
            let chartIndex = dayIndex === 0 ? 6 : dayIndex - 1; 
            
            weeklyRevenue[chartIndex] += order.price; // بنجمع سعر الطلب على اليوم بتاعه
        }
    });

    // 3. مسح الشارت القديم لو موجود عشان ميعملش تداخل
    if (revenueChart) {
        revenueChart.destroy();
    }

    // 4. رسم الشارت بالداتا الحقيقية
    revenueChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Real Revenue (₪)',
                data: weeklyRevenue, // الداتا الحقيقية أهي!
                borderColor: '#22c55e',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#22c55e'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: 'var(--text-muted)' } },
                x: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: 'var(--text-muted)' } }
            },
            plugins: {
                legend: { labels: { color: 'var(--text-main)' } }
            }
        }
    });
}
}

// 7. اللوجيك الخاص بالقائمة الجانبية (SPA Routing)
const navLinks = document.querySelectorAll('.nav-links li');
const pages = document.querySelectorAll('.page-section');

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
        targetSection.style.display = 'block';
        
        setTimeout(() => {
            targetSection.classList.add('active-section');
        }, 50);
    });
});
// رابط الـ API للعمال
const WORKERS_API_URL = 'https://cleano-backend.vercel.app/api/workers';
let workers = [];

// جلب العمال من السيرفر
async function fetchWorkers() {
    try {
        const response = await fetch(WORKERS_API_URL);
        const workers = await response.json();
        allWorkersList = workers; // حفظنا العمال هنا
        renderWorkersTable(workers);
    } catch (error) {
        console.error('Error fetching workers:', error);
    }
}

// رسم جدول العمال (مع حساب متوسط التقييم)
function renderWorkersTable(dataToRender = workers) {
    const tbody = document.getElementById('workers-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    dataToRender.forEach((worker) => {
        // --- سحر حساب متوسط التقييم ---
        let avgRating = 0;
        if (worker.ratings && worker.ratings.length > 0) {
            const sum = worker.ratings.reduce((a, b) => a + b, 0);
            avgRating = (sum / worker.ratings.length).toFixed(1); // بنقرب الرقم لعشرة واحدة (مثلاً 4.5)
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${worker.name}</strong></td>
            <td>${worker.role}</td>
            <td style="color: #fbbf24; font-weight: bold; font-size: 15px;">⭐ ${avgRating}</td>
            <td><span class="status ${worker.status === 'active' ? 'completed' : 'pending'}">${worker.status}</span></td>
            <td>
                <button class="action-btn" onclick="deleteWorker('${worker._id}')"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// حذف عامل
async function deleteWorker(id) {
    if(confirm('Are you sure you want to delete this worker?')) {
        try {
            await fetch(`${WORKERS_API_URL}/${id}`, { method: 'DELETE' });
            fetchWorkers(); // تحديث بعد الحذف
        } catch (error) {
            console.error('Error deleting worker:', error);
        }
    }
}

// إضافة عامل جديد
// ==========================================
// إضافة عامل يدوي عن طريق الأدمن (Worker Modal Logic)
// ==========================================
const workerModal = document.getElementById('add-worker-modal');
const openWorkerModalBtn = document.getElementById('open-worker-modal-btn');
const closeWorkerModalBtn = document.getElementById('close-worker-modal');

// 1. فتح الـ Modal بتاع العمال
if (openWorkerModalBtn) {
    openWorkerModalBtn.addEventListener('click', () => {
        workerModal.style.display = 'block';
    });
}

// 2. قفل الـ Modal
if (closeWorkerModalBtn) {
    closeWorkerModalBtn.addEventListener('click', () => workerModal.style.display = 'none');
}

window.addEventListener('click', (e) => {
    if (e.target === workerModal) workerModal.style.display = 'none';
});

// 3. إرسال بيانات العامل للسيرفر
document.getElementById('submit-manual-worker').addEventListener('click', async () => {
    const workerNameInput = document.getElementById('manual-worker-name');
    const workerRoleSelect = document.getElementById('manual-worker-role');
    const workerRatingInput = document.getElementById('manual-worker-rating'); // جديد
    const workerStatusSelect = document.getElementById('manual-worker-status'); // جديد
    
    const workerName = workerNameInput.value.trim();
    if (!workerName) {
        alert('Please enter the worker name!');
        return;
    }

    const workerRole = workerRoleSelect.value;
    const workerRating = parseFloat(workerRatingInput.value) || 5.0; // بياخد الرقم اللي كتبته
    const workerStatus = workerStatusSelect.value; // بياخد الحالة اللي اخترتها
    
    // تجهيز بيانات العامل بالبيانات اللي الأدمن حددها
    const newWorker = {
        name: workerName,
        role: workerRole,
        rating: workerRating, 
        status: workerStatus
    };

    try {
        await fetch(WORKERS_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newWorker)
        });
        
        // تفريغ الخانات وقفل الـ Modal وتحديث الجدول
        workerNameInput.value = '';
        workerRatingInput.value = '5.0'; // نرجع التقييم للوضع الافتراضي
        workerModal.style.display = 'none';
        fetchWorkers(); 
        alert('Worker added successfully with your custom settings!');
    } catch (error) {
        console.error('Error adding manual worker:', error);
    }
});

// ==========================================
// ميزة البحث المباشر (Live Search)
// ==========================================
const searchInput = document.querySelector('.search-bar input');

searchInput.addEventListener('input', (e) => {
    // بناخد الكلمة اللي اتكتبت ونحولها لحروف صغيرة عشان البحث يبقى دقيق
    const searchTerm = e.target.value.toLowerCase();

    // 1. فلترة الطلبات
    const filteredOrders = orders.filter(order => 
        order.customer.toLowerCase().includes(searchTerm) || 
        order.service.toLowerCase().includes(searchTerm) ||
        order.orderId.toLowerCase().includes(searchTerm)
    );

    // 2. فلترة العمال
    const filteredWorkers = workers.filter(worker => 
        worker.name.toLowerCase().includes(searchTerm) || 
        worker.role.toLowerCase().includes(searchTerm)
    );

    // بنحدث الجداول بالبيانات الجديدة المفلترة
    renderTable(filteredOrders);
    renderWorkersTable(filteredWorkers);
});
// ==========================================
// إعدادات النظام (Settings Logic)
// ==========================================
const themeToggle = document.getElementById('theme-toggle');

// 1. فحص لو المستخدم كان مختار الوضع الليلي قبل كده من الـ LocalStorage
if (localStorage.getItem('cleano_theme') === 'dark') {
    document.body.classList.add('dark-mode');
    themeToggle.checked = true;
}

// 2. تشغيل زرار الـ Dark Mode
themeToggle.addEventListener('change', (e) => {
    if (e.target.checked) {
        document.body.classList.add('dark-mode');
        localStorage.setItem('cleano_theme', 'dark'); // حفظ الإعداد
    } else {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('cleano_theme', 'light');
    }
});

// 3. زرار تغيير اللغة (شكل مبدئي)
document.getElementById('language-select').addEventListener('change', (e) => {
    const selectedLang = e.target.value;
    if (selectedLang === 'ar') {
        alert('سيتم دعم اللغة العربية بالكامل قريباً!');
        // هنا نقدر نضيف كود يقلب الموقع RTL (من اليمين للشمال)
    }
});
// ==========================================
// تعديل وحفظ اسم الأدمن
// ==========================================
const adminNameInput = document.getElementById('admin-name-input');
const saveAdminBtn = document.getElementById('save-admin-btn');
const displayAdminName = document.getElementById('display-admin-name');

// 1. أول ما الصفحة تفتح، نجيب الاسم من الـ LocalStorage (لو مفيش، نخليه Admin)
const savedAdminName = localStorage.getItem('cleano_admin_name') || 'Admin';
if (displayAdminName) displayAdminName.innerText = savedAdminName;
if (adminNameInput) adminNameInput.value = savedAdminName;

// 2. لما ندوس على زرار الحفظ
if (saveAdminBtn) {
    saveAdminBtn.addEventListener('click', () => {
        const newName = adminNameInput.value.trim();
        if (newName !== "") {
            localStorage.setItem('cleano_admin_name', newName); // نحفظه
            displayAdminName.innerText = newName; // نغيره فوق
            
            // نغير الصورة كمان عشان تاخد أول حرف من الاسم الجديد
            const profileImg = document.querySelector('.admin-profile img');
            profileImg.src = `https://ui-avatars.com/api/?name=${newName}&background=22c55e&color=fff`;
            
            alert('تم تغيير اسم الأدمن بنجاح!');
        }
    });
}
// ==========================================
// تصدير الطلبات لملف Excel / CSV
// ==========================================
const exportBtn = document.getElementById('export-orders-btn');

if (exportBtn) {
    exportBtn.addEventListener('click', () => {
        // لو مفيش طلبات، نطلع رسالة تنبيه
        if (orders.length === 0) {
            alert("No orders available to export!");
            return;
        }

        // إضافة \uFEFF عشان دعم اللغة العربية في الإكسيل
        let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
        
        // 1. إضافة عناوين الأعمدة (الهيدر)
        csvContent += "Order ID,Service,Customer,Status,Price (ILS)\n";

        // 2. اللف على الطلبات وإضافتها صف صف
        orders.forEach(order => {
            // بنجهز الصف وبنفصل بين البيانات بفاصلة
            const row = `${order.orderId},${order.service},${order.customer},${order.status},${order.price}`;
            csvContent += row + "\n";
        });

        // 3. كود تحميل الملف أوتوماتيك
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "Cleano_Orders_Report.csv");
        
        document.body.appendChild(link); // مطلوب عشان يشتغل على كل المتصفحات
        link.click(); // كأننا دوسنا على لينك التحميل
        document.body.removeChild(link); // بنمسح اللينك الوهمي بعد ما يخلص
    });
}
// ==========================================
// القائمة المنسدلة والبروفايل (Dropdown & Profile)
// ==========================================
const dropdownToggle = document.getElementById('admin-dropdown-toggle');
const dropdownMenu = document.getElementById('admin-dropdown-menu');
const profileModal = document.getElementById('profile-modal');
const openProfileBtn = document.getElementById('open-profile-btn');
const closeProfileBtn = document.querySelector('.close-profile-modal');

// 1. فتح وقفل القائمة المنسدلة
if(dropdownToggle) {
    dropdownToggle.addEventListener('click', (e) => {
        e.stopPropagation(); // عشان متقفلش أول ما نفتحها
        dropdownMenu.style.display = dropdownMenu.style.display === 'block' ? 'none' : 'block';
    });
}

// قفل القائمة لو دوسنا في أي حتة بره
window.addEventListener('click', () => {
    if (dropdownMenu) dropdownMenu.style.display = 'none';
});

// 2. فتح نافذة البروفايل
if(openProfileBtn) {
    openProfileBtn.addEventListener('click', (e) => {
        e.preventDefault();
        profileModal.style.display = 'block';
        
        // استدعاء البيانات المحفوظة
        document.getElementById('profile-name').value = localStorage.getItem('cleano_admin_name') || 'Admin';
        document.getElementById('profile-phone').value = localStorage.getItem('cleano_admin_phone') || '';
        
        const savedPic = localStorage.getItem('cleano_admin_pic');
        if (savedPic) document.getElementById('profile-preview').src = savedPic;
    });
}

// قفل نافذة البروفايل
closeProfileBtn.addEventListener('click', () => profileModal.style.display = 'none');

// 3. رفع الصورة وتحويلها لنص عشان تتحفظ
document.getElementById('profile-pic-upload').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const base64Image = event.target.result;
            document.getElementById('profile-preview').src = base64Image;
            localStorage.setItem('cleano_admin_pic', base64Image); // حفظها
        }
        reader.readAsDataURL(file);
    }
});

// 4. حفظ بيانات البروفايل
document.getElementById('save-profile-btn').addEventListener('click', () => {
    const newName = document.getElementById('profile-name').value.trim();
    const newPhone = document.getElementById('profile-phone').value.trim();
    
    if(newName) localStorage.setItem('cleano_admin_name', newName);
    localStorage.setItem('cleano_admin_phone', newPhone);
    
    // تحديث الاسم والصورة في الشريط العلوي أوتوماتيك
    document.getElementById('display-admin-name').innerText = newName;
    const savedPic = localStorage.getItem('cleano_admin_pic');
    
    if (savedPic) {
        document.getElementById('topbar-avatar').src = savedPic;
    } else {
        document.getElementById('topbar-avatar').src = `https://ui-avatars.com/api/?name=${newName}&background=22c55e&color=fff`;
    }
    
    profileModal.style.display = 'none';
    alert('Profile saved successfully!');
});

// 5. زرار تسجيل الخروج
function logout() {
    // توجيه المستخدم لصفحة اللوجن
    window.location.href = 'index.html';
}

// 6. تحميل الصورة والاسم أول ما الصفحة تفتح
document.addEventListener("DOMContentLoaded", () => {
    const savedPic = localStorage.getItem('cleano_admin_pic');
    const savedName = localStorage.getItem('cleano_admin_name') || 'Admin';
    
    const displayAdminName = document.getElementById('display-admin-name');
    const topbarAvatar = document.getElementById('topbar-avatar');

    if(displayAdminName) displayAdminName.innerText = savedName;
    if(topbarAvatar) {
        topbarAvatar.src = savedPic ? savedPic : `https://ui-avatars.com/api/?name=${savedName}&background=22c55e&color=fff`;
    }
});
// ==========================================
// نظام الإشعارات للأدمن (Admin Notifications)
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

// دالة إرسال الإشعار
function sendNotification(targetUser, message) {
    let notifs = JSON.parse(localStorage.getItem('cleano_notifs')) || [];
    notifs.push({ target: targetUser, text: message, date: new Date().toLocaleString(), read: false });
    localStorage.setItem('cleano_notifs', JSON.stringify(notifs));
}

// دالة تحميل إشعارات الأدمن بس
function loadNotifications() {
    const currentUser = 'Admin'; 
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
        let notifs = JSON.parse(localStorage.getItem('cleano_notifs')) || [];
        notifs.forEach(n => { if (n.target === 'Admin') n.read = true; });
        localStorage.setItem('cleano_notifs', JSON.stringify(notifs));
        loadNotifications();
    });
}
// تحديث الإشعارات لايف كل ثانيتين
setInterval(loadNotifications, 2000); 
loadNotifications();// تشغيلها أول ما الصفحة تفتح

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
let allWorkersList = []; // متغير هنحفظ فيه العمال

// دالة ربط العامل بالطلب
async function assignWorkerToOrder(orderId, workerName) {
    try {
        await fetch(`${API_URL}/${orderId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ assignedWorker: workerName })
        });
        fetchOrders(); // تحديث الجدول
        
        // لو اخترت عامل، نبعتله إشعار هو كمان!
        if(workerName !== 'Not Assigned') {
            sendNotification(workerName, `You have been assigned to order!`);
        }
    } catch (error) {
        console.error('Error assigning worker:', error);
    }
}
// ==========================================
// تشغيل فلتر الطلبات (Status Filter)
// ==========================================
const statusFilter = document.getElementById('status-filter');

if (statusFilter) {
    statusFilter.addEventListener('change', (e) => {
        const selectedVal = e.target.value; // القيمة اللي اخترناها (all, pending, completed)
        
        if (selectedVal === 'all') {
            // لو اختار All، نعرض كل الطلبات
            renderAllOrdersTable(orders); 
        } else {
            // لو اختار حاجة تانية، نفلتر الطلبات ونعرضها
            const filteredOrders = orders.filter(order => order.status === selectedVal);
            renderAllOrdersTable(filteredOrders); 
        }
    });
}
// ==========================================
// طباعة الفاتورة (Print Invoice)
// ==========================================
function printInvoice(orderId) {
    // 1. ندور على الطلب في الداتابيز بتاعتنا
    const order = orders.find(o => o._id === orderId);
    if(!order) {
        alert("Order not found!");
        return;
    }

    // 2. نفتح نافذة جديدة للطباعة
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    // 3. نرسم شكل الفاتورة بالـ HTML والـ CSS
    printWindow.document.write(`
        <html>
        <head>
            <title>Invoice - ${order.orderId}</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; }
                .invoice-header { display: flex; justify-content: space-between; border-bottom: 2px solid #22c55e; padding-bottom: 20px; margin-bottom: 30px; }
                .logo { color: #22c55e; font-size: 28px; font-weight: bold; }
                .invoice-details { margin-bottom: 40px; line-height: 1.6; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                th, td { border: 1px solid #e5e7eb; padding: 12px; text-align: left; }
                th { background-color: #f9fafb; color: #374151; }
                .total { font-size: 20px; font-weight: bold; text-align: right; color: #111827; }
                .footer { text-align: center; color: #6b7280; margin-top: 50px; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="invoice-header">
                <div class="logo">🌿 Cleano Services</div>
                <div style="text-align: right;">
                    <h2 style="margin: 0; color: #111827;">INVOICE</h2>
                    <p style="margin: 5px 0; color: #6b7280;">Order Ref: ${order.orderId}</p>
                    <p style="margin: 0; color: #6b7280;">Date: ${order.date || new Date().toISOString().split('T')[0]}</p>
                </div>
            </div>
            
            <div class="invoice-details">
                <p><strong>Billed To:</strong> ${order.customer}</p>
                <p><strong>Assigned Worker:</strong> ${order.assignedWorker || 'Not Assigned'}</p>
                <p><strong>Order Status:</strong> <span style="text-transform: uppercase;">${order.status}</span></p>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>Description (Service Provided)</th>
                        <th>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>${order.service}</td>
                        <td>₪ ${order.price}</td>
                    </tr>
                </tbody>
            </table>
            
            <p class="total">Total Due: ₪ ${order.price}</p>
            
            <div class="footer">
                <p>Thank you for trusting Cleano Services!</p>
                <p>If you have any questions concerning this invoice, please contact our support.</p>
            </div>
        </body>
        </html>
    `);
    
    // 4. نقفل التعديل ونشغل أمر الطباعة
    printWindow.document.close();
    // بنعمل تأخير بسيط عشان نضمن إن الخطوط والتنسيقات حملت
    setTimeout(() => {
        printWindow.print();
    }, 250);
}
// ==========================================
// نظام الترجمة الشامل (Full Site Translation)
// ==========================================
const languageSelect = document.getElementById('language-select');

// 1. القاموس الشامل لكل كلمات الموقع
const translations = {
    en: {
        nav_overview: "Overview", nav_orders: "Orders", nav_workers: "Workers", nav_settings: "Settings",
        stat_orders: "Total Orders", stat_workers: "Active Workers", stat_revenue: "Total Revenue",
        chart_status: "Orders Status Breakdown", chart_services: "Top Requested Services", chart_revenue: "Revenue Overview (Last 7 Days)",
        table_id: "ID", table_service: "Service", table_customer: "Customer", table_status: "Status", table_worker: "Worker", table_price: "Price", table_action: "Action",
        btn_export: "Export CSV", btn_add_order: "Add New Order", btn_add_worker: "Add New Worker",
        settings_title: "System Settings", dark_mode: "Dark Mode", language: "Language"
    },
    ar: {
        nav_overview: "الرئيسية", nav_orders: "الطلبات", nav_workers: "العمال", nav_settings: "الإعدادات",
        stat_orders: "إجمالي الطلبات", stat_workers: "العمال النشطين", stat_revenue: "إجمالي الأرباح",
        chart_status: "حالة الطلبات", chart_services: "أكثر الخدمات طلباً", chart_revenue: "أرباح آخر 7 أيام",
        table_id: "الرقم", table_service: "الخدمة", table_customer: "العميل", table_status: "الحالة", table_worker: "العامل", table_price: "السعر", table_action: "إجراء",
        btn_export: "تصدير CSV", btn_add_order: "إضافة طلب", btn_add_worker: "إضافة عامل",
        settings_title: "إعدادات النظام", dark_mode: "الوضع الليلي", language: "اللغة"
    }
};

// 2. دالة تطبيق الترجمة على كل أجزاء الموقع
function applyLanguage(lang) {
    const t = translations[lang];
    if (!t) return;

    // --- ترجمة القائمة الجانبية ---
    const navLinks = document.querySelectorAll('.nav-links li a');
    if (navLinks.length >= 4) {
        navLinks[0].innerHTML = `<i class="fa-solid fa-house"></i> ${t.nav_overview}`;
        navLinks[1].innerHTML = `<i class="fa-solid fa-broom"></i> ${t.nav_orders}`;
        navLinks[2].innerHTML = `<i class="fa-solid fa-users"></i> ${t.nav_workers}`;
        navLinks[3].innerHTML = `<i class="fa-solid fa-gear"></i> ${t.nav_settings}`;
    }

    // --- ترجمة كروت الإحصائيات ---
    const statTitles = document.querySelectorAll('.stat-info h3');
    if(statTitles.length >= 3) {
        statTitles[0].innerText = t.stat_orders;
        statTitles[1].innerText = t.stat_workers;
        statTitles[2].innerText = t.stat_revenue;
    }

    // --- ترجمة عناوين الرسومات البيانية ---
    const chartTitles = document.querySelectorAll('.chart-title');
    if(chartTitles.length >= 3) {
        chartTitles[0].innerText = t.chart_status;
        chartTitles[1].innerText = t.chart_services;
        chartTitles[2].innerText = t.chart_revenue;
    }

    // --- ترجمة الزراير الأساسية ---
    const exportBtn = document.getElementById('export-orders-btn');
    if(exportBtn) exportBtn.innerHTML = `<i class="fa-solid fa-file-csv"></i> ${t.btn_export}`;
    
    const addOrderBtn = document.getElementById('open-order-modal-btn');
    if(addOrderBtn) addOrderBtn.innerHTML = `<i class="fa-solid fa-plus"></i> ${t.btn_add_order}`;
    
    const addWorkerBtn = document.getElementById('open-worker-modal-btn');
    if(addWorkerBtn) addWorkerBtn.innerHTML = `<i class="fa-solid fa-user-plus"></i> ${t.btn_add_worker}`;

    // --- ترجمة عناوين الجداول (بذكاء عشان ميبوظش الهيكل) ---
    const thElements = document.querySelectorAll('th');
    thElements.forEach(th => {
        if(th.innerText.includes('ID') || th.innerText.includes('الرقم')) th.innerText = t.table_id;
        if(th.innerText.includes('Service') || th.innerText.includes('الخدمة')) th.innerText = t.table_service;
        if(th.innerText.includes('Customer') || th.innerText.includes('العميل')) th.innerText = t.table_customer;
        if(th.innerText.includes('Status') || th.innerText.includes('الحالة')) th.innerText = t.table_status;
        if(th.innerText === 'Worker' || th.innerText === 'العامل') th.innerText = t.table_worker;
        if(th.innerText.includes('Price') || th.innerText.includes('السعر')) th.innerText = t.table_price;
        if(th.innerText.includes('Action') || th.innerText.includes('إجراء')) th.innerText = t.table_action;
    });

    // --- تغيير الخط حسب اللغة ---
    if (lang === 'ar') {
        document.body.style.fontFamily = "'Cairo', 'Tajawal', 'Segoe UI', sans-serif";
    } else {
        document.body.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
    }
}

// 3. تشغيل الترجمة عند التغيير وحفظها
if (languageSelect) {
    const savedLang = localStorage.getItem('cleano_lang') || 'en';
    languageSelect.value = savedLang;
    applyLanguage(savedLang);

    // هنا شيلنا الـ alert المزعج خالص
    languageSelect.addEventListener('change', (e) => {
        const selectedLang = e.target.value;
        localStorage.setItem('cleano_lang', selectedLang);
        applyLanguage(selectedLang);
    });
}
// ==========================================
// نظام الشات المباشر للأدمن (Live Chat Logic)
// ==========================================
let activeChatCustomer = null;
const BASE_API = API_URL.replace('/orders', '');

// رسم قائمة العملاء اللي ليهم طلبات
function renderChatUsers() {
    const usersList = document.getElementById('chat-users-list');
    if(!usersList) return;
    
    // استخراج أسماء العملاء بدون تكرار من جدول الطلبات
    const customers = [...new Set(orders.map(o => o.customer))];
    usersList.innerHTML = '';
    
    customers.forEach(customer => {
        const li = document.createElement('li');
        li.style.cssText = `padding: 10px; border-radius: 8px; background: var(--card-bg); cursor: pointer; color: var(--text-main); font-weight: 600; border: 1px solid var(--border); transition: 0.3s;`;
        li.innerText = customer;
        li.onclick = () => openAdminChat(customer);
        usersList.appendChild(li);
    });
}

// فتح الشات مع عميل معين
async function openAdminChat(customerName) {
    activeChatCustomer = customerName;
    document.getElementById('current-chat-user').innerText = `Chat with: ${customerName}`;
    document.getElementById('admin-chat-input').disabled = false;
    document.getElementById('admin-send-btn').disabled = false;
    await fetchAdminMessages();
}

// جلب الرسائل
async function fetchAdminMessages() {
    if (!activeChatCustomer) return;
    try {
        const response = await fetch(`${BASE_API}/messages/${activeChatCustomer}`);
        const msgs = await response.json();
        
        const chatBox = document.getElementById('admin-chat-messages');
        chatBox.innerHTML = '';
        
        msgs.forEach(msg => {
            const isAdmin = msg.sender === 'Admin';
            chatBox.innerHTML += `
                <div style="max-width: 80%; padding: 10px; border-radius: 10px; ${isAdmin ? 'background: #3b82f6; color: white; align-self: flex-end; border-bottom-right-radius: 0;' : 'background: var(--card-bg); color: var(--text-main); align-self: flex-start; border-bottom-left-radius: 0; border: 1px solid var(--border);'}">
                    <p style="margin: 0; font-size: 14px;">${msg.text}</p>
                    <small style="font-size: 10px; opacity: 0.7;">${new Date(msg.timestamp).toLocaleTimeString()}</small>
                </div>
            `;
        });
        chatBox.scrollTop = chatBox.scrollHeight;
    } catch (error) {
        console.error('Error fetching admin msgs:', error);
    }
}

// إرسال رسالة من الأدمن
async function sendAdminMessage() {
    const input = document.getElementById('admin-chat-input');
    const text = input.value.trim();
    
    if (!text || !activeChatCustomer) return;
    
    try {
        await fetch(`${BASE_API}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sender: 'Admin', receiver: activeChatCustomer, text })
        });
        input.value = '';
        fetchAdminMessages();
        
        // نبعت إشعار للعميل إن الدعم رد عليه!
        if (typeof sendNotification === 'function') {
            sendNotification(activeChatCustomer, "Support replied to your message! 💬");
        }
    } catch (error) {
        console.error('Error sending msg:', error);
    }
}

// تحديث الشات أوتوماتيك كل 3 ثواني
setInterval(() => {
    const messagesSection = document.getElementById('messages-section');
    if (messagesSection && messagesSection.classList.contains('active-section')) {
        fetchAdminMessages();
    }
}, 3000);
// 8. تشغيل كل حاجة أول ما الصفحة تفتح
window.onload = () => {
    fetchOrders();
    fetchWorkers();
    initChart();
};