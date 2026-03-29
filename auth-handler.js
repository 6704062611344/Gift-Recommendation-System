// auth-handler.js

// ฟังก์ชันสำหรับจัดการการสมัครสมาชิก (Register)
function handleRegister(event) {
    event.preventDefault(); // ป้องกันการ reload หน้าจอ
    
    const name = document.getElementById('reg-name').value.trim();
    const username = document.getElementById('reg-username').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirmPassword = document.getElementById('reg-confirm').value;

    if (!name || !username || !email || !password || !confirmPassword) {
        alert('กรุณากรอกข้อมูลให้ครบทุกช่อง');
        return;
    }

    if (password !== confirmPassword) {
        alert('รหัสผ่านไม่ตรงกัน');
        return;
    }

    // จำลองการบันทึกข้อมูลลง LocalStorage (สำหรับการทดสอบ)
    const userData = { name, username, email, password, role: 'member' };
    localStorage.setItem('user_' + username, JSON.stringify(userData));
    
    alert('สร้างบัญชีผู้ใช้สำเร็จ!');
    // เปลี่ยนไปหน้า login หรือสลับ Tab
    if (typeof switchTab === 'function') switchTab('login'); 
}

// ฟังก์ชันสำหรับจัดการการเข้าสู่ระบบ (Login)
function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
        alert('กรุณากรอกอีเมลและรหัสผ่าน');
        return;
    }

    // ตัวอย่าง Logic การตรวจสอบข้อมูล (ควรเชื่อมต่อกับ Backend ในอนาคต)
    // ในที่นี้เป็นการตรวจสอบเบื้องต้นจากข้อมูลที่อาจจะบันทึกไว้ใน sessionStorage/localStorage
    console.log('กำลังเข้าสู่ระบบด้วย:', email);
    
    // จำลองการส่งข้อมูลไปยังหน้า Dashboard
    // window.location.href = 'user-home.html'; 
}

// รอให้ DOM โหลดเสร็จแล้วค่อยผูก Event เข้ากับปุ่ม
document.addEventListener('DOMContentLoaded', () => {
    const regForm = document.querySelector('.register-form'); // ปรับตาม class ของ form จริง
    const loginForm = document.querySelector('.login-form');

    if (regForm) {
        regForm.addEventListener('submit', handleRegister);
    }
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
});